CREATE DATABASE IF NOT EXISTS air_quality_monitoring;
USE air_quality_monitoring;


CREATE TABLE sensors (
    sensor_id VARCHAR(50) PRIMARY KEY,
    sensor_name VARCHAR(100) NOT NULL,
    description TEXT,
    

    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    altitude DECIMAL(8, 2),
    address VARCHAR(255),
    

    sensor_type ENUM('stationary', 'mobile', 'portable') DEFAULT 'stationary',
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    firmware_version VARCHAR(50),
    

    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(255),
