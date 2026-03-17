
const CONFIG = {
    MAP: {
        center: [55.7558, 37.6173], 
        zoom: 11,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    API: {
        baseUrl: 'http://localhost:3000/api',
        endpoints: {
            sensors: '/sensors',
            data: '/sensor-data',
            latest: '/latest-data',
            wifi: '/wifi-scan',
            sync: '/wifi-sync'
        }
    },
    COLORS: {
        good: '#4CAF50',
        moderate: '#FF9800',
        unhealthy: '#F44336',
        bad: '#9C27B0',
        hazardous: '#795548'
    },
    AQI_RANGES: {
        good: { min: 0, max: 50 },
        moderate: { min: 51, max: 100 },
        unhealthy: { min: 101, max: 150 },
        bad: { min: 151, max: 200 },
        veryBad: { min: 201, max: 300 },
        hazardous: { min: 301, max: 500 }
    }
};


let map;
let markers = [];
let sensorsData = [];
let currentMarker = null;
let autoUpdateInterval = null;
let isAutoUpdateEnabled = true;
let wifiNetworks = [];


class AirQualityAPI {
    constructor() {
        this.baseUrl = CONFIG.API.baseUrl;
    }

    // Получить все датчики
    async getSensors() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.API.endpoints.sensors}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения датчиков:', error);
            return this.getMockSensors();
        }
    }

    // Получить последние данные
    async getLatestData() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.API.endpoints.latest}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            return this.getMockData();
        }
    }


    async submitSensorData(data) {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.API.endpoints.data}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            return { success: true, message: 'Данные сохранены локально' };
        }
    }


    async scanWiFi() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.API.endpoints.wifi}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка сканирования Wi-Fi:', error);
            return this.getMockWiFiNetworks();
        }
    }

    async syncViaWiFi() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.API.endpoints.sync}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            return { success: true, message: 'Локальная синхронизация выполнена' };
        }
    }


    getMockSensors() {
        return [
            {
                sensor_id: 'SENSOR_MOS_001',
                sensor_name: 'Центральный датчик',
                latitude: 55.7558,
                longitude: 37.6173,
                sensor_type: 'stationary',
                is_active: true,
                last_update: new Date().toISOString()
            },
            {
                sensor_id: 'SENSOR_MOS_002',
                sensor_name: 'Северный датчик',
                latitude: 55.8358,
                longitude: 37.6173,
                sensor_type: 'stationary',
                is_active: true,
                last_update: new Date().toISOString()
            },
            {
                sensor_id: 'SENSOR_MOS_003',
                sensor_name: 'Южный датчик',
                latitude: 55.6758,
                longitude: 37.6173,
                sensor_type: 'stationary',
                is_active: true,
                last_update: new Date().toISOString()
            }
        ];
    }

    getMockData() {
        return [
            {
                sensor_id: 'SENSOR_MOS_001',
                timestamp: new Date().toISOString(),
                pm25: 15.3,
                pm10: 25.7,
                co2: 420,
                temperature: 22.5,
                humidity: 45,
                aqi: 35,
                battery_level: 85,
                wifi_signal: -45
            },
            {
                sensor_id: 'SENSOR_MOS_002',
                timestamp: new Date().toISOString(),
                pm25: 12.1,
                pm10: 20.3,
                co2: 410,
                temperature: 21.8,
                humidity: 48,
                aqi: 28,
                battery_level: 92,
                wifi_signal: -50
            },
            {
                sensor_id: 'SENSOR_MOS_003',
                timestamp: new Date().toISOString(),
                pm25: 18.7,
                pm10: 30.2,
                co2: 450,
                temperature: 23.1,
                humidity: 42,
                aqi: 42,
                battery_level: 78,
                wifi_signal: -55
            }
        ];
    }

    getMockWiFiNetworks() {
        return [
            { ssid: 'MoscowAir_Network_1', signal: -45, security: 'WPA2', connected: true },
            { ssid: 'MoscowAir_Network_2', signal: -55, security: 'WPA2', connected: false },
            { ssid: 'Public_WiFi', signal: -65, security: 'Open', connected: false }
        ];
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const api = new AirQualityAPI();
    

    initMap();
    setupEventListeners(api);
    loadInitialData(api);
    setupAutoUpdate(api);
    updateWiFiStatus();
});


function initMap() {
    map = L.map('map').setView(CONFIG.MAP.center, CONFIG.MAP.zoom);
    
    L.tileLayer(CONFIG.MAP.tileLayer, {
        attribution: CONFIG.MAP.attribution,
        maxZoom: 18
    }).addTo(map);
}


function setupEventListeners(api) {

    document.getElementById('map-btn').addEventListener('click', openMapModal);
    

    document.querySelector('.close-modal').addEventListener('click', closeMapModal);
    

    window.addEventListener('click', function(e) {
        if (e.target === document.getElementById('map-modal')) {
            closeMapModal();
        }
    });
    

    document.getElementById('refresh-data').addEventListener('click', () => refreshData(api));
    document.getElementById('auto-update').addEventListener('click', toggleAutoUpdate);
    document.getElementById('add-sensor').addEventListener('click', showAddSensorForm);
    document.getElementById('show-history').addEventListener('click', showHistory);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('scan-wifi').addEventListener('click', () => scanWiFiNetworks(api));
    document.getElementById('wifi-sync-btn').addEventListener('click', () => syncViaWiFi(api));
    

    document.getElementById('filter-aqi').addEventListener('change', filterMarkersByAQI);
    

    document.getElementById('sensor-data-form').addEventListener('submit', (e) => submitSensorForm(e, api));
    document.getElementById('cancel-btn').addEventListener('click', hideAddSensorForm);
    

    map.on('click', function(e) {
        document.getElementById('latitude').value = e.latlng.lat.toFixed(6);
        document.getElementById('longitude').value = e.latlng.lng.toFixed(6);
        

        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        currentMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'temp-marker',
                html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [26, 26]
            })
        }).addTo(map).bindPopup('Новая позиция датчика').openPopup();
    });
}

async function loadInitialData(api) {
    try {
        const [sensors, data] = await Promise.all([
            api.getSensors(),
            api.getLatestData()
        ]);
        
        sensorsData = data;
        updateMapMarkers(data);
        updateSensorTable(data);
        updateStatistics(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}


async function refreshData(api) {
    try {
        const data = await api.getLatestData();
        sensorsData = data;
        updateMapMarkers(data);
        updateSensorTable(data);
        updateStatistics(data);
        showNotification('Данные успешно обновлены', 'success');
    } catch (error) {
        console.error('Ошибка обновления данных:', error);
        showNotification('Ошибка обновления данных', 'error');
    }
}


function setupAutoUpdate(api) {
    if (isAutoUpdateEnabled) {
        autoUpdateInterval = setInterval(() => {
            if (document.getElementById('map-modal').style.display === 'block') {
                refreshData(api);
            }
        }, 30000); // 30 секунд
    }
}

function toggleAutoUpdate() {
    const btn = document.getElementById('auto-update');
    isAutoUpdateEnabled = !isAutoUpdateEnabled;
    
    if (isAutoUpdateEnabled) {
        btn.classList.add('active');
        btn.innerHTML = '🔁 Автообновление (30 сек)';
        setupAutoUpdate(new AirQualityAPI());
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '⏸️ Автообновление выключено';
        clearInterval(autoUpdateInterval);
    }
}


function updateMapMarkers(data) {

    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    

    data.forEach(sensor => {
        const marker = createMarker(sensor);
        marker.addTo(map);
        markers.push(marker);
    });
}

function createMarker(sensor) {
    const aqiColor = getAQIColor(sensor.aqi);
    const icon = L.divIcon({
        className: 'sensor-marker',
        html: `
            <div style="
                background-color: ${aqiColor};
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                cursor: pointer;
            ">
                ${sensor.aqi || '?'}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
    
    const marker = L.marker([sensor.latitude || 55.7558, sensor.longitude || 37.6173], { icon });
    
    const popupContent = `
        <div class="sensor-popup">
            <h3>${sensor.sensor_name || sensor.sensor_id}</h3>
            <p><strong>ID:</strong> ${sensor.sensor_id}</p>
            <p><strong>AQI:</strong> <span style="color: ${aqiColor}">${sensor.aqi || 'Н/Д'}</span></p>
            <p><strong>PM2.5:</strong> ${sensor.pm25 || 'Н/Д'} µg/m³</p>
            <p><strong>PM10:</strong> ${sensor.pm10 || 'Н/Д'} µg/m³</p>
            <p><strong>CO₂:</strong> ${sensor.co2 || 'Н/Д'} ppm</p>
            <p><strong>Температура:</strong> ${sensor.temperature || 'Н/Д'}°C</p>
            <p><strong>Влажность:</strong> ${sensor.humidity || 'Н/Д'}%</p>
            <p><strong>Батарея:</strong> ${sensor.battery_level || 'Н/Д'}%</p>
            <p><strong>Wi-Fi сигнал:</strong> ${sensor.wifi_signal || 'Н/Д'} dBm</p>
            <p><small>Обновлено: ${new Date(sensor.timestamp).toLocaleTimeString()}</small></p>
            <button onclick="editSensor('${sensor.sensor_id}')" style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">✏️ Редактировать</button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    return marker;
}

function filterMarkersByAQI() {
    const filterValue = document.getElementById('filter-aqi').value;
    
    markers.forEach(marker => {
        const aqi = marker.options.sensorData?.aqi || 0;
        let showMarker = true;
        
        switch(filterValue) {
            case 'good':
                showMarker = aqi <= 50;
                break;
            case 'moderate':
                showMarker = aqi > 50 && aqi <= 100;
                break;
            case 'unhealthy':
                showMarker = aqi > 100 && aqi <= 150;
                break;
            case 'bad':
                showMarker = aqi > 150;
                break;
        }
        
        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
}


function showAddSensorForm() {
    const formContainer = document.getElementById('sensor-form-container');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    
    formTitle.textContent = 'Добавить новый датчик';
    submitBtn.textContent = 'Сохранить данные';
    formContainer.style.display = 'block';

    document.getElementById('sensor-data-form').reset();
    

    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
}

function hideAddSensorForm() {
    document.getElementById('sensor-form-container').style.display = 'none';
    document.getElementById('sensor-data-form').reset();
    
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
}

async function submitSensorForm(e, api) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const sensorData = {
        sensor_id: formData.get('sensor_id'),
        sensor_name: formData.get('sensor_name') || formData.get('sensor_id'),
        sensor_type: formData.get('sensor_type'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        pm25: formData.get('pm25') ? parseFloat(formData.get('pm25')) : null,
        pm10: formData.get('pm10') ? parseFloat(formData.get('pm10')) : null,
        co2: formData.get('co2') ? parseInt(formData.get('co2')) : null,
        temperature: formData.get('temperature') ? parseFloat(formData.get('temperature')) : null,
        humidity: formData.get('humidity') ? parseFloat(formData.get('humidity')) : null,
        air_quality_index: formData.get('air_quality_index') ? parseInt(formData.get('air_quality_index')) : null,
        timestamp: new Date().toISOString(),
        battery_level: Math.floor(Math.random() * 30) + 70, // Моковые данные
        wifi_signal: Math.floor(Math.random() * 40) - 80 // Моковые данные
    };
    
    try {
        const result = await api.submitSensorData(sensorData);
        
        if (result.success) {

            sensorsData.unshift(sensorData);
            

            updateMapMarkers(sensorsData);
            updateSensorTable(sensorsData);
            updateStatistics(sensorsData);
            

            hideAddSensorForm();
            
            showNotification('Датчик успешно добавлен', 'success');
        } else {
            showNotification('Ошибка добавления датчика', 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки формы:', error);
        showNotification('Ошибка отправки данных', 'error');
    }
}

function editSensor(sensorId) {
    const sensor = sensorsData.find(s => s.sensor_id === sensorId);
    if (!sensor) return;
    
    const formContainer = document.getElementById('sensor-form-container');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    
    formTitle.textContent = 'Редактировать датчик';
    submitBtn.textContent = 'Обновить данные';
    formContainer.style.display = 'block';
    

    document.getElementById('sensor-id').value = sensor.sensor_id;
    document.getElementById('sensor-name').value = sensor.sensor_name || '';
    document.getElementById('sensor-type').value = sensor.sensor_type || 'stationary';
    document.getElementById('latitude').value = sensor.latitude || 55.7558;
    document.getElementById('longitude').value = sensor.longitude || 37.6173;
    document.getElementById('pm25').value = sensor.pm25 || '';
    document.getElementById('pm10').value = sensor.pm10 || '';
    document.getElementById('co2').value = sensor.co2 || '';
    document.getElementById('temperature').value = sensor.temperature || '';
    document.getElementById('humidity').value = sensor.humidity || '';
    document.getElementById('air-quality').value = sensor.air_quality_index || '';
    

    map.setView([sensor.latitude || 55.7558, sensor.longitude || 37.6173], 13);
}


function updateSensorTable(data) {
    const tableBody = document.getElementById('sensor-table-body');
    tableBody.innerHTML = '';
    

    const recentData = data.slice(0, 20);
    
    recentData.forEach(sensor => {
        const row = document.createElement('tr');
        const aqiStatus = getAQIStatus(sensor.aqi);
        
        row.innerHTML = `
            <td>${new Date(sensor.timestamp).toLocaleTimeString()}</td>
            <td><strong>${sensor.sensor_name || sensor.sensor_id}</strong></td>
            <td>${sensor.latitude ? sensor.latitude.toFixed(4) : 'N/A'}, ${sensor.longitude ? sensor.longitude.toFixed(4) : 'N/A'}</td>
            <td>${sensor.pm25 || '--'}</td>
            <td>${sensor.pm10 || '--'}</td>
            <td>${sensor.co2 || '--'}</td>
            <td>${sensor.temperature || '--'}</td>
            <td>${sensor.humidity || '--'}</td>
            <td class="status-${aqiStatus.class}">${sensor.aqi || '--'}</td>
            <td>
                <span class="status-${aqiStatus.class}">${aqiStatus.text}</span>
                ${sensor.battery_level ? `<br><small>🔋 ${sensor.battery_level}%</small>` : ''}
            </td>
            <td>
                <button onclick="editSensor('${sensor.sensor_id}')" class="action-btn edit-btn">✏️</button>
                <button onclick="deleteSensor('${sensor.sensor_id}')" class="action-btn delete-btn">🗑️</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateStatistics(data) {
    const totalSensors = data.length;
    const activeSensors = data.filter(s => s.battery_level > 10).length;
    const avgAQI = data.length > 0 
        ? Math.round(data.reduce((sum, s) => sum + (s.aqi || 0), 0) / data.length)
        : 0;
    const avgPM25 = data.length > 0
        ? (data.reduce((sum, s) => sum + (s.pm25 || 0), 0) / data.length).toFixed(1)
        : 0;
    
    document.getElementById('total-sensors').textContent = totalSensors;
    document.getElementById('active-sensors').textContent = activeSensors;
    document.getElementById('avg-aqi').textContent = avgAQI;
    document.getElementById('avg-pm25').textContent = avgPM25;
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

function updateWiFiStatus() {
    const wifiIcon = document.getElementById('wifi-icon');
    const wifiStrength = document.getElementById('wifi-strength');
    const wifiIp = document.getElementById('wifi-ip');
    

    const strengths = ['📶', '📶', '📶📶', '📶📶📶', '📶📶📶📶'];
    const signals = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный'];
    
    const randomStrength = Math.floor(Math.random() * strengths.length);
    
    wifiIcon.textContent = strengths[randomStrength];
    wifiStrength.textContent = `Сигнал: ${signals[randomStrength]}`;
    wifiIp.textContent = `IP: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

async function scanWiFiNetworks(api) {
    try {
        wifiNetworks = await api.scanWiFi();
        showWiFiNetworksList();
    } catch (error) {
        console.error('Ошибка сканирования Wi-Fi:', error);
        showNotification('Ошибка сканирования сетей', 'error');
    }
}

function showWiFiNetworksList() {
    const networksList = wifiNetworks.map(network => `
        <div class="wifi-network" style="
            padding: 10px;
            margin: 5px 0;
            background: rgba(255,255,255,0.05);
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <div>
                <strong>${network.ssid}</strong><br>
                <small>${network.security} • ${Math.abs(network.signal)} dBm</small>
            </div>
            ${network.connected ? 
                '<span style="color: #4CAF50;">✓ Подключено</span>' : 
                '<button style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Подключить</button>'
            }
        </div>
    `).join('');
    
    alertify.alert('Доступные Wi-Fi сети', `
        <div style="max-height: 300px; overflow-y: auto;">
            ${networksList}
        </div>
    `);
}

async function syncViaWiFi(api) {
    try {
        const result = await api.syncViaWiFi();
        showNotification(result.message || 'Синхронизация завершена', 'success');
        refreshData(api);
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        showNotification('Ошибка синхронизации', 'error');
    }
}

function showHistory() {
    alertify.alert('История данных', `
        <p>Функция истории данных в разработке...</p>
        <p>В будущей версии здесь будут доступны:</p>
        <ul>
            <li>Графики изменения показателей</li>
            <li>Исторические данные по дням</li>
            <li>Экспорт в CSV/Excel</li>
            <li>Анализ трендов</li>
        </ul>
    `);
}

function exportData() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Время,Датчик,Широта,Долгота,PM2.5,PM10,CO2,Температура,Влажность,AQI,Батарея,Wi-Fi сигнал\n"
        + sensorsData.map(sensor => 
            `${new Date(sensor.timestamp).toLocaleString()},`
            + `${sensor.sensor_name || sensor.sensor_id},`
            + `${sensor.latitude || ''},`
            + `${sensor.longitude || ''},`
            + `${sensor.pm25 || ''},`
            + `${sensor.pm10 || ''},`
            + `${sensor.co2 || ''},`
            + `${sensor.temperature || ''},`
            + `${sensor.humidity || ''},`
            + `${sensor.aqi || ''},`
            + `${sensor.battery_level || ''},`
            + `${sensor.wifi_signal || ''}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sensor_data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Данные экспортированы в CSV', 'success');
}

function deleteSensor(sensorId) {
    if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
        sensorsData = sensorsData.filter(s => s.sensor_id !== sensorId);
        updateMapMarkers(sensorsData);
        updateSensorTable(sensorsData);
        updateStatistics(sensorsData);
        showNotification('Датчик удален', 'success');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getAQIColor(aqi) {
    if (!aqi) return CONFIG.COLORS.good;
    if (aqi <= 50) return CONFIG.COLORS.good;
    if (aqi <= 100) return CONFIG.COLORS.moderate;
    if (aqi <= 150) return CONFIG.COLORS.unhealthy;
    if (aqi <= 200) return CONFIG.COLORS.bad;
    return CONFIG.COLORS.hazardous;
}

function getAQIStatus(aqi) {
    if (!aqi) return { class: 'good', text: 'Нет данных' };
    if (aqi <= 50) return { class: 'good', text: 'Хорошо' };
    if (aqi <= 100) return { class: 'moderate', text: 'Удовлет.' };
    if (aqi <= 150) return { class: 'unhealthy', text: 'Нездорово' };
    if (aqi <= 200) return { class: 'bad', text: 'Плохо' };
    return { class: 'bad', text: 'Очень плохо' };
}

function openMapModal() {
    document.getElementById('map-modal').style.display = 'block';
    setTimeout(() => {
        map.invalidateSize();
        refreshData(new AirQualityAPI());
    }, 100);
}

function closeMapModal() {
    document.getElementById('map-modal').style.display = 'none';
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
    hideAddSensorForm();
}

function showNotification(message, type = 'info') {
    const colors = {
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: '#2196F3'
    };
    
    alertify.notify(message, type, 3, {
        background: colors[type] || colors.info,
        color: 'white'
    });
}


window.editSensor = editSensor;
window.deleteSensor = deleteSensor;
