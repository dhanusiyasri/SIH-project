"""Train the first unsupervised anomaly baseline from gateway_readings."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

from .feature_engineering import build_features, model_matrix

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "sensor_data.db"
MODEL_DIR = BASE_DIR / "ml" / "artifacts"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"
FEATURE_CSV = MODEL_DIR / "training_features.csv"


def load_data() -> pd.DataFrame:
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found: {DB_PATH}. Run the API/simulator first "
            "or copy the project's sensor_data.db into backend/."
        )
    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql_query(
            "SELECT * FROM gateway_readings ORDER BY server_timestamp", conn
        )


def main() -> None:
    raw = load_data()
    if raw.empty:
        raise RuntimeError("gateway_readings is empty; collect data before training.")

    features = build_features(raw)
    X = model_matrix(features)

    # Use the earliest 70% as the training period to avoid future leakage.
    split = max(10, int(len(X) * 0.70))
    train_X = X.iloc[:split]
    test_X = X.iloc[split:]

    # Train primarily on readings labelled NORMAL by the current edge-rule
    # system. These labels are simulator/edge labels, not mine ground truth.
    normal_mask = (
        features.iloc[:split]["edge_risk"].astype(str).str.upper() == "NORMAL"
    ).to_numpy()
    normal_train = train_X.loc[normal_mask]
    if len(normal_train) < 20:
        normal_train = train_X

    model = Pipeline(
        [
            ("scaler", RobustScaler()),
            (
                "isolation_forest",
                IsolationForest(
                    n_estimators=250,
                    contamination="auto",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(normal_train)

    # IsolationForest: decision_function > 0 is more normal. Convert to a
    # 0-100 anomaly score where larger means more anomalous.
    decision = model.decision_function(test_X)
    anomaly_score = pd.Series(-decision, index=test_X.index)

    result = features.iloc[split:][["server_timestamp", "edge_risk"]].copy()
    result["anomaly_score_raw"] = anomaly_score.values

    # A data-driven percentile score is more stable than exposing raw IF values.
    train_decision = model.decision_function(train_X)
    low = float(pd.Series(-train_decision).quantile(0.50))
    high = float(pd.Series(-train_decision).quantile(0.99))
    if high <= low:
        high = low + 1e-6
    result["anomaly_score_0_100"] = (
        (result["anomaly_score_raw"] - low) / (high - low) * 100
    ).clip(0, 100)

    result["edge_abnormal"] = (
        result["edge_risk"].astype(str).str.upper() != "NORMAL"
    )

    # Detection quality is only a diagnostic against simulator-generated edge
    # labels. It is not a validation against confirmed mine subsidence.
    predicted = result["anomaly_score_0_100"] >= 70
    truth = result["edge_abnormal"]

    print("Rows:", len(raw))
    print("Training rows:", len(train_X))
    print("Normal rows used for training:", len(normal_train))
    print("Test rows:", len(test_X))
    print("\nConfusion matrix against edge-risk labels:")
    print(confusion_matrix(truth, predicted, labels=[False, True]))
    print("\nDiagnostic classification report:")
    print(
        classification_report(
            truth,
            predicted,
            labels=[False, True],
            target_names=["NORMAL", "EDGE_ABNORMAL"],
            zero_division=0,
        )
    )

    joblib.dump(model, MODEL_PATH)
    FEATURE_CSV.parent.mkdir(parents=True, exist_ok=True)
    features.assign(
        **{c: X[c] for c in X.columns}
    ).to_csv(FEATURE_CSV, index=False)

    metadata = {
        "model": "IsolationForest",
        "purpose": "unsupervised sensor anomaly detection baseline",
        "trained_rows": int(len(normal_train)),
        "total_rows": int(len(raw)),
        "feature_count": int(X.shape[1]),
        "features": X.columns.tolist(),
        "score_threshold_for_dashboard": 70,
        "note": "Current edge_risk labels are simulator/firmware rule outputs, not confirmed mine-event ground truth.",
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"\nSaved model: {MODEL_PATH}")
    print(f"Saved features: {FEATURE_CSV}")
    print(f"Saved metadata: {METADATA_PATH}")


if __name__ == "__main__":
    main()
