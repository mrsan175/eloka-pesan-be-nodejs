# Eloka Pesan - API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Swagger UI:** `http://localhost:3000/api/v1/docs`

---

## 📋 Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Default Accounts](#default-accounts)
- [API Endpoints](#api-endpoints)
  - [Authentication](#auth-endpoints)
  - [Users](#users-endpoints)
  - [Shops](#shops-endpoints)
  - [Products](#products-endpoints)
  - [Orders](#orders-endpoints)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Business Rules](#business-rules)

---

## 🎯 Introduction

Eloka Pesan adalah sistem backend untuk pemesanan makanan dan minuman di restoran/coffee shop. Sistem ini mendukung:

- **Multiple order types**: Dine-in, Takeaway, Delivery
- **Role-based access**: Admin, Staff, Customer
- **Product variants & addons**: Size, temperature, extra shot, dll.
- **Order management**: Status lifecycle dari PENDING hingga COMPLETED
- **Auto-calculation**: Subtotal + PPN 11% + Ongkir (untuk delivery)

---

## 🔐 Authentication

API menggunakan **JWT (JSON Web Token)** untuk autentikasi.

### Flow:
1. Login → Dapatkan `accessToken` dan `refreshToken`
2. Gunakan `accessToken` di header untuk request yang membutuhkan autentikasi
3. Jika `accessToken` expired, gunakan `refreshToken` untuk mendapatkan token baru
4. Logout → Token dihapus dari Redis

### Header Format:
```
Authorization: Bearer <accessToken>
```

---

## 👥 Default Accounts

Berikut adalah akun yang sudah di-seed di database:

### 1. Admin Account
```json
{
  "email": "admin@elokapesan.com",
  "password": "admin123",
  "role": "ADMIN",
  "name": "System Admin",
  "phone": "+628111111111"
}
```
**Akses:**
- Semua endpoint
- User management
- Shop management (CRUD)
- Product management (CRUD)
- Order management (view all, update status)

---

### 2. Staff Account
```json
{
  "email": "staff@elokapesan.com",
  "password": "staff123",
  "role": "STAFF",
  "name": "Barista Staff",
  "phone": "+628222222222"
}
```
**Akses:**
- Shop management (create, update, toggle status)
- Product management (CRUD)
- Category management (CRUD)
- Order management (view all, update status, update payment)
- Variant & Addon management

---

### 3. Customer Account
```json
{
  "email": "user@example.com",
  "password": "user123",
  "role": "CUSTOMER",
  "name": "Budi Santoso",
  "phone": "+628333333333"
}
```
**Akses:**
- View shops & products (public)
- Create orders
- View own orders
- Manage own profile & addresses
- Cancel own orders (before CONFIRMED)

**Default Address:**
```json
{
  "label": "Rumah",
  "street": "Jl. Sudirman No. 45",
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "postalCode": "12190"
}
```

---

### 4. Demo Shop
```json
{
  "id": "shop-demo-1",
  "name": "Eloka Coffee & Eatery",
  "description": "Artisan coffee and comfort food",
  "address": "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
  "phone": "+62215551234",
  "email": "info@elokacoffee.com",
  "openTime": "07:00",
  "closeTime": "22:00",
  "isOpen": true
}
```

**Demo Products:**
- **Coffee**: Iced Americano (Rp 28.000), Caffe Latte (Rp 35.000)
- **Non-Coffee**: Matcha Latte (Rp 38.000)
- **Food**: Butter Croissant (Rp 25.000)

---

## 📍 API Endpoints

### Auth Endpoints

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+628123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "customer@example.com",
      "name": "John Doe",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@elokapesan.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "admin@elokapesan.com",
      "name": "System Admin",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 3. Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 4. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Users Endpoints

#### 1. Get My Profile
```http
GET /api/v1/users/me
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "Budi Santoso",
    "phone": "+628333333333",
    "role": "CUSTOMER",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### 2. Update Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Budi Santoso Updated",
  "phone": "+628999999999"
}
```

---

#### 3. Change Password
```http
POST /api/v1/users/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "user123",
  "newPassword": "newpassword123"
}
```

---

#### 4. Get My Addresses
```http
GET /api/v1/users/addresses
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Addresses retrieved successfully",
  "data": [
    {
      "id": "clxxx...",
      "label": "Rumah",
      "street": "Jl. Sudirman No. 45",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postalCode": "12190",
      "isDefault": true
    }
  ]
}
```

---

#### 5. Create Address
```http
POST /api/v1/users/addresses
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "label": "Kantor",
  "street": "Jl. Thamrin No. 10",
  "city": "Jakarta Pusat",
  "province": "DKI Jakarta",
  "postalCode": "10230",
  "coordinates": "-6.1944,106.8229"
}
```

---

#### 6. Update Address
```http
PUT /api/v1/users/addresses/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "label": "Kantor (Updated)",
  "street": "Jl. Thamrin No. 11"
}
```

---

#### 7. Delete Address
```http
DELETE /api/v1/users/addresses/:id
Authorization: Bearer <accessToken>
```

---

#### 8. Set Default Address
```http
POST /api/v1/users/addresses/:id/set-default
Authorization: Bearer <accessToken>
```

---

#### 9. Get All Users (Admin Only)
```http
GET /api/v1/users?page=1&limit=10&role=CUSTOMER
Authorization: Bearer <accessToken>
```

---

### Shops Endpoints

#### 1. Get All Shops (Public)
```http
GET /api/v1/shops?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Shops retrieved successfully",
  "data": {
    "shops": [
      {
        "id": "shop-demo-1",
        "name": "Eloka Coffee & Eatery",
        "description": "Artisan coffee and comfort food",
        "address": "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
        "phone": "+62215551234",
        "email": "info@elokacoffee.com",
        "openTime": "07:00",
        "closeTime": "22:00",
        "isOpen": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

#### 2. Get Shop by ID (Public)
```http
GET /api/v1/shops/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Shop retrieved successfully",
  "data": {
    "id": "shop-demo-1",
    "name": "Eloka Coffee & Eatery",
    "description": "Artisan coffee and comfort food",
    "address": "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
    "phone": "+62215551234",
    "email": "info@elokacoffee.com",
    "openTime": "07:00",
    "closeTime": "22:00",
    "isOpen": true,
    "categories": [
      {
        "id": "clxxx...",
        "name": "Coffee",
        "description": "Espresso-based coffee drinks",
        "order": 1
      }
    ]
  }
}
```

---

#### 3. Create Shop (Admin/Staff)
```http
POST /api/v1/shops
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "New Coffee Shop",
  "description": "Fresh roasted coffee",
  "address": "Jl. Kemang Raya No. 5",
  "phone": "+62215559999",
  "email": "info@newcoffee.com",
  "openTime": "08:00",
  "closeTime": "20:00"
}
```

---

#### 4. Update Shop (Admin/Staff)
```http
PUT /api/v1/shops/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Updated Shop Name",
  "openTime": "07:30",
  "closeTime": "21:00"
}
```

---

#### 5. Delete Shop (Admin Only)
```http
DELETE /api/v1/shops/:id
Authorization: Bearer <accessToken>
```

---

#### 6. Toggle Shop Status (Admin/Staff)
```http
POST /api/v1/shops/:id/toggle-status
Authorization: Bearer <accessToken>
```

---

### Products Endpoints

#### 1. Get All Products (Public)
```http
GET /api/v1/products?page=1&limit=10&categoryId=xxx&isAvailable=true
```

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "clxxx...",
        "name": "Iced Americano",
        "description": "Espresso shot topped with cold water and ice",
        "price": "28000.00",
        "image": null,
        "isAvailable": true,
        "isPopular": true,
        "category": {
          "id": "clxxx...",
          "name": "Coffee"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 4,
      "totalPages": 1
    }
  }
}
```

---

#### 2. Get Product by ID (Public)
```http
GET /api/v1/products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "clxxx...",
    "name": "Iced Americano",
    "description": "Espresso shot topped with cold water and ice",
    "price": "28000.00",
    "image": null,
    "isAvailable": true,
    "isPopular": true,
    "stock": null,
    "category": {
      "id": "clxxx...",
      "name": "Coffee",
      "shopId": "shop-demo-1"
    },
    "variants": [
      {
        "id": "clxxx...",
        "name": "Size",
        "optionName": "Regular",
        "priceAdjust": "0.00",
        "isAvailable": true
      },
      {
        "id": "clxxx...",
        "name": "Size",
        "optionName": "Large",
        "priceAdjust": "5000.00",
        "isAvailable": true
      }
    ],
    "addons": [
      {
        "id": "clxxx...",
        "name": "Extra Shot",
        "price": "6000.00",
        "isAvailable": true
      },
      {
        "id": "clxxx...",
        "name": "Vanilla Syrup",
        "price": "5000.00",
        "isAvailable": true
      }
    ]
  }
}
```

---

#### 3. Get Products by Shop (Public)
```http
GET /api/v1/products/shop/:shopId?categoryId=xxx
```

---

#### 4. Create Category (Admin/Staff)
```http
POST /api/v1/products/categories
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "shopId": "shop-demo-1",
  "name": "Desserts",
  "description": "Sweet treats and cakes",
  "order": 4
}
```

---

#### 5. Update Category (Admin/Staff)
```http
PUT /api/v1/products/categories/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Desserts & Cakes",
  "description": "Updated description"
}
```

---

#### 6. Delete Category (Admin/Staff)
```http
DELETE /api/v1/products/categories/:id
Authorization: Bearer <accessToken>
```

---

#### 7. Create Product (Admin/Staff)
```http
POST /api/v1/products
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "categoryId": "clxxx...",
  "name": "Cappuccino",
  "description": "Espresso with steamed milk and foam",
  "price": 32000,
  "image": "https://example.com/cappuccino.jpg",
  "isAvailable": true,
  "isPopular": false,
  "stock": 100
}
```

---

#### 8. Update Product (Admin/Staff)
```http
PUT /api/v1/products/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Cappuccino (Updated)",
  "price": 33000,
  "isAvailable": true
}
```

---

#### 9. Delete Product (Admin/Staff)
```http
DELETE /api/v1/products/:id
Authorization: Bearer <accessToken>
```

---

#### 10. Toggle Product Availability (Admin/Staff)
```http
POST /api/v1/products/:id/toggle-availability
Authorization: Bearer <accessToken>
```

---

#### 11. Add Product Variant (Admin/Staff)
```http
POST /api/v1/products/:productId/variants
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Temperature",
  "optionName": "Hot",
  "priceAdjust": 0
}
```

---

#### 12. Remove Product Variant (Admin/Staff)
```http
DELETE /api/v1/products/variants/:id
Authorization: Bearer <accessToken>
```

---

#### 13. Add Product Addon (Admin/Staff)
```http
POST /api/v1/products/:productId/addons
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Whipped Cream",
  "price": 5000
}
```

---

#### 14. Remove Product Addon (Admin/Staff)
```http
DELETE /api/v1/products/addons/:id
Authorization: Bearer <accessToken>
```

---

### Orders Endpoints

#### 1. Create Order
```http
POST /api/v1/orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "shopId": "shop-demo-1",
  "orderType": "DELIVERY",
  "addressId": "clxxx...",
  "items": [
    {
      "productId": "clxxx...",
      "quantity": 2,
      "variantIds": ["variant-id-1"],
      "addonIds": ["addon-id-1", "addon-id-2"],
      "notes": "Less sugar please"
    }
  ],
  "notes": "Please ring the bell twice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20240115-001",
    "userId": "clxxx...",
    "shopId": "shop-demo-1",
    "orderType": "DELIVERY",
    "subtotal": "56000.00",
    "tax": "6160.00",
    "deliveryFee": "5000.00",
    "discount": "0.00",
    "total": "67160.00",
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "items": [
      {
        "id": "clxxx...",
        "productId": "clxxx...",
        "quantity": 2,
        "price": "28000.00",
        "subtotal": "56000.00",
        "product": {
          "id": "clxxx...",
          "name": "Iced Americano"
        },
        "variants": [...],
        "addons": [...]
      }
    ]
  }
}
```

**Order Calculation:**
- **Subtotal** = (Product price + variant adjustments) × quantity + addon prices
- **Tax (PPN 11%)** = Subtotal × 0.11
- **Delivery Fee** = Rp 5.000 (only for DELIVERY orders)
- **Total** = Subtotal + Tax + Delivery Fee - Discount

---

#### 2. Get My Orders
```http
GET /api/v1/orders/my-orders?page=1&limit=10&status=PENDING
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "clxxx...",
        "orderNumber": "ORD-20240115-001",
        "shopId": "shop-demo-1",
        "orderType": "DELIVERY",
        "subtotal": "56000.00",
        "tax": "6160.00",
        "deliveryFee": "5000.00",
        "total": "67160.00",
        "status": "PENDING",
        "paymentStatus": "UNPAID",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "shop": {
          "id": "shop-demo-1",
          "name": "Eloka Coffee & Eatery"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

#### 3. Get Order by ID
```http
GET /api/v1/orders/:id
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20240115-001",
    "userId": "clxxx...",
    "shopId": "shop-demo-1",
    "orderType": "DELIVERY",
    "tableNumber": null,
    "subtotal": "56000.00",
    "tax": "6160.00",
    "deliveryFee": "5000.00",
    "discount": "0.00",
    "total": "67160.00",
    "status": "PENDING",
    "paymentMethod": null,
    "paymentStatus": "UNPAID",
    "notes": "Please ring the bell twice",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": "clxxx...",
      "name": "Budi Santoso",
      "email": "user@example.com"
    },
    "shop": {
      "id": "shop-demo-1",
      "name": "Eloka Coffee & Eatery"
    },
    "address": {
      "id": "clxxx...",
      "label": "Rumah",
      "street": "Jl. Sudirman No. 45",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postalCode": "12190"
    },
    "items": [
      {
        "id": "clxxx...",
        "productId": "clxxx...",
        "quantity": 2,
        "price": "28000.00",
        "subtotal": "56000.00",
        "notes": "Less sugar please",
        "product": {
          "id": "clxxx...",
          "name": "Iced Americano"
        },
        "variants": [
          {
            "id": "clxxx...",
            "variant": {
              "id": "variant-id-1",
              "name": "Size",
              "optionName": "Large",
              "priceAdjust": "5000.00"
            }
          }
        ],
        "addons": [
          {
            "id": "clxxx...",
            "quantity": 1,
            "addon": {
              "id": "addon-id-1",
              "name": "Extra Shot",
              "price": "6000.00"
            }
          }
        ]
      }
    ]
  }
}
```

---

#### 4. Cancel Order
```http
POST /api/v1/orders/:id/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

**Note:** Order can only be cancelled if status is `PENDING`.

---

#### 5. Get All Orders (Admin/Staff)
```http
GET /api/v1/orders?page=1&limit=10&status=PENDING&shopId=shop-demo-1
Authorization: Bearer <accessToken>
```

---

#### 6. Update Order Status (Admin/Staff)
```http
PATCH /api/v1/orders/:id/status
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "CONFIRMED"
}
```

**Status Transitions:**
- `PENDING` → `CONFIRMED`, `CANCELLED`
- `CONFIRMED` → `PREPARING`, `CANCELLED`
- `PREPARING` → `READY`, `CANCELLED`
- `READY` → `DELIVERING` (for DELIVERY), `COMPLETED` (for DINE_IN/TAKEAWAY)
- `DELIVERING` → `COMPLETED`
- `COMPLETED` → (final state)
- `CANCELLED` → (final state)

---

#### 7. Update Payment Status (Admin/Staff)
```http
PATCH /api/v1/orders/:id/payment
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "paymentMethod": "CASH",
  "paymentStatus": "PAID"
}
```

---

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Success Response with Pagination
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [ /* array of items */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

## ⚠️ Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ /* validation errors if any */ ]
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error, business logic error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Common Error Examples

#### 1. Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

#### 2. Authentication Error
```json
{
  "success": false,
  "message": "No token provided"
}
```

#### 3. Authorization Error
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### 4. Not Found Error
```json
{
  "success": false,
  "message": "Product not found"
}
```

#### 5. Business Logic Error
```json
{
  "success": false,
  "message": "Cannot transition order from PREPARING to PENDING. Allowed: READY, CANCELLED"
}
```

---

## 📋 Business Rules

### Order Management

1. **Order Type Rules:**
   - `DINE_IN`: Requires `tableNumber`
   - `DELIVERY`: Requires `addressId`, includes delivery fee (Rp 5.000)
   - `TAKEAWAY`: No additional requirements

2. **Order Calculation:**
   ```
   Subtotal = Sum of (Product Price + Variant Adjustments) × Quantity + Addon Prices
   Tax (PPN) = Subtotal × 11%
   Delivery Fee = Rp 5.000 (only for DELIVERY)
   Total = Subtotal + Tax + Delivery Fee - Discount
   ```

3. **Order Status Lifecycle:**
   ```
   PENDING → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED
                ↓           ↓          ↓
             CANCELLED   CANCELLED  CANCELLED
   ```

4. **Cancellation Rules:**
   - Customer can cancel only when status is `PENDING`
   - Staff/Admin can cancel at any time before `COMPLETED`
   - When cancelled, product stock is restored (if stock management is enabled)

5. **Payment Status:**
   - `UNPAID`: Initial state
   - `PAID`: Payment received
   - `REFUNDED`: Payment returned (after cancellation)

### Product Management

1. **Variants:**
   - Same product can have multiple variants (Size, Temperature, etc.)
   - Each variant has price adjustment (positive or negative)
   - Example: Regular (+Rp 0), Large (+Rp 5.000)

2. **Addons:**
   - Additional items with fixed prices
   - Can be selected multiple times (quantity)
   - Example: Extra Shot (Rp 6.000), Vanilla Syrup (Rp 5.000)

3. **Availability:**
   - Products can be toggled available/unavailable
   - Unavailable products cannot be ordered
   - Does not delete the product from database

### User Roles & Permissions

| Feature | ADMIN | STAFF | CUSTOMER |
|---------|-------|-------|----------|
| View shops & products | ✅ | ✅ | ✅ |
| Create shop | ✅ | ✅ | ❌ |
| Delete shop | ✅ | ❌ | ❌ |
| Manage products | ✅ | ✅ | ❌ |
| View all orders | ✅ | ✅ | ❌ |
| Update order status | ✅ | ✅ | ❌ |
| Create order | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| Cancel own order | ✅ | ✅ | ✅ (PENDING only) |
| User management | ✅ | ❌ | ❌ |

---

## 🚀 Getting Started

### 1. Installation
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:
```env
DATABASE_URL="your-neon-postgresql-url"
DATABASE_URL_UNPOOLED="your-neon-direct-url"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

### 3. Database Migration
```bash
npm run prisma:migrate
```

### 4. Seed Database
```bash
npm run prisma:seed
```

### 5. Run Server
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 6. Run Tests
```bash
npm test
```

### 7. Access API
- **API Base:** http://localhost:3000/api/v1
- **Swagger UI:** http://localhost:3000/api/v1/docs
- **Health Check:** http://localhost:3000/health

---

## 📝 Testing with Postman/Thunder Client

### Quick Test Flow

1. **Login as Admin:**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@elokapesan.com",
  "password": "admin123"
}
```
Copy the `accessToken` from response.

2. **Get All Products:**
```http
GET http://localhost:3000/api/v1/products
```

3. **Create Order as Customer:**
```http
# First, login as customer
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user123"
}

# Then create order
POST http://localhost:3000/api/v1/orders
Authorization: Bearer <customer-access-token>
Content-Type: application/json

{
  "shopId": "shop-demo-1",
  "orderType": "DELIVERY",
  "addressId": "<get-from-GET-/users/addresses>",
  "items": [
    {
      "productId": "<get-from-GET-/products>",
      "quantity": 2
    }
  ]
}
```

4. **Update Order Status as Staff:**
```http
# Login as staff
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "staff@elokapesan.com",
  "password": "staff123"
}

# Update order status
PATCH http://localhost:3000/api/v1/orders/<order-id>/status
Authorization: Bearer <staff-access-token>
Content-Type: application/json

{
  "status": "CONFIRMED"
}
```

---

## 🔧 Technical Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL (Neon)
- **Cache:** Redis
- **Authentication:** JWT
- **Validation:** express-validator
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

---

## 📞 Support

Untuk pertanyaan atau bantuan, silakan hubungi:
- Email: info@elokapesan.com
- Phone: +62215551234

---

**Last Updated:** October 28, 2026  
**Version:** 1.0.0
