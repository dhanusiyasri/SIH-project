from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from database import Base


class SensorReading(Base):
    """Legacy flat sensor table kept for compatibility with the first prototype."""

    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    accel_mean_g = Column(Float)
    accel_rms_g = Column(Float)
    accel_peak_g = Column(Float)
    gyro_mean_dps = Column(Float)
    gyro_peak_dps = Column(Float)
    roll_change_deg = Column(Float)
    pitch_change_deg = Column(Float)
    tilt_change_deg = Column(Float)
    fsr_mean = Column(Float)
    fsr_min = Column(Float)
    fsr_max = Column(Float)
    fsr_std = Column(Float)
    fsr_rate_peak = Column(Float)
    vibration_events = Column(Integer)
    vibration_duration_ms = Column(Integer)
    shock_detected = Column(Integer)
    vibration_detected = Column(Integer)
    tilt_detected = Column(Integer)
    pressure_detected = Column(Integer)
    sudden_pressure_detected = Column(Integer)


class GatewayReading(Base):
    """Gateway packet produced by the real Node 1 firmware."""

    __tablename__ = "gateway_readings"

    id = Column(Integer, primary_key=True, index=True)
    server_timestamp = Column(DateTime, nullable=False, index=True)
    device_timestamp_ms = Column(Integer, nullable=False)
    edge_risk = Column(String, nullable=False)

    node1_accel_x_g = Column(Float)
    node1_accel_y_g = Column(Float)
    node1_accel_z_g = Column(Float)
    node1_accel_magnitude_g = Column(Float)
    node1_gyro_x_dps = Column(Float)
    node1_gyro_y_dps = Column(Float)
    node1_gyro_z_dps = Column(Float)
    node1_gyro_magnitude_dps = Column(Float)
    node1_roll_deg = Column(Float)
    node1_pitch_deg = Column(Float)
    node1_fsr_raw = Column(Integer)
    node1_fsr_voltage = Column(Float)
    node1_fsr_resistance_ohm = Column(Float)
    node1_vibration = Column(Integer)
    node1_vibration_events = Column(Integer)
    node1_vibration_duration_ms = Column(Integer)
    node1_tilt_change_deg = Column(Float)
    node1_accel_deviation_g = Column(Float)

    node2_online = Column(Integer)
    sd_available = Column(Integer)
    esp_now_available = Column(Integer)

    node2_packet_id = Column(Integer, nullable=True)
    node2_device_timestamp_ms = Column(Integer, nullable=True)
    node2_accel_x_g = Column(Float, nullable=True)
    node2_accel_y_g = Column(Float, nullable=True)
    node2_accel_z_g = Column(Float, nullable=True)
    node2_accel_magnitude_g = Column(Float, nullable=True)
    node2_gyro_x_dps = Column(Float, nullable=True)
    node2_gyro_y_dps = Column(Float, nullable=True)
    node2_gyro_z_dps = Column(Float, nullable=True)
    node2_gyro_magnitude_dps = Column(Float, nullable=True)
    node2_roll_deg = Column(Float, nullable=True)
    node2_pitch_deg = Column(Float, nullable=True)
    node2_fsr_raw = Column(Integer, nullable=True)
    node2_fsr_voltage = Column(Float, nullable=True)
    node2_fsr_resistance_ohm = Column(Float, nullable=True)
    node2_vibration = Column(Integer, nullable=True)
    node2_vibration_events = Column(Integer, nullable=True)
