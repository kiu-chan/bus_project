import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';

const LocationMarker = ({ busStations, onNearestStation }) => {
  const [position, setPosition] = useState(null);
  const map = useMap();

  // Hàm tính khoảng cách giữa 2 điểm theo công thức Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Tìm trạm gần nhất
  const findNearestStation = (currentPosition) => {
    if (!busStations.length) return null;

    let nearestStation = null;
    let shortestDistance = Infinity;

    busStations.forEach(station => {
      const distance = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        station.coordinates[0],
        station.coordinates[1]
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestStation = { ...station, distance };
      }
    });

    return nearestStation;
  };

  // Click handler cho nút tìm trạm gần nhất
  const handleFindNearestStation = () => {
    const nearest = findNearestStation(position);
    if (nearest) {
      onNearestStation(nearest);
    }
  };

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
          <button 
            onClick={handleFindNearestStation}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1 text-sm"
          >
            <MapPin size={16} />
            Tìm trạm gần nhất
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

export default LocationMarker;