# Driver Signup API Documentation

## Overview
Complete backend implementation for Driver Signup functionality with authentication, profile management, and admin operations.

## Model Schema
Located at: `backend/models/DriverSignup.js`

### Fields:
- `fullName` (String, required) - Driver's full name
- `mobile` (String, required, unique) - Mobile number
- `password` (String, required, min 6 chars) - Hashed password
- `isRegistered` (Boolean, default: false) - Registration status
- `registrationId` (ObjectId, ref: 'Registration') - Link to Registration model
- `createdAt` (Date) - Timestamp

## API Endpoints

### Base URL: `/api/driver-signup`

---

### 1. **Driver Signup** (Public)
**POST** `/api/driver-signup/signup`

Create a new driver account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "mobile": "1234567890",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Driver signup successful. Please complete registration to start driving.",
  "data": {
    "_id": "driver_id",
    "fullName": "John Doe",
    "mobile": "1234567890",
    "isRegistered": false,
    "registrationId": null,
    "token": "jwt_token_here"
  }
}
```

---

### 2. **Driver Login** (Public)
**POST** `/api/driver-signup/login`

Authenticate a driver.

**Request Body:**
```json
{
  "mobile": "1234567890",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "driver_id",
    "fullName": "John Doe",
    "mobile": "1234567890",
    "isRegistered": false,
    "registrationId": null,
    "token": "jwt_token_here"
  }
}
```

---

### 3. **Get Driver Profile** (Private)
**GET** `/api/driver-signup/me`

Get authenticated driver's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "driver_id",
    "fullName": "John Doe",
    "mobile": "1234567890",
    "isRegistered": false,
    "registrationId": {
      "vehicleType": "Sedan",
      "vehicleNumber": "ABC123",
      "licenseNumber": "DL12345"
    },
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### 4. **Update Driver Profile** (Private)
**PUT** `/api/driver-signup/profile`

Update driver's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fullName": "John Smith",
  "registrationId": "registration_id",
  "isRegistered": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "driver_id",
    "fullName": "John Smith",
    "mobile": "1234567890",
    "isRegistered": true,
    "registrationId": "registration_id",
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### 5. **Update Password** (Private)
**PUT** `/api/driver-signup/password`

Change driver's password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": {
    "token": "new_jwt_token_here"
  }
}
```

---

### 6. **Get All Drivers** (Admin)
**GET** `/api/driver-signup/all`

Get all drivers with pagination and filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `isRegistered` (boolean) - Filter by registration status
- `search` (string) - Search by name or mobile

**Example:**
```
GET /api/driver-signup/all?page=1&limit=10&isRegistered=true&search=John
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "driver_id",
      "fullName": "John Doe",
      "mobile": "1234567890",
      "isRegistered": true,
      "registrationId": {
        "vehicleType": "Sedan",
        "vehicleNumber": "ABC123",
        "licenseNumber": "DL12345"
      },
      "createdAt": "2025-12-12T10:00:00.000Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 50
}
```

---

### 7. **Get Driver by ID** (Admin)
**GET** `/api/driver-signup/:id`

Get a specific driver's details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "driver_id",
    "fullName": "John Doe",
    "mobile": "1234567890",
    "isRegistered": true,
    "registrationId": {
      "vehicleType": "Sedan",
      "vehicleNumber": "ABC123",
      "licenseNumber": "DL12345"
    },
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### 8. **Delete Driver** (Admin)
**DELETE** `/api/driver-signup/:id`

Delete a driver account.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Driver deleted successfully"
}
```

---

### 9. **Link Registration** (Admin)
**PUT** `/api/driver-signup/:id/link-registration`

Link a driver to a registration record.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "registrationId": "registration_id"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Registration linked successfully",
  "data": {
    "_id": "driver_id",
    "fullName": "John Doe",
    "mobile": "1234567890",
    "isRegistered": true,
    "registrationId": "registration_id",
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error message describing the issue"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Driver not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error message"
}
```

---

## Authentication

All private endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

The token is returned in the response after successful signup or login.

---

## Files Created/Modified

### Created:
1. `backend/controllers/driverSignupController.js` - Controller with all business logic
2. `backend/routes/driverSignup.js` - Route definitions
3. `backend/DRIVER_SIGNUP_API.md` - This documentation

### Modified:
1. `backend/models/DriverSignup.js` - Fixed model export name
2. `backend/server.js` - Added driver signup routes

---

## Testing the API

### Example using cURL:

**Signup:**
```bash
curl -X POST http://localhost:5000/api/driver-signup/signup \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","mobile":"1234567890","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/driver-signup/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"1234567890","password":"password123"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/driver-signup/me \
  -H "Authorization: Bearer <your_token>"
```

---

## Environment Variables Required

Make sure your `.env` file has:
```
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

---

## Notes

- All passwords are automatically hashed using bcrypt before storage
- Mobile numbers must be unique
- Admin routes may need additional middleware for role-based access control
- The `protect` middleware validates JWT tokens and attaches user info to `req.user`
