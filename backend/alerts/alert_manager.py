import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import Alert


SEVERITY_ORDER = {
    "NORMAL": 0,
    "WARNING": 1,
    "OFFLINE": 2,
    "CRITICAL": 3,
}


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _site_message(level, risk_score, contributors):
    if level == "CRITICAL":
        return f"Critical site risk detected (risk score {risk_score:.1f})."
    if level == "WARNING":
        return f"Warning site risk detected (risk score {risk_score:.1f})."
    return "Site risk returned to normal."


def _create_alert(
    db: Session,
    *,
    node_id: str,
    level: str,
    event_type: str,
    message: str,
    risk_score: float = 0.0,
    anomaly_score: float = 0.0,
    contributors=None,
    previous_level=None,
    timestamp=None,
    resolved=False,
):
    alert = Alert(
        node_id=node_id,
        severity=level,
        event_type=event_type,
        message=message,
        risk_score=float(risk_score),
        anomaly_score=float(anomaly_score),
        contributors_json=json.dumps(contributors or []),
        previous_severity=previous_level,
        created_at=timestamp or utc_now(),
        acknowledged=False,
        resolved=resolved,
        resolved_at=(timestamp or utc_now()) if resolved else None,
    )
    db.add(alert)
    db.flush()
    return alert


def _resolve_open_alerts(db: Session, node_id: str, when):
    open_alerts = (
        db.query(Alert)
        .filter(Alert.node_id == node_id, Alert.resolved.is_(False))
        .all()
    )
    for alert in open_alerts:
        alert.resolved = True
        alert.resolved_at = when
    return open_alerts


def sync_alerts(
    db: Session,
    *,
    ai_result,
    latest_gateway,
):
    """Synchronize persistent alerts with the latest AI/risk state.

    This module does not calculate AI or risk. It only consumes the already
    calculated result and creates deduplicated state-change/recovery records.
    """
    if ai_result is None or latest_gateway is None:
        return []

    timestamp = latest_gateway.server_timestamp or utc_now()
    risk = str(ai_result.get("ai_risk", "NORMAL")).upper()
    risk_score = float(ai_result.get("risk_score", 0) or 0)
    anomaly_score = float(ai_result.get("anomaly_score", 0) or 0)
    contributors = ai_result.get("contributors", []) or []

    created_or_current = []

    # ---------------------------------------------------------
    # SITE RISK ALERT
    # ---------------------------------------------------------
    site_node = "MINE_SITE"
    open_site = (
        db.query(Alert)
        .filter(Alert.node_id == site_node, Alert.resolved.is_(False))
        .order_by(Alert.created_at.desc())
        .first()
    )

    if risk in ("WARNING", "CRITICAL"):
        if open_site and open_site.severity == risk and open_site.event_type == "ALERT":
            created_or_current.append(open_site)
        else:
            previous = open_site.severity if open_site else None
            _resolve_open_alerts(db, site_node, timestamp)
            alert = _create_alert(
                db,
                node_id=site_node,
                level=risk,
                event_type="ALERT",
                message=_site_message(risk, risk_score, contributors),
                risk_score=risk_score,
                anomaly_score=anomaly_score,
                contributors=contributors,
                previous_level=previous,
                timestamp=timestamp,
            )
            created_or_current.append(alert)
    else:
        if open_site:
            previous = open_site.severity
            _resolve_open_alerts(db, site_node, timestamp)
            recovery = _create_alert(
                db,
                node_id=site_node,
                level="NORMAL",
                event_type="RECOVERY",
                message=f"Site risk recovered from {previous} to NORMAL.",
                risk_score=risk_score,
                anomaly_score=anomaly_score,
                contributors=contributors,
                previous_level=previous,
                timestamp=timestamp,
                resolved=True,
            )
            created_or_current.append(recovery)

    # ---------------------------------------------------------
    # NODE 2 COMMUNICATION ALERT
    # ---------------------------------------------------------
    node2_online = bool(latest_gateway.node2_online)
    node2 = "NODE_02"
    open_node = (
        db.query(Alert)
        .filter(Alert.node_id == node2, Alert.resolved.is_(False))
        .order_by(Alert.created_at.desc())
        .first()
    )

    if not node2_online:
        if not open_node or open_node.severity != "OFFLINE" or open_node.event_type != "ALERT":
            previous = open_node.severity if open_node else None
            _resolve_open_alerts(db, node2, timestamp)
            offline = _create_alert(
                db,
                node_id=node2,
                level="OFFLINE",
                event_type="ALERT",
                message="Node 2 communication is offline.",
                risk_score=risk_score,
                anomaly_score=anomaly_score,
                contributors=["Node 2 communication"],
                previous_level=previous,
                timestamp=timestamp,
            )
            created_or_current.append(offline)
        else:
            created_or_current.append(open_node)
    elif open_node and open_node.severity == "OFFLINE":
        _resolve_open_alerts(db, node2, timestamp)
        recovery = _create_alert(
            db,
            node_id=node2,
            level="NORMAL",
            event_type="RECOVERY",
            message="Node 2 communication recovered.",
            risk_score=risk_score,
            anomaly_score=anomaly_score,
            contributors=["Node 2 communication recovered"],
            previous_level="OFFLINE",
            timestamp=timestamp,
            resolved=True,
        )
        created_or_current.append(recovery)

    db.commit()
    return created_or_current


def serialize_alert(alert):
    try:
        contributors = json.loads(alert.contributors_json or "[]")
    except (TypeError, json.JSONDecodeError):
        contributors = []

    return {
        "id": alert.id,
        "node_id": alert.node_id,
        "severity": alert.severity,
        "event_type": alert.event_type,
        "message": alert.message,
        "risk_score": float(alert.risk_score or 0),
        "anomaly_score": float(alert.anomaly_score or 0),
        "contributors": contributors,
        "previous_severity": alert.previous_severity,
        "created_at": alert.created_at.isoformat() + "Z" if alert.created_at else None,
        "acknowledged": bool(alert.acknowledged),
        "acknowledged_at": alert.acknowledged_at.isoformat() + "Z" if alert.acknowledged_at else None,
        "resolved": bool(alert.resolved),
        "resolved_at": alert.resolved_at.isoformat() + "Z" if alert.resolved_at else None,
    }
