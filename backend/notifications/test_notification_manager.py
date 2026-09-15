from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import Alert
from notifications.notification_manager import dispatch_alert, preview_notification


def main():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    alert = Alert(
        node_id="MINE_SITE",
        severity="CRITICAL",
        event_type="ALERT",
        message="Test critical event.",
        risk_score=88.0,
        anomaly_score=94.0,
        contributors_json='["AI anomaly", "Tilt change"]',
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    preview = preview_notification(alert)
    assert len(preview) == 3
    assert all(item["status"] == "PREVIEW_ONLY" for item in preview)

    sent = dispatch_alert(db, alert)
    assert len(sent) == 3
    assert all(item.status == "MOCKED" for item in sent)

    repeated = dispatch_alert(db, alert)
    assert repeated == []

    print("Notification manager tests passed.")


if __name__ == "__main__":
    main()
