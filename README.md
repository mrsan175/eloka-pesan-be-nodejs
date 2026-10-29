# Eloka Pesan - Backend API

> Backend system untuk pemesanan makanan dan minuman di restoran/coffee shop

## 🎯 Overview

Eloka Pesan adalah REST API backend yang mendukung sistem pemesanan makanan dengan fitur lengkap:

- ✅ **Multi-type Orders**: Dine-in, Takeaway, Delivery
- ✅ **Role-Based Access Control**: Admin, Staff, Customer
- ✅ **Product Customization**: Variants & Addons
- ✅ **Smart Calculation**: Auto-calculate subtotal, tax (PPN 11%), delivery fee
- ✅ **Order Lifecycle**: Status management dari PENDING hingga COMPLETED
- ✅ **JWT Authentication**: Access token + Refresh token dengan Redis
- ✅ **API Documentation**: Swagger UI terintegrasi
- ✅ **Unit Tests**: 95 tests dengan 76% coverage

---

## 📋 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL (atau akun [Neon](https://neon.tech))
- Redis (lokal atau cloud)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd eloka-pesan/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Run database migration
npm run prisma:migrate

# Seed initial data
npm run prisma:seed

# Start development server
npm run dev
```

Server akan berjalan di: **http://localhost:3000**

---

## 🚀 Deploy ke Vercel

Backend ini memakai `src/index.ts` sebagai serverless handler Vercel. Saat membuat
project baru di Vercel, pilih folder `backend` sebagai **Root Directory** jika
repository juga berisi frontend.

Tambahkan environment variables berikut di Vercel untuk environment **Production**:

```text
NODE_ENV=production
DATABASE_URL=<pooled Neon connection string>
REDIS_URL=<production Redis URL>
JWT_SECRET=<random production secret>
JWT_REFRESH_SECRET=<random production refresh secret>
CORS_ORIGIN=<frontend production URL>
```

`DATABASE_URL` harus menggunakan pooled connection string untuk runtime aplikasi.
`REDIS_URL` diambil oleh aplikasi saat `NODE_ENV=production`; jangan commit nilai
secret ke repository atau memasukkannya ke `vercel.json`.

Setelah deploy, endpoint API tersedia di:
`https://<project-domain>/api/v1/health`

---

## 🔑 Default Accounts

Setelah menjalankan `npm run prisma:seed`, gunakan akun berikut:

### Admin
```
Email: admin@elokapesan.com
Password: admin123
Role: ADMIN
```

### Staff
```
Email: staff@elokapesan.com
Password: staff123
Role: STAFF
```

### Customer
```
Email: user@example.com
Password: user123
Role: CUSTOMER
```

---

## 📚 Documentation

- **API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Swagger UI**: http://localhost:3000/api/v1/docs
- **Test Summary**: [TEST_SUMMARY.md](./TEST_SUMMARY.md)

---

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start dev server dengan hot-reload

# Build
npm run build           # Compile TypeScript to JavaScript
npm start               # Run production build

# Database
npm run prisma:migrate  # Run database migrations
npm run prisma:seed     # Seed initial data
npm run prisma:studio   # Open Prisma Studio (database GUI)
npm run prisma:generate # Generate Prisma Client

# Testing
npm test                # Run unit tests with coverage
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── __tests__/           # Unit tests
│   │   ├── controllers/     # Controller tests
│   │   ├── mocks/           # Mock objects (Prisma, Redis)
│   │   └── utils/           # Utility tests
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Prisma client
│   │   ├── environment.ts   # Environment variables
│   │   └── redis.ts         # Redis client
│   ├── controllers/         # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── shop.controller.ts
│   │   ├── product.controller.ts
│   │   └── order.controller.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── errorHandler.ts # Global error handler
│   │   ├── rateLimiter.ts  # Rate limiting
│   │   └── validateRequest.ts
│   ├── routes/              # API routes
│   │   └── v1/              # API version 1
│   ├── utils/               # Utility functions
│   │   ├── asyncHandler.ts
│   │   ├── errors.ts        # Custom error classes
│   │   ├── logger.ts        # Winston logger
│   │   └── response.ts      # Response helpers
│   ├── types/               # TypeScript types
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Database seeder
│   └── migrations/          # Migration history
├── .env                     # Environment variables
├── .env.example             # Environment template
├── jest.config.js           # Jest configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

---

## 🗄️ Database Schema

### Core Models

- **User**: Admin, Staff, Customer dengan role-based access
- **Shop**: Restoran/coffee shop
- **Category**: Kategori produk (Coffee, Food, dll)
- **Product**: Menu item dengan price, availability, stock
- **ProductVariant**: Varian produk (Size: Small/Large, Temperature: Hot/Iced)
- **ProductAddon**: Addon produk (Extra Shot, Whipped Cream)
- **Order**: Pesanan dengan calculation otomatis
- **OrderItem**: Item dalam pesanan
- **Address**: Alamat pengiriman user
- **RefreshToken**: JWT refresh token (stored in DB)

### Order Calculation Logic

```typescript
Subtotal = Σ (Product Price + Variant Adjustments) × Quantity + Addon Prices
Tax (PPN 11%) = Subtotal × 0.11
Delivery Fee = Rp 5.000 (only for DELIVERY orders)
Total = Subtotal + Tax + Delivery Fee - Discount
```

### Order Status Flow

```
PENDING → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED
   ↓          ↓           ↓          ↓
CANCELLED  CANCELLED   CANCELLED  CANCELLED
```

---

## 🔐 Authentication

### JWT Flow

1. **Login** → Dapatkan `accessToken` (7 days) & `refreshToken` (30 days)
2. Gunakan `accessToken` di header: `Authorization: Bearer <token>`
3. Jika expired, gunakan `refreshToken` untuk mendapatkan token baru
4. **Logout** → Token dihapus dari Redis

### Refresh Token Storage

- `accessToken`: Short-lived, tidak disimpan di server
- `refreshToken`: Long-lived, disimpan di Redis untuk revocation

---

## 🧪 Testing

```bash
npm test
```

**Test Coverage:**
- ✅ 7 Test Suites (Auth, User, Shop, Product, Order, Utilities)
- ✅ 95 Tests Passed
- ✅ 76% Statement Coverage
- ✅ Mock objects untuk Prisma & Redis

---

## 🌐 API Endpoints

### Public Endpoints
- `GET /api/v1/shops` - List semua toko
- `GET /api/v1/shops/:id` - Detail toko
- `GET /api/v1/products` - List semua produk
- `GET /api/v1/products/:id` - Detail produk

### Authentication
- `POST /api/v1/auth/register` - Register user baru
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### User (Requires Auth)
- `GET /api/v1/users/me` - Get profile
- `PUT /api/v1/users/me` - Update profile
- `GET /api/v1/users/addresses` - List alamat
- `POST /api/v1/users/addresses` - Tambah alamat
- `PUT /api/v1/users/addresses/:id` - Update alamat
- `DELETE /api/v1/users/addresses/:id` - Hapus alamat
- `POST /api/v1/users/addresses/:id/set-default` - Set default address

### Orders (Requires Auth)
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/my-orders` - List own orders
- `GET /api/v1/orders/:id` - Detail order
- `POST /api/v1/orders/:id/cancel` - Cancel order

### Orders - Staff/Admin
- `GET /api/v1/orders` - List all orders
- `PATCH /api/v1/orders/:id/status` - Update order status
- `PATCH /api/v1/orders/:id/payment` - Update payment status

### Products - Staff/Admin
- `POST /api/v1/products/categories` - Create category
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `POST /api/v1/products/:id/toggle-availability` - Toggle availability
- `POST /api/v1/products/:productId/variants` - Add variant
- `POST /api/v1/products/:productId/addons` - Add addon

### Shops - Staff/Admin
- `POST /api/v1/shops` - Create shop
- `PUT /api/v1/shops/:id` - Update shop
- `DELETE /api/v1/shops/:id` - Delete shop (Admin only)
- `POST /api/v1/shops/:id/toggle-status` - Toggle shop status

Lihat dokumentasi lengkap di [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Cache | Redis |
| Auth | JWT (jsonwebtoken) |
| Validation | express-validator |
| Logging | Winston |
| Testing | Jest + Supertest |
| Documentation | Swagger/OpenAPI |
| Code Quality | ESLint + Prettier |

---

## 📦 Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:pass@host/db?sslmode=require"

# Redis
REDIS_URL="redis://default:password@host:port"  # Production
REDIS_HOST=127.0.0.1                             # Development
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🐛 Troubleshooting

### Issue: Prisma connection error
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Check database connection
npm run prisma:studio
```

### Issue: Redis connection error
```bash
# Check Redis is running
redis-cli ping

# Or install Redis locally
# Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/
# Mac: brew install redis
# Linux: sudo apt-get install redis-server
```

### Issue: Port already in use
```bash
# Change PORT in .env file
PORT=3001
```

### Issue: Tests failing
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose
```

---

## 📝 Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use ESLint & Prettier for formatting
- Write meaningful commit messages
- Add JSDoc comments for complex functions

### API Design
- RESTful conventions
- Consistent response format
- Proper HTTP status codes
- Validation on all inputs

### Security
- Input validation & sanitization
- SQL injection protection (Prisma)
- XSS protection (helmet middleware)
- Rate limiting
- JWT token expiration
- Password hashing (bcrypt)

---

## 🚢 Deployment

### Production Checklist

- [ ] Update environment variables
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` & `JWT_REFRESH_SECRET`
- [ ] Configure `CORS_ORIGIN` dengan domain production
- [ ] Setup PostgreSQL di Neon atau provider lain
- [ ] Setup Redis (Redis Cloud, Upstash, dll)
- [ ] Run database migration: `npm run prisma:migrate`
- [ ] Build aplikasi: `npm run build`
- [ ] Setup process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Setup SSL certificate
- [ ] Configure logging & monitoring

### Deployment Platforms

- **Vercel**: Serverless deployment
- **Railway**: Full-stack deployment
- **Render**: Web services + databases
- **AWS/GCP/Azure**: VPS or container deployment
- **Heroku**: Easy deployment dengan buildpack

---

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

---

## 👥 Contributors

- **Your Name** - Initial work

---

## 📞 Support

Untuk pertanyaan atau bantuan:
- 📧 Email: info@elokapesan.com
- 📱 Phone: +62215551234

---

**Version:** 1.0.0  
**Last Updated:** October 28, 2026

---

Made with ☕ by Eloka Team
