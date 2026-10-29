import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { config } from '../../config/environment';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eloka Pesan API',
      version: '1.0.0',
      description: 'REST API untuk aplikasi pemesanan menu restoran/coffee shop',
      contact: {
        name: 'API Support',
        email: 'support@elokapesan.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.elokapesan.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm1abc123xyz' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            phone: { type: 'string', example: '+6281234567890' },
            role: { type: 'string', enum: ['CUSTOMER', 'STAFF', 'ADMIN'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            label: { type: 'string', example: 'Home' },
            street: { type: 'string', example: 'Jl. Merdeka No. 123' },
            city: { type: 'string', example: 'Jakarta' },
            province: { type: 'string', example: 'DKI Jakarta' },
            postalCode: { type: 'string', example: '12345' },
            coordinates: { type: 'string', example: '-6.2088,106.8456' },
            isDefault: { type: 'boolean' },
          },
        },
        Shop: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Coffee Shop ABC' },
            description: { type: 'string' },
            logo: { type: 'string', format: 'uri' },
            address: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            openTime: { type: 'string', example: '08:00' },
            closeTime: { type: 'string', example: '22:00' },
            isOpen: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            shopId: { type: 'string' },
            name: { type: 'string', example: 'Coffee' },
            description: { type: 'string' },
            image: { type: 'string', format: 'uri' },
            order: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            categoryId: { type: 'string' },
            name: { type: 'string', example: 'Cappuccino' },
            description: { type: 'string' },
            price: { type: 'number', format: 'decimal', example: 35000 },
            image: { type: 'string', format: 'uri' },
            isAvailable: { type: 'boolean' },
            isPopular: { type: 'boolean' },
            stock: { type: 'integer', nullable: true },
            order: { type: 'integer' },
          },
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
            name: { type: 'string', example: 'Size' },
            optionName: { type: 'string', example: 'Large' },
            priceAdjust: { type: 'number', example: 5000 },
            isAvailable: { type: 'boolean' },
          },
        },
        ProductAddon: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
            name: { type: 'string', example: 'Extra Shot' },
            price: { type: 'number', example: 8000 },
            isAvailable: { type: 'boolean' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string', example: 'ORD-261028-1234' },
            userId: { type: 'string' },
            shopId: { type: 'string' },
            addressId: { type: 'string', nullable: true },
            orderType: { type: 'string', enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] },
            tableNumber: { type: 'string', nullable: true },
            subtotal: { type: 'number', format: 'decimal' },
            tax: { type: 'number', format: 'decimal' },
            deliveryFee: { type: 'number', format: 'decimal' },
            discount: { type: 'number', format: 'decimal' },
            total: { type: 'number', format: 'decimal' },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
            },
            paymentMethod: { type: 'string', nullable: true },
            paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID', 'REFUNDED'] },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            productId: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number', format: 'decimal' },
            subtotal: { type: 'number', format: 'decimal' },
            notes: { type: 'string', nullable: true },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Shops', description: 'Shop management endpoints' },
      { name: 'Products', description: 'Product and category management' },
      { name: 'Orders', description: 'Order management endpoints' },
    ],
  },
  apis: ['./src/docs/*.yaml'],
};

const specs = swaggerJsdoc(options);

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Eloka Pesan API Docs',
}));

export default router;
