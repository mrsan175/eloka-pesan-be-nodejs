"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Create Admin User
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@elokapesan.com' },
        update: {},
        create: {
            email: 'admin@elokapesan.com',
            password: adminPassword,
            name: 'System Admin',
            phone: '+628111111111',
            role: 'ADMIN',
        },
    });
    // Create Staff User
    const staffPassword = await bcryptjs_1.default.hash('staff123', 10);
    const staff = await prisma.user.upsert({
        where: { email: 'staff@elokapesan.com' },
        update: {},
        create: {
            email: 'staff@elokapesan.com',
            password: staffPassword,
            name: 'Barista Staff',
            phone: '+628222222222',
            role: 'STAFF',
        },
    });
    // Create Demo Customer
    const customerPassword = await bcryptjs_1.default.hash('user123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            password: customerPassword,
            name: 'Budi Santoso',
            phone: '+628333333333',
            role: 'CUSTOMER',
            addresses: {
                create: {
                    label: 'Rumah',
                    street: 'Jl. Sudirman No. 45',
                    city: 'Jakarta Selatan',
                    province: 'DKI Jakarta',
                    postalCode: '12190',
                    isDefault: true,
                },
            },
        },
    });
    // Create Coffee Shop
    const shop = await prisma.shop.upsert({
        where: { id: 'shop-demo-1' },
        update: {},
        create: {
            id: 'shop-demo-1',
            name: 'Eloka Coffee & Eatery',
            description: 'Artisan coffee and comfort food',
            address: 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan',
            phone: '+62215551234',
            email: 'info@elokacoffee.com',
            openTime: '07:00',
            closeTime: '22:00',
            isOpen: true,
        },
    });
    // Categories
    const coffeeCat = await prisma.category.create({
        data: {
            shopId: shop.id,
            name: 'Coffee',
            description: 'Espresso-based coffee drinks',
            order: 1,
        },
    });
    const nonCoffeeCat = await prisma.category.create({
        data: {
            shopId: shop.id,
            name: 'Non-Coffee',
            description: 'Tea, chocolate, and refreshers',
            order: 2,
        },
    });
    const foodCat = await prisma.category.create({
        data: {
            shopId: shop.id,
            name: 'Food & Pastry',
            description: 'Snacks, pastry, and heavy meals',
            order: 3,
        },
    });
    // Products - Coffee
    await prisma.product.create({
        data: {
            categoryId: coffeeCat.id,
            name: 'Iced Americano',
            description: 'Espresso shot topped with cold water and ice',
            price: 28000,
            isAvailable: true,
            isPopular: true,
            order: 1,
            variants: {
                create: [
                    { name: 'Size', optionName: 'Regular', priceAdjust: 0 },
                    { name: 'Size', optionName: 'Large', priceAdjust: 5000 },
                ],
            },
            addons: {
                create: [
                    { name: 'Extra Shot', price: 6000 },
                    { name: 'Vanilla Syrup', price: 5000 },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            categoryId: coffeeCat.id,
            name: 'Caffe Latte',
            description: 'Rich espresso balanced with steamed milk and thin foam',
            price: 35000,
            isAvailable: true,
            isPopular: true,
            order: 2,
            variants: {
                create: [
                    { name: 'Temperature', optionName: 'Hot', priceAdjust: 0 },
                    { name: 'Temperature', optionName: 'Iced', priceAdjust: 2000 },
                ],
            },
            addons: {
                create: [
                    { name: 'Oat Milk Sub', price: 10000 },
                    { name: 'Caramel Drizzle', price: 5000 },
                    { name: 'Extra Shot', price: 6000 },
                ],
            },
        },
    });
    // Non-Coffee
    await prisma.product.create({
        data: {
            categoryId: nonCoffeeCat.id,
            name: 'Matcha Latte',
            description: 'Pure Uji matcha with fresh steamed milk',
            price: 38000,
            isAvailable: true,
            isPopular: true,
            order: 1,
        },
    });
    // Food
    await prisma.product.create({
        data: {
            categoryId: foodCat.id,
            name: 'Butter Croissant',
            description: 'Flaky, buttery classic French pastry',
            price: 25000,
            isAvailable: true,
            order: 1,
        },
    });
    console.log('Seed completed successfully!');
    console.log({
        admin: admin.email,
        staff: staff.email,
        customer: customer.email,
        shop: shop.name,
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map