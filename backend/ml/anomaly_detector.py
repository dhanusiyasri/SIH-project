from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "artifacts" / "isolation_forest.joblib"


# Load trained model
model = joblib.load(MODEL_PATH)


def score_dataframe(features: pd.DataFrame) -> pd.DataFrame:
    """
    Run the trained Isolation Forest model.

    Input:
        Feature dataframe

    Output:
        Original dataframe +:
        - anomaly_raw
        - anomaly_score
        - anomaly_label
    """

    if features.empty:
        result = features.copy()

        result["anomaly_raw"] = []
        result["anomaly_score"] = []
        result["anomaly_label"] = []

        return result

    # ---------------------------------------------------------
    # Select the exact features expected by the trained model
    # ---------------------------------------------------------

    if hasattr(model, "feature_names_in_"):
        expected_features = list(model.feature_names_in_)

        X = features.reindex(
            columns=expected_features,
            fill_value=0
        )

    else:
        X = features.copy()

    # ---------------------------------------------------------
    # Convert everything to numeric
    # ---------------------------------------------------------

    X = X.apply(
        pd.to_numeric,
        errors="coerce"
    )

    X = X.replace(
        [np.inf, -np.inf],
        np.nan
    )

    X = X.fillna(0)

    # ---------------------------------------------------------
    # Isolation Forest
    # ---------------------------------------------------------

    raw_score = model.decision_function(X)

    prediction = model.predict(X)

    # sklearn:
    #  1  = normal
    # -1  = anomaly

    anomaly_label = np.where(
        prediction == -1,
        "ANOMALY",
        "NORMAL"
    )

    # ---------------------------------------------------------
    # Convert raw score to 0-100
    #
    # Higher score = more anomalous
    # ---------------------------------------------------------

    anomaly_score = np.clip(
        ((-raw_score) + 0.10) / 0.20 * 100,
        0,
        100
    )

    # ---------------------------------------------------------
    # Return dataframe
    # ---------------------------------------------------------

    result = features.copy()

    result["anomaly_raw"] = raw_score

    result["anomaly_score"] = anomaly_score

    result["anomaly_label"] = anomaly_label

    return result