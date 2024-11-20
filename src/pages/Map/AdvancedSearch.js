// AdvancedSearch.js
import React, { useState, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { Search, ChevronDown, MapPin, Bus } from 'lucide-react';
import debounce from 'lodash/debounce';
import axios from 'axios';

const AdvancedSearch = ({ busStations, onStationSelect, onRouteSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchMode, setSearchMode] = useState('station'); // 'station', 'route', 'location'
  const [searchTerm, setSearchTerm] = useState('');
  const [routeData, setRouteData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const map = useMap();

  // Fetch tất cả các tuyến bus khi component mount
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/bus-stations');
        setRouteData(response.data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách tuyến:', error);
      }
    };
    fetchRoutes();
  }, []);

  // Hàm tìm kiếm theo từng mode
  const searchByMode = useCallback((term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();

    switch (searchMode) {
      case 'station':
        const stationResults = busStations
          .filter(station => 
            station.ten_tram.toLowerCase().includes(normalizedTerm)
          )
          .slice(0, 5);
        setSearchResults(stationResults);
        break;

      case 'route':
        const routeResults = routeData
          .filter(route => 
            route.ten_tuyen.toLowerCase().includes(normalizedTerm) ||
            route.tuyen_id.toString().includes(normalizedTerm)
          )
          .slice(0, 5);
        setSearchResults(routeResults);
        break;

      case 'location':
        const locationResults = routeData
          .filter(route => 
            route.diem_dau.toLowerCase().includes(normalizedTerm) ||
            route.diem_cuoi.toLowerCase().includes(normalizedTerm)
          )
          .slice(0, 5);
        setSearchResults(locationResults);
        break;
    }
  }, [busStations, routeData, searchMode]);

  const debouncedSearch = useCallback(
    debounce((term) => searchByMode(term), 300),
    [searchByMode]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleResultSelect = (result) => {
    setSearchTerm('');
    setSearchResults([]);

    if (searchMode === 'station') {
      onStationSelect(result);
      map.flyTo(result.coordinates, 16);
    } else {
      onRouteSelect(result.tuyen_id);
    }
  };

  const getPlaceholder = () => {
    switch (searchMode) {
      case 'station':
        return 'Tìm kiếm trạm bus...';
      case 'route':
        return 'Tìm kiếm theo số tuyến...';
      case 'location':
        return 'Tìm kiếm theo điểm đầu/cuối...';
      default:
        return 'Tìm kiếm...';
    }
  };

  return (
    <div className="absolute top-5 right-5 z-[1000] w-80">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Search Mode Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              searchMode === 'station' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => handleSearchModeChange('station')}
          >
            Trạm
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              searchMode === 'route' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => handleSearchModeChange('route')}
          >
            Tuyến
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              searchMode === 'location' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => handleSearchModeChange('location')}
          >
            Địa điểm
          </button>
        </div>

        {/* Search Input */}
        <div className="relative p-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute right-5 top-5 h-5 w-5 text-gray-400" />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border-t max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={searchMode === 'station' ? result.tram_id : result.tuyen_id}
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
              >
                {searchMode === 'station' ? (
                  // Kết quả tìm kiếm trạm
                  <div>
                    <div className="font-medium">{result.ten_tram}</div>
                    <div className="text-sm text-gray-500">ID: {result.tram_id}</div>
                  </div>
                ) : (
                  // Kết quả tìm kiếm tuyến hoặc địa điểm
                  <div>
                    <div className="font-medium">{result.ten_tuyen}</div>
                    <div className="text-sm text-gray-500">
                      {result.diem_dau} → {result.diem_cuoi}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;