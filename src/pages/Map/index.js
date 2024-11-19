import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component để tự động cập nhật vị trí
const LocationMarker = () => {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useEffect(() => {
    // Hàm xử lý khi tìm thấy vị trí
    const onLocationFound = (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 16); // Zoom level 16 để thấy rõ khu vực xung quanh
    };

    // Hàm xử lý khi có lỗi
    const onLocationError = (e) => {
      console.log("Không thể lấy vị trí:", e.message);
    };

    // Đăng ký các event handlers
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    // Bắt đầu theo dõi vị trí
    map.locate({ 
      watch: true, // Theo dõi liên tục
      enableHighAccuracy: true // Độ chính xác cao
    });

    // Cleanup khi component unmount
    return () => {
      map.stopLocate();
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        Vị trí của bạn<br />
        Vĩ độ: {position.lat.toFixed(4)}<br />
        Kinh độ: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  );
};

const Map = () => {
  const defaultPosition = [21.0285, 105.8542]; // Vị trí mặc định (Hà Nội)
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMap, setActiveMap] = useState('street');

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

  const handleMapChange = (mapKey) => {
    setActiveMap(mapKey);
    setShowDropdown(false);
  };

  // Click outside to close dropdown
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

        {/* Dropdown Button */}
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

            {/* Dropdown Menu */}
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
    </div>
  );
};

export default Map;