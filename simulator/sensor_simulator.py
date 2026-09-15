import random
import time
from datetime import datetime, timezone

import requests


# ============================================================
# CONFIGURATION
# ============================================================

API_URL = "http://127.0.0.1:8080/api/gateway-data"

INTERVAL_SECONDS = 0.5

# ------------------------------------------------------------
# Select simulation scenario
#
# NORMAL
# GRADUAL_DEFORMATION
# SUDDEN_MOVEMENT
# SEVERE_EVENT
# ------------------------------------------------------------

SCENARIO = "NORMAL"


# ============================================================
# TIMESTAMP
# ============================================================

def utc_timestamp():
    return datetime.now(timezone.utc).isoformat(
        timespec="milliseconds"
    )


# ============================================================
# NODE DATA GENERATOR
# ============================================================

def generate_node(
    node_id,
    scenario="NORMAL",
    progress=0.0,
):
    """
    Generate realistic-looking sensor data for one node.

    progress:
        0.0 → beginning of scenario
        1.0 → maximum severity
    """

    # ========================================================
    # NORMAL
    # ========================================================

    if scenario == "NORMAL":

        tilt = random.uniform(0.05, 2.0)

        accel = random.uniform(
            1.00,
            1.10
        )

        vibration = (
            random.random() < 0.08
        )

        fsr = random.randint(
            0,
            60
        )


    # ========================================================
    # GRADUAL DEFORMATION
    # ========================================================

    elif scenario == "GRADUAL_DEFORMATION":

        # Gradually increase tilt
        base_tilt = 1.0

        maximum_extra_tilt = 6.0

        tilt = (
            base_tilt
            + maximum_extra_tilt * progress
            + random.uniform(-0.2, 0.2)
        )

        # Slight acceleration deviation
        accel = (
            1.03
            + 0.10 * progress
            + random.uniform(-0.015, 0.015)
        )

        # Increasing vibration probability
        vibration_probability = (
            0.05
            + 0.45 * progress
        )

        vibration = (
            random.random()
            < vibration_probability
        )

        # FSR gradually increases
        fsr = int(
            40
            + 400 * progress
            + random.uniform(-15, 15)
        )

        fsr = max(
            0,
            fsr
        )


    # ========================================================
    # SUDDEN MOVEMENT
    # ========================================================

    elif scenario == "SUDDEN_MOVEMENT":

        if progress < 0.65:

            # Mostly normal before event
            tilt = random.uniform(
                0.5,
                2.0
            )

            accel = random.uniform(
                1.00,
                1.10
            )

            vibration = (
                random.random() < 0.10
            )

            fsr = random.randint(
                20,
                70
            )

        else:

            # Sudden structural movement
            tilt = random.uniform(
                5.0,
                9.5
            )

            accel = random.uniform(
                1.15,
                1.45
            )

            vibration = True

            fsr = random.randint(
                250,
                500
            )


    # ========================================================
    # SEVERE EVENT
    # ========================================================

    elif scenario == "SEVERE_EVENT":

        # Strong abnormal condition
        tilt = random.uniform(
            9.0,
            15.0
        )

        accel = random.uniform(
            1.30,
            1.75
        )

        vibration = True

        fsr = random.randint(
            500,
            800
        )


    else:

        raise ValueError(
            f"Unknown scenario: {scenario}"
        )


    # ========================================================
    # ROLL / PITCH
    # ========================================================

    roll = random.uniform(
        -tilt,
        tilt
    )

    pitch = random.uniform(
        -tilt,
        tilt
    )


    # ========================================================
    # VIBRATION
    # ========================================================

    vibration_events = (
        random.randint(1, 4)
        if vibration
        else 0
    )

    vibration_duration_ms = (
        random.randint(50, 500)
        if vibration
        else 0
    )


    # ========================================================
    # FSR ELECTRICAL VALUES
    # ========================================================

    fsr_voltage = (
        fsr * 3.3 / 4095
    )

    fsr_resistance = (
        10000
        * (
            3.3 / fsr_voltage - 1
        )
        if fsr_voltage > 0
        else 0
    )


    # ========================================================
    # RETURN NODE DATA
    # ========================================================

    return {

        "accel_x_g":
            random.uniform(
                -0.03,
                0.03
            ),

        "accel_y_g":
            random.uniform(
                -0.03,
                0.03
            ),

        "accel_z_g":
            accel,

        "accel_magnitude_g":
            accel,

        "gyro_x_dps":
            random.uniform(
                -1,
                1
            ),

        "gyro_y_dps":
            random.uniform(
                -1,
                1
            ),

        "gyro_z_dps":
            random.uniform(
                -1,
                1
            ),

        "gyro_magnitude_dps":
            random.uniform(
                0.1,
                1.5
            ),

        "roll_deg":
            roll,

        "pitch_deg":
            pitch,

        "fsr_raw":
            fsr,

        "fsr_voltage":
            fsr_voltage,

        "fsr_resistance_ohm":
            fsr_resistance,

        "vibration":
            vibration,

        "vibration_events":
            vibration_events,

        "vibration_duration_ms":
            vibration_duration_ms,

        "tilt_change_deg":
            abs(tilt),

        "accel_deviation_g":
            abs(
                accel - 1.0
            ),
    }


# ============================================================
# GATEWAY PACKET
# ============================================================

def generate_gateway_packet(
    scenario,
    progress
):

    # --------------------------------------------------------
    # Node 1
    # --------------------------------------------------------

    node1 = generate_node(
        "NODE_01",
        scenario,
        progress
    )


    # --------------------------------------------------------
    # Node 2
    #
    # Normally similar to Node 1.
    # During abnormal conditions we introduce a small
    # spatial difference to test cross-node features.
    # --------------------------------------------------------

    node2 = generate_node(
        "NODE_02",
        scenario,
        progress
    )


    # ========================================================
    # CREATE SPATIAL DIFFERENCE
    # ========================================================

    if scenario == "GRADUAL_DEFORMATION":

        # Node 2 reacts slightly less
        node2["tilt_change_deg"] *= 0.75
        node2["accel_deviation_g"] *= 0.80
        node2["fsr_raw"] = int(
            node2["fsr_raw"] * 0.80
        )


    elif scenario == "SUDDEN_MOVEMENT":

        # Node 1 experiences stronger movement
        node2["tilt_change_deg"] *= 0.55
        node2["accel_deviation_g"] *= 0.65
        node2["fsr_raw"] = int(
            node2["fsr_raw"] * 0.60
        )


    elif scenario == "SEVERE_EVENT":

        # Significant difference between nodes
        node2["tilt_change_deg"] *= 0.45
        node2["accel_deviation_g"] *= 0.55
        node2["fsr_raw"] = int(
            node2["fsr_raw"] * 0.50
        )


    # ========================================================
    # NODE 2 ONLINE
    # ========================================================

    node2_online = True


    # ========================================================
    # EDGE RISK
    #
    # This mimics the basic firmware/gateway risk label.
    # The actual AI risk will be calculated by the backend.
    # ========================================================

    warning = (
        node1["vibration"]
        or node1["tilt_change_deg"] > 3
        or node1["accel_deviation_g"] > 0.08
    )

    critical = (
        node1["tilt_change_deg"] > 8
        or node1["accel_deviation_g"] > 0.20
    )


    if critical:

        edge_risk = "CRITICAL_MOVEMENT"

    elif warning:

        edge_risk = "SIGNIFICANT_MOVEMENT"

    else:

        edge_risk = "NORMAL"


    # ========================================================
    # GATEWAY PACKET
    # ========================================================

    return {

        "timestamp_ms":
            int(
                time.monotonic() * 1000
            ) % 4294967295,

        "risk":
            edge_risk,

        "node1":
            node1,

        "gateway": {

            "node2_online":
                node2_online,

            "sd_available":
                False,

            "esp_now_available":
                True,
        },

        "node2": {

            "status":
                "ONLINE",

            "packet_id":
                random.randint(
                    1,
                    100000
                ),

            "timestamp_ms":
                int(
                    time.monotonic() * 1000
                ) % 4294967295,

            **{
                key: value
                for key, value
                in node2.items()
                if key
                not in {
                    "vibration_duration_ms",
                    "tilt_change_deg",
                    "accel_deviation_g",
                }
            },
        },
    }


# ============================================================
# SEND PACKET
# ============================================================

def send_packet(packet):

    try:

        response = requests.post(
            API_URL,
            json=packet,
            timeout=5
        )

        print(
            f"{datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S')}"
            f" | HTTP {response.status_code}"
            f" | scenario={SCENARIO}"
            f" | edge_risk={packet['risk']}"
            f" | tilt={packet['node1']['tilt_change_deg']:.2f}"
            f" | accel_dev={packet['node1']['accel_deviation_g']:.3f}"
            f" | fsr={packet['node1']['fsr_raw']}"
            f" | vibration={packet['node1']['vibration']}"
            f" | node2=ONLINE"
        )

    except requests.RequestException as error:

        print(
            f"{utc_timestamp()} | ERROR: {error}"
        )


# ============================================================
# START SIMULATOR
# ============================================================

print(
    "\n=============================================="
)

print(
    "   MINE SUBSIDENCE GATEWAY SIMULATOR"
)

print(
    "=============================================="
)

print(
    f"Scenario       : {SCENARIO}"
)

print(
    f"API            : {API_URL}"
)

print(
    f"Interval       : {INTERVAL_SECONDS} seconds"
)

print(
    "Node 1         : ONLINE"
)

print(
    "Node 2         : ONLINE"
)

print(
    "==============================================\n"
)


# ============================================================
# SCENARIO PROGRESS
# ============================================================

step = 0

TOTAL_STEPS = 120


while True:

    started = time.monotonic()


    # --------------------------------------------------------
    # Progress from 0 → 1
    # --------------------------------------------------------

    progress = (
        step % TOTAL_STEPS
    ) / (
        TOTAL_STEPS - 1
    )


    packet = generate_gateway_packet(
        SCENARIO,
        progress
    )


    send_packet(packet)


    step += 1


    elapsed = (
        time.monotonic()
        - started
    )


    time.sleep(
        max(
            0,
            INTERVAL_SECONDS
            - elapsed
        )
    )