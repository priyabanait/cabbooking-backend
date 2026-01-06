# Driver Signup API - Quick Test Guide

## Prerequisites
1. Make sure MongoDB is running
2. Make sure your `.env` file is configured
3. Start the backend server: `cd backend && npm start`

---

## Test Endpoints (Using REST Client or Postman)

### 1. Driver Signup ✅
**Endpoint:** `POST http://localhost:5000/api/driver-signup/signup`

**Body (JSON):**
```json
{
  "fullName": "Test Driver",
  "mobile": "9876543210",
  "password": "test123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Driver signup successful. Please complete registration to start driving.",
  "data": {
    "_id": "...",
    "fullName": "Test Driver",
    "mobile": "9876543210",
    "isRegistered": false,
    "registrationId": null,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Driver Login ✅
**Endpoint:** `POST http://localhost:5000/api/driver-signup/login`

**Body (JSON):**
```json
{
  "mobile": "9876543210",
  "password": "test123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "...",
    "fullName": "Test Driver",
    "mobile": "9876543210",
    "isRegistered": false,
    "registrationId": null,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ IMPORTANT:** Copy the `token` value from the response. You'll need it for the next requests.

---

### 3. Get Driver Profile 🔒
**Endpoint:** `GET http://localhost:5000/api/driver-signup/me`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "fullName": "Test Driver",
    "mobile": "9876543210",
    "isRegistered": false,
    "registrationId": null,
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### 4. Update Driver Profile 🔒
**Endpoint:** `PUT http://localhost:5000/api/driver-signup/profile`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (JSON):**
```json
{
  "fullName": "Updated Driver Name"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "...",
    "fullName": "Updated Driver Name",
    "mobile": "9876543210",
    "isRegistered": false,
    "registrationId": null,
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### 5. Update Password 🔒
**Endpoint:** `PUT http://localhost:5000/api/driver-signup/password`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (JSON):**
```json
{
  "currentPassword": "test123",
  "newPassword": "newtest456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": {
    "token": "NEW_TOKEN_HERE"
  }
}
```

---

### 6. Get All Drivers (Admin) 🔒👑
**Endpoint:** `GET http://localhost:5000/api/driver-signup/all?page=1&limit=10`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Query Parameters:**
- `page=1` (optional, default: 1)
- `limit=10` (optional, default: 10)
- `isRegistered=true` (optional)
- `search=Test` (optional)

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "fullName": "Test Driver",
      "mobile": "9876543210",
      "isRegistered": false,
      "registrationId": null,
      "createdAt": "2025-12-12T10:00:00.000Z"
    }
  ],
  "totalPages": 1,
  "currentPage": 1,
  "total": 1
}
```

---

### 7. Get Driver by ID (Admin) 🔒👑
**Endpoint:** `GET http://localhost:5000/api/driver-signup/{driver_id}`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

---

### 8. Delete Driver (Admin) 🔒👑
**Endpoint:** `DELETE http://localhost:5000/api/driver-signup/{driver_id}`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

---

## Testing with cURL (PowerShell)

### 1. Signup
```powershell
curl -X POST http://localhost:5000/api/driver-signup/signup `
  -H "Content-Type: application/json" `
  -d '{"fullName":"Test Driver","mobile":"9876543210","password":"test123"}'
```

### 2. Login
```powershell
curl -X POST http://localhost:5000/api/driver-signup/login `
  -H "Content-Type: application/json" `
  -d '{"mobile":"9876543210","password":"test123"}'
```

### 3. Get Profile (replace TOKEN)
```powershell
curl -X GET http://localhost:5000/api/driver-signup/me `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Testing with JavaScript (Fetch API)

```javascript
// 1. Signup
const signup = async () => {
  const response = await fetch('http://localhost:5000/api/driver-signup/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Driver',
      mobile: '9876543210',
      password: 'test123'
    })
  });
  const data = await response.json();
  console.log(data);
  return data.data.token; // Save this token
};

// 2. Login
const login = async () => {
  const response = await fetch('http://localhost:5000/api/driver-signup/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile: '9876543210',
      password: 'test123'
    })
  });
  const data = await response.json();
  console.log(data);
  return data.data.token; // Save this token
};

// 3. Get Profile
const getProfile = async (token) => {
  const response = await fetch('http://localhost:5000/api/driver-signup/me', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log(data);
};

// Usage:
// const token = await signup();
// await getProfile(token);
```

---

## Common Errors and Solutions

### ❌ "User already exists with this mobile number"
**Solution:** Use a different mobile number or login instead.

### ❌ "Not authorized to access this route"
**Solution:** Make sure you're sending the token in the Authorization header: `Bearer YOUR_TOKEN`

### ❌ "Invalid credentials"
**Solution:** Check your mobile number and password.

### ❌ "Driver not found"
**Solution:** The driver with the given ID doesn't exist in the database.

---

## 🔑 Icons Legend
- ✅ Public endpoint (no authentication needed)
- 🔒 Protected endpoint (driver authentication required)
- 👑 Admin endpoint (admin authentication required)

---

## Quick Test Checklist

- [ ] Backend server is running
- [ ] MongoDB is connected
- [ ] Signup works and returns a token
- [ ] Login works with created credentials
- [ ] Get profile works with token
- [ ] Update profile works
- [ ] Password update works
- [ ] Admin endpoints work (if you have admin account)

---

## Need Help?

Check the detailed API documentation in `DRIVER_SIGNUP_API.md` for more information.
