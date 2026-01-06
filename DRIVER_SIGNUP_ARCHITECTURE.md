# Driver Signup Backend Architecture

## 📊 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                        │
│                   React/Mobile App/Postman                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP Requests (JSON)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                              │
│                    (backend/server.js)                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Route: /api/driver-signup                             │    │
│  │  (backend/routes/driverSignup.js)                      │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Middleware Layer                               │    │
│  │  ┌──────────────────┐  ┌──────────────────┐          │    │
│  │  │  protectDriver   │  │  requireRegistr. │          │    │
│  │  │  (JWT Verify)    │  │  (Check Status)  │          │    │
│  │  └──────────────────┘  └──────────────────┘          │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Controller Layer                             │    │
│  │  (backend/controllers/driverSignupController.js)       │    │
│  │                                                        │    │
│  │  • signup()          • updateProfile()                │    │
│  │  • login()           • updatePassword()               │    │
│  │  • getMe()           • getAllDrivers()                │    │
│  │  • getDriverById()   • deleteDriver()                 │    │
│  │  • linkRegistration()                                 │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │             Model Layer                                │    │
│  │  (backend/models/DriverSignup.js)                      │    │
│  │                                                        │    │
│  │  Schema: driverSignupSchema                           │    │
│  │  • fullName (String)                                  │    │
│  │  • mobile (String, unique)                            │    │
│  │  • password (String, hashed)                          │    │
│  │  • isRegistered (Boolean)                             │    │
│  │  • registrationId (ObjectId)                          │    │
│  │  • createdAt (Date)                                   │    │
│  │                                                        │    │
│  │  Methods:                                             │    │
│  │  • matchPassword()                                    │    │
│  │  • pre-save (hash password)                           │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                              │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MONGODB DATABASE                             │
│                                                                  │
│  Collection: driversignups                                       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ {                                                    │       │
│  │   _id: ObjectId,                                     │       │
│  │   fullName: "John Doe",                              │       │
│  │   mobile: "9876543210",                              │       │
│  │   password: "$2a$10$hashed...",                      │       │
│  │   isRegistered: false,                               │       │
│  │   registrationId: ObjectId | null,                   │       │
│  │   createdAt: ISODate                                 │       │
│  │ }                                                    │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow Examples

### 1. Driver Signup Flow
```
Client
  │
  │ POST /api/driver-signup/signup
  │ Body: { fullName, mobile, password }
  │
  ▼
Route (driverSignup.js)
  │
  │ router.post('/signup', signup)
  │
  ▼
Controller (driverSignupController.js)
  │
  │ 1. Validate input
  │ 2. Check if driver exists
  │ 3. Create new driver (password auto-hashed)
  │ 4. Generate JWT token
  │ 5. Return driver data + token
  │
  ▼
Model (DriverSignup.js)
  │
  │ pre-save hook: Hash password
  │ Save to MongoDB
  │
  ▼
Response to Client
  {
    success: true,
    data: { _id, fullName, mobile, token }
  }
```

### 2. Get Profile Flow (Protected Route)
```
Client
  │
  │ GET /api/driver-signup/me
  │ Header: Authorization: Bearer <token>
  │
  ▼
Route (driverSignup.js)
  │
  │ router.get('/me', protectDriver, getMe)
  │
  ▼
Middleware (driverAuth.js)
  │
  │ protectDriver:
  │ 1. Extract token from header
  │ 2. Verify JWT token
  │ 3. Find driver by decoded ID
  │ 4. Attach driver to req.user
  │ 5. Call next()
  │
  ▼
Controller (driverSignupController.js)
  │
  │ getMe:
  │ 1. Get driver from req.user.id
  │ 2. Populate registrationId
  │ 3. Return driver data
  │
  ▼
Response to Client
  {
    success: true,
    data: { _id, fullName, mobile, ... }
  }
```

## 📦 File Dependencies

```
server.js
  │
  ├── routes/driverSignup.js
  │     │
  │     ├── controllers/driverSignupController.js
  │     │     │
  │     │     └── models/DriverSignup.js
  │     │
  │     ├── middleware/driverAuth.js
  │     │     │
  │     │     └── models/DriverSignup.js
  │     │
  │     └── middleware/auth.js (for admin routes)
  │           │
  │           └── models/User.js
  │
  └── config/db.js (MongoDB connection)
```

## 🔐 Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│                  JWT TOKEN STRUCTURE                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Header:                                                  │
│    { alg: "HS256", typ: "JWT" }                          │
│                                                           │
│  Payload:                                                 │
│    { id: "driver_mongodb_id", iat: ..., exp: ... }      │
│                                                           │
│  Signature:                                               │
│    HMACSHA256(base64(header) + "." + base64(payload),    │
│                process.env.JWT_SECRET)                    │
│                                                           │
└──────────────────────────────────────────────────────────┘

Token Generation:
  signup() or login() → generateToken(driver._id) → JWT

Token Verification:
  Client Request → protectDriver middleware → 
  jwt.verify(token, JWT_SECRET) → Find Driver → Attach to req.user
```

## 📋 Data Relationships

```
┌─────────────────────┐          ┌─────────────────────┐
│   DriverSignup      │          │   Registration      │
│  (driversignups)    │          │  (registrations)    │
├─────────────────────┤          ├─────────────────────┤
│ _id: ObjectId       │          │ _id: ObjectId       │
│ fullName: String    │          │ vehicleType: String │
│ mobile: String      │          │ vehicleNumber: Str  │
│ password: String    │◄─────────│ licenseNumber: Str  │
│ isRegistered: Bool  │          │ ...                 │
│ registrationId: ──────────────►│                     │
│   ObjectId (ref)    │          │                     │
│ createdAt: Date     │          │                     │
└─────────────────────┘          └─────────────────────┘
```

## 🎯 Endpoint Access Matrix

| Endpoint | Method | Access | Middleware |
|----------|--------|--------|------------|
| `/signup` | POST | 🌐 Public | None |
| `/login` | POST | 🌐 Public | None |
| `/me` | GET | 🔒 Driver | protectDriver |
| `/profile` | PUT | 🔒 Driver | protectDriver |
| `/password` | PUT | 🔒 Driver | protectDriver |
| `/all` | GET | 👑 Admin | protect |
| `/:id` | GET | 👑 Admin | protect |
| `/:id` | DELETE | 👑 Admin | protect |
| `/:id/link-registration` | PUT | 👑 Admin | protect |

## 🛡️ Security Features

```
┌─────────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Password Hashing (bcrypt)                           │
│     • Salt rounds: 10                                   │
│     • Auto-hash on save                                 │
│     • Compare method for login                          │
│                                                          │
│  2. JWT Authentication                                   │
│     • Secret key from env                               │
│     • 30-day expiration                                 │
│     • Bearer token in headers                           │
│                                                          │
│  3. Database Constraints                                 │
│     • Unique mobile number                              │
│     • Required field validation                         │
│     • Schema-level validation                           │
│                                                          │
│  4. Middleware Protection                                │
│     • Route-level auth checks                           │
│     • Token verification                                │
│     • User existence validation                         │
│                                                          │
│  5. Error Handling                                       │
│     • No sensitive data in errors                       │
│     • Proper HTTP status codes                          │
│     • Generic error messages                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 📊 Status Codes Used

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful signup |
| 400 | Bad Request | Validation errors, duplicate mobile |
| 401 | Unauthorized | Invalid credentials, missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Driver not found |
| 500 | Server Error | Database errors, unexpected errors |

---

## 🚀 Quick Start Commands

```bash
# Navigate to backend
cd backend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev

# Start production server
npm start

# Test endpoints
# See DRIVER_SIGNUP_TESTING.md for detailed tests
```

---

This architecture provides a complete, secure, and scalable driver signup system! 🎉
