import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import Notification


NOTIFICATION_MODE = os.getenv("NOTIFICATION_MODE", "MOCK").upper()
DEFAULT_CHANNELS = ("DASHBOARD", "EMAIL", "SMS")


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _recipient(channel: str) -> str | None:
    values = {
        "EMAIL": os.getenv("ALERT_EMAIL", "demo@example.com"),
        "SMS": os.getenv("ALERT_PHONE", "+91XXXXXXXXXX"),
        "DASHBOARD": "dashboard",
    }
    return values.get(channel)


def build_notification_message(alert) -> str:
    prefix = f"[{alert.severity}] {alert.node_id}"
    if alert.event_type == "RECOVERY":
        return f"{prefix}: {alert.message}"
    return f"{prefix}: {alert.message} Risk score={float(alert.risk_score or 0):.1f}."


def _already_logged(db: Session, alert_id: int, channel: str) -> bool:
    return (
        db.query(Notification)
        .filter(
            Notification.alert_id == alert_id,
            Notification.channel == channel,
        )
        .first()
        is not None
    )


def dispatch_alert(db: Session, alert, channels=DEFAULT_CHANNELS):
    """Create notification delivery records without external side effects in MOCK mode.

    The dispatcher is intentionally provider-agnostic. Real email/SMS providers
    can be added later without changing Alert Manager or the dashboard.
    """
    results = []
    message = build_notification_message(alert)

    for channel in channels:
        channel = str(channel).upper()
        if _already_logged(db, alert.id, channel):
            continue

        if NOTIFICATION_MODE == "MOCK":
            notification = Notification(
                alert_id=alert.id,
                channel=channel,
                recipient=_recipient(channel),
                provider="MOCK",
                status="MOCKED",
                message=message,
                created_at=utc_now(),
                sent_at=utc_now(),
            )
        else:
            # Fail closed until a real provider is deliberately configured.
            notification = Notification(
                alert_id=alert.id,
                channel=channel,
                recipient=_recipient(channel),
                provider="UNCONFIGURED",
                status="NOT_SENT",
                message=message,
                created_at=utc_now(),
                error="Real notification providers are not configured; no external message was sent.",
            )

        db.add(notification)
        results.append(notification)

    db.commit()
    return results


def dispatch_alerts(db: Session, alerts, channels=DEFAULT_CHANNELS):
    all_results = []
    for alert in alerts:
        all_results.extend(dispatch_alert(db, alert, channels=channels))
    return all_results


def serialize_notification(notification):
    return {
        "id": notification.id,
        "alert_id": notification.alert_id,
        "channel": notification.channel,
        "recipient": notification.recipient,
        "provider": notification.provider,
        "status": notification.status,
        "message": notification.message,
        "created_at": notification.created_at.isoformat() + "Z" if notification.created_at else None,
        "sent_at": notification.sent_at.isoformat() + "Z" if notification.sent_at else None,
        "error": notification.error,
    }


def preview_notification(alert, channels=DEFAULT_CHANNELS):
    """Return a side-effect-free preview for testing the notification workflow."""
    message = build_notification_message(alert)
    return [
        {
            "channel": str(channel).upper(),
            "recipient": _recipient(str(channel).upper()),
            "provider": "MOCK",
            "status": "PREVIEW_ONLY",
            "message": message,
        }
        for channel in channels
    ]
