const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // In production, specify your frontend URL
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/registration', require('./routes/registration'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/scheduled-rides', require('./routes/scheduledRides'));
app.use('/api/fare', require('./routes/fare'));
app.use('/api/users', require('./routes/users'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/driver-signup', require('./routes/driverSignup'));
// app.use('/api/rides', require('./routes/rides'));
// app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/delivery-services', require('./routes/deliveryServices'));
app.use('/api/delivery-orders', require('./routes/deliveryOrders'));
app.use('/api/parcel-services', require('./routes/parcelServices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/vehicle-types', require('./routes/vehicleTypes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Cab Booking API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Store active drivers and their locations
const activeDrivers = new Map();
const driverSockets = new Map(); // Map driverId to socketId

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Driver goes online
  socket.on('driver:online', (data) => {
    const { driverId, location, name, vehicleType } = data;
    console.log(`🚗 Driver ${driverId} (${name}) is now online`);
    
    activeDrivers.set(driverId, {
      driverId,
      name,
      vehicleType,
      location,
      status: 'available',
      socketId: socket.id,
      lastUpdate: new Date()
    });
    
    driverSockets.set(driverId, socket.id);
    socket.driverId = driverId;
    
    // Broadcast to all clients that a new driver is online
    io.emit('driver:status', {
      driverId,
      status: 'online',
      location
    });
    
    // Send list of all active drivers to newly connected driver
    socket.emit('drivers:list', Array.from(activeDrivers.values()));
  });

  // Driver updates location
  socket.on('driver:location', (data) => {
    const { driverId, location, speed, heading } = data;
    
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.location = location;
      driver.speed = speed;
      driver.heading = heading;
      driver.lastUpdate = new Date();
      
      activeDrivers.set(driverId, driver);
      
      // Broadcast location update to all clients
      io.emit('driver:location:update', {
        driverId,
        location,
        speed,
        heading,
        timestamp: driver.lastUpdate
      });
    }
  });

  // Driver status change (available, busy, offline)
  socket.on('driver:status', (data) => {
    const { driverId, status } = data;
    
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.status = status;
      activeDrivers.set(driverId, driver);
      
      io.emit('driver:status:update', {
        driverId,
        status
      });
      
      console.log(`📊 Driver ${driverId} status: ${status}`);
    }
  });

  // User requests nearby drivers
  socket.on('user:request:nearby', (data) => {
    const { location, radius = 5 } = data; // radius in km
    
    const nearbyDrivers = [];
    activeDrivers.forEach((driver) => {
      if (driver.status === 'available' && driver.location) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          driver.location.latitude,
          driver.location.longitude
        );
        
        if (distance <= radius) {
          nearbyDrivers.push({
            ...driver,
            distance: parseFloat(distance.toFixed(2))
          });
        }
      }
    });
    
    // Sort by distance
    nearbyDrivers.sort((a, b) => a.distance - b.distance);
    
    socket.emit('drivers:nearby', nearbyDrivers);
    console.log(`📍 Found ${nearbyDrivers.length} nearby drivers`);
  });

  // Ride request from user to specific driver
  socket.on('ride:request', (data) => {
    const { driverId, rideDetails } = data;
    const driverSocketId = driverSockets.get(driverId);
    
    if (driverSocketId) {
      io.to(driverSocketId).emit('ride:request:received', {
        ...rideDetails,
        requestId: `REQ-${Date.now()}`
      });
      console.log(`🔔 Ride request sent to driver ${driverId}`);
    }
  });

  // Driver accepts ride
  socket.on('ride:accept', (data) => {
    const { requestId, driverId, userId } = data;
    
    // Update driver status
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.status = 'busy';
      activeDrivers.set(driverId, driver);
    }
    
    // Notify user
    io.emit('ride:accepted', {
      requestId,
      driverId,
      driver: activeDrivers.get(driverId)
    });
    
    console.log(`✅ Driver ${driverId} accepted ride ${requestId}`);
  });

  // Driver rejects ride
  socket.on('ride:reject', (data) => {
    const { requestId, driverId } = data;
    
    io.emit('ride:rejected', {
      requestId,
      driverId
    });
    
    console.log(`❌ Driver ${driverId} rejected ride ${requestId}`);
  });

  // Ride started
  socket.on('ride:start', (data) => {
    const { rideId, driverId } = data;
    
    io.emit('ride:started', {
      rideId,
      driverId,
      timestamp: new Date()
    });
    
    console.log(`🚀 Ride ${rideId} started`);
  });

  // Ride completed
  socket.on('ride:complete', (data) => {
    const { rideId, driverId } = data;
    
    // Update driver status back to available
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.status = 'available';
      activeDrivers.set(driverId, driver);
    }
    
    io.emit('ride:completed', {
      rideId,
      driverId,
      timestamp: new Date()
    });
    
    console.log(`🏁 Ride ${rideId} completed`);
  });

  // Get all active drivers
  socket.on('drivers:get:all', () => {
    socket.emit('drivers:list', Array.from(activeDrivers.values()));
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    
    // Remove driver from active list if it was a driver
    if (socket.driverId) {
      const driverId = socket.driverId;
      activeDrivers.delete(driverId);
      driverSockets.delete(driverId);
      
      // Notify all clients
      io.emit('driver:offline', { driverId });
      console.log(`🚗 Driver ${driverId} went offline`);
    }
  });
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Clean up inactive drivers every 5 minutes
setInterval(() => {
  const now = new Date();
  activeDrivers.forEach((driver, driverId) => {
    const timeSinceUpdate = now - driver.lastUpdate;
    // Remove if no update for 10 minutes
    if (timeSinceUpdate > 10 * 60 * 1000) {
      activeDrivers.delete(driverId);
      driverSockets.delete(driverId);
      io.emit('driver:offline', { driverId });
      console.log(`🧹 Cleaned up inactive driver ${driverId}`);
    }
  });
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 5000;
const FALLBACK_PORT = 5001;

const startServer = (port) => {
  server.listen(port, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${port}`);
    console.log(`📡 WebSocket server ready for real-time location tracking`);
    console.log(`🌐 API available at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is already in use`);
      if (port === PORT) {
        console.log(`🔄 Trying fallback port ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT);
      } else {
        console.error('❌ Both ports (5000 and 5001) are in use. Please stop other services or change the port.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
};

startServer(PORT);
