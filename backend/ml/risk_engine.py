import math


def _safe_float(value, default=0.0):
    """
    Safely convert a value to float.
    """
    try:
        if value is None:
            return default

        value = float(value)

        if not math.isfinite(value):
            return default

        return value

    except (TypeError, ValueError):
        return default


def _clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, value))


def calculate_risk(
    anomaly_score=0.0,
    tilt_change_deg=0.0,
    accel_deviation_g=0.0,
    vibration_events=0,
    node_tilt_difference=0.0,
    node_fsr_difference=0.0,
    fsr_raw=0.0,
):
    """
    Combine AI anomaly detection with interpretable
    sensor indicators.

    This is a prototype risk-ranking engine.

    It is NOT a calibrated mine-safety threshold model.
    Real mine data is required for final calibration.
    """

    # =========================================================
    # SAFE INPUTS
    # =========================================================

    anomaly_score = _safe_float(anomaly_score)

    tilt_change_deg = _safe_float(tilt_change_deg)

    accel_deviation_g = _safe_float(
        accel_deviation_g
    )

    vibration_events = _safe_float(
        vibration_events
    )

    node_tilt_difference = _safe_float(
        node_tilt_difference
    )

    node_fsr_difference = _safe_float(
        node_fsr_difference
    )

    fsr_raw = _safe_float(
        fsr_raw
    )

    # =========================================================
    # NORMALIZE INDIVIDUAL SIGNALS
    # =========================================================

    # Tilt:
    # 8 degrees is treated as strong evidence.
    tilt_score = _clamp(
        abs(tilt_change_deg) / 8.0 * 100.0
    )

    # Acceleration:
    # 0.20 g deviation is treated as strong evidence.
    accel_score = _clamp(
        abs(accel_deviation_g) / 0.20 * 100.0
    )

    # Vibration:
    # 4 events is treated as strong evidence.
    vibration_score = _clamp(
        vibration_events / 4.0 * 100.0
    )

    # Difference between Node 1 and Node 2 tilt.
    node_tilt_score = _clamp(
        abs(node_tilt_difference) / 5.0 * 100.0
    )

    # Difference between Node 1 and Node 2 FSR.
    node_fsr_score = _clamp(
        abs(node_fsr_difference) / 250.0 * 100.0
    )

    # FSR is weak supporting evidence.
    fsr_score = _clamp(
        abs(fsr_raw) / 700.0 * 100.0
    )

    # =========================================================
    # WEIGHTED RISK SCORE
    # =========================================================

    risk_score = (
        0.45 * anomaly_score
        + 0.18 * tilt_score
        + 0.12 * accel_score
        + 0.08 * vibration_score
        + 0.08 * node_tilt_score
        + 0.06 * node_fsr_score
        + 0.03 * fsr_score
    )

    risk_score = _clamp(risk_score)

    # =========================================================
    # RISK LEVEL
    # =========================================================

    if risk_score >= 75:
        risk = "CRITICAL"

    elif risk_score >= 45:
        risk = "WARNING"

    else:
        risk = "NORMAL"

    # =========================================================
    # FIND IMPORTANT CONTRIBUTORS
    # =========================================================

    evidence = {
        "AI anomaly": anomaly_score,
        "Tilt change": tilt_score,
        "Acceleration deviation": accel_score,
        "Vibration": vibration_score,
        "Node tilt difference": node_tilt_score,
        "Node FSR difference": node_fsr_score,
        "FSR": fsr_score,
    }

    contributors = [
        name
        for name, score in sorted(
            evidence.items(),
            key=lambda item: item[1],
            reverse=True
        )
        if score >= 40
    ]

    # Limit to the strongest contributors.
    contributors = contributors[:3]

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "risk": risk,
        "risk_score": round(
            risk_score,
            2
        ),
        "contributors": contributors,

        "evidence": {
            key: round(value, 2)
            for key, value in evidence.items()
        }
    }