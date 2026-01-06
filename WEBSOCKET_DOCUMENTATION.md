# WebSocket Real-Time Location Tracking - Documentation

## Overview
This WebSocket implementation provides real-time driver location tracking similar to Uber, Ola, and other ride-hailing apps.

## Connection
```javascript
const socket = io('http://localhost:5000');
```

## WebSocket Events

### Driver Events

#### 1. **Driver Goes Online**
```javascript
// Emit when driver app starts
socket.emit('driver:online', {
  driverId: 'DR001',
  name: 'John Doe',
  vehicleType: 'sedan',
  location: {
    latitude: 28.6139,
    longitude: 77.2090
  }
});
```

#### 2. **Driver Location Update**
```javascript
// Emit every 5-10 seconds while driving
socket.emit('driver:location', {
  driverId: 'DR001',
  location: {
    latitude: 28.6139,
    longitude: 77.2090
  },
  speed: 45, // km/h
  heading: 180 // degrees (0-360)
});

// Listen for location updates
socket.on('driver:location:update', (data) => {
  console.log('Driver location updated:', data);
  // { driverId, location, speed, heading, timestamp }
});
```

#### 3. **Driver Status Change**
```javascript
// Change status (available, busy, offline)
socket.emit('driver:status', {
  driverId: 'DR001',
  status: 'busy' // 'available' | 'busy' | 'offline'
});

// Listen for status updates
socket.on('driver:status:update', (data) => {
  console.log('Driver status:', data);
  // { driverId, status }
});
```

#### 4. **Receive Ride Request**
```javascript
socket.on('ride:request:received', (data) => {
  console.log('New ride request:', data);
  // { requestId, pickup, dropoff, fare, userId, distance }
});
```

#### 5. **Accept Ride**
```javascript
socket.emit('ride:accept', {
  requestId: 'REQ-123456',
  driverId: 'DR001',
  userId: 'USER-001'
});
```

#### 6. **Reject Ride**
```javascript
socket.emit('ride:reject', {
  requestId: 'REQ-123456',
  driverId: 'DR001'
});
```

#### 7. **Start Ride**
```javascript
socket.emit('ride:start', {
  rideId: 'RIDE-123456',
  driverId: 'DR001'
});

socket.on('ride:started', (data) => {
  // { rideId, driverId, timestamp }
});
```

#### 8. **Complete Ride**
```javascript
socket.emit('ride:complete', {
  rideId: 'RIDE-123456',
  driverId: 'DR001'
});

socket.on('ride:completed', (data) => {
  // { rideId, driverId, timestamp }
});
```

### User/Customer Events

#### 1. **Request Nearby Drivers**
```javascript
socket.emit('user:request:nearby', {
  location: {
    latitude: 28.6139,
    longitude: 77.2090
  },
  radius: 5 // km
});

// Receive nearby drivers
socket.on('drivers:nearby', (drivers) => {
  console.log('Nearby drivers:', drivers);
  // Array of drivers with distance
});
```

#### 2. **Send Ride Request**
```javascript
socket.emit('ride:request', {
  driverId: 'DR001',
  rideDetails: {
    pickup: {
      address: 'Connaught Place',
      latitude: 28.6304,
      longitude: 77.2177
    },
    dropoff: {
      address: 'India Gate',
      latitude: 28.6129,
      longitude: 77.2295
    },
    fare: 250,
    distance: 5.2,
    userId: 'USER-001'
  }
});
```

#### 3. **Listen for Ride Acceptance**
```javascript
socket.on('ride:accepted', (data) => {
  console.log('Driver accepted:', data);
  // { requestId, driverId, driver }
});

socket.on('ride:rejected', (data) => {
  console.log('Driver rejected:', data);
  // { requestId, driverId }
});
```

### Admin/Dashboard Events

#### 1. **Get All Active Drivers**
```javascript
socket.emit('drivers:get:all');

socket.on('drivers:list', (drivers) => {
  console.log('Active drivers:', drivers);
  // Array of all online drivers with locations
});
```

#### 2. **Monitor Driver Status**
```javascript
socket.on('driver:status', (data) => {
  console.log('Driver status change:', data);
  // { driverId, status, location }
});

socket.on('driver:offline', (data) => {
  console.log('Driver went offline:', data.driverId);
});
```

## REST API Endpoints

### 1. **Update Driver Location (HTTP)**
```
POST /api/drivers/location/update
Content-Type: application/json

{
  "driverId": "DR001",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "address": "Connaught Place, New Delhi",
  "speed": 45,
  "heading": 180
}
```

### 2. **Get Nearby Drivers (HTTP)**
```
POST /api/drivers/nearby
Content-Type: application/json

{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "radius": 5,
  "vehicleType": "sedan" // optional
}
```

### 3. **Update Driver Availability (HTTP)**
```
PUT /api/drivers/availability/:driverId
Content-Type: application/json

{
  "availability": "available" // 'available' | 'busy' | 'offline'
}
```

### 4. **Get Driver Location History (HTTP)**
```
GET /api/drivers/location/history/:driverId?limit=50
```

## Implementation Examples

### Driver App Example (React Native/Mobile)
```javascript
import io from 'socket.io-client';
import Geolocation from '@react-native-community/geolocation';

const socket = io('http://localhost:5000');
let locationWatcher = null;

// Go online
const goOnline = (driverData) => {
  socket.emit('driver:online', driverData);
  
  // Start location tracking
  locationWatcher = Geolocation.watchPosition(
    (position) => {
      socket.emit('driver:location', {
        driverId: driverData.driverId,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        speed: position.coords.speed * 3.6, // m/s to km/h
        heading: position.coords.heading
      });
    },
    (error) => console.error(error),
    { 
      enableHighAccuracy: true,
      distanceFilter: 10, // Update every 10 meters
      interval: 5000 // Check every 5 seconds
    }
  );
};

// Go offline
const goOffline = () => {
  if (locationWatcher) {
    Geolocation.clearWatch(locationWatcher);
  }
  socket.disconnect();
};
```

### Customer App Example (React)
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function RideBooking() {
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Listen for nearby drivers
    newSocket.on('drivers:nearby', (drivers) => {
      setNearbyDrivers(drivers);
    });

    // Listen for driver location updates
    newSocket.on('driver:location:update', (data) => {
      setNearbyDrivers(prev => 
        prev.map(driver => 
          driver.driverId === data.driverId 
            ? { ...driver, location: data.location }
            : driver
        )
      );
    });

    return () => newSocket.close();
  }, []);

  const findNearbyDrivers = (userLocation) => {
    socket.emit('user:request:nearby', {
      location: userLocation,
      radius: 5
    });
  };

  return (
    <div>
      <h2>Nearby Drivers: {nearbyDrivers.length}</h2>
      {nearbyDrivers.map(driver => (
        <div key={driver.driverId}>
          {driver.name} - {driver.distance} km away
        </div>
      ))}
    </div>
  );
}
```

### Admin Dashboard Example
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function AdminDashboard() {
  const [activeDrivers, setActiveDrivers] = useState([]);
  const socket = io('http://localhost:5000');

  useEffect(() => {
    // Get all drivers on mount
    socket.emit('drivers:get:all');

    socket.on('drivers:list', (drivers) => {
      setActiveDrivers(drivers);
    });

    socket.on('driver:location:update', (data) => {
      setActiveDrivers(prev => 
        prev.map(driver => 
          driver.driverId === data.driverId 
            ? { ...driver, location: data.location }
            : driver
        )
      );
    });

    socket.on('driver:offline', (data) => {
      setActiveDrivers(prev => 
        prev.filter(d => d.driverId !== data.driverId)
      );
    });

    return () => socket.close();
  }, []);

  return (
    <div>
      <h2>Active Drivers: {activeDrivers.length}</h2>
      {/* Render map with driver markers */}
    </div>
  );
}
```

## Features Implemented

✅ **Real-time driver location tracking**
✅ **Nearby driver search with geospatial queries**
✅ **Driver availability management**
✅ **Ride request/accept/reject flow**
✅ **Location history tracking**
✅ **Automatic cleanup of inactive drivers**
✅ **Both WebSocket and REST API support**
✅ **Distance calculation using Haversine formula**
✅ **Driver status broadcasting**

## Performance Considerations

- Location updates are limited to every 5-10 seconds to reduce server load
- Location history is capped at 100 points per driver
- Inactive drivers are cleaned up after 10 minutes of no updates
- MongoDB geospatial indexes for fast nearby driver queries
- WebSocket rooms can be added for scalability

## Security Recommendations

1. Add authentication for WebSocket connections
2. Validate driver IDs before accepting location updates
3. Rate limit location updates (max 1 per 5 seconds)
4. Use HTTPS/WSS in production
5. Implement proper CORS policies
6. Add driver verification before going online

## Next Steps

- Add map integration (Google Maps, Mapbox)
- Implement ride matching algorithm
- Add surge pricing based on demand
- Driver heat maps for admin
- Push notifications for ride requests
- Driver rating and feedback system
