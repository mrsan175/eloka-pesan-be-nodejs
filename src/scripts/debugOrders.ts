import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== USER INFO ===');
    const user = await prisma.user.findUnique({
      where: { email: 'makassar-outlet06@elokapesan.com' }
    });
    console.log('User:', JSON.stringify(user, null, 2));

    console.log('\n=== SHOPS LIST ===');
    const shops = await prisma.shop.findMany({
      where: { name: { contains: 'Sultan Alauddin', mode: 'insensitive' } }
    });
    console.log('Shops with Sultan Alauddin:', JSON.stringify(shops, null, 2));

    console.log('\n=== RECENT ORDERS ===');
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        user: true,
        items: true
      }
    });
    console.log(`Found ${orders.length} total recent orders:`);
    orders.forEach(o => {
      console.log(`- Order #${o.orderNumber} | Shop: ${o.shop?.name} (ID: ${o.shopId}) | Total: ${o.total} | User: ${o.user?.email || 'Guest'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
