"""Small isolated test for alert state transitions.

Run from backend with the project's virtual environment active:
    python alerts/test_alert_manager.py
"""

from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import Alert
from alerts.alert_manager import sync_alerts


class Gateway:
    def __init__(self, risk="NORMAL", online=True):
        self.server_timestamp = datetime(2026, 1, 1, 12, 0, 0)
        self.node2_online = online


def ai(risk, score):
    return {
        "ai_risk": risk,
        "risk_score": score,
        "anomaly_score": score,
        "contributors": ["AI anomaly"] if risk != "NORMAL" else [],
    }


engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

# NORMAL -> no alert
assert sync_alerts(db, ai_result=ai("NORMAL", 10), latest_gateway=Gateway()) == []
assert db.query(Alert).count() == 0

# NORMAL -> WARNING creates one alert
sync_alerts(db, ai_result=ai("WARNING", 55), latest_gateway=Gateway())
assert db.query(Alert).filter(Alert.severity == "WARNING").count() == 1

# WARNING -> WARNING is deduplicated
sync_alerts(db, ai_result=ai("WARNING", 56), latest_gateway=Gateway())
assert db.query(Alert).filter(Alert.severity == "WARNING").count() == 1

# WARNING -> CRITICAL creates a new alert
sync_alerts(db, ai_result=ai("CRITICAL", 80), latest_gateway=Gateway())
assert db.query(Alert).filter(Alert.severity == "CRITICAL").count() == 1

# CRITICAL -> NORMAL creates a recovery record
sync_alerts(db, ai_result=ai("NORMAL", 15), latest_gateway=Gateway())
assert db.query(Alert).filter(Alert.event_type == "RECOVERY").count() >= 1

# NODE 2 online -> offline creates one communication alert
sync_alerts(db, ai_result=ai("NORMAL", 15), latest_gateway=Gateway(online=False))
assert db.query(Alert).filter(Alert.node_id == "NODE_02", Alert.severity == "OFFLINE").count() == 1

# Repeated offline packet is deduplicated
sync_alerts(db, ai_result=ai("NORMAL", 15), latest_gateway=Gateway(online=False))
assert db.query(Alert).filter(Alert.node_id == "NODE_02", Alert.severity == "OFFLINE").count() == 1

# Recovery when Node 2 comes back online
sync_alerts(db, ai_result=ai("NORMAL", 15), latest_gateway=Gateway(online=True))
assert db.query(Alert).filter(Alert.node_id == "NODE_02", Alert.event_type == "RECOVERY").count() == 1

print("Alert manager tests passed.")
