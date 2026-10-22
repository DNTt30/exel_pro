import json
import shutil

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from scheduler_ml.api import create_app
from scheduler_ml.data import FEATURES, SHIFTS, features_for_week, load_history, training_examples
from scheduler_ml.pipeline import Predictor, train


@pytest.fixture(scope="session")
def csv_path(tmp_path_factory):
    path = tmp_path_factory.mktemp("history") / "mock.csv"
    rows = []
    for day in pd.date_range("2026-04-06", periods=112):
        for index, shift in enumerate(("MORNING", "AFTERNOON", "NIGHT")):
            weekend = day.dayofweek >= 5
            ideal = 2 if index == 2 else (3 if weekend else 4)
            rows.append({
                "store_id": "VN0485", "shift_date": day.date().isoformat(),
                "day_of_week": (day.dayofweek + 1) % 7, "shift_type": shift,
                "is_weekend": weekend, "is_holiday": False, "has_extreme_weather": False,
                "shift_revenue_vnd": (ideal - 1) * 2000000 + day.day * 1000,
                "shift_foot_traffic": ideal * 40,
                "ideal_staff_count": ideal, "assigned_staff_count": ideal + day.day % 2,
                "is_mock_data": True,
            })
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


@pytest.fixture(scope="session")
def trained(csv_path, tmp_path_factory):
    directory = tmp_path_factory.mktemp("artifacts") / "run"
    report = train(csv_path, directory)
    return directory, report


def test_history_and_temporal_split(csv_path):
    history = load_history(csv_path)
    assert set(history.shift_code) == set(SHIFTS)
    features, keys, baseline = training_examples(history)
    assert list(features) == FEATURES
    assert len(features) == 84 * 3
    assert np.isfinite(features.to_numpy()).all()
    assert len(baseline) == len(keys)
    assert (keys.forecast_origin.dt.dayofweek == 0).all()
    assert ((keys.shift_date - keys.forecast_origin).dt.days.between(0, 6)).all()


def test_target_week_and_future_data_cannot_leak_into_features(csv_path):
    history = load_history(csv_path)
    origin = pd.Timestamp("2026-06-01")
    before, keys, baseline = features_for_week(history, "VN0485", origin, ["VN0485"])
    changed = history.copy()
    future = changed.shift_date.ge(origin)
    for column in ("shift_revenue_vnd", "shift_foot_traffic", "ideal_staff_count", "assigned_staff_count"):
        changed.loc[future, column] = 999999
    changed.loc[future, "is_holiday"] = True
    changed.loc[future, "has_extreme_weather"] = True
    after, after_keys, after_baseline = features_for_week(changed, "VN0485", origin, ["VN0485"])
    pd.testing.assert_frame_equal(before, after)
    pd.testing.assert_frame_equal(keys, after_keys)
    np.testing.assert_array_equal(baseline, after_baseline)
    # Also insensitive to target-week rows being completely unavailable.
    truncated, _, _ = features_for_week(history[history.shift_date.lt(origin)], "VN0485", origin, ["VN0485"])
    pd.testing.assert_frame_equal(before, truncated)


def test_assigned_staffing_is_neither_label_nor_feature(csv_path):
    history = load_history(csv_path)
    before, labels, baseline = training_examples(history)
    history["assigned_staff_count"] = 10000
    after, after_labels, after_baseline = training_examples(history)
    pd.testing.assert_frame_equal(before, after)
    pd.testing.assert_frame_equal(labels, after_labels)
    np.testing.assert_array_equal(baseline, after_baseline)


@pytest.mark.parametrize("case", ["real", "mixed", "duplicate", "missing_shift", "wrong_day", "unknown_shift", "infinite", "negative", "fraction", "missing_column", "bad_date"])
def test_reject_invalid_history(csv_path, tmp_path, case):
    frame = pd.read_csv(csv_path)
    if case == "real":
        frame["is_mock_data"] = False
    elif case == "mixed":
        frame.loc[0, "is_mock_data"] = False
    elif case == "duplicate":
        frame = pd.concat([frame, frame.iloc[:1]])
    elif case == "missing_shift":
        frame = frame.iloc[1:]
    elif case == "wrong_day":
        frame.loc[0, "day_of_week"] = 0
    elif case == "unknown_shift":
        frame.loc[0, "shift_type"] = "ANY"
    elif case == "infinite":
        frame["shift_revenue_vnd"] = float("inf")
    elif case == "negative":
        frame.loc[0, "ideal_staff_count"] = -1
    elif case == "fraction":
        frame["ideal_staff_count"] = 1.5
    elif case == "missing_column":
        frame = frame.drop(columns="ideal_staff_count")
    elif case == "bad_date":
        frame.loc[0, "shift_date"] = "2026-02-30"
    path = tmp_path / "invalid.csv"
    frame.to_csv(path, index=False)
    with pytest.raises(ValueError):
        load_history(path)


def test_training_report_and_reload(trained):
    directory, report = trained
    assert report["training_last_date"] < report["holdout_first_date"]
    assert report["lightgbm"]["rows"] == 84
    assert report["production_ready"] is False
    assert np.isfinite(report["lightgbm"]["mae"])
    predictor = Predictor(directory)
    output = predictor.predict_week("VN0485", predictor.origin.date())
    assert len(output["predictions"]) == 21
    assert output["is_mock_data"] is True
    assert output["production_ready"] is False
    assert {row["shift_code"] for row in output["predictions"]} == set(SHIFTS)
    assert len({(row["shift_date"], row["shift_code"]) for row in output["predictions"]}) == 21
    assert all(row["predicted_staff_count"] >= 0 for row in output["predictions"])
    assert output == Predictor(directory).predict_week("VN0485", predictor.origin.date())


def test_training_is_repeatable_and_never_overwrites(csv_path, trained, tmp_path):
    directory, report = trained
    second = tmp_path / "second-run"
    assert train(csv_path, second) == report
    assert (second / "model.txt").read_bytes() == (directory / "model.txt").read_bytes()
    with pytest.raises(ValueError, match="already exists"):
        train(csv_path, directory)


def test_api_success_and_rejections(trained):
    directory, _ = trained
    origin = json.loads((directory / "metadata.json").read_text())["forecast_origin"]
    body = {"store_id": "VN0485", "start_date": origin}
    with TestClient(create_app(directory)) as client:
        assert client.get("/health").json()["ready"] is True
        response = client.post("/predict-weekly-demand", json=body)
        assert response.status_code == 200
        assert len(response.json()["predictions"]) == 21
        assert response.json()["production_ready"] is False
        for invalid in (
            {**body, "store_id": "OTHER"}, {**body, "start_date": "2030-01-01"},
            {**body, "start_date": "not-a-date"}, {**body, "model_dir": "../../"},
            {**body, "shift_revenue_vnd": 10000000},
        ):
            assert client.post("/predict-weekly-demand", json=invalid).status_code == 422
        assert client.post("/train").status_code == 404


def test_missing_artifact_returns_503(tmp_path):
    with TestClient(create_app(tmp_path)) as client:
        assert client.get("/health").json()["ready"] is False
        response = client.post("/predict-weekly-demand", json={"store_id": "VN0485", "start_date": "2026-09-28"})
        assert response.status_code == 503


def test_corrupt_artifact_fails_closed(trained, tmp_path):
    directory, _ = trained
    corrupt = tmp_path / "corrupt"
    shutil.copytree(directory, corrupt)
    with (corrupt / "history.csv").open("a") as stream:
        stream.write("\n")
    with pytest.raises(ValueError, match="checksum"):
        Predictor(corrupt)
    with TestClient(create_app(corrupt)) as client:
        assert client.get("/health").json()["ready"] is False


def test_store_history_is_isolated(csv_path):
    history = load_history(csv_path)
    second = history.copy()
    second["store_id"] = "VN9999"
    second["shift_revenue_vnd"] = 999999999
    multi = pd.concat([history, second])
    origin = pd.Timestamp("2026-06-01")
    actual, _, _ = features_for_week(multi, "VN0485", origin, ["VN0485", "VN9999"])
    expected, _, _ = features_for_week(history, "VN0485", origin, ["VN0485"])
    pd.testing.assert_frame_equal(actual, expected)
