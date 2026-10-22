"""Run with python -m scheduler_ml.train --csv ... --output ..."""

import argparse
import json
from pathlib import Path

from .pipeline import train


def main():
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Train and evaluate a LOCAL MOCK LightGBM staffing model.")
    parser.add_argument("--csv", type=Path, default=root / "ml_mock_history_VN0485.csv")
    parser.add_argument("--output", type=Path, default=root / "backend-ml/models/mock-run")
    args = parser.parse_args()
    try:
        report = train(args.csv, args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Training failed: {error}\n")
    print(json.dumps(report, indent=2))
    print(f"Mock artifacts saved: {args.output}")


if __name__ == "__main__":
    main()
