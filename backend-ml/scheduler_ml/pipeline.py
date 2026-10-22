"""Local training, chronological evaluation and native LightGBM artifacts."""

import hashlib
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from .data import FEATURES, FEATURE_VERSION, features_for_week, load_history, training_examples

PARAMETERS = {
    "objective": "regression_l1", "metric": "mae", "num_leaves": 7,
    "learning_rate": 0.05, "min_data_in_leaf": 15, "verbosity": -1,
    "seed": 12345, "deterministic": True, "force_col_wise": True, "num_threads": 1,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def staff_counts(values):
    values = np.asarray(values, dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Model returned non-finite predictions.")
    # Rounding is for demo display only, not an operational staffing constraint.
    return np.maximum(0, np.floor(values + 0.5)).astype(int)


def metrics(expected, predicted) -> dict:
    expected, predicted = np.asarray(expected), np.asarray(predicted)
    rounded = staff_counts(predicted)
    return {
        "mae": float(np.abs(expected - predicted).mean()),
        "rounded_mae": float(np.abs(expected - rounded).mean()),
        "underprediction_rate": float((rounded < expected).mean()),
        "rows": len(expected),
    }


def fit(features, labels):
    dataset = lgb.Dataset(features, label=labels, categorical_feature=["store_index", "shift_index", "day_of_week"])
    return lgb.train(PARAMETERS, dataset, num_boost_round=100)


def train(csv_path: str | Path, output: str | Path) -> dict:
    output = Path(output)
    if output.exists():
        raise ValueError("Output already exists; choose a new run directory.")
    history = load_history(csv_path)
    features, keys, baseline = training_examples(history)
    # Last four whole weeks are untouched by fitting or hyperparameter tuning.
    holdout_start = history.shift_date.max() - pd.Timedelta(days=27)
    train_mask = keys.shift_date.lt(holdout_start)
    test_mask = ~train_mask
    evaluation_model = fit(features[train_mask], keys.loc[train_mask, "ideal_staff_count"])
    predictions = evaluation_model.predict(features[test_mask], num_threads=1)
    expected = keys.loc[test_mask, "ideal_staff_count"].to_numpy()
    model_metrics = metrics(expected, predictions)
    baseline_metrics = metrics(expected, baseline[test_mask.to_numpy()])
    report = {
        "is_mock_data": True, "production_ready": False,
        "evaluation": "four-week rolling-origin holdout; features frozen at each Monday; model fixed",
        "training_last_date": keys.loc[train_mask, "shift_date"].max().date().isoformat(),
        "holdout_first_date": holdout_start.date().isoformat(),
        "holdout_last_date": history.shift_date.max().date().isoformat(),
        "training_rows": int(train_mask.sum()), "lightgbm": model_metrics,
        "baseline_same_weekday_shift_median_28d": baseline_metrics,
        "beats_baseline_mae": model_metrics["mae"] < baseline_metrics["mae"],
        "label_distribution": {str(int(k)): int(v) for k, v in history.ideal_staff_count.value_counts().sort_index().items()},
        "notes": [
            "Synthetic threshold labels do not validate real store demand.",
            "Each validation week may use observed history from earlier validation weeks.",
            "No actual target-week revenue, weather, holiday flags or assigned staffing are input features.",
            "Serving model is refitted on all available examples AFTER evaluation.",
            "No confidence or match probability is estimated.",
        ],
    }
    final_model = fit(features, keys.ideal_staff_count)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=".ml-run-", dir=output.parent))
    try:
        final_model.save_model(str(temporary / "model.txt"))
        history.drop(columns="shift_code").to_csv(temporary / "history.csv", index=False, date_format="%Y-%m-%d")
        metadata = {
            "feature_version": FEATURE_VERSION, "features": FEATURES,
            "stores": sorted(history.store_id.unique()),
            "is_mock_data": True, "production_ready": False, "source": "mock_lightgbm",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "history_last_date": history.shift_date.max().date().isoformat(),
            "forecast_origin": (history.shift_date.max() + pd.Timedelta(days=1)).date().isoformat(),
            "model_sha256": sha256(temporary / "model.txt"), "history_sha256": sha256(temporary / "history.csv"),
            "source_csv_sha256": sha256(Path(csv_path)), "parameters": PARAMETERS, "boost_rounds": 100,
        }
        metadata["model_version"] = f"mock-{metadata['model_sha256'][:12]}"
        for name, data in (("metadata.json", metadata), ("evaluation.json", report)):
            (temporary / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.rename(output)
    except BaseException:
        shutil.rmtree(temporary)
        raise
    return report


class Predictor:
    def __init__(self, directory: str | Path):
        directory = Path(directory)
        self.metadata = json.loads((directory / "metadata.json").read_text(encoding="utf-8"))
        meta = self.metadata
        if (meta.get("feature_version") != FEATURE_VERSION or meta.get("features") != FEATURES
                or meta.get("is_mock_data") is not True or meta.get("production_ready") is not False):
            raise ValueError("Incompatible model metadata.")
        for name in ("model", "history"):
            filename = directory / ("model.txt" if name == "model" else "history.csv")
            if sha256(filename) != meta.get(f"{name}_sha256"):
                raise ValueError("Artifact checksum mismatch.")
        self.history = load_history(directory / "history.csv")
        self.origin = self.history.shift_date.max() + pd.Timedelta(days=1)
        if (meta.get("forecast_origin") != self.origin.date().isoformat()
                or meta.get("history_last_date") != self.history.shift_date.max().date().isoformat()
                or meta.get("stores") != sorted(self.history.store_id.unique()) or self.origin.dayofweek != 0):
            raise ValueError("History and forecast metadata disagree.")
        self.model = lgb.Booster(model_file=str(directory / "model.txt"))
        if self.model.feature_name() != FEATURES:
            raise ValueError("Model feature contract mismatch.")

    def predict_week(self, store_id: str, start_date) -> dict:
        if pd.Timestamp(start_date) != self.origin:
            raise ValueError(f"This run only forecasts the week starting {self.origin.date()}; refresh history and retrain for another week.")
        features, keys, _ = features_for_week(self.history, store_id, self.origin, self.metadata["stores"])
        raw = self.model.predict(features, num_threads=1)
        counts = staff_counts(raw)
        return {
            "source": "mock_lightgbm", "is_mock_data": True, "production_ready": False,
            "model_version": self.metadata["model_version"],
            "history_last_date": self.metadata["history_last_date"],
            "forecast_origin": self.metadata["forecast_origin"],
            "predictions": [
                {"store_id": row.store_id, "shift_date": row.shift_date.date().isoformat(),
                 "shift_code": row.shift_code, "predicted_staff_count": int(count),
                 "raw_prediction": float(value)}
                for row, count, value in zip(keys.itertuples(index=False), counts, raw)
            ],
        }
