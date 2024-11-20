import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';

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

export default LocationMarker;