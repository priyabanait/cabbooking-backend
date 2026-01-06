# Cab Booking System - User Flow Documentation

## Overview
The system now implements a complete flow where users must:
1. **Signup/Login** → Get authenticated (tracked by mobile number)
2. **Complete Registration** → Provide additional details
3. **Book Vehicle** → Choose vehicle type and create booking

All operations are tracked by the user's **mobile number**.

---

## API Endpoints Flow

### Step 1: User Signup/Login

#### Signup (New User)
```
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "mobile": "9876543210",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signup successful. Please complete registration to book rides.",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "mobile": "9876543210",
    "isRegistered": false,
    "token": "jwt_token_here"
  }
}
```

#### Login (Existing User)
```
POST /api/auth/login
Content-Type: application/json

{
  "mobile": "9876543210",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful. Please complete registration to book rides.",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "mobile": "9876543210",
    "isRegistered": false,
    "token": "jwt_token_here"
  }
}
```

**Note:** Save the `token` - you'll need it for all subsequent requests!

---

### Step 2: Complete Registration

After signup/login, users must complete registration before booking.

#### Register User Details
```
POST /api/registration
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "gender": "male",
  "referralCode": "REF123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "_id": "registration_id",
    "mobile": "9876543210",
    "fullName": "John Doe",
    "email": "john@example.com",
    "gender": "male",
    "referralCode": "REF123"
  }
}
```

#### Check Registration Status
```
GET /api/registration/status/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRegistered": true,
    "mobile": "9876543210",
    "registration": {
      "_id": "registration_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "gender": "male"
    }
  }
}
```

#### Get My Registration Details
```
GET /api/registration/me
Authorization: Bearer {token}
```

---

### Step 3: Book a Vehicle

Once registered, users can book rides.

#### Get Available Vehicle Types
```
GET /api/vehicles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "vehicle_id",
      "name": "Sedan",
      "description": "Comfortable sedan for 4 passengers",
      "capacity": 4,
      "ratePerKm": 15,
      "features": ["AC", "Music System"],
      "isActive": true
    }
  ]
}
```

#### Create Booking
```
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "pickup": {
    "address": "123 Main St, City",
    "coordinates": [77.5946, 12.9716]
  },
  "dropoff": {
    "address": "456 Park Ave, City",
    "coordinates": [77.6412, 12.9698]
  },
  "vehicleType": "sedan",
  "fare": 150,
  "distance": 10,
  "scheduledTime": "2025-12-10T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "_id": "booking_id",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "mobile": "9876543210"
    },
    "pickup": {
      "address": "123 Main St, City",
      "coordinates": [77.5946, 12.9716]
    },
    "dropoff": {
      "address": "456 Park Ave, City",
      "coordinates": [77.6412, 12.9698]
    },
    "vehicleType": "sedan",
    "fare": 150,
    "distance": 10,
    "status": "pending"
  }
}
```

**If Registration Not Complete:**
```json
{
  "success": false,
  "message": "Please complete registration before booking a ride",
  "requiresRegistration": true
}
```

---

## Error Handling

### Registration Already Completed
If user tries to register again:
```json
{
  "success": false,
  "message": "User already completed registration"
}
```

### Not Authenticated
If token is missing or invalid:
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Mobile Number Already Exists
On signup with existing mobile:
```json
{
  "success": false,
  "message": "User already exists with this mobile number"
}
```

---

## Database Schema Updates

### User Model
- Added `isRegistered` field (boolean) - tracks if user completed registration
- Added `registrationId` field (ObjectId) - links to Registration document
- Mobile number is unique identifier

### Registration Model
- Added `user` field (ObjectId) - links to User
- Added `mobile` field - duplicates mobile from User for easy tracking
- Email remains unique
- Mobile number is tracked here too

### Booking Model
- Populates user with mobile number
- Registration check enforced before booking creation

---

## Mobile Number Tracking

All operations are tracked by mobile number:
1. **Signup/Login**: User identified by mobile
2. **Registration**: Linked to user's mobile
3. **Bookings**: Associated with user, which includes mobile

To find all data for a mobile number:
```javascript
// Find user by mobile
const user = await User.findOne({ mobile: "9876543210" });

// Find registration by mobile
const registration = await Registration.findOne({ mobile: "9876543210" });

// Find all bookings by user
const bookings = await Booking.find({ user: user._id });
```

---

## Complete User Journey Example

```bash
# 1. Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","mobile":"9876543210","password":"pass123"}'

# Save the token from response

# 2. Complete Registration
curl -X POST http://localhost:5000/api/registration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"fullName":"John Doe","email":"john@example.com","gender":"male"}'

# 3. Get Vehicle Types
curl http://localhost:5000/api/vehicles

# 4. Create Booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"pickup":{"address":"Location A","coordinates":[77.5,12.9]},"dropoff":{"address":"Location B","coordinates":[77.6,12.8]},"vehicleType":"sedan","fare":150,"distance":10}'
```

---

## Key Features Implemented

✅ Mobile number-based authentication
✅ Registration requirement before booking
✅ Registration status tracking
✅ Automatic linking of user → registration → bookings
✅ Protected routes with JWT authentication
✅ Clear error messages for user guidance
✅ Duplicate prevention (mobile, email)
✅ Complete user flow enforcement

---

## Testing the Flow

1. Start your server: `node server.js`
2. Test signup with a mobile number
3. Complete registration with the token
4. Try booking - should work
5. Try booking without registration - should fail with helpful message
6. Check registration status anytime
