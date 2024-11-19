import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busStopIcon = L.icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const LocationMarker = () => {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useEffect(() => {
    const onLocationFound = (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 16);
    };

    const onLocationError = (e) => {
      console.log("Không thể lấy vị trí:", e.message);
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    map.locate({ 
      watch: true,
      enableHighAccuracy: true 
    });

    return () => {
      map.stopLocate();
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="font-sans">
          <h3 className="font-bold">Vị trí của bạn</h3>
          <p className="text-sm">Vĩ độ: {position.lat.toFixed(4)}</p>
          <p className="text-sm">Kinh độ: {position.lng.toFixed(4)}</p>
        </div>
      </Popup>
    </Marker>
  );
};

const Map = () => {
  const defaultPosition = [21.0285, 105.8542];
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMap, setActiveMap] = useState('street');
  const [busStations, setBusStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationRoutes, setStationRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeStations, setRouteStations] = useState([]);
  const [routePath, setRoutePath] = useState(null);

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

  // Hàm lấy đường đi từ OSRM
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

  // Hàm tính toán đường đi hoàn chỉnh
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

  const handleMapChange = (mapKey) => {
    setActiveMap(mapKey);
    setShowDropdown(false);
  };

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
      
      // Tính toán đường đi thực tế
      const path = await calculateFullRoute(sortedStations);
      setRoutePath(path);
      
    } catch (error) {
      console.error('Error fetching route stations:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    const fetchStationRoutes = async () => {
      if (!selectedStation) return;

      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3001/api/station-routes/${selectedStation.tram_id}`);
        setStationRoutes(response.data);
      } catch (error) {
        console.error('Lỗi khi tải thông tin tuyến:', error);
        setStationRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStationRoutes();
  }, [selectedStation]);

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
            icon={busStopIcon}
            eventHandlers={{
              click: () => {
                setSelectedStation(station);
                setRoutePath(null); // Xóa đường đi cũ khi chọn trạm mới
              },
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
                            className="border-b pb-1 last:border-b-0 cursor-pointer hover:bg-blue-50 p-2 rounded"
                            onClick={() => fetchRouteStations(route.tuyen_id)}
                          >
                            <span className="font-medium">{route.ten_tuyen}</span>
                            <div className="text-xs text-gray-600">
                              {route.diem_dau} → {route.diem_cuoi}
                            </div>
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

        {/* Dropdown cho loại bản đồ */}
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
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            Đang tải...
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;