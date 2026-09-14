import random
import time
from datetime import datetime, timezone

import requests

API_URL = "http://127.0.0.1:8080/api/gateway-data"
INTERVAL_SECONDS = 0.5


def utc_timestamp():
    """Human-readable server-side timestamp used only for simulator logs."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def generate_node(prefix, abnormal=False):
    if abnormal:
        tilt = random.uniform(8.5, 14.0)
        accel = random.uniform(1.20, 1.75)
        vibration = True
        fsr = random.randint(450, 700)
    else:
        tilt = random.uniform(0.05, 2.0)
        accel = random.uniform(1.00, 1.10)
        vibration = random.random() < 0.08
        fsr = random.randint(0, 60)

    roll = random.uniform(-tilt, tilt)
    pitch = random.uniform(-tilt, tilt)

    return {
        "accel_x_g": random.uniform(-0.03, 0.03),
        "accel_y_g": random.uniform(-0.03, 0.03),
        "accel_z_g": accel,
        "accel_magnitude_g": accel,
        "gyro_x_dps": random.uniform(-1, 1),
        "gyro_y_dps": random.uniform(-1, 1),
        "gyro_z_dps": random.uniform(-1, 1),
        "gyro_magnitude_dps": random.uniform(0.1, 1.5),
        "roll_deg": roll,
        "pitch_deg": pitch,
        "fsr_raw": fsr,
        "fsr_voltage": fsr * 3.3 / 4095,
        "fsr_resistance_ohm": 10000 * (3.3 / (fsr * 3.3 / 4095) - 1) if fsr else 0,
        "vibration": vibration,
        "vibration_events": random.randint(1, 4) if vibration else 0,
        "vibration_duration_ms": random.randint(50, 500) if vibration else 0,
        "tilt_change_deg": tilt,
        "accel_deviation_g": abs(accel - 1.0),
    }


def generate_gateway_packet():
    abnormal = random.random() < 0.10
    node1 = generate_node("NODE_01", abnormal)

    # Simulate the real gateway state: Node 2 can be temporarily offline.
    node2_online = random.random() > 0.10
    node2 = generate_node("NODE_02", abnormal) if node2_online else None

    warning = (
        node1["vibration"]
        or node1["tilt_change_deg"] > 3
        or node1["accel_deviation_g"] > 0.08
    )
    critical = (
        node1["tilt_change_deg"] > 8
        or node1["accel_deviation_g"] > 0.20
    )

    risk = "CRITICAL_MOVEMENT" if critical else "SIGNIFICANT_MOVEMENT" if warning else "NORMAL"

    return {
        "timestamp_ms": int(time.monotonic() * 1000) % 4294967295,
        "risk": risk,
        "node1": node1,
        "gateway": {
            "node2_online": node2_online,
            "sd_available": False,
            "esp_now_available": True,
        },
        "node2": (
            {
                "status": "ONLINE",
                "packet_id": random.randint(1, 100000),
                "timestamp_ms": int(time.monotonic() * 1000) % 4294967295,
                **{k: v for k, v in node2.items() if k != "vibration_duration_ms" and k not in {"tilt_change_deg", "accel_deviation_g"}},
            }
            if node2_online
            else {"status": "OFFLINE"}
        ),
    }


def send_packet(packet):
    try:
        response = requests.post(API_URL, json=packet, timeout=5)
        print(
            f"{datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S')} | "
            f"HTTP {response.status_code} | risk={packet['risk']} | "
            f"tilt={packet['node1']['tilt_change_deg']:.2f} | "
            f"fsr={packet['node1']['fsr_raw']} | "
            f"node2={'ONLINE' if packet['gateway']['node2_online'] else 'OFFLINE'}"
        )
    except requests.RequestException as error:
        print(f"{utc_timestamp()} | ERROR: {error}")


print("Mine Subsidence Gateway Simulator")
print("POST target: /api/gateway-data")
print("Packet interval: 500 ms")
print("Database stores server timestamps in UTC; dashboard displays Asia/Kolkata.\n")

while True:
    started = time.monotonic()
    send_packet(generate_gateway_packet())
    elapsed = time.monotonic() - started
    time.sleep(max(0, INTERVAL_SECONDS - elapsed))
