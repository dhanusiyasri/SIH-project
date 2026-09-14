"""Feature engineering for mine subsidence sensor data.

The functions operate on gateway_readings and create time-aware features
for Node 1, Node 2, and their cross-node differences.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


BASE_FEATURES = [
    "n1_tilt",
    "n1_tilt_rate",
    "n1_accel_deviation",
    "n1_accel_change",
    "n1_gyro",
    "n1_fsr",
    "n1_fsr_change",
    "n1_vibration",
    "n1_vibration_events",
    "n1_shock",
    "n1_tilt_flag",
    "n1_pressure_flag",
    "n1_sudden_pressure_flag",
    "n2_tilt",
    "n2_tilt_rate",
    "n2_accel_deviation",
    "n2_accel_change",
    "n2_gyro",
    "n2_fsr",
    "n2_fsr_change",
    "n2_vibration",
    "n2_vibration_events",
    "node_tilt_difference",
    "node_accel_difference",
    "node_fsr_difference",
    "node_gyro_difference",
    "node_vibration_difference",
    "node_data_available",
]


def _numeric(df: pd.DataFrame, column: str) -> pd.Series:
    if column not in df:
        return pd.Series(np.nan, index=df.index, dtype=float)
    return pd.to_numeric(df[column], errors="coerce")


def build_features(df: pd.DataFrame, rolling_window: int = 5) -> pd.DataFrame:
    """Build robust time-series features from raw gateway readings."""
    out = df.copy()

    out["server_timestamp"] = pd.to_datetime(
        out["server_timestamp"], errors="coerce", utc=True
    )
    out = out.sort_values("server_timestamp").reset_index(drop=True)

    # Node 1 raw signals
    out["n1_tilt"] = _numeric(out, "node1_tilt_change_deg")
    out["n1_accel_deviation"] = _numeric(out, "node1_accel_deviation_g")
    out["n1_accel"] = _numeric(out, "node1_accel_magnitude_g")
    out["n1_gyro"] = _numeric(out, "node1_gyro_magnitude_dps")
    out["n1_fsr"] = _numeric(out, "node1_fsr_raw")
    out["n1_vibration"] = _numeric(out, "node1_vibration").fillna(0)
    out["n1_vibration_events"] = _numeric(out, "node1_vibration_events").fillna(0)

    # Node 2 raw signals. It is valid only when the gateway says it is online.
    n2_online = _numeric(out, "node2_online").fillna(0).astype(int)
    out["n2_tilt"] = np.where(
        n2_online == 1,
        np.maximum(
            _numeric(out, "node2_roll_deg").abs(),
            _numeric(out, "node2_pitch_deg").abs(),
        ),
        np.nan,
    )
    out["n2_accel"] = np.where(
        n2_online == 1, _numeric(out, "node2_accel_magnitude_g"), np.nan
    )
    out["n2_gyro"] = np.where(
        n2_online == 1, _numeric(out, "node2_gyro_magnitude_dps"), np.nan
    )
    out["n2_fsr"] = np.where(
        n2_online == 1, _numeric(out, "node2_fsr_raw"), np.nan
    )
    out["n2_vibration"] = np.where(
        n2_online == 1, _numeric(out, "node2_vibration"), np.nan
    )
    out["n2_vibration_events"] = np.where(
        n2_online == 1, _numeric(out, "node2_vibration_events"), np.nan
    )

    # Time delta in seconds. Clip extreme gaps so a disconnected interval
    # does not create misleading rates.
    dt = out["server_timestamp"].diff().dt.total_seconds()
    dt = dt.replace(0, np.nan).clip(lower=0.01, upper=60.0)

    # First-order temporal changes/rates.
    out["n1_tilt_rate"] = out["n1_tilt"].diff() / dt
    out["n1_accel_change"] = out["n1_accel"].diff()
    out["n1_fsr_change"] = out["n1_fsr"].diff()

    out["n2_tilt_rate"] = out["n2_tilt"].diff() / dt
    out["n2_accel_change"] = out["n2_accel"].diff()
    out["n2_fsr_change"] = out["n2_fsr"].diff()

    # Gateway does not transmit Node 2's derived accel deviation, so derive it
    # against the physical 1g reference used by the firmware.
    out["n2_accel_deviation"] = (out["n2_accel"] - 1.0).abs()

    # Edge indicators are useful contextual features, but not the target.
    out["n1_shock"] = (
        _numeric(out, "node1_accel_deviation_g") > 0.20
    ).astype(float)
    out["n1_tilt_flag"] = (
        _numeric(out, "node1_tilt_change_deg").abs() > 8.0
    ).astype(float)
    out["n1_pressure_flag"] = 0.0
    out["n1_sudden_pressure_flag"] = 0.0

    # Cross-node features. Absolute differences are easier for the baseline
    # model to learn than signed differences.
    out["node_tilt_difference"] = (
        out["n1_tilt"] - out["n2_tilt"]
    ).abs()
    out["node_accel_difference"] = (
        out["n1_accel"] - out["n2_accel"]
    ).abs()
    out["node_fsr_difference"] = (
        out["n1_fsr"] - out["n2_fsr"]
    ).abs()
    out["node_gyro_difference"] = (
        out["n1_gyro"] - out["n2_gyro"]
    ).abs()
    out["node_vibration_difference"] = (
        out["n1_vibration_events"] - out["n2_vibration_events"]
    ).abs()
    out["node_data_available"] = n2_online.astype(float)

    # Rolling stability features. These are useful later for a stronger model.
    for col in [
        "n1_tilt",
        "n1_accel_deviation",
        "n1_fsr",
        "n1_vibration_events",
        "n2_tilt",
        "n2_accel_deviation",
        "n2_fsr",
        "n2_vibration_events",
    ]:
        out[f"{col}_rolling_mean"] = out[col].rolling(
            rolling_window, min_periods=2
        ).mean()
        out[f"{col}_rolling_std"] = out[col].rolling(
            rolling_window, min_periods=2
        ).std()

    return out


def model_matrix(features: pd.DataFrame) -> pd.DataFrame:
    """Return numeric, finite model features with safe imputation."""
    cols = [c for c in BASE_FEATURES if c in features.columns]
    # Include rolling features automatically.
    cols += [
        c for c in features.columns
        if c.endswith("_rolling_mean") or c.endswith("_rolling_std")
    ]
    cols = list(dict.fromkeys(cols))

    X = features[cols].copy()
    X = X.replace([np.inf, -np.inf], np.nan)

    # Time-series interpolation followed by column medians.
    X = X.interpolate(limit_direction="both")
    X = X.fillna(X.median(numeric_only=True))
    X = X.fillna(0.0)
    return X.astype(float)
