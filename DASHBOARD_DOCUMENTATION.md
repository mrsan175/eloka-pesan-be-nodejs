# Dokumentasi Backend - Untuk Dashboard Admin & Staff Outlet

---

## 1. Struktur Project

```
backend/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # HTTP server entry
│   ├── config/             # Konfigurasi (DB, Redis, env)
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, validation, error handling, sessionCache
│   ├── routes/v1/          # API routes
│   ├── services/           # Business logic (geolocation, notifications)
│   ├── utils/              # Helpers (response, logger)
│   └── __tests__/          # Unit tests
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

---

## 2. Database Schema (Penting untuk Dashboard)

### 2.1 User Management

| Model | Kolom | Tipe | Keterangan |
|-------|-------|------|------------|
| **User** | id | String (cuid) | Primary key |
| | email | String (unique) | Login email |
| | password | String | Bcrypt hash |
| | name | String | Nama lengkap |
| | phone | String? | No. HP |
| | role | Enum | `CUSTOMER`, `STAFF`, `ADMIN` |
| | isActive | Boolean | Status akun |
| | createdAt | DateTime | Dibuat |
| | updatedAt | DateTime | Diubah |

**RefreshToken** - Token untuk refresh JWT  
**Address** - Alamat pengguna (label, street, city, province, postalCode, coordinates)

### 2.2 Shop Management

| Model | Kolom | Tipe | Keterangan |
|-------|-------|------|------------|
| **Shop** | id | String (cuid) | Primary key |
| | name | String | Nama toko |
| | description | String? | Deskripsi |
| | logo | String? | URL logo |
| | address | String | Alamat lengkap |
| | phone | String | No. HP |
| | email | String? | Email toko |
| | latitude/longitude | Float? | Untuk map |
| | openTime/closeTime | String | Jam buka (HH:mm) |
| | isOpen | Boolean | Status buka/tutup |

**ShopStaff** - Relasi many-to-many antara User dan Shop (satu outlet dapat memiliki beberapa staff dan satu staff dapat ditugaskan ke beberapa outlet)

### 2.3 Product Management

| Model | Kolom | Tipe | Keterangan |
|-------|-------|------|------------|
| **Category** | id, shopId, name, description, image, order, isActive |
| **Product** | id, categoryId, name, description, price (Decimal), image, isAvailable, isPopular, stock |
| **ProductAddon** | id, productId, name, optionName?, price, isAvailable. Menyatukan variant dan addon |
| **ShopProduct** | shopId, productId, isVisible. Menentukan visibility produk universal per outlet |

### 2.4 Order Management (PENTING untuk Dashboard)

| Model | Kolom | Tipe | Keterangan |
|-------|-------|------|------------|
| **Order** | id | String | Primary key |
| | orderNumber | String (unique) | Format: ORD-YYYYMMDD-XXX |
| | userId | String? | FK ke User |
| | shopId | String | FK ke Shop |
| | addressId | String? | FK ke Address (delivery) |
| | orderType | Enum | `DINE_IN`, `TAKEAWAY`, `DELIVERY` |
| | tableNumber | String? | Untuk DINE_IN |
| | pickupTime | DateTime? | Untuk TAKEAWAY |
| | subtotal | Decimal | Subtotal sebelum tax |
| | tax | Decimal | PPN 11% |
| | deliveryFee | Decimal | Rp 5.000 (delivery only) |
| | discount | Decimal | Diskon |
| | total | Decimal | Total akhir |
| | status | Enum | `PENDING` → `CONFIRMED` → `PREPARING` → `READY` → `DELIVERING` → `COMPLETED` / `CANCELLED` |
| | paymentMethod | String? | CASH, CARD, etc |
| | paymentStatus | Enum | `UNPAID`, `PAID`, `REFUNDED` |
| | notes | String? | Catatan pesanan |
| | createdAt/updatedAt | DateTime | Timestamps |

**OrderItem** - Item dalam pesanan (productId, quantity, price, subtotal, notes)  
**OrderItemAddon** - Semua pilihan produk yang dipilih per item melalui `productAddonId`

---

## 3. API Endpoints untuk Dashboard

### 3.1 Auth

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register user baru |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |

### 3.2 Users (Admin only)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/v1/users` | Get all users (paginated) |
| GET | `/api/v1/users/me` | Get profile sendiri |
| PUT | `/api/v1/users/me` | Update profile |
| POST | `/api/v1/users/change-password` | Ganti password |
| GET | `/api/v1/users/addresses` | Get alamat sendiri |
| POST | `/api/v1/users/addresses` | Tambah alamat |
| PUT | `/api/v1/users/addresses/:id` | Update alamat |
| DELETE | `/api/v1/users/addresses/:id` | Hapus alamat |
| POST | `/api/v1/users/addresses/:id/set-default` | Set alamat default |

### 3.3 Shops

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/shops` | Public | Get all shops |
| GET | `/api/v1/shops/:id` | Public | Get shop detail (dengan categories) |
| POST | `/api/v1/shops` | **Admin only** | Create shop (STAFF cannot create) |
| PUT | `/api/v1/shops/:id` | Admin/Staff | Update shop |
| DELETE | `/api/v1/shops/:id` | Admin | Delete shop |
| POST | `/api/v1/shops/:id/toggle-status` | Admin/Staff | Toggle buka/tutup |

### 3.4 Products

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/products` | Public | Get all products |
| GET | `/api/v1/products/:id` | Public | Get product detail (dengan product addons) |
| GET | `/api/v1/products/shop/:shopId` | Public/Auth | Get produk yang visible pada outlet |
| GET | `/api/v1/products/categories` | Public | Get all categories |
| POST | `/api/v1/products/categories` | Admin/Staff | Create category |
| PUT | `/api/v1/products/categories/:id` | Admin/Staff | Update category |
| DELETE | `/api/v1/products/categories/:id` | Admin/Staff | Delete category |
| POST | `/api/v1/products` | Admin/Staff | Create product |
| PUT | `/api/v1/products/:id` | Admin/Staff | Update product |
| DELETE | `/api/v1/products/:id` | Admin/Staff | Delete product |
| POST | `/api/v1/products/:id/toggle-availability` | Admin/Staff | Toggle availability |
| POST | `/api/v1/products/:productId/addons` | Admin/Staff | Add addon |
| DELETE | `/api/v1/products/addons/:id` | Admin/Staff | Delete addon |
| POST | `/api/v1/products/:productId/shops/:shopId/toggle-visibility` | Admin/Staff assigned | Toggle visibility produk pada outlet |

### 3.5 Orders (Core untuk Dashboard)

| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/orders` | Admin/Staff | Get all orders (STAFF auto-filtered to assigned outlet) |
| GET | `/api/v1/orders/my-orders` | Customer | Get orders sendiri |
| GET | `/api/v1/orders/:id` | Admin/Staff/Customer | Get order detail (STAFF limited to assigned outlet) |
| POST | `/api/v1/orders` | Customer | Create order |
| POST | `/api/v1/orders/:id/cancel` | Customer (PENDING) / Admin/Staff | Cancel order |
| PATCH | `/api/v1/orders/:id/status` | Admin/Staff | Update status (triggers Redis pub/sub notification) |
| PATCH | `/api/v1/orders/:id/payment` | Admin/Staff | Update payment status |

### 3.6 Query Parameters untuk Orders

```
GET /api/v1/orders?page=1&limit=20&status=PENDING&shopId=xxx&startDate=2024-01-01&endDate=2024-01-31
```

---

## 4. Alur API untuk Dashboard

### 4.1 Login Flow

```
1. POST /auth/login → { accessToken, refreshToken, user }
2. Simpan accessToken di localStorage/session
3. Untuk setiap request: Header "Authorization: Bearer <accessToken>"
4. Jika 401 → POST /auth/refresh-token → dapat token baru
5. Jika refresh gagal → redirect ke login
```

### 4.2 Dashboard Admin - Ringkasan

```
1. GET /shops → Semua toko
2. GET /orders?status=PENDING → Pesanan masuk
3. GET /orders?status=PREPARING → Sedang dibuat
4. GET /orders?status=READY → Siap diambil
5. GET /users → Semua user (filter role)
6. GET /products/shop/:id → Produk di toko tertentu
```

### 4.3 Dashboard Staff Outlet

```
1. Login → outlet staff ditentukan oleh relasi `ShopStaff`
2. GET /orders?shopId=<shopId>&status=PENDING → Pesanan masuk (backend tetap membatasi ke outlet assignment)
3. PATCH /orders/:id/status → CONFIRMED → PREPARING → READY → COMPLETED
   (triggers Redis pub/sub notification untuk real-time sync)
4. PATCH /orders/:id/payment → Update payment
5. GET /products/shop/:shopId → lihat produk universal yang visible pada outlet
6. POST/PUT/DELETE /products → manage produk
7. POST `/products/:productId/shops/:shopId/toggle-visibility` → tampilkan/sembunyikan produk pada outlet
8. POST/PUT/DELETE /products/categories → Manage kategori
9. Shop access limited to assigned outlet only (cannot create shops)
```

### 4.4 Order Status Transition

```
PENDING ──→ CONFIRMED ──→ PREPARING ──→ READY ──→ DELIVERING ──→ COMPLETED
   ↓            ↓            ↓            ↓              ↓
CANCELLED   CANCELLED    CANCELLED    CANCELLED
```

### 4.5 Create Order Flow (Customer)

```
1. GET /shops → Pilih toko
2. GET /products/shop/:id → Lihat produk
3. GET /products/:id → Lihat product addons/options
4. POST /orders
   {
     shopId,
     orderType: "DELIVERY" | "DINE_IN" | "TAKEAWAY",
     addressId (jika delivery),
     tableNumber (jika dine_in),
     items: [
       {
         productId,
         quantity,
         variantIds: [],
         addonIds: [],
         notes
       }
     ],
     notes
   }
5. Sistem hitung: subtotal + tax(11%) + deliveryFee(5000) = total
6. Return: orderNumber, total, status: PENDING
7. Staff lihat di dashboard → PATCH /orders/:id/status
```

---

## 5. Perhitungan Harga

```
subtotal = Σ [(productPrice + variantPriceAdjust) × quantity] + Σ (addonPrice × quantity)
tax = subtotal × 0.11 (PPN 11%)
deliveryFee = 5000 (hanya untuk orderType = DELIVERY)
total = subtotal + tax + deliveryFee - discount
```

---

## 6. Role-Based Access

| Fitur | ADMIN | STAFF | CUSTOMER |
|-------|-------|-------|----------|
| Manage all shops | ✅ | ❌ | ❌ |
| **Create shop** | ✅ | ❌ | ❌ |
| Manage products in assigned outlet | ✅ | ✅ | ❌ |
| View orders (assigned outlet only) | ✅ | ✅ | ❌ |
| Update order status | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Create order | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |

**Note**: STAFF hanya bisa akses data untuk outlet yang di-assign. Staff tidak bisa create shop.

---

## 7. Default Accounts untuk Testing

| Role | Email | Password | Keterangan |
|------|-------|----------|------------|
| ADMIN | admin@elokapesan.com | admin123 | System admin |
| CUSTOMER | user@example.com | user123 | Test customer |
| STAFF | *Created per outlet* | outlet123 | Staff accounts dibuat saat seed outlets |

**Note**: Staff account tidak dibuat terpisah. Setiap outlet di-seed dengan staff account masing-masing menggunakan password `outlet123`.

---

## 8. Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Pagination
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

---

## 9. Endpoint untuk Dashboard Stats

Buat dashboard analytics, gunakan kombinasi:

```typescript
// Total orders hari ini
GET /orders?startDate=2024-01-15&endDate=2024-01-15&shopId=xxx

// Orders by status
GET /orders?status=PENDING&shopId=xxx

// Revenue hari ini (filter status=COMPLETED)
GET /orders?status=COMPLETED&startDate=...&endDate=...&shopId=xxx
```

### Stats yang perlu di-hit manual:
- **Total Revenue**: Filter `status=COMPLETED`, hitung field `total` dari response
- **Orders Today**: Filter `startDate=hari ini`, `endDate=hari ini`
- **Pending Orders**: Filter `status=PENDING`
- **Visible Products per Outlet**: GET `/products/shop/:shopId` (ShopProduct.isVisible=true dan Product.isAvailable=true)

---

## 10. Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis (untuk blacklist token, session caching, geolocation, order notifications via Streams)
- **Auth**: JWT (access + refresh token)
- **Validation**: express-validator

---

## 11. Cara Run

```bash
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL, JWT_SECRET, REDIS
npm run prisma:migrate
npm run prisma:seed   # Optional: seed demo data
npm run dev           # Start dev server di localhost:3000
```

**API Base URL**: `http://localhost:3000/api/v1`  
**Swagger**: `http://localhost:3000/api/v1/docs`

---

## 12. Tips Development Dashboard

### Untuk Admin Dashboard:
1. GET /users?role=STAFF → list staff
2. GET /users?role=CUSTOMER → list customer
3. GET /shops → semua toko, bisa create new shop
4. GET /orders?page=1&limit=50 → order list semua toko
5. Stats: hitung manual dari response atau buat endpoint baru di backend

### Untuk Staff Outlet Dashboard:
1. Ambil outlet dari assignment `ShopStaff`
2. GET /orders?shopId=<shopId>&status=PENDING → pesanan baru
3. Auto-refresh setiap 10 detik untuk pesanan baru (atau subscribe ke Redis pub/sub via WebSocket)
4. PATCH /orders/:id/status → update status
5. GET /products/shop/:shopId → manage menu universal yang tersedia untuk outlet
6. POST /products/:productId/shops/:shopId/toggle-visibility → tampilkan/sembunyikan menu

---

## 13. Redis Usage

Backend menggunakan Redis untuk 4 fitur:

### 13.1 Token Blacklist (Auth)
```typescript
// Middleware auth cek blacklist
await redis.get(`blacklist:${token}`);
```

### 13.2 Geolocation (Nearby Shops)
File: `src/services/geolocation.service.ts`
```typescript
// Redis GEO menimpan koordinat semua outlet
await redis.geoadd('shops:geo', longitude, latitude, shopId);
// Query nearby
await redis.georadius('shops:geo', longitude, latitude, radius, 'km');
```

Endpoint: `GET /shops/nearby?lat=-5.15&lng=119.42&radius=10`

### 13.3 Session Caching
File: `src/middleware/sessionCache.ts`
```typescript
import { loadSession } from '../middleware/sessionCache';

// Gunakan setelah authenticate untuk load user + shopIds dengan cache
router.use(authenticate, loadSession);
```

Flow:
1. Cek Redis key `session:user:<userId>` (TTL 1 jam)
2. Cache miss → load dari DB (User + ShopStaff untuk role STAFF)
3. Simpan ke Redis untuk request berikutnya
4. Invalidate saat logout / role change / staff assignment change: `deleteCachedSession(userId)`

Session data terdiri dari: `id, email, name, role, isActive, shopIds[]` (shopIds hanya untuk STAFF).

### 13.4 Order Notifications (Redis Streams)
File: `src/services/notification.service.ts`

**Why Streams over Pub/Sub?**
1. **Persistence**: Messages saved in stream history (up to 1000 entries). Staff missing events can replay.
2. **Reliable Delivery**: Supports consumer groups for multi-staff outlets.
3. **Range Queries**: Retrieve notification history without DB hits.

Streams:
- `stream:notifications:orders` → order events (created, updated, cancelled, completed)
- `stream:notifications:shops` → shop status events
- `stream:notifications:system` → system alerts

```typescript
import { 
  notifyOrderUpdate, 
  getStreamHistory, 
  readStreamNew,
  NotificationStream 
} from '../services/notification.service';

// Publish (dipanggil otomatis di order controller)
await notifyOrderUpdate('ORDER_CREATED', orderId, orderNumber, shopId, 'PENDING');
await notifyOrderUpdate('ORDER_UPDATED', orderId, orderNumber, shopId, 'CONFIRMED');
await notifyOrderUpdate('ORDER_CANCELLED', orderId, orderNumber, shopId, 'CANCELLED');
await notifyOrderUpdate('ORDER_COMPLETED', orderId, orderNumber, shopId, 'COMPLETED');

// Read recent history (untuk initial load dashboard)
const history = await getStreamHistory(NotificationStream.ORDERS, 20);
// Returns: [{ id: '1767225600000-0', data: { type, orderId, orderNumber, ... } }, ...]

// Poll for new notifications (SSE/WebSocket backend)
let lastId = '$'; // Start from latest
setInterval(async () => {
  const newEvents = await readStreamNew(NotificationStream.ORDERS, lastId, 2000);
  if (newEvents.length > 0) {
    lastId = newEvents[newEvents.length - 1].id;
    // Broadcast to WebSocket clients
    newEvents.forEach(event => {
      wss.broadcast(JSON.stringify(event.data));
    });
  }
}, 3000);
```

Stream Entry Format:
```json
{
  "id": "1767225600000-0",
  "data": {
    "type": "ORDER_CREATED",
    "orderId": "clx...",
    "orderNumber": "ORD-20260101-001",
    "shopId": "clx...",
    "status": "PENDING",
    "message": "New order ORD-20260101-001 received",
    "timestamp": "1767225600000"
  }
}
```

Dashboard WebSocket/SSE flow:
1. Client connects via WebSocket/SSE
2. Backend sends last 20 notifications via `getStreamHistory()`
3. Backend polls `readStreamNew()` every 2-3s with last seen ID
4. New entries broadcast to connected clients
5. Client can reconnect and fetch missed history (no data loss)

---

**Last Updated:** November 3, 2026