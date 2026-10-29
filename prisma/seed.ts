import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type OutletSeed = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
};

const makassarOutlets: OutletSeed[] = [
  { name: 'Eloka Adhyaksa', address: 'Jl. Adhyaksa No. 1, Panakkukang', latitude: -5.1511, longitude: 119.4295, openTime: '07:00', closeTime: '22:00' },
  { name: 'Eloka Losari', address: 'Jl. Penghibur No. 12, Ujung Pandang', latitude: -5.1372, longitude: 119.4078, openTime: '08:00', closeTime: '23:00' },
  { name: 'Eloka Karebosi', address: 'Jl. Ahmad Yani No. 18, Wajo', latitude: -5.1328, longitude: 119.4146, openTime: '06:00', closeTime: '21:00' },
  { name: 'Eloka Nusantara', address: 'Jl. Nusantara No. 45, Wajo', latitude: -5.1269, longitude: 119.4168, openTime: '00:00', closeTime: '23:59' },
  { name: 'Eloka Pettarani', address: 'Jl. A. P. Pettarani No. 88, Rappocini', latitude: -5.1612, longitude: 119.4431, openTime: '09:00', closeTime: '20:00' },
  { name: 'Eloka Sultan Alauddin', address: 'Jl. Sultan Alauddin No. 31, Tamalate', latitude: -5.1771, longitude: 119.4322, openTime: '10:00', closeTime: '22:00' },
  { name: 'Eloka Hertasning', address: 'Jl. Hertasning No. 20, Rappocini', latitude: -5.1715, longitude: 119.4457, openTime: '07:30', closeTime: '22:30' },
  { name: 'Eloka Boulevard', address: 'Jl. Boulevard No. 7, Panakkukang', latitude: -5.1547, longitude: 119.4426, openTime: '08:00', closeTime: '21:00' },
  { name: 'Eloka Andalas', address: 'Jl. Andalas No. 56, Bontoala', latitude: -5.1284, longitude: 119.4251, openTime: '06:00', closeTime: '20:00' },
  { name: 'Eloka Maros', address: 'Jl. Urip Sumoharjo No. 99, Panakkukang', latitude: -5.1438, longitude: 119.4452, openTime: '07:00', closeTime: '22:00' },
  { name: 'Eloka Veteran', address: 'Jl. Veteran Utara No. 24, Makassar', latitude: -5.1361, longitude: 119.4184, openTime: '08:00', closeTime: '21:00' },
  { name: 'Eloka Akkarena', address: 'Jl. Tanjung Bunga No. 15, Tamalate', latitude: -5.1878, longitude: 119.4057, openTime: '10:00', closeTime: '23:00' },
  { name: 'Eloka Toraja', address: 'Jl. Daeng Tata No. 10, Tamalate', latitude: -5.1822, longitude: 119.4214, openTime: '00:00', closeTime: '23:59' },
  { name: 'Eloka Rusa', address: 'Jl. Rusa No. 9, Mamajang', latitude: -5.1541, longitude: 119.4169, openTime: '09:00', closeTime: '19:00' },
  { name: 'Eloka Pisang Epe', address: 'Jl. Ahmad Yani No. 3, Wajo', latitude: -5.1322, longitude: 119.4141, openTime: '15:00', closeTime: '23:00' },
  { name: 'Eloka Parape', address: 'Jl. Veteran Selatan No. 60, Mamajang', latitude: -5.1634, longitude: 119.4162, openTime: '07:00', closeTime: '21:00' },
  { name: 'Eloka Perintis', address: 'Jl. Perintis Kemerdekaan No. 22, Tamalanrea', latitude: -5.1262, longitude: 119.4938, openTime: '08:00', closeTime: '22:00' },
  { name: 'Eloka Tamalanrea', address: 'Jl. Tamalanrea Raya No. 11, Tamalanrea', latitude: -5.1167, longitude: 119.4964, openTime: '11:00', closeTime: '23:00' },
  { name: 'Eloka Bawakaraeng', address: 'Jl. Gunung Bawakaraeng No. 41, Makassar', latitude: -5.1397, longitude: 119.4268, openTime: '06:30', closeTime: '21:30' },
  { name: 'Eloka Tanjung Bunga', address: 'Jl. Metro Tanjung Bunga No. 8, Tamalate', latitude: -5.1764, longitude: 119.3972, openTime: '12:00', closeTime: '00:00' },
];

const bogorOutlets: OutletSeed[] = [
  { name: 'Eloka Cileungsi', address: 'Jl. Raya Cileungsi No. 18, Cileungsi, Kabupaten Bogor', latitude: -6.4025, longitude: 106.9707, openTime: '07:00', closeTime: '22:00' },
  { name: 'Eloka Kota Bogor', address: 'Jl. Juanda No. 25, Bogor Tengah, Kota Bogor', latitude: -6.5950, longitude: 106.7972, openTime: '08:00', closeTime: '23:00' },
  { name: 'Eloka Parung', address: 'Jl. Raya Parung No. 10, Parung, Kabupaten Bogor', latitude: -6.4310, longitude: 106.7330, openTime: '09:00', closeTime: '21:00' },
  { name: 'Eloka Sentul', address: 'Jl. MH. Thamrin No. 8, Sentul, Kabupaten Bogor', latitude: -6.5590, longitude: 106.8432, openTime: '06:00', closeTime: '22:00' },
  { name: 'Eloka Cibinong', address: 'Jl. Tegar Beriman No. 12, Cibinong, Kabupaten Bogor', latitude: -6.4817, longitude: 106.8317, openTime: '00:00', closeTime: '23:59' },
  { name: 'Eloka Dramaga', address: 'Jl. Raya Dramaga No. 40, Dramaga, Kabupaten Bogor', latitude: -6.5568, longitude: 106.7334, openTime: '10:00', closeTime: '20:00' },
];

const makassarMenus = [
  ['Menu Utama', [
    ['Es Kopi Susu Gula Aren', 'Kopi susu dengan gula aren khas Makassar', 18000],
    ['Pisang Epe Keju', 'Pisang bakar pipih dengan saus gula aren dan keju', 22000],
    ['Nasi Goreng Coto', 'Nasi goreng berbumbu rempah khas Makassar', 28000],
    ['Es Pisang Ijo', 'Pisang kukus dengan bubur sumsum dan sirup merah', 20000],
    ['Teh Tarik', 'Teh susu tarik dengan rasa manis lembut', 15000],
  ]],
] as const;

async function seedOutlets(outlets: OutletSeed[], region: 'makassar' | 'bogor'): Promise<void> {
  const password = await bcrypt.hash('outlet123', 10);
  const menuCategory = makassarMenus[0];

  for (const [index, outlet] of outlets.entries()) {
    const { name, address, latitude, longitude, openTime, closeTime } = outlet;
    const number = String(index + 1).padStart(2, '0');
    const shopId = `${region}-shop-${number}`;
    const categoryId = `${region}-category-${number}`;

    await prisma.user.upsert({
      where: { email: `${region}-outlet${number}@elokapesan.com` },
      update: { name: `${name} Staff`, role: 'STAFF', password },
      create: {
        email: `${region}-outlet${number}@elokapesan.com`,
        password,
        name: `${name} Staff`,
        phone: `+62852100000${number}`,
        role: 'STAFF',
      },
    });

    await prisma.shop.upsert({
      where: { id: shopId },
      update: { name, address, latitude, longitude, openTime, closeTime, isOpen: true },
      create: {
        id: shopId,
        name,
        description: `Kuliner pilihan ${name} di ${region === 'bogor' ? 'Kabupaten Bogor' : 'Kota Makassar'}`,
        address,
        phone: `+62411${String(700000 + index)}`,
        email: `${region}-outlet${number}@elokapesan.com`,
        latitude,
        longitude,
        openTime,
        closeTime,
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
      const productId = `${region}-product-${number}-${menuIndex + 1}`;
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

      if (menuIndex % 2 === 0) {
        const addons: Array<[string, number]> = [['Tambah Keju', 5000], ['Extra Porsi', 7000]];
        for (const [addonIndex, [addonName, addonPrice]] of addons.entries()) {
          await prisma.productAddon.upsert({
            where: { id: `${productId}-addon-${addonIndex + 1}` },
            update: { name: addonName, price: addonPrice.toString(), isAvailable: true, productId },
            create: { id: `${productId}-addon-${addonIndex + 1}`, productId, name: addonName, price: addonPrice.toString(), isAvailable: true },
          });
        }
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

  await seedOutlets(makassarOutlets, 'makassar');
  await seedOutlets(bogorOutlets, 'bogor');

  console.log('Seed completed successfully!');
  console.log({
    admin: admin.email,
    staff: staff.email,
    customer: customer.email,
    shop: shop.name,
    makassarOutlets: makassarOutlets.length,
    bogorOutlets: bogorOutlets.length,
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
