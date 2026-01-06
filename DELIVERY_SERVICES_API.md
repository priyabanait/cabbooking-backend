# Delivery Services API Documentation

## Overview
Complete delivery service system for Restaurant, Grocery, Medicine, and Parcel deliveries.

---

## Delivery Services Endpoints

### Get All Services
```
GET /api/delivery-services
GET /api/delivery-services?category=Food & Essentials
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "_id": "service_id",
      "name": "Restaurant Delivery",
      "category": "Food & Essentials",
      "type": "Restaurant Delivery",
      "description": "Order food from your favorite restaurants",
      "estimatedTime": {
        "min": 30,
        "max": 45,
        "unit": "mins"
      },
      "features": ["Fast delivery", "Hot & fresh", "Track order"],
      "basePrice": 20,
      "pricePerKm": 8,
      "isActive": true
    }
  ]
}
```

### Get Single Service
```
GET /api/delivery-services/:id
```

### Seed Initial Services
```
POST /api/delivery-services/seed
```
Creates the 4 default delivery services (Restaurant, Grocery, Medicine, Parcel).

---

## Delivery Orders Endpoints

### Create Order (Requires Authentication & Registration)
```
POST /api/delivery-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "serviceType": "Restaurant Delivery",
  "pickup": {
    "address": "Restaurant ABC, Street 1",
    "coordinates": [77.5946, 12.9716],
    "contactName": "Restaurant ABC",
    "contactPhone": "9876543210"
  },
  "delivery": {
    "address": "Home, Street 2",
    "coordinates": [77.6412, 12.9698],
    "contactName": "John Doe",
    "contactPhone": "9876543211"
  },
  "items": [
    {
      "name": "Biryani",
      "quantity": 2,
      "price": 250
    },
    {
      "name": "Paneer Tikka",
      "quantity": 1,
      "price": 180
    }
  ],
  "deliveryFee": 50,
  "distance": 5.5,
  "estimatedTime": 35,
  "instructions": "Call on arrival"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "_id": "order_id",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "mobile": "9876543210"
    },
    "serviceType": "Restaurant Delivery",
    "pickup": {...},
    "delivery": {...},
    "items": [...],
    "itemsTotal": 680,
    "deliveryFee": 50,
    "totalAmount": 730,
    "status": "pending",
    "createdAt": "2025-12-10T12:00:00.000Z"
  }
}
```

### Get My Orders
```
GET /api/delivery-orders
Authorization: Bearer {token}
```

### Get Single Order
```
GET /api/delivery-orders/:id
Authorization: Bearer {token}
```

### Cancel Order
```
PUT /api/delivery-orders/:id/cancel
Authorization: Bearer {token}
```

### Update Order Status (Driver/Admin)
```
PUT /api/delivery-orders/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "picked_up"
}
```

**Status Values:**
- `pending` - Order placed
- `confirmed` - Driver assigned
- `picked_up` - Driver picked up items
- `in_transit` - On the way to delivery
- `delivered` - Successfully delivered
- `cancelled` - Order cancelled

### Assign Driver (Admin)
```
PUT /api/delivery-orders/:id/assign-driver
Authorization: Bearer {token}
Content-Type: application/json

{
  "driverId": "driver_id_here"
}
```

### Get All Orders (Admin)
```
GET /api/delivery-orders/all
GET /api/delivery-orders/all?status=pending
GET /api/delivery-orders/all?serviceType=Restaurant Delivery
Authorization: Bearer {token}
```

---

## Complete Flow Example

### 1. Seed Services (One-time setup)
```bash
POST http://localhost:5000/api/delivery-services/seed
```

### 2. User Signs Up
```bash
POST http://localhost:5000/api/auth/signup
{
  "name": "John Doe",
  "mobile": "9876543210",
  "password": "password123"
}
```

### 3. Complete Registration
```bash
POST http://localhost:5000/api/registration
Authorization: Bearer {token}
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "gender": "male"
}
```

### 4. View Available Services
```bash
GET http://localhost:5000/api/delivery-services
```

### 5. Place Order
```bash
POST http://localhost:5000/api/delivery-orders
Authorization: Bearer {token}
{
  "serviceType": "Restaurant Delivery",
  "pickup": {...},
  "delivery": {...},
  "items": [...],
  "deliveryFee": 50,
  "distance": 5.5
}
```

### 6. Track Order
```bash
GET http://localhost:5000/api/delivery-orders/:orderId
Authorization: Bearer {token}
```

---

## Service Types

1. **Restaurant Delivery**
   - Estimated Time: 30-45 mins
   - Features: Fast delivery, Hot & fresh, Track order
   - Base Price: ₹20
   - Per KM: ₹8

2. **Grocery Delivery**
   - Estimated Time: 45-60 mins
   - Features: Fresh products, Wide selection, Same day delivery
   - Base Price: ₹30
   - Per KM: ₹10

3. **Medicine Delivery**
   - Estimated Time: 30 mins
   - Features: Safe delivery, Prescription support, Fast service
   - Base Price: ₹25
   - Per KM: ₹12

4. **Parcel Delivery**
   - Estimated Time: 60-120 mins
   - Features: Safe delivery, Track parcel, Insurance available
   - Base Price: ₹40
   - Per KM: ₹15

---

## Database Models

### DeliveryService
- name, category, type, description
- icon, estimatedTime, features
- basePrice, pricePerKm, isActive

### DeliveryOrder
- user, serviceType, pickup, delivery
- items, deliveryFee, totalAmount
- distance, estimatedTime, driver
- status, paymentStatus, instructions

---

## Features
✅ Multiple delivery services
✅ User authentication required
✅ Registration check before ordering
✅ Real-time order tracking
✅ Driver assignment
✅ Order status updates
✅ Cancel orders
✅ Mobile number tracking
✅ Estimated delivery time
✅ Delivery fee calculation

Restart your server and test the new delivery services! 🚀
