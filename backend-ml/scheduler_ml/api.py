"""Read-only local API; training stays in the CLI, with no database credentials."""

import logging
import os
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .pipeline import Predictor


class WeeklyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    start_date: date


class Prediction(BaseModel):
    store_id: str
    shift_date: date
    shift_code: Literal["6-14", "14-22", "22-6"]
    predicted_staff_count: int = Field(ge=0)
    raw_prediction: float = Field(allow_inf_nan=False)


class WeeklyResponse(BaseModel):
    source: Literal["mock_lightgbm"]
    is_mock_data: Literal[True]
    production_ready: Literal[False]
    model_version: str
    history_last_date: date
    forecast_origin: date
    predictions: list[Prediction] = Field(min_length=21, max_length=21)


def create_app(model_dir: str | Path | None = None) -> FastAPI:
    directory = Path(model_dir or os.environ.get("ML_MODEL_DIR") or Path(__file__).resolve().parents[1] / "models/mock-run")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.predictor = None
        try:
            app.state.predictor = Predictor(directory)
        except Exception:
            logging.getLogger(__name__).exception("Mock model unavailable; train a valid local artifact first.")
        yield

    app = FastAPI(title="GS25 Mock Demand Worker", version="0.1.0", lifespan=lifespan)

    @app.get("/health")
    def health():
        predictor = app.state.predictor
        return {"ready": predictor is not None, "is_mock_data": True, "production_ready": False,
                "forecast_origin": predictor.metadata["forecast_origin"] if predictor else None}

    @app.post("/predict-weekly-demand", response_model=WeeklyResponse)
    def predict(request: WeeklyRequest):
        if app.state.predictor is None:
            raise HTTPException(503, "Model unavailable. Train local mock artifacts and restart the worker.")
        try:
            return app.state.predictor.predict_week(request.store_id, request.start_date)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error

    return app


app = create_app()
