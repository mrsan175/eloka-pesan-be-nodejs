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

const menuCategories = ['Kopi', 'Minuman Segar', 'Makanan', 'Camilan'] as const;

const menuCatalog = [
  ['Es Kopi Susu Gula Aren', 'Kopi susu dengan gula aren khas Eloka', 18000],
  ['Americano Citrus', 'Kopi hitam dengan sentuhan jeruk segar', 20000],
  ['Caffe Latte Pandan', 'Latte lembut dengan aroma pandan', 26000],
  ['Mocha Kacang', 'Kopi cokelat dengan taburan kacang', 28000],
  ['Matcha Latte', 'Matcha premium dengan susu segar', 28000],
  ['Es Teh Markisa', 'Teh dingin dengan sirup markisa', 16000],
  ['Soda Lychee Mint', 'Soda leci dengan daun mint', 22000],
  ['Jus Alpukat Kopi', 'Alpukat creamy dengan espresso', 25000],
  ['Nasi Goreng Rempah', 'Nasi goreng dengan bumbu rempah Nusantara', 29000],
  ['Mie Goreng Cabe Ijo', 'Mie goreng gurih dengan cabai hijau', 27000],
  ['Ayam Sambal Matah', 'Ayam panggang dengan sambal matah', 34000],
  ['Rice Bowl Teriyaki', 'Nasi hangat dengan ayam teriyaki', 32000],
  ['Pisang Epe Gula Aren', 'Pisang bakar khas dengan saus gula aren', 22000],
  ['Roti Bakar Srikaya', 'Roti panggang dengan selai srikaya', 20000],
  ['Kentang Keju', 'Kentang goreng dengan saus keju', 24000],
  ['Tahu Crispy Sambal', 'Tahu renyah dengan sambal pilihan', 18000],
  ['Croissant Butter', 'Pastry renyah dengan butter premium', 23000],
  ['Pancake Buah', 'Pancake lembut dengan buah musiman', 30000],
  ['Puding Cokelat', 'Puding cokelat dengan saus vanilla', 19000],
  ['Es Pisang Ijo Eloka', 'Pisang ijo dengan bubur sumsum dan sirup', 24000],
] as const;

type AddonSeed = [name: string, price: number];
type VariantSeed = [group: string, option: string, priceAdjust: number];

const menuVariants: Record<number, VariantSeed[]> = {
  0: [['Size', 'Regular', 0], ['Size', 'Large', 5000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 2000]],
  1: [['Size', 'Regular', 0], ['Size', 'Large', 5000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 2000]],
  2: [['Size', 'Regular', 0], ['Size', 'Large', 5000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 2000]],
  3: [['Size', 'Regular', 0], ['Size', 'Large', 5000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 2000]],
  4: [['Size', 'Regular', 0], ['Size', 'Large', 5000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 2000]],
  5: [['Size', 'Regular', 0], ['Size', 'Large', 4000], ['Suhu', 'Hot', 0], ['Suhu', 'Ice', 1000]],
  6: [['Size', 'Regular', 0], ['Size', 'Large', 5000]],
  7: [['Size', 'Regular', 0], ['Size', 'Large', 5000]],
};

const menuAddons: Record<number, AddonSeed[]> = {
  0: [['Extra Sugar', 2000], ['Less Sugar', 0], ['Extra Shot', 6000]],
  1: [['Extra Sugar', 2000], ['Less Sugar', 0], ['Extra Shot', 6000]],
  2: [['Extra Shot', 6000], ['Sirup Vanilla', 4000], ['Oat Milk', 8000]],
  3: [['Extra Shot', 6000], ['Whipped Cream', 5000], ['Sirup Hazelnut', 5000]],
  4: [['Extra Sugar', 2000], ['Less Sugar', 0], ['Oat Milk', 8000]],
  5: [['Extra Sugar', 2000], ['Less Sugar', 0], ['Irisan Lemon', 3000]],
  6: [['Extra Lychee', 5000], ['Daun Mint', 2000], ['Es Batu Tambahan', 1000]],
  7: [['Extra Susu', 4000], ['Less Sugar', 0], ['Chia Seed', 4000]],
  8: [['Nasi Tambahan', 6000], ['Telur', 6000], ['Sambal Extra', 3000]],
  9: [['Mie Tambahan', 5000], ['Telur', 6000], ['Cabe Extra', 2000]],
  10: [['Nasi Tambahan', 6000], ['Sambal Matah Extra', 4000], ['Telur', 6000]],
  11: [['Nasi Tambahan', 6000], ['Telur', 6000], ['Saus Teriyaki Extra', 4000]],
  12: [['Keju Parut', 5000], ['Cokelat', 4000], ['Es Krim Vanilla', 7000]],
  13: [['Butter Extra', 3000], ['Keju', 5000], ['Selai Cokelat', 4000]],
  14: [['Saus Keju', 5000], ['Saus Sambal', 3000], ['Porsi Besar', 7000]],
  15: [['Saus Sambal', 3000], ['Saus Keju', 5000], ['Porsi Besar', 6000]],
  17: [['Madu', 4000], ['Whipped Cream', 5000], ['Pisang Tambahan', 5000]],
  18: [['Whipped Cream', 5000], ['Saus Cokelat', 4000], ['Kacang Almond', 5000]],
  19: [['Saus Gula Aren Extra', 4000], ['Keju Parut', 5000], ['Kelapa Parut', 3000]],
};

async function seedOutlets(outlets: OutletSeed[], region: 'makassar' | 'bogor'): Promise<void> {
  const password = await bcrypt.hash('outlet123', 10);
  for (const [index, outlet] of outlets.entries()) {
    const { name, address, latitude, longitude, openTime, closeTime } = outlet;
    const number = String(index + 1).padStart(2, '0');
    const shopId = `${region}-shop-${number}`;
    const categoryIds = menuCategories.map(
      (_category, categoryIndex) => `${region}-category-${number}-${categoryIndex + 1}`,
    );

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

    for (const [categoryIndex, categoryName] of menuCategories.entries()) {
      await prisma.category.upsert({
        where: { id: categoryIds[categoryIndex] },
        update: { name: categoryName, shopId, isActive: true },
        create: {
          id: categoryIds[categoryIndex],
          shopId,
          name: categoryName,
          description: `${categoryName} pilihan ${name}`,
          order: categoryIndex + 1,
        },
      });
    }

    for (const [menuIndex, [baseMenuName, baseDescription, price]] of menuCatalog.entries()) {
      const productId = `${region}-product-${number}-${menuIndex + 1}`;
      const locationName = name.replace(/^Eloka\s+/i, '');
      const menuName = `${baseMenuName} ${locationName}`;
      const description = `${baseDescription} di outlet ${name}`;
      const categoryIndex = menuIndex < 4
        ? 0
        : menuIndex < 8
          ? 1
          : menuIndex < 13
            ? 2
            : 3;
      const categoryId = categoryIds[categoryIndex];
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
          isPopular: menuIndex % 5 === 0,
          order: menuIndex + 1,
        },
      });

      const addons = menuAddons[menuIndex] || [];

      const variants = menuVariants[menuIndex] || [];
      for (let variantIndex = 0; variantIndex < 4; variantIndex++) {
        const variant = variants[variantIndex];
        await prisma.productVariant.upsert({
          where: { id: `${productId}-variant-${variantIndex + 1}` },
          update: {
            name: variant?.[0] || `Pilihan ${variantIndex + 1}`,
            optionName: variant?.[1] || `Tidak tersedia`,
            priceAdjust: (variant?.[2] || 0).toString(),
            isAvailable: Boolean(variant),
            productId,
          },
          create: {
            id: `${productId}-variant-${variantIndex + 1}`,
            productId,
            name: variant?.[0] || `Pilihan ${variantIndex + 1}`,
            optionName: variant?.[1] || `Tidak tersedia`,
            priceAdjust: (variant?.[2] || 0).toString(),
            isAvailable: Boolean(variant),
          },
        });
      }

      for (let addonIndex = 0; addonIndex < 4; addonIndex++) {
        const addon = addons[addonIndex];
        await prisma.productAddon.upsert({
          where: { id: `${productId}-addon-${addonIndex + 1}` },
          update: {
            name: addon?.[0] || `Add-on ${addonIndex + 1}`,
            price: (addon?.[1] || 0).toString(),
            isAvailable: Boolean(addon),
            productId,
          },
          create: {
            id: `${productId}-addon-${addonIndex + 1}`,
            productId,
            name: addon?.[0] || `Add-on ${addonIndex + 1}`,
            price: (addon?.[1] || 0).toString(),
            isAvailable: Boolean(addon),
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
