// MapComponent.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import LocationMarker from './LocationMarker';
import AdvancedSearch from './AdvancedSearch';
import 'leaflet/dist/leaflet.css';

// Cấu hình icon mặc định cho Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icon cho trạm bus
const busStopIcon = L.icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// Icon cho trạm đang chọn
const selectedBusStopIcon = L.icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  className: 'selected-station-marker' // Thêm class để style
});

// Cấu hình các loại bản đồ
const mapLayers = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'Bản đồ đường phố'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    name: 'Bản đồ vệ tinh'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    name: 'Bản đồ địa hình'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    name: 'Bản đồ tối'
  }
};

const MapComponent = () => {
  // States
  const defaultPosition = [21.0285, 105.8542];
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMap, setActiveMap] = useState('street');
  const [busStations, setBusStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationRoutes, setStationRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [routeStations, setRouteStations] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Lấy dữ liệu đường đi từ OSRM
  const getRoute = async (start, end) => {
    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      return response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    } catch (error) {
      console.error('Error fetching route:', error);
      return null;
    }
  };

  // Tính toán đường đi hoàn chỉnh
  const calculateFullRoute = async (stations) => {
    if (stations.length < 2) return [];

    let fullPath = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const start = stations[i].coordinates;
      const end = stations[i + 1].coordinates;
      const segment = await getRoute(start, end);
      if (segment) {
        fullPath = fullPath.concat(segment);
      }
    }
    return fullPath;
  };

  // Xử lý thay đổi loại bản đồ
  const handleMapChange = (mapKey) => {
    setActiveMap(mapKey);
    setShowDropdown(false);
  };

  // Xử lý khi chọn trạm
  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setRoutePath(null);
    setSelectedRoute(null);
    setRouteInfo(null);
    fetchStationRoutes(station);
  };

  // Xử lý khi chọn tuyến
  const handleRouteSelect = async (routeId) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedRoute(routeId);
      
      // Lấy thông tin tuyến
      const routeResponse = await axios.get(`http://localhost:3001/api/bus-stations`);
      const route = routeResponse.data.find(r => r.tuyen_id === routeId);
      setRouteInfo(route);
      
      // Lấy các trạm trên tuyến
      await fetchRouteStations(routeId);
      
    } catch (error) {
      console.error('Lỗi khi tải thông tin tuyến:', error);
      setError('Không thể tải thông tin tuyến. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách các trạm trên tuyến
  const fetchRouteStations = async (routeId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/route-stations/${routeId}`);
      
      const sortedStations = response.data
        .sort((a, b) => a.thu_tu_tram - b.thu_tu_tram)
        .map(station => ({
          ...station,
          coordinates: [station.toa_do.x, station.toa_do.y]
        }));

      setRouteStations(sortedStations);
      
      // Tính toán đường đi
      const path = await calculateFullRoute(sortedStations);
      setRoutePath(path);
      
    } catch (error) {
      console.error('Error fetching route stations:', error);
      setError('Không thể tải thông tin tuyến. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách các tuyến đi qua trạm
  const fetchStationRoutes = async (station) => {
    if (!station) return;

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/station-routes/${station.tram_id}`);
      setStationRoutes(response.data);
    } catch (error) {
      console.error('Lỗi khi tải thông tin tuyến:', error);
      setStationRoutes([]);
      setError('Không thể tải thông tin tuyến. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchBusStations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('http://localhost:3001/api/bus-routes');
        
        const formattedStations = response.data.map(station => ({
          ...station,
          coordinates: [station.toa_do.x, station.toa_do.y]
        }));

        setBusStations(formattedStations);
      } catch (error) {
        console.error('Lỗi khi tải danh sách trạm:', error);
        setError('Không thể tải danh sách trạm bus. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusStations();
  }, []);

  // Handle dropdown close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="w-full h-screen relative">
      <MapContainer 
        center={defaultPosition} 
        zoom={13} 
        className="w-full h-full"
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        
        <TileLayer
          attribution={mapLayers[activeMap].attribution}
          url={mapLayers[activeMap].url}
        />

        <LocationMarker />
        
        <AdvancedSearch 
          busStations={busStations}
          onStationSelect={handleStationSelect}
          onRouteSelect={handleRouteSelect}
        />

        {/* Hiển thị đường đi */}
        {routePath && (
          <Polyline
            positions={routePath}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}

        {/* Hiển thị các trạm */}
        {busStations.map((station) => (
          <Marker
            key={station.tram_id}
            position={station.coordinates}
            icon={selectedStation?.tram_id === station.tram_id ? selectedBusStopIcon : busStopIcon}
            eventHandlers={{
              click: () => handleStationSelect(station),
            }}
          >
            <Popup>
              <div className="font-sans p-2">
                <h3 className="font-bold text-lg mb-2">{station.ten_tram}</h3>
                <div className="text-sm space-y-1">
                  <p>ID Trạm: {station.tram_id}</p>
                  <p>Trạng thái: {station.trang_thai}</p>
                  
                  {stationRoutes.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-2">Các tuyến bus đi qua:</h4>
                      <ul className="space-y-1">
                        {stationRoutes.map(route => (
                          <li 
                            key={route.tuyen_id} 
                            className={`border-b pb-1 last:border-b-0 cursor-pointer hover:bg-blue-50 p-2 rounded ${
                              selectedRoute === route.tuyen_id ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => handleRouteSelect(route.tuyen_id)}
                          >
                            <span className="font-medium">{route.ten_tuyen}</span>
                            <div className="text-xs text-gray-600">
                              {route.diem_dau} → {route.diem_cuoi}
                            </div>
                            {route.thoi_gian_hoat_dong && (
                              <div className="text-xs text-gray-500 mt-1">
                                Thời gian: {route.thoi_gian_hoat_dong}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dropdown chọn loại bản đồ */}
        <div className="absolute top-5 left-5 z-[1000]">
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2"
            >
              <span>{mapLayers[activeMap].name}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-md shadow-lg">
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => handleMapChange(key)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                      activeMap === key ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Route Info Panel */}
        {routeInfo && (
          <div className="absolute bottom-5 left-5 z-[1000] bg-white p-4 rounded-lg shadow-lg max-w-md">
            <h3 className="font-bold text-lg mb-2">{routeInfo.ten_tuyen}</h3>
            <div className="text-sm space-y-2">
              <p><span className="font-medium">Điểm đầu:</span> {routeInfo.diem_dau}</p>
              <p><span className="font-medium">Điểm cuối:</span> {routeInfo.diem_cuoi}</p>
              {routeInfo.thoi_gian_hoat_dong && (
                <p><span className="font-medium">Thời gian hoạt động:</span> {routeInfo.thoi_gian_hoat_dong}</p>
              )}
              
              {routeStations.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Danh sách các trạm trên tuyến:</p>
                  <div className="max-h-40 overflow-y-auto">
                    {routeStations.map((station, index) => (
                      <div 
                        key={station.tram_id}
                        className={`p-2 ${index < routeStations.length - 1 ? 'border-b' : ''} 
                          ${selectedStation?.tram_id === station.tram_id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="font-medium">{station.ten_tram}</div>
                        <div className="text-xs text-gray-500">Thứ tự: {station.thu_tu_tram}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setRouteInfo(null);
                  setRoutePath(null);
                  setSelectedRoute(null);
                  setRouteStations([]);
                }}
                className="mt-3 w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Đóng thông tin tuyến
              </button>
            </div>
          </div>
        )}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700">Đang tải...</span>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-[1001] max-w-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="absolute top-1 right-1 text-red-700 hover:text-red-900"
          >
            <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}

      {/* CSS cho selected station marker */}
      <style jsx global>{`
        .selected-station-marker {
          filter: hue-rotate(120deg) saturate(1.5);
          transform-origin: bottom center;
          animation: bounce 0.5s ease infinite alternate;
        }
        
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;