import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const makassarOutlets = [
  ['Yotta Panakkukang', 'Jl. Adhyaksa No. 1, Panakkukang', -5.1511296, 119.4295296],
  ['Kopi Losari', 'Jl. Penghibur No. 12, Ujung Pandang', -5.1372, 119.4078],
  ['Dapur Karebosi', 'Jl. Ahmad Yani No. 18, Wajo', -5.1328, 119.4146],
  ['Coto Nusantara', 'Jl. Nusantara No. 45, Wajo', -5.1269, 119.4168],
  ['Roti Bakar Pettarani', 'Jl. A. P. Pettarani No. 88, Rappocini', -5.1612, 119.4431],
  ['Es Pisang Ijo Sultan', 'Jl. Sultan Alauddin No. 31, Tamalate', -5.1771, 119.4322],
  ['Warung Muda Mudi', 'Jl. Hertasning No. 20, Rappocini', -5.1715, 119.4457],
  ['Balla Latte', 'Jl. Boulevard No. 7, Panakkukang', -5.1547, 119.4426],
  ['Pallu Basa Daeng', 'Jl. Andalas No. 56, Bontoala', -5.1284, 119.4251],
  ['Sop Konro Maros', 'Jl. Urip Sumoharjo No. 99, Panakkukang', -5.1438, 119.4452],
  ['Nasi Kuning Fajar', 'Jl. Veteran Utara No. 24, Makassar', -5.1361, 119.4184],
  ['Kedai Pantai Akkarena', 'Jl. Tanjung Bunga No. 15, Tamalate', -5.1878, 119.4057],
  ['Kopi Toraja 1913', 'Jl. Daeng Tata No. 10, Tamalate', -5.1822, 119.4214],
  ['Mie Kering Hengky', 'Jl. Rusa No. 9, Mamajang', -5.1541, 119.4169],
  ['Pisang Epe Karebosi', 'Jl. Ahmad Yani No. 3, Wajo', -5.1322, 119.4141],
  ['Ayam Parape Makassar', 'Jl. Veteran Selatan No. 60, Mamajang', -5.1634, 119.4162],
  ['Sarikaya Corner', 'Jl. Perintis Kemerdekaan No. 22, Tamalanrea', -5.1262, 119.4938],
  ['Bebek Palekko Daeng', 'Jl. Tamalanrea Raya No. 11, Tamalanrea', -5.1167, 119.4964],
  ['Kue Tradisional Bawakaraeng', 'Jl. Gunung Bawakaraeng No. 41, Makassar', -5.1397, 119.4268],
  ['Senja Rooftop Makassar', 'Jl. Metro Tanjung Bunga No. 8, Tamalate', -5.1764, 119.3972],
] as const;

const makassarMenus = [
  ['Menu Utama', [
    ['Es Kopi Susu Gula Aren', 'Kopi susu dengan gula aren khas Makassar', 18000],
    ['Pisang Epe Keju', 'Pisang bakar pipih dengan saus gula aren dan keju', 22000],
    ['Nasi Goreng Coto', 'Nasi goreng berbumbu rempah khas Makassar', 28000],
    ['Es Pisang Ijo', 'Pisang kukus dengan bubur sumsum dan sirup merah', 20000],
    ['Teh Tarik', 'Teh susu tarik dengan rasa manis lembut', 15000],
  ]],
] as const;

async function seedMakassarOutlets(): Promise<void> {
  const password = await bcrypt.hash('outlet123', 10);
  const menuCategory = makassarMenus[0];

  for (const [index, [name, address, latitude, longitude]] of makassarOutlets.entries()) {
    const number = String(index + 1).padStart(2, '0');
    const shopId = `makassar-shop-${number}`;
    const categoryId = `makassar-category-${number}`;

    await prisma.user.upsert({
      where: { email: `outlet${number}@elokapesan.com` },
      update: { name: `${name} Staff`, role: 'STAFF', password },
      create: {
        email: `outlet${number}@elokapesan.com`,
        password,
        name: `${name} Staff`,
        phone: `+62852100000${number}`,
        role: 'STAFF',
      },
    });

    await prisma.shop.upsert({
      where: { id: shopId },
      update: { name, address, latitude, longitude, isOpen: true },
      create: {
        id: shopId,
        name,
        description: `Kuliner pilihan ${name} di Kota Makassar`,
        address,
        phone: `+62411${String(700000 + index)}`,
        email: `outlet${number}@elokapesan.com`,
        latitude,
        longitude,
        openTime: '07:00',
        closeTime: '22:00',
        isOpen: true,
      },
    });

    await prisma.category.upsert({
      where: { id: categoryId },
      update: { name: menuCategory[0], shopId },
      create: {
        id: categoryId,
        shopId,
        name: menuCategory[0],
        description: 'Menu favorit khas outlet',
        order: 1,
      },
    });

    for (const [menuIndex, [menuName, description, price]] of menuCategory[1].entries()) {
      const productId = `makassar-product-${number}-${menuIndex + 1}`;
      await prisma.product.upsert({
        where: { id: productId },
        update: { name: menuName, description, price, categoryId, isAvailable: true },
        create: {
          id: productId,
          categoryId,
          name: menuName,
          description,
          price,
          isAvailable: true,
          isPopular: menuIndex === 0,
          order: menuIndex + 1,
        },
      });

      const addons: Array<[string, number]> = [
        ['Tambah Keju', 5000],
        ['Extra Porsi', 7000],
      ];

      for (const [addonIndex, [addonName, addonPrice]] of addons.entries()) {
        await prisma.productAddon.upsert({
          where: { id: `${productId}-addon-${addonIndex + 1}` },
          update: {
            name: addonName,
            price: addonPrice.toString(),
            isAvailable: true,
            productId,
          },
          create: {
            id: `${productId}-addon-${addonIndex + 1}`,
            productId,
            name: addonName,
            price: addonPrice.toString(),
            isAvailable: true,
          },
        });
      }
    }
  }
}

async function main() {
  console.log('Seeding database...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
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
  const staffPassword = await bcrypt.hash('staff123', 10);
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
  const customerPassword = await bcrypt.hash('user123', 10);
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

  await seedMakassarOutlets();

  console.log('Seed completed successfully!');
  console.log({
    admin: admin.email,
    staff: staff.email,
    customer: customer.email,
    shop: shop.name,
    makassarOutlets: makassarOutlets.length,
    outletAccountPassword: 'outlet123',
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
