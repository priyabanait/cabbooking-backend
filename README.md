# Cab Booking Backend API

A RESTful API backend for a cab booking application built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization (JWT)
- User, Driver, and Admin roles
- Driver management and profile creation
- Real-time driver location tracking
- Booking management (create, update, cancel)
- Rating and review system
- Geospatial queries for finding nearby drivers
- Fare calculation based on distance and vehicle type

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
copy .env.example .env
```

3. Update the `.env` file with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cab-booking
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

4. Make sure MongoDB is running on your system

5. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Protected)
- `PUT /api/users/:id` - Update user (Protected)

### Drivers
- `GET /api/drivers` - Get all verified drivers
- `GET /api/drivers/nearby` - Get nearby available drivers
- `GET /api/drivers/:id` - Get driver by ID
- `POST /api/drivers` - Create driver profile (Protected)
- `PUT /api/drivers/:id` - Update driver profile (Protected)
- `PUT /api/drivers/:id/location` - Update driver location (Protected)
- `PUT /api/drivers/:id/availability` - Toggle driver availability (Protected)

### Bookings
- `GET /api/bookings` - Get user's bookings (Protected)
- `POST /api/bookings` - Create new booking (Protected)
- `GET /api/bookings/:id` - Get booking by ID (Protected)
- `PUT /api/bookings/:id` - Update booking (Protected)
- `DELETE /api/bookings/:id` - Cancel booking (Protected)
- `POST /api/bookings/:id/review` - Add rating and review (Protected)

## Project Structure

```
cab-booking/
├── config/
│   └── db.js              # Database connection
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── bookingController.js # Booking management
│   └── driverController.js  # Driver management
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── models/
│   ├── User.js             # User model
│   ├── Driver.js           # Driver model
│   └── Booking.js          # Booking model
├── routes/
│   ├── auth.js             # Auth routes
│   ├── users.js            # User routes
│   ├── drivers.js          # Driver routes
│   ├── bookings.js         # Booking routes
│   └── rides.js            # Ride routes (placeholder)
├── utils/
│   └── helpers.js          # Helper functions
├── .env.example            # Environment variables example
├── .gitignore              # Git ignore file
├── package.json            # Dependencies
└── server.js               # Entry point
```

## Vehicle Types

- `hatchback` - Base: ₹50, Per km: ₹10
- `sedan` - Base: ₹80, Per km: ₹15
- `suv` - Base: ₹100, Per km: ₹20
- `luxury` - Base: ₹200, Per km: ₹30

## Booking Status Flow

1. `pending` - Booking created, waiting for driver
2. `accepted` - Driver accepted the booking
3. `ongoing` - Ride in progress
4. `completed` - Ride completed
5. `cancelled` - Booking cancelled

## License

ISC
