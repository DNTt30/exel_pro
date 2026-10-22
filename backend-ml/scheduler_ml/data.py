"""Validated mock history and features available at the start of a forecast week."""

from pathlib import Path

import numpy as np
import pandas as pd

SHIFT_ALIASES = {"MORNING": "6-14", "AFTERNOON": "14-22", "NIGHT": "22-6"}
SHIFTS = tuple(SHIFT_ALIASES.values())
FEATURES = [
    "store_index", "shift_index", "day_of_week", "is_weekend", "horizon_day",
    "revenue_previous_week", "revenue_mean_7d", "revenue_mean_28d",
    "weekday_revenue_mean_28d", "traffic_mean_28d",
]
FEATURE_VERSION = "mock-weekly-asof-v1"
REQUIRED = {
    "store_id", "shift_date", "shift_type", "day_of_week", "is_weekend",
    "is_holiday", "has_extreme_weather", "shift_revenue_vnd", "shift_foot_traffic",
    "ideal_staff_count", "assigned_staff_count", "is_mock_data",
}


def load_history(path: str | Path) -> pd.DataFrame:
    frame = pd.read_csv(path, dtype={"store_id": str, "shift_date": str})
    missing = REQUIRED - set(frame.columns)
    if missing:
        raise ValueError(f"Missing CSV columns: {', '.join(sorted(missing))}")
    if frame.empty or frame[list(REQUIRED)].isna().any().any():
        raise ValueError("History must contain complete, non-empty records.")
    if not frame.store_id.str.fullmatch(r"[A-Za-z0-9_-]{1,64}").all():
        raise ValueError("Invalid store_id.")
    for column in ("is_mock_data", "is_weekend", "is_holiday", "has_extreme_weather"):
        values = frame[column].astype(str).str.lower()
        if not values.isin(["true", "false"]).all():
            raise ValueError(f"{column} must be true or false.")
        frame[column] = values.eq("true")
    if not frame.is_mock_data.all():
        raise ValueError("This experimental worker accepts mock data only.")
    if not frame.shift_date.str.fullmatch(r"\d{4}-\d{2}-\d{2}").all():
        raise ValueError("shift_date must use YYYY-MM-DD.")
    frame["shift_date"] = pd.to_datetime(frame.shift_date, format="%Y-%m-%d", errors="raise")
    frame["shift_code"] = frame.shift_type.replace(SHIFT_ALIASES)
    if not frame.shift_code.isin(SHIFTS).all():
        raise ValueError("Unsupported shift_type.")
    for column in ("shift_revenue_vnd", "shift_foot_traffic", "ideal_staff_count", "assigned_staff_count", "day_of_week"):
        frame[column] = pd.to_numeric(frame[column], errors="raise")
        values = frame[column].to_numpy(dtype=float)
        if not np.isfinite(values).all() or (values < 0).any() or (values != np.floor(values)).any():
            raise ValueError(f"{column} must contain finite non-negative integers.")
    # CSV uses JavaScript Sunday=0. Python features use Monday=0.
    if not frame.day_of_week.eq((frame.shift_date.dt.dayofweek + 1) % 7).all():
        raise ValueError("day_of_week does not match shift_date.")
    if not frame.is_weekend.eq(frame.shift_date.dt.dayofweek >= 5).all():
        raise ValueError("is_weekend does not match shift_date.")
    if frame.duplicated(["store_id", "shift_date", "shift_code"]).any():
        raise ValueError("Duplicate store/date/shift records.")
    days = pd.date_range(frame.shift_date.min(), frame.shift_date.max())
    expected = pd.MultiIndex.from_product([sorted(frame.store_id.unique()), days, SHIFTS])
    actual = pd.MultiIndex.from_frame(frame[["store_id", "shift_date", "shift_code"]])
    if len(expected.difference(actual)):
        raise ValueError("Every store must have all three shifts for every history date.")
    return frame.sort_values(["shift_date", "store_id", "shift_code"]).reset_index(drop=True)


def week_origin(day: pd.Timestamp) -> pd.Timestamp:
    return day - pd.Timedelta(days=day.dayofweek)


def features_for_week(history: pd.DataFrame, store_id: str, origin: pd.Timestamp,
                      stores: list[str]) -> tuple[pd.DataFrame, pd.DataFrame, np.ndarray]:
    origin = pd.Timestamp(origin)
    if origin.dayofweek != 0:
        raise ValueError("Forecast origin must be Monday.")
    if store_id not in stores:
        raise ValueError("Unknown store_id.")
    # The same cutoff applies to ALL seven forecast days, including validation.
    past = history[
        history.store_id.eq(store_id)
        & history.shift_date.lt(origin)
        & history.shift_date.ge(origin - pd.Timedelta(days=28))
    ]
    if len(past) != 28 * len(SHIFTS):
        raise ValueError("A complete 28-day history before forecast origin is required.")
    rows, keys, baseline = [], [], []
    for offset in range(7):
        day = origin + pd.Timedelta(days=offset)
        for shift_index, shift in enumerate(SHIFTS):
            shift_past = past[past.shift_code.eq(shift)]
            recent = shift_past[shift_past.shift_date.ge(origin - pd.Timedelta(days=7))]
            weekday = shift_past[shift_past.shift_date.dt.dayofweek.eq(day.dayofweek)]
            previous = shift_past[shift_past.shift_date.eq(day - pd.Timedelta(days=7))]
            rows.append([
                stores.index(store_id), shift_index, day.dayofweek, int(day.dayofweek >= 5), offset,
                float(previous.shift_revenue_vnd.iloc[0]), float(recent.shift_revenue_vnd.mean()),
                float(shift_past.shift_revenue_vnd.mean()), float(weekday.shift_revenue_vnd.mean()),
                float(shift_past.shift_foot_traffic.mean()),
            ])
            keys.append({"store_id": store_id, "shift_date": day, "shift_code": shift, "forecast_origin": origin})
            baseline.append(float(weekday.ideal_staff_count.median()))
    return pd.DataFrame(rows, columns=FEATURES), pd.DataFrame(keys), np.array(baseline)


def training_examples(history: pd.DataFrame):
    stores = sorted(history.store_id.unique())
    first = history.shift_date.min() + pd.Timedelta(days=28)
    last = history.shift_date.max()
    if last.dayofweek != 6:
        raise ValueError("For weekly experiments, history must end on Sunday.")
    origins = pd.date_range(first, last - pd.Timedelta(days=6), freq="W-MON")
    if len(origins) < 8:
        raise ValueError("Need at least eight complete forecast weeks after the 28-day warm-up.")
    feature_sets, key_sets, baselines = [], [], []
    for origin in origins:
        for store_id in stores:
            features, keys, baseline = features_for_week(history, store_id, origin, stores)
            feature_sets.append(features)
            key_sets.append(keys)
            baselines.append(baseline)
    keys = pd.concat(key_sets, ignore_index=True).merge(
        history[["store_id", "shift_date", "shift_code", "ideal_staff_count"]],
        on=["store_id", "shift_date", "shift_code"], how="left", validate="one_to_one", sort=False,
    )
    return pd.concat(feature_sets, ignore_index=True), keys, np.concatenate(baselines)
