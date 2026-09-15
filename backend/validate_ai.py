import requests
import time
from datetime import datetime


API_URL = "http://127.0.0.1:8080"


def get_latest():
    response = requests.get(
        f"{API_URL}/api/ai/latest",
        timeout=5
    )

    response.raise_for_status()
    return response.json()


def print_result(data, count):
    timestamp = data.get("timestamp", "--")
    risk = data.get("risk", "--")
    risk_score = data.get("risk_score", 0)
    anomaly_score = data.get("anomaly_score", 0)
    anomaly_label = data.get("anomaly_label", "--")

    print(
        f"{count:03d} | "
        f"{timestamp} | "
        f"Risk={risk:<8} | "
        f"RiskScore={float(risk_score):6.2f} | "
        f"Anomaly={float(anomaly_score):6.2f} | "
        f"Label={anomaly_label}"
    )


def main():

    print()
    print("=" * 100)
    print("MINE SUBSIDENCE AI VALIDATION")
    print("=" * 100)
    print(f"Backend: {API_URL}")
    print("Sampling AI output every 2 seconds")
    print("Press CTRL+C to stop")
    print("=" * 100)
    print()

    count = 0

    risk_values = []
    anomaly_values = []

    try:

        while True:

            try:

                data = get_latest()

                count += 1

                print_result(data, count)

                try:
                    risk_values.append(
                        float(data.get("risk_score", 0))
                    )
                except (TypeError, ValueError):
                    pass

                try:
                    anomaly_values.append(
                        float(data.get("anomaly_score", 0))
                    )
                except (TypeError, ValueError):
                    pass

            except requests.exceptions.RequestException as e:

                print()
                print("BACKEND ERROR:")
                print(e)
                print()

            time.sleep(2)

    except KeyboardInterrupt:

        print()
        print()
        print("=" * 100)
        print("VALIDATION SUMMARY")
        print("=" * 100)

        if risk_values:

            print(
                f"Risk score   : "
                f"min={min(risk_values):.2f}, "
                f"max={max(risk_values):.2f}, "
                f"avg={sum(risk_values)/len(risk_values):.2f}"
            )

        if anomaly_values:

            print(
                f"Anomaly score: "
                f"min={min(anomaly_values):.2f}, "
                f"max={max(anomaly_values):.2f}, "
                f"avg={sum(anomaly_values)/len(anomaly_values):.2f}"
            )

        print()
        print("Validation stopped.")


if __name__ == "__main__":
    main()