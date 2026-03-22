import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import json
from enum import Enum as PyEnum

Base = declarative_base()


class AQICategory(PyEnum):
    EXCELLENT = "Отличное"
    GOOD = "Хорошее"
    MODERATE = "Удовлетворительное"
    POOR = "Плохое"
    VERY_POOR = "Очень плохое"
    HAZARDOUS = "Опасное"


class PollutantType(PyEnum):
    PM2_5 = "PM2.5"
    PM10 = "PM10"
    NO2 = "NO2"
    CO2 = "CO2"
    TEMPERATURE = "Температура"
    HUMIDITY = "Влажность"
    PRESSURE = "Давление"
    OTHER = "Другое"


class Location(Base):
    __tablename__ = 'locations'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    description = Column(String(500))
    address = Column(String(200))
    city = Column(String(100))
    country = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    environment_type = Column(String(50))
    traffic_intensity = Column(String(50))

    measurements = relationship("AirQualityMeasurement", back_populates="location")
    sensors = relationship("Sensor", back_populates="location")
    alerts = relationship("Alert", back_populates="location")

    def __repr__(self):
        return f"<Location(name='{self.name}', lat={self.latitude}, lon={self.longitude})>"


class Sensor(Base):
    __tablename__ = 'sensors'

    id = Column(Integer, primary_key=True)
    sensor_id = Column(String(50), unique=True, nullable=False)
    sensor_type = Column(String(50), nullable=False)
    pollutant_type = Column(Enum(PollutantType), nullable=False)
    manufacturer = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(100))
    measurement_range_min = Column(Float)
    measurement_range_max = Column(Float)
    accuracy = Column(Float)
    resolution = Column(Float)
    calibration_date = Column(DateTime)
    next_calibration_date = Column(DateTime)
    calibration_coefficient = Column(Float, default=1.0)
    location_id = Column(Integer, ForeignKey('locations.id'))
    is_active = Column(Boolean, default=True)
    last_maintenance = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    location = relationship("Location", back_populates="sensors")
    measurements = relationship("MeasurementData", back_populates="sensor")

    def __repr__(self):
        return f"<Sensor(id='{self.sensor_id}', type='{self.sensor_type}')>"


class AirQualityMeasurement(Base):
    __tablename__ = 'air_quality_measurements'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pm2_5 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    co2 = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    aqi = Column(Float)
    aqi_category = Column(Enum(AQICategory))
    pm2_5_index = Column(Float)
    pm10_index = Column(Float)
    no2_index = Column(Float)
    pm2_5_1h_avg = Column(Float)
    pm10_1h_avg = Column(Float)
    no2_1h_avg = Column(Float)
    co2_1h_avg = Column(Float)
    location_id = Column(Integer, ForeignKey('locations.id'), nullable=False)
    location = relationship("Location", back_populates="measurements")

    def __repr__(self):
        return f"<Measurement(timestamp={self.timestamp}, AQI={self.aqi})>"


class MeasurementData(Base):
    __tablename__ = 'measurement_data'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    sensor_id = Column(Integer, ForeignKey('sensors.id'), nullable=False)
    pollutant_type = Column(Enum(PollutantType), nullable=False)
    data_quality = Column(String(20))
    is_valid = Column(Boolean, default=True)
    error_code = Column(String(50))

    sensor = relationship("Sensor", back_populates="measurements")

    def __repr__(self):
        return f"<RawData(sensor={self.sensor_id}, value={self.value}{self.unit})>"


class AlertThreshold(Base):
    __tablename__ = 'alert_thresholds'

    id = Column(Integer, primary_key=True)
    pollutant_type = Column(Enum(PollutantType), nullable=False)
    warning_threshold = Column(Float)
    danger_threshold = Column(Float)
    critical_threshold = Column(Float)
    duration_minutes = Column(Integer, default=60)
    who_guideline = Column(Float)
    eu_limit = Column(Float)
    national_limit = Column(Float)
    description = Column(String(500))
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Threshold(pollutant='{self.pollutant_type}')>"


class Alert(Base):
    __tablename__ = 'alerts'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    location_id = Column(Integer, ForeignKey('locations.id'), nullable=False)
    pollutant_type = Column(Enum(PollutantType), nullable=False)
    alert_level = Column(String(20))
    current_value = Column(Float)
    threshold_value = Column(Float)
    duration_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    recommendation = Column(String(500))

    location = relationship("Location", back_populates="alerts")

    def __repr__(self):
        return f"<Alert(pollutant='{self.pollutant_type}', level='{self.alert_level}')>"


class Statistics(Base):
    __tablename__ = 'statistics'

    id = Column(Integer, primary_key=True)
    date = Column(DateTime, nullable=False, index=True)
    location_id = Column(Integer, ForeignKey('locations.id'), nullable=False)
    pm2_5_24h_avg = Column(Float)
    pm10_24h_avg = Column(Float)
    no2_24h_avg = Column(Float)
    co2_24h_avg = Column(Float)
    pm2_5_max = Column(Float)
    pm10_max = Column(Float)
    no2_max = Column(Float)
    co2_max = Column(Float)
    pm2_5_min = Column(Float)
    pm10_min = Column(Float)
    no2_min = Column(Float)
    co2_min = Column(Float)
    measurement_count = Column(Integer)
    aqi_max = Column(Float)
    aqi_avg = Column(Float)

    def __repr__(self):
        return f"<Statistics(date={self.date}, PM2.5_avg={self.pm2_5_24h_avg})>"


class AirQualityDB:
    def __init__(self, db_url='sqlite:///air_quality_monitoring.db'):
        self.engine = create_engine(db_url, echo=False)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        self._initialize_thresholds()

    def _initialize_thresholds(self):
        default_thresholds = [
            {
                'pollutant_type': PollutantType.PM2_5,
                'warning_threshold': 25,
                'danger_threshold': 50,
                'critical_threshold': 100,
                'who_guideline': 15,
                'description': 'PM2.5 - мелкодисперсные частицы'
            },
            {
                'pollutant_type': PollutantType.PM10,
                'warning_threshold': 50,
                'danger_threshold': 100,
                'critical_threshold': 200,
                'who_guideline': 45,
                'description': 'PM10 - крупнодисперсные частицы'
            },
            {
                'pollutant_type': PollutantType.NO2,
                'warning_threshold': 100,
                'danger_threshold': 200,
                'critical_threshold': 400,
                'who_guideline': 25,
                'description': 'NO2 - диоксид азота'
            },
            {
                'pollutant_type': PollutantType.CO2,
                'warning_threshold': 1000,
                'danger_threshold': 2000,
                'critical_threshold': 5000,
                'who_guideline': None,
                'description': 'CO2 - диоксид углерода'
            }
        ]

        for threshold_data in default_thresholds:
            existing = self.session.query(AlertThreshold).filter_by(
                pollutant_type=threshold_data['pollutant_type']
            ).first()

            if not existing:
                threshold = AlertThreshold(**threshold_data)
                self.session.add(threshold)

        self.session.commit()

    def add_location(self, name, latitude, longitude, **kwargs):
        location = Location(
            name=name,
            latitude=latitude,
            longitude=longitude,
            **kwargs
        )
        self.session.add(location)
        self.session.commit()
        return location

    def add_sensor(self, sensor_id, sensor_type, pollutant_type, location_id, **kwargs):
        sensor = Sensor(
            sensor_id=sensor_id,
            sensor_type=sensor_type,
            pollutant_type=pollutant_type,
            location_id=location_id,
            **kwargs
        )
        self.session.add(sensor)
        self.session.commit()
        return sensor

    def add_raw_measurement(self, sensor_id, value, unit, pollutant_type, **kwargs):
        raw_data = MeasurementData(
            sensor_id=sensor_id,
            value=value,
            unit=unit,
            pollutant_type=pollutant_type,
            timestamp=datetime.datetime.utcnow(),
            **kwargs
        )
        self.session.add(raw_data)
        self.session.commit()
        self._check_sensor_alert(raw_data)
        self._aggregate_measurements(raw_data.sensor.location_id)
        return raw_data

    def _check_sensor_alert(self, raw_data):
        threshold = self.session.query(AlertThreshold).filter_by(
            pollutant_type=raw_data.pollutant_type
        ).first()

        if not threshold or not raw_data.is_valid:
            return

        alert_level = None
        if raw_data.value >= threshold.critical_threshold:
            alert_level = 'critical'
        elif raw_data.value >= threshold.danger_threshold:
            alert_level = 'danger'
        elif raw_data.value >= threshold.warning_threshold:
            alert_level = 'warning'

        if alert_level:
            existing_alert = self.session.query(Alert).filter_by(
                location_id=raw_data.sensor.location_id,
                pollutant_type=raw_data.pollutant_type,
                is_active=True,
                alert_level=alert_level
            ).first()

            if not existing_alert:
                alert = Alert(
                    location_id=raw_data.sensor.location_id,
                    pollutant_type=raw_data.pollutant_type,
                    alert_level=alert_level,
                    current_value=raw_data.value,
                    threshold_value=threshold.warning_threshold if alert_level == 'warning' else
                    threshold.danger_threshold if alert_level == 'danger' else
                    threshold.critical_threshold,
                    recommendation=self._get_recommendation(raw_data.pollutant_type, alert_level)
                )
                self.session.add(alert)
                self.session.commit()

    def _get_recommendation(self, pollutant_type, alert_level):
        recommendations = {
            PollutantType.PM2_5: {
                'warning': 'PM2.5 превышен. Людям с заболеваниями дыхательных путей рекомендуется ограничить пребывание на улице.',
                'danger': 'Высокий уровень PM2.5. Всем рекомендуется ограничить физическую активность на улице.',
                'critical': 'Опасный уровень PM2.5. Рекомендуется оставаться в помещении, использовать очистители воздуха.'
            },
            PollutantType.PM10: {
                'warning': 'Повышенный уровень PM10. Может вызывать раздражение дыхательных путей.',
                'danger': 'Высокий уровень PM10. Рекомендуется носить маску на улице.',
                'critical': 'Опасный уровень PM10. Избегайте длительного пребывания на улице.'
            },
            PollutantType.NO2: {
                'warning': 'Повышенный уровень NO2. Может вызывать раздражение глаз и дыхательных путей.',
                'danger': 'Высокий уровень NO2. Людям с астмой следует быть осторожными.',
                'critical': 'Опасный уровень NO2. Избегайте физических нагрузок на улице.'
            },
            PollutantType.CO2: {
                'warning': 'Повышенный уровень CO2. Рекомендуется проветривание помещений.',
                'danger': 'Высокий уровень CO2. Может вызывать головную боль и усталость.',
                'critical': 'Опасный уровень CO2. Необходимо срочное проветривание или эвакуация.'
            }
        }

        return recommendations.get(pollutant_type, {}).get(alert_level, '')

    def _aggregate_measurements(self, location_id):
        one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)

        raw_data = self.session.query(MeasurementData).join(Sensor).filter(
            Sensor.location_id == location_id,
            MeasurementData.timestamp >= one_hour_ago,
            MeasurementData.is_valid == True
        ).all()

        if not raw_data:
            return

        grouped_data = {}
        for data in raw_data:
            if data.pollutant_type not in grouped_data:
                grouped_data[data.pollutant_type] = []
            grouped_data[data.pollutant_type].append(data.value)

        pm2_5_avg = self._calculate_average(grouped_data.get(PollutantType.PM2_5))
        pm10_avg = self._calculate_average(grouped_data.get(PollutantType.PM10))
        no2_avg = self._calculate_average(grouped_data.get(PollutantType.NO2))
        co2_avg = self._calculate_average(grouped_data.get(PollutantType.CO2))
        temp_data = self._calculate_average(grouped_data.get(PollutantType.TEMPERATURE))
        humidity_data = self._calculate_average(grouped_data.get(PollutantType.HUMIDITY))

        aqi = self._calculate_aqi(pm2_5_avg, pm10_avg, no2_avg)

        measurement = AirQualityMeasurement(
            location_id=location_id,
            timestamp=datetime.datetime.utcnow(),
            pm2_5=pm2_5_avg,
            pm10=pm10_avg,
            no2=no2_avg,
            co2=co2_avg,
            temperature=temp_data,
            humidity=humidity_data,
            pm2_5_1h_avg=pm2_5_avg,
            pm10_1h_avg=pm10_avg,
            no2_1h_avg=no2_avg,
            co2_1h_avg=co2_avg,
            aqi=aqi,
            aqi_category=self._get_aqi_category(aqi),
            pm2_5_index=self._calculate_pollutant_index(pm2_5_avg, PollutantType.PM2_5),
            pm10_index=self._calculate_pollutant_index(pm10_avg, PollutantType.PM10),
            no2_index=self._calculate_pollutant_index(no2_avg, PollutantType.NO2)
        )

        self.session.add(measurement)
        self.session.commit()
        self._update_daily_statistics(location_id)

    def _calculate_average(self, values):
        if not values:
            return None
        return sum(values) / len(values)

    def _calculate_aqi(self, pm2_5, pm10, no2):
        indices = []

        if pm2_5 is not None:
            indices.append(self._calculate_pollutant_index(pm2_5, PollutantType.PM2_5))
        if pm10 is not None:
            indices.append(self._calculate_pollutant_index(pm10, PollutantType.PM10))
        if no2 is not None:
            indices.append(self._calculate_pollutant_index(no2, PollutantType.NO2))

        if not indices:
            return None

        return max(indices)

    def _calculate_pollutant_index(self, concentration, pollutant_type):
        if concentration is None:
            return None

        if pollutant_type == PollutantType.PM2_5:
            breakpoints = [(0, 12, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150),
                           (55.5, 150.4, 151, 200), (150.5, 250.4, 201, 300), (250.5, 350.4, 301, 400)]
        elif pollutant_type == PollutantType.PM10:
            breakpoints = [(0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150),
                           (255, 354, 151, 200), (355, 424, 201, 300), (425, 504, 301, 400)]
        elif pollutant_type == PollutantType.NO2:
            breakpoints = [(0, 53, 0, 50), (54, 100, 51, 100), (101, 360, 101, 150),
                           (361, 649, 151, 200), (650, 1249, 201, 300), (1250, 1649, 301, 400)]
        else:
            return None

        for c_low, c_high, i_low, i_high in breakpoints:
            if c_low <= concentration <= c_high:
                return ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low

        return 500

    def _get_aqi_category(self, aqi):
        if aqi is None:
            return None

        if aqi <= 50:
            return AQICategory.EXCELLENT
        elif aqi <= 100:
            return AQICategory.GOOD
        elif aqi <= 150:
            return AQICategory.MODERATE
        elif aqi <= 200:
            return AQICategory.POOR
        elif aqi <= 300:
            return AQICategory.VERY_POOR
        else:
            return AQICategory.HAZARDOUS

    def _update_daily_statistics(self, location_id):
        today = datetime.datetime.utcnow().date()
        today_start = datetime.datetime.combine(today, datetime.time.min)

        measurements = self.session.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.location_id == location_id,
            AirQualityMeasurement.timestamp >= today_start
        ).all()

        if not measurements:
            return

        stats = Statistics(
            date=today_start,
            location_id=location_id,
            measurement_count=len(measurements)
        )

        for param in ['pm2_5', 'pm10', 'no2', 'co2']:
            values = [getattr(m, param) for m in measurements if getattr(m, param) is not None]
            if values:
                setattr(stats, f'{param}_24h_avg', sum(values) / len(values))
                setattr(stats, f'{param}_max', max(values))
                setattr(stats, f'{param}_min', min(values))

        aqi_values = [m.aqi for m in measurements if m.aqi is not None]
        if aqi_values:
            stats.aqi_avg = sum(aqi_values) / len(aqi_values)
            stats.aqi_max = max(aqi_values)

        self.session.add(stats)
        self.session.commit()

    def get_current_air_quality(self, location_id):
        measurement = self.session.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.location_id == location_id
        ).order_by(AirQualityMeasurement.timestamp.desc()).first()

        return measurement

    def get_air_quality_history(self, location_id, hours=24):
        start_time = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)

        measurements = self.session.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.location_id == location_id,
            AirQualityMeasurement.timestamp >= start_time
        ).order_by(AirQualityMeasurement.timestamp).all()

        return measurements

    def get_alerts(self, location_id=None, is_active=True):
        query = self.session.query(Alert).filter_by(is_active=is_active)

        if location_id:
            query = query.filter_by(location_id=location_id)

        return query.order_by(Alert.timestamp.desc()).all()

    def get_daily_report(self, location_id, date=None):
        if date is None:
            date = datetime.datetime.utcnow().date()

        start_date = datetime.datetime.combine(date, datetime.time.min)
        end_date = datetime.datetime.combine(date, datetime.time.max)

        stats = self.session.query(Statistics).filter(
            Statistics.location_id == location_id,
            Statistics.date == start_date
        ).first()

        measurements = self.session.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.location_id == location_id,
            AirQualityMeasurement.timestamp >= start_date,
            AirQualityMeasurement.timestamp <= end_date
        ).all()

        alerts = self.session.query(Alert).filter(
            Alert.location_id == location_id,
            Alert.timestamp >= start_date,
            Alert.timestamp <= end_date
        ).all()

        return {
            'date': date,
            'statistics': stats,
            'measurements_count': len(measurements),
            'alerts_count': len(alerts),
            'max_aqi': max([m.aqi for m in measurements if m.aqi]) if measurements else None,
            'avg_pm2_5': stats.pm2_5_24h_avg if stats else None,
            'avg_pm10': stats.pm10_24h_avg if stats else None,
            'avg_no2': stats.no2_24h_avg if stats else None,
            'avg_co2': stats.co2_24h_avg if stats else None
        }

    def export_data(self, location_id, start_date, end_date, format='json'):
        measurements = self.session.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.location_id == location_id,
            AirQualityMeasurement.timestamp >= start_date,
            AirQualityMeasurement.timestamp <= end_date
        ).all()

        if format == 'json':
            data = []
            for m in measurements:
                data.append({
                    'timestamp': m.timestamp.isoformat(),
                    'pm2_5': m.pm2_5,
                    'pm10': m.pm10,
                    'no2': m.no2,
                    'co2': m.co2,
                    'temperature': m.temperature,
                    'humidity': m.humidity,
                    'aqi': m.aqi,
                    'aqi_category': m.aqi_category.value if m.aqi_category else None
                })
            return json.dumps(data, ensure_ascii=False, indent=2)

        return None

    def close(self):
        self.session.close()


if __name__ == "__main__":
    db = AirQualityDB()

    try:
        location = db.add_location(
            name="Центральный парк",
            latitude=55.7558,
            longitude=37.6176,
            city="Москва",
            country="Россия",
            environment_type="городской парк",
            description="Станция мониторинга в центральном парке"
        )
        print(f"Создана локация: {location}")

        sensors_data = [
            ("SENSOR_PM25_001", "Plantower PMS5003", PollutantType.PM2_5, "μg/m³"),
            ("SENSOR_PM10_001", "Plantower PMS5003", PollutantType.PM10, "μg/m³"),
            ("SENSOR_NO2_001", "Alphasense NO2-B43F", PollutantType.NO2, "ppb"),
            ("SENSOR_CO2_001", "SenseAir S8", PollutantType.CO2, "ppm"),
            ("SENSOR_TEMP_001", "DHT22", PollutantType.TEMPERATURE, "°C"),
            ("SENSOR_HUM_001", "DHT22", PollutantType.HUMIDITY, "%")
        ]

        for sensor_id, model, pollutant_type, unit in sensors_data:
            sensor = db.add_sensor(
                sensor_id=sensor_id,
                sensor_type=model.split()[0],
                pollutant_type=pollutant_type,
                location_id=location.id,
                model=model,
                manufacturer="Тестовый производитель"
            )
            print(f"Добавлен датчик: {sensor}")

        import random
        from datetime import datetime, timedelta

        print("\nДобавление тестовых измерений...")
        for i in range(10):
            pm2_5 = random.uniform(5, 60)
            pm10 = random.uniform(10, 100)
            no2 = random.uniform(10, 300)
            co2 = random.uniform(400, 1500)
            temp = random.uniform(15, 25)
            humidity = random.uniform(40, 70)

            for sensor_type, value, unit in [
                (PollutantType.PM2_5, pm2_5, "μg/m³"),
                (PollutantType.PM10, pm10, "μg/m³"),
                (PollutantType.NO2, no2, "ppb"),
                (PollutantType.CO2, co2, "ppm"),
                (PollutantType.TEMPERATURE, temp, "°C"),
                (PollutantType.HUMIDITY, humidity, "%")
            ]:
                sensor = db.session.query(Sensor).filter_by(
                    location_id=location.id,
                    pollutant_type=sensor_type
                ).first()

                if sensor:
                    db.add_raw_measurement(
                        sensor_id=sensor.id,
                        value=value,
                        unit=unit,
                        pollutant_type=sensor_type
                    )

        current = db.get_current_air_quality(location.id)
        if current:
            print(f"\nТекущее качество воздуха:")
            print(f"  PM2.5: {current.pm2_5:.1f} μg/m³")
            print(f"  PM10: {current.pm10:.1f} μg/m³")
            print(f"  NO2: {current.no2:.1f} ppb")
            print(f"  CO2: {current.co2:.1f} ppm")
            print(f"  AQI: {current.aqi:.0f} ({current.aqi_category.value})")

        alerts = db.get_alerts(location.id)
        if alerts:
            print(f"\nАктивные предупреждения:")
            for alert in alerts:
                print(f"  {alert.pollutant_type.value}: {alert.alert_level} (значение: {alert.current_value})")

        report = db.get_daily_report(location.id)
        print(f"\nЕжедневный отчет:")
        print(f"  Количество измерений: {report['measurements_count']}")
        print(f"  Средний PM2.5: {report['avg_pm2_5']:.1f} μg/m³")
        print(f"  Средний PM10: {report['avg_pm10']:.1f} μg/m³")
        print(f"  Средний NO2: {report['avg_no2']:.1f} ppb")
        print(f"  Средний CO2: {report['avg_co2']:.1f} ppm")

    finally:
        db.close()
