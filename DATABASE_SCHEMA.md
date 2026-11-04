# Database Schema Documentation - Eloka Pesan

**Last Updated:** November 5, 2026  
**Database:** PostgreSQL (Neon)  
**ORM:** Prisma  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Schema Details](#schema-details)
4. [Business Rules](#business-rules)
5. [Indexes & Performance](#indexes--performance)
6. [Migration Guide](#migration-guide)

---

## 🎯 Overview

Eloka Pesan adalah sistem POS multi-outlet untuk coffee shop/restoran dengan fitur:

- **Multi-tenant:** Satu produk universal, visibility per outlet via `ShopProduct`
- **Role-based:** ADMIN (full access), STAFF (outlet-specific), CUSTOMER (order only)
- **Order types:** DINE_IN, TAKEAWAY, DELIVERY
- **Addon system:** Kategori addon dengan aturan `SINGLE`/`MULTIPLE` selection
- **Real-time:** Redis pub/sub untuk notifikasi order status

---

## 🗺️ Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER MANAGEMENT                               │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │    User     │──┐
    │─────────────│  │
    │ id (PK)     │  │ 1:N
    │ email       │  │
    │ password    │  ├──→ RefreshToken (token auth)
    │ name        │  │
    │ phone       │  ├──→ Address (delivery addresses)
    │ role        │  │
    │ isActive    │  ├──→ Order (customer orders)
    └─────────────┘  │
                     └──→ ShopStaff (outlet assignments)


┌──────────────────────────────────────────────────────────────────────┐
│                      SHOP & PRODUCT MANAGEMENT                        │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐         ┌──────────────┐
    │    Shop     │──1:N───→│  Category    │
    │─────────────│         │──────────────│
    │ id (PK)     │         │ id (PK)      │
    │ name        │         │ shopId (FK)  │
    │ address     │         │ name         │
    │ phone       │         │ order        │
    │ openTime    │         └──────┬───────┘
    │ closeTime   │                │ 1:N
    │ isOpen      │                ↓
    └──────┬──────┘         ┌──────────────┐
           │ 1:N            │   Product    │
           │                │──────────────│
           ↓                │ id (PK)      │
    ┌─────────────┐         │ categoryId   │
    │ ShopStaff   │         │ name         │
    │─────────────│         │ price        │
    │ shopId (FK) │         │ isAvailable  │
    │ userId (FK) │         │ stock        │
    └─────────────┘         └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │ 1:N          │ 1:N          │ 1:N
                    ↓              ↓              ↓
             ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
             │ ShopProduct │ │ ProductAddon │ │  OrderItem   │
             │─────────────│ │──────────────│ │──────────────│
             │ shopId (FK) │ │ productId    │ │ orderId (FK) │
             │ productId   │ │ name         │ │ productId    │
             │ isVisible   │ │ category     │ │ quantity     │
             └─────────────┘ │ price        │ │ subtotal     │
                             │ order        │ └──────┬───────┘
                             │ addonCategoryId│       │ 1:N
                             └───────┬────────┘       ↓
                                     │ N:1      ┌──────────────────┐
                                     ↓          │ OrderItemAddon   │
                             ┌──────────────┐  │──────────────────│
                             │AddonCategory │  │ orderItemId (FK) │
                             │──────────────│  │ productAddonId   │
                             │ id (PK)      │  │ quantity         │
                             │ name         │  └──────────────────┘
                             │ selectionMode│
                             └──────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                         ORDER MANAGEMENT                              │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │    Order    │
    │─────────────│
    │ id (PK)     │
    │ orderNumber │ (unique: ORD-YYYYMMDD-XXX)
    │ userId (FK) │──→ User (nullable for guest orders)
    │ shopId (FK) │──→ Shop
    │ addressId   │──→ Address (DELIVERY only)
    │ orderType   │ (DINE_IN | TAKEAWAY | DELIVERY)
    │ tableNumber │ (DINE_IN only)
    │ subtotal    │
    │ tax         │ (11% PPN)
    │ deliveryFee │ (Rp 5,000 for DELIVERY)
    │ discount    │
    │ total       │
    │ status      │ (lifecycle below)
    │ paymentStatus│ (UNPAID | PAID | REFUNDED)
    │ paymentMethod│
    └─────┬───────┘
          │ 1:N
          ↓
    ┌─────────────┐
    │  OrderItem  │
    │─────────────│
    │ id (PK)     │
    │ orderId     │
    │ productId   │
    │ quantity    │
    │ price       │ (snapshot at order time)
    │ subtotal    │
    └─────────────┘
```

---

## 📊 Schema Details

### 1. User Management

#### 1.1 User
**Purpose:** Mengelola akun pengguna (customer, staff, admin)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `email` | String | UNIQUE, NOT NULL | Login email |
| `password` | String | NOT NULL | Bcrypt hash |
| `name` | String | NOT NULL | Full name |
| `phone` | String | NULLABLE | Phone number |
| `role` | UserRole | NOT NULL, DEFAULT: CUSTOMER | User role enum |
| `isActive` | Boolean | DEFAULT: true | Account status |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `orders` → Order[] (1:N)
- `refreshToken` → RefreshToken[] (1:N)
- `addresses` → Address[] (1:N)
- `staffShops` → ShopStaff[] (1:N)

**Indexes:**
- `email` (unique constraint + index)

**Enum: UserRole**
```prisma
enum UserRole {
  CUSTOMER  // Pelanggan - bisa order, lihat order sendiri
  STAFF     // Staff outlet - kelola outlet assigned saja
  ADMIN     // Admin - full access semua fitur
}
```

---

#### 1.2 RefreshToken
**Purpose:** Token JWT untuk refresh access token

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `token` | String | UNIQUE, NOT NULL | JWT refresh token |
| `userId` | String | FK → User, NOT NULL | User owner |
| `expiresAt` | DateTime | NOT NULL | Token expiry |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |

**Relations:**
- `user` → User (N:1, onDelete: CASCADE)

**Indexes:**
- `userId`
- `token` (unique constraint + index)

---

#### 1.3 Address
**Purpose:** Alamat pengiriman customer (untuk DELIVERY orders)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `userId` | String | FK → User, NOT NULL | Address owner |
| `label` | String | NOT NULL | "Rumah", "Kantor", etc |
| `street` | String | NOT NULL | Street address |
| `city` | String | NOT NULL | City name |
| `province` | String | NOT NULL | Province name |
| `postalCode` | String | NOT NULL | Postal code |
| `isDefault` | Boolean | DEFAULT: false | Default address flag |
| `coordinates` | String | NULLABLE | "lat,lng" format |

**Relations:**
- `user` → User (N:1, onDelete: CASCADE)
- `orders` → Order[] (1:N)

**Indexes:**
- `userId`

---

### 2. Shop & Staff Management

#### 2.1 Shop
**Purpose:** Data outlet/restoran

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `name` | String | NOT NULL | Shop name |
| `description` | String | NULLABLE | Shop description |
| `logo` | String | NULLABLE | Logo URL |
| `address` | String | NOT NULL | Full address |
| `phone` | String | NOT NULL | Contact phone |
| `email` | String | NULLABLE | Contact email |
| `latitude` | Float | NULLABLE | Geolocation latitude |
| `longitude` | Float | NULLABLE | Geolocation longitude |
| `openTime` | String | NOT NULL | Format: "HH:mm" (e.g., "07:00") |
| `closeTime` | String | NOT NULL | Format: "HH:mm" (e.g., "22:00") |
| `isOpen` | Boolean | DEFAULT: true | Open/closed status |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `categories` → Category[] (1:N)
- `orders` → Order[] (1:N)
- `staff` → ShopStaff[] (1:N)
- `products` → ShopProduct[] (1:N)

---

#### 2.2 ShopStaff
**Purpose:** Many-to-many relation antara User (STAFF role) dan Shop

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `shopId` | String | FK → Shop, NOT NULL | Shop reference |
| `userId` | String | FK → User, NOT NULL | Staff user reference |
| `createdAt` | DateTime | DEFAULT: now() | Assignment date |

**Relations:**
- `shop` → Shop (N:1, onDelete: CASCADE)
- `user` → User (N:1, onDelete: CASCADE)

**Constraints:**
- UNIQUE(`shopId`, `userId`) - satu staff tidak bisa assigned 2x ke outlet yang sama

**Indexes:**
- `shopId`
- `userId`

---

### 3. Product Management

#### 3.1 Category
**Purpose:** Kategori produk (Coffee, Food, Non-Coffee, dll)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `shopId` | String | FK → Shop, NOT NULL | Shop owner |
| `name` | String | NOT NULL | Category name |
| `description` | String | NULLABLE | Category description |
| `image` | String | NULLABLE | Category image URL |
| `order` | Int | DEFAULT: 0 | Display order |
| `isActive` | Boolean | DEFAULT: true | Active status |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `shop` → Shop (N:1, onDelete: CASCADE)
- `products` → Product[] (1:N)

**Indexes:**
- `shopId`

---

#### 3.2 Product
**Purpose:** Produk universal yang tersedia di semua outlet

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `categoryId` | String | FK → Category, NOT NULL | Product category |
| `name` | String | NOT NULL | Product name |
| `description` | String | NULLABLE | Product description |
| `price` | Decimal(10,2) | NOT NULL | Base price |
| `image` | String | NULLABLE | Product image URL |
| `isAvailable` | Boolean | DEFAULT: true | Global availability |
| `isPopular` | Boolean | DEFAULT: false | Popular flag |
| `stock` | Int | NULLABLE | Stock count (optional) |
| `order` | Int | DEFAULT: 0 | Display order |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `category` → Category (N:1, onDelete: CASCADE)
- `shopProducts` → ShopProduct[] (1:N)
- `addons` → ProductAddon[] (1:N)
- `orderItems` → OrderItem[] (1:N)

**Indexes:**
- `categoryId`
- `isAvailable`

**Business Logic:**
- Produk bersifat **universal** - dibuat sekali, tersedia di semua outlet
- Visibility per outlet diatur via `ShopProduct.isVisible`
- `isAvailable=false` → produk tidak bisa dipesan di semua outlet

---

#### 3.3 AddonCategory
**Purpose:** Kategori addon dengan aturan seleksi (SINGLE/MULTIPLE)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `name` | String | UNIQUE, NOT NULL | Category name (e.g., "Size", "Sugar Level") |
| `selectionMode` | String | DEFAULT: "MULTIPLE" | "SINGLE" or "MULTIPLE" |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `addons` → ProductAddon[] (1:N)

**Business Rules:**
- `SINGLE`: Customer hanya bisa pilih 1 addon dari kategori ini (e.g., Size: Regular/Large)
- `MULTIPLE`: Customer bisa pilih beberapa addon (e.g., Toppings: Extra Shot, Vanilla Syrup)
- Kategori yang masih digunakan oleh addon tidak bisa dihapus

---

#### 3.4 ProductAddon
**Purpose:** Addon/options untuk produk (size, topping, sugar level, dll)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `productId` | String | FK → Product, NOT NULL | Product reference |
| `name` | String | NOT NULL | Addon name (e.g., "Large", "Extra Shot") |
| `addonCategoryId` | String | FK → AddonCategory, NULLABLE | Category reference |
| `category` | String | DEFAULT: "Lainnya" | Legacy category field |
| `order` | Int | DEFAULT: 0 | Display order |
| `price` | Decimal(10,2) | DEFAULT: 0 | Additional price |
| `isAvailable` | Boolean | DEFAULT: true | Availability status |

**Relations:**
- `product` → Product (N:1, onDelete: CASCADE)
- `addonCategory` → AddonCategory (N:1, onDelete: SET NULL)
- `orderItemAddons` → OrderItemAddon[] (1:N)

**Indexes:**
- `productId`
- `addonCategoryId`

**Business Rules:**
- Addon dengan `addonCategoryId` mengikuti aturan seleksi dari `AddonCategory.selectionMode`
- Addon legacy tanpa `addonCategoryId` menggunakan field `category` (backward compatibility)
- Staff outlet dapat toggle `isAvailable` untuk addon pada produk yang visible di outlet-nya

---

#### 3.5 ShopProduct
**Purpose:** Visibility control produk universal per outlet

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `shopId` | String | FK → Shop, NOT NULL | Shop reference |
| `productId` | String | FK → Product, NOT NULL | Product reference |
| `isVisible` | Boolean | DEFAULT: true | Visibility status |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `shop` → Shop (N:1, onDelete: CASCADE)
- `product` → Product (N:1, onDelete: CASCADE)

**Constraints:**
- UNIQUE(`shopId`, `productId`) - satu produk hanya punya 1 entry per outlet

**Indexes:**
- `shopId`
- `productId`

**Business Rules:**
- Saat produk dibuat pertama kali, `ShopProduct` otomatis dibuat untuk semua outlet dengan `isVisible=true`
- Staff outlet hanya bisa toggle `isVisible` untuk outlet yang assigned
- Customer hanya melihat produk dengan `Product.isAvailable=true` AND `ShopProduct.isVisible=true`

---

### 4. Order Management

#### 4.1 Order
**Purpose:** Data pesanan customer

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `orderNumber` | String | UNIQUE, NOT NULL | Format: ORD-YYYYMMDD-XXX |
| `userId` | String | FK → User, NULLABLE | Customer (nullable for guest) |
| `shopId` | String | FK → Shop, NOT NULL | Shop reference |
| `addressId` | String | FK → Address, NULLABLE | Delivery address (DELIVERY only) |
| `orderType` | OrderType | NOT NULL, DEFAULT: DINE_IN | Order type enum |
| `tableNumber` | String | NULLABLE | Table number (DINE_IN only) |
| `pickupTime` | DateTime | NULLABLE | Pickup time (TAKEAWAY only) |
| `subtotal` | Decimal(10,2) | NOT NULL | Subtotal before tax |
| `tax` | Decimal(10,2) | DEFAULT: 0 | PPN 11% |
| `deliveryFee` | Decimal(10,2) | DEFAULT: 0 | Delivery fee (DELIVERY only) |
| `discount` | Decimal(10,2) | DEFAULT: 0 | Discount amount |
| `total` | Decimal(10,2) | NOT NULL | Final total |
| `status` | OrderStatus | DEFAULT: PENDING | Order status enum |
| `paymentMethod` | String | NULLABLE | Payment method |
| `paymentStatus` | PaymentStatus | DEFAULT: UNPAID | Payment status enum |
| `notes` | String | NULLABLE | Order notes |
| `createdAt` | DateTime | DEFAULT: now() | Created timestamp |
| `updatedAt` | DateTime | AUTO | Updated timestamp |

**Relations:**
- `user` → User (N:1, nullable for guest orders)
- `shop` → Shop (N:1, NOT NULL)
- `address` → Address (N:1, nullable)
- `items` → OrderItem[] (1:N)

**Indexes:**
- `userId`
- `shopId`
- `orderNumber` (unique constraint + index)
- `status`
- `createdAt`

**Enums:**

```prisma
enum OrderType {
  DINE_IN    // Makan di tempat - butuh tableNumber
  TAKEAWAY   // Bungkus - optional pickupTime
  DELIVERY   // Delivery - butuh addressId, +Rp 5,000 fee
}

enum OrderStatus {
  PENDING     // Baru dibuat, belum dikonfirmasi
  CONFIRMED   // Dikonfirmasi staff
  PREPARING   // Sedang diproses
  READY       // Siap diambil/dikirim
  DELIVERING  // Dalam pengiriman (DELIVERY only)
  COMPLETED   // Selesai
  CANCELLED   // Dibatalkan
}

enum PaymentStatus {
  UNPAID      // Belum dibayar
  PAID        // Sudah dibayar
  REFUNDED    // Dikembalikan (setelah cancel)
}
```

---

#### 4.2 OrderItem
**Purpose:** Item dalam order (produk yang dipesan)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `orderId` | String | FK → Order, NOT NULL | Order reference |
| `productId` | String | FK → Product, NOT NULL | Product reference |
| `quantity` | Int | NOT NULL | Quantity ordered |
| `price` | Decimal(10,2) | NOT NULL | Product price snapshot |
| `subtotal` | Decimal(10,2) | NOT NULL | Item subtotal |
| `notes` | String | NULLABLE | Item-specific notes |

**Relations:**
- `order` → Order (N:1, onDelete: CASCADE)
- `product` → Product (N:1)
- `addons` → OrderItemAddon[] (1:N)

**Indexes:**
- `orderId`
- `productId`

**Business Rules:**
- `price` adalah snapshot harga produk saat order dibuat (tidak berubah jika harga produk diupdate)
- `subtotal` = (`price` + sum of addon prices) × `quantity`

---

#### 4.3 OrderItemAddon
**Purpose:** Addon yang dipilih untuk setiap order item

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, cuid() | Unique identifier |
| `orderItemId` | String | FK → OrderItem, NOT NULL | Order item reference |
| `productAddonId` | String | FK → ProductAddon, NOT NULL | Addon reference |
| `quantity` | Int | DEFAULT: 1 | Addon quantity |

**Relations:**
- `orderItem` → OrderItem (N:1, onDelete: CASCADE)
- `productAddon` → ProductAddon (N:1)

**Indexes:**
- `orderItemId`
- `productAddonId`

**Business Rules:**
- Menyimpan addon yang dipilih customer saat checkout
- Harga addon diambil dari `ProductAddon.price` saat order dibuat
- Jika addon dihapus di masa depan, history order tetap aman (foreign key tidak CASCADE)

---

## 📐 Business Rules

### 1. Order Calculation

```
Subtotal = Σ (Product Price + Addon Prices) × Quantity
Tax      = Subtotal × 0.11 (PPN 11%)
Delivery = Rp 5,000 (hanya untuk DELIVERY)
Total    = Subtotal + Tax + Delivery - Discount
```

**Example:**
```
Order:
- 2x Iced Americano (Rp 28,000)
  - Large size (+Rp 5,000)
  - Extra Shot (+Rp 6,000)

Calculation:
Item subtotal = (28,000 + 5,000 + 6,000) × 2 = Rp 78,000
Tax           = 78,000 × 0.11 = Rp 8,580
Delivery      = Rp 5,000 (if DELIVERY)
Total         = 78,000 + 8,580 + 5,000 = Rp 91,580
```

---

### 2. Order Status Lifecycle

```
PENDING → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED
   ↓          ↓           ↓          ↓
CANCELLED  CANCELLED   CANCELLED  CANCELLED
```

**Allowed Transitions:**
- `PENDING` → `CONFIRMED`, `CANCELLED`
- `CONFIRMED` → `PREPARING`, `CANCELLED`
- `PREPARING` → `READY`, `CANCELLED`
- `READY` → `DELIVERING` (DELIVERY only), `COMPLETED` (DINE_IN/TAKEAWAY)
- `DELIVERING` → `COMPLETED`, `CANCELLED`
- `COMPLETED` → (final state)
- `CANCELLED` → (final state)

**Cancellation Rules:**
- Customer: hanya bisa cancel saat `PENDING`
- Staff/Admin: bisa cancel kapan saja sebelum `COMPLETED`

---

### 3. Product Visibility Logic

**Public API (`GET /products/shop/:shopId`):**
```sql
WHERE Product.isAvailable = true 
  AND ShopProduct.isVisible = true
  AND ShopProduct.shopId = :shopId
```

**Staff View:**
- Staff hanya melihat produk untuk outlet yang assigned
- Staff bisa toggle `ShopProduct.isVisible` untuk outlet-nya

**Admin View:**
- Admin melihat semua produk universal
- Admin bisa toggle `Product.isAvailable` (global)
- Admin bisa toggle `ShopProduct.isVisible` per outlet

---

### 4. Addon Selection Rules

**Berdasarkan `AddonCategory.selectionMode`:**

| Mode | Rule | Example |
|------|------|---------|
| `SINGLE` | Customer pilih **1 addon saja** dari kategori ini | Size: Regular OR Large (not both) |
| `MULTIPLE` | Customer bisa pilih **beberapa addon** | Toppings: Extra Shot + Vanilla Syrup |

**Validation di Frontend:**
- Kategori `SINGLE` → Radio button
- Kategori `MULTIPLE` → Checkbox

**Backend tidak enforce validation** - Frontend bertanggung jawab untuk UX yang benar.

---

### 5. Role-Based Access Control

| Feature | ADMIN | STAFF | CUSTOMER |
|---------|-------|-------|----------|
| Create/Delete Shop | ✅ | ❌ | ❌ |
| Update Shop | ✅ | ✅ (assigned only) | ❌ |
| Create/Edit/Delete Product | ✅ | ❌ | ❌ |
| Create/Edit/Delete Category | ✅ | ❌ | ❌ |
| Create/Edit Addon | ✅ | ❌ | ❌ |
| Toggle Product Visibility | ✅ | ✅ (assigned shop) | ❌ |
| Toggle Addon Availability | ✅ | ✅ (assigned shop) | ❌ |
| View All Orders | ✅ | ✅ (assigned shop) | ❌ |
| Update Order Status | ✅ | ✅ (assigned shop) | ❌ |
| Create Order | ✅ | ✅ | ✅ |
| View Own Orders | ✅ | ✅ | ✅ |
| Cancel Order | ✅ | ✅ | ✅ (PENDING only) |

---

## ⚡ Indexes & Performance

### Primary Indexes (Auto-created)

| Table | Index | Type |
|-------|-------|------|
| User | `email` | UNIQUE |
| RefreshToken | `token` | UNIQUE |
| Order | `orderNumber` | UNIQUE |
| AddonCategory | `name` | UNIQUE |
| ShopStaff | `(shopId, userId)` | UNIQUE composite |
| ShopProduct | `(shopId, productId)` | UNIQUE composite |

### Secondary Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| User | `email` | Fast login lookup |
| RefreshToken | `userId`, `token` | Token validation |
| Address | `userId` | User address list |
| ShopStaff | `shopId`, `userId` | Staff assignment queries |
| Category | `shopId` | Shop category list |
| Product | `categoryId`, `isAvailable` | Product filtering |
| ProductAddon | `productId`, `addonCategoryId` | Addon lookup |
| ShopProduct | `shopId`, `productId` | Visibility queries |
| Order | `userId`, `shopId`, `orderNumber`, `status`, `createdAt` | Order filtering & sorting |
| OrderItem | `orderId`, `productId` | Order item lookup |
| OrderItemAddon | `orderItemId`, `productAddonId` | Addon history |

### Query Optimization Tips

1. **Get shop products:**
```sql
-- Fast with indexes on shopId + isAvailable + isVisible
SELECT p.* FROM Product p
JOIN ShopProduct sp ON sp.productId = p.id
WHERE p.isAvailable = true 
  AND sp.isVisible = true
  AND sp.shopId = :shopId
```

2. **Get orders by shop + status:**
```sql
-- Fast with composite index on (shopId, status, createdAt)
SELECT * FROM Order
WHERE shopId = :shopId 
  AND status = 'PENDING'
ORDER BY createdAt DESC
```

3. **Staff assigned shops:**
```sql
-- Fast with index on userId
SELECT s.* FROM Shop s
JOIN ShopStaff ss ON ss.shopId = s.id
WHERE ss.userId = :staffUserId
```

---

## 🔧 Migration Guide

### Running Migrations

```bash
# Development: Generate migration from schema changes
npm run prisma:migrate:dev

# Production: Deploy pending migrations
npm run prisma:migrate:deploy

# Check migration status
npx prisma migrate status
```

### Seeding Database

```bash
# Seed initial data (admin, shop, products)
npm run prisma:seed
```

**Default Seed Data:**
- 1 Admin account
- 1 Staff account (assigned to outlet 06)
- 1 Customer account
- 1 Demo shop (Eloka Coffee & Eatery)
- 4 Categories (Coffee, Non-Coffee, Food, Beverages)
- 4 Products with addons

### Schema Backup

```bash
# Export schema to SQL
npx prisma db pull

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

## 🚨 Important Notes

### 1. Prisma Relation Mode

```prisma
datasource db {
  provider     = "postgresql"
  relationMode = "prisma"  // Neon-specific
}
```

- Neon PostgreSQL uses `relationMode = "prisma"` for better connection pooling
- Foreign key constraints handled by Prisma, not PostgreSQL
- Improves performance with connection pooling (pgbouncer)

### 2. Decimal Precision

All price fields use `Decimal(10,2)`:
- Max value: 99,999,999.99 (99 juta)
- Precision: 2 decimal places
- No floating-point rounding errors

### 3. Soft Delete vs Hard Delete

| Model | Delete Strategy |
|-------|----------------|
| User, Shop, Category, Product | CASCADE delete (hard delete) |
| ProductAddon | Soft delete via `isAvailable=false` if used in orders |
| Order | Never delete (audit trail) |
| RefreshToken | Hard delete on logout |

### 4. Guest Orders

- `Order.userId` is NULLABLE
- Guest orders saved with `userId = null`
- Guest can track order via public `/orders/:id/status` endpoint
- No authentication required for guest order tracking

---

## 📞 Support

**Database Issues:**
- Check Prisma logs: `DEBUG=prisma:* npm run dev`
- Check Neon dashboard: https://console.neon.tech
- Connection issues: Verify `DATABASE_URL` and `DATABASE_URL_UNPOOLED`

**Migration Issues:**
- Reset database (DEV ONLY): `npx prisma migrate reset`
- Force deploy: `npx prisma migrate deploy --force`

---

**Last Updated:** November 4, 2026  
**Schema Version:** 1.0.0  
**Prisma Version:** 5.x
