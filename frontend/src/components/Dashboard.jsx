import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  BatteryLow, 
  BatteryFull, 
  BatteryMedium, 
  Server, 
  Power, 
  Cpu, 
  MemoryStick, 
  Calendar 
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';

// Custom colored markers
const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Color-coded icons
const greenIcon = createColoredIcon('green');
const redIcon = createColoredIcon('red');
const yellowIcon = createColoredIcon('yellow');

// Custom map update component
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// Custom marker function with color-coded icons
const RobotMarkers = ({ robots }) => {
  return robots.map(robot => {
    // Determine icon based on robot status
    let markerIcon = greenIcon;
    if (!robot['Online/Offline']) {
      markerIcon = redIcon;
    } else if (robot['Battery Percentage'] < 20) {
      markerIcon = yellowIcon;
    }

    return (
      <Marker
        key={robot['Robot ID']}
        position={robot['Location Coordinates']}
        icon={markerIcon}
      >
        <Popup>
          <div className="p-2">
            <h3 className="text-lg font-bold mb-2 text-center">
              Robot {robot['Robot ID'].slice(0, 8)}
            </h3>
            <div className="space-y-1">
              <p className="flex justify-between items-center">
                <span className="flex items-center">
                  <Power className="mr-2 w-4 h-4" />
                  Status:
                </span> 
                <span className={
                  robot['Online/Offline'] 
                    ? (robot['Battery Percentage'] < 20 ? 'text-yellow-500' : 'text-green-500')
                    : 'text-red-500'
                }>
                  {robot['Online/Offline'] 
                    ? (robot['Battery Percentage'] < 20 ? 'Online (Low Battery)' : 'Online')
                    : 'Offline'}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="flex items-center">
                  <BatteryLow className="mr-2 w-4 h-4" />
                  Battery:
                </span> 
                <span>{robot['Battery Percentage']}%</span>
              </p>
              <p className="flex justify-between items-center">
                <span className="flex items-center">
                  <Cpu className="mr-2 w-4 h-4" />
                  CPU Usage:
                </span> 
                <span>{robot['CPU Usage']}%</span>
              </p>
              <p className="flex justify-between items-center">
                <span className="flex items-center">
                  <MemoryStick className="mr-2 w-4 h-4" />
                  RAM:
                </span> 
                <span>{robot['RAM Consumption']} MB</span>
              </p>
              <p className="flex justify-between items-center text-gray-500">
                <span className="flex items-center">
                  <Calendar className="mr-2 w-4 h-4" />
                  Last Updated:
                </span> 
                <span>{robot['Last Updated']}</span>
              </p>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });
};

const Dashboard = () => {
  const [robots, setRobots] = useState([]);
  const [filter, setFilter] = useState('all');
  const mapRef = useRef(null);

  // Fetch and socket setup
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const response = await fetch('http://localhost:5000/robots');
        const data = await response.json();
        setRobots(data);
      } catch (error) {
        console.error('Failed to fetch robots:', error);
      }
    };

    fetchRobots();

    const socket = io('http://localhost:5000');
    socket.on('update', (updatedRobots) => {
      setRobots(updatedRobots);
    });

    return () => socket.disconnect();
  }, []);

  // Filter robots
  const filteredRobots = robots.filter(robot => {
    switch(filter) {
      case 'online':
        return robot['Online/Offline'];
      case 'offline':
        return !robot['Online/Offline'];
      case 'low-battery':
        return robot['Online/Offline'] && robot['Battery Percentage'] < 20;
      default:
        return true;
    }
  });

  // Calculate map center
  const calculateMapCenter = () => {
    if (filteredRobots.length === 0) return [0, 0];
    
    const latSum = filteredRobots.reduce((sum, robot) => sum + robot['Location Coordinates'][0], 0);
    const lngSum = filteredRobots.reduce((sum, robot) => sum + robot['Location Coordinates'][1], 0);
    
    return [
      latSum / filteredRobots.length, 
      lngSum / filteredRobots.length
    ];
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-20  space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center  border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400 flex items-center">
          <Server className="mr-3 w-8 h-8" />
          Robot Fleet Dashboard
        </h1>
        <div className="flex space-x-2">
          <div className="bg-cyan-600/20 border border-cyan-500/50 px-3 py-1 rounded">
            Total Robots: {robots.length}
          </div>
          <div className="bg-cyan-600/20 border border-cyan-500/50 px-3 py-1 rounded">
            Active: {filteredRobots.length}
          </div>
        </div>
      </div>

      {/* Color Key */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-semibold mb-3 text-cyan-400">Color Key</h3>
        <div className="flex space-x-6 justify-center">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-500 mr-2 rounded"></div>
            <span>Online</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-yellow-500 mr-2 rounded"></div>
            <span>Online (Low Battery)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-red-500 mr-2 rounded"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-center space-x-4 mb-6">
        {[
          { label: 'All Robots', value: 'all' },
          { label: 'Online', value: 'online' },
          { label: 'Offline', value: 'offline' },
          { label: 'Low Battery', value: 'low-battery' }
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`
              px-4 py-2 rounded transition-colors flex items-center
              ${filter === value 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-[600px] bg-gray-800 rounded-lg overflow-hidden">
        {filteredRobots.length > 0 && (
          <MapContainer
            center={calculateMapCenter()}
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
          >
            <MapUpdater 
              center={calculateMapCenter()} 
              zoom={3} 
            />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <RobotMarkers robots={filteredRobots} />
          </MapContainer>
        )}
      </div>

      {/* Robot List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr className="text-cyan-400">
              <th className="p-3 text-left">Robot ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Battery</th>
              <th className="p-3">CPU Usage</th>
              <th className="p-3">RAM</th>
              <th className="p-3">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredRobots.map(robot => (
              <tr 
                key={robot['Robot ID']}
                className={`
                  border-b border-gray-700 
                  ${!robot['Online/Offline'] ? 'opacity-50' : ''}
                `}
              >
                <td className="p-3 text-cyan-300">{robot['Robot ID'].slice(0, 8)}</td>
                <td className="p-3 text-center">
                  <span className={
                    robot['Online/Offline'] 
                      ? (robot['Battery Percentage'] < 20 ? 'text-yellow-500' : 'text-green-500')
                      : 'text-red-500'
                  }>
                    {robot['Online/Offline'] 
                      ? (robot['Battery Percentage'] < 20 ? 'Online (Low Battery)' : 'Online')
                      : 'Offline'}
                  </span>
                </td>
                <td className="p-3 text-center">{robot['Battery Percentage']}%</td>
                <td className="p-3 text-center">{robot['CPU Usage']}%</td>
                <td className="p-3 text-center">{robot['RAM Consumption']} MB</td>
                <td className="p-3 text-center">{robot['Last Updated']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map View */}
      
    </div>
  );
};

export default Dashboard;