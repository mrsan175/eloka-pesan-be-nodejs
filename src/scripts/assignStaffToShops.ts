import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignStaff() {
  try {
    // Mapping staff email ke shop ID
    const assignments = [
      { email: 'makassar-outlet06@elokapesan.com', shopId: 'makassar-shop-06' },
      { email: 'makassar-outlet07@elokapesan.com', shopId: 'makassar-shop-07' },
      // Tambahkan mapping lainnya sesuai kebutuhan
    ];

    for (const { email, shopId } of assignments) {
      const user = await prisma.user.findUnique({ where: { email } });
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });

      if (!user) {
        console.log(`❌ User ${email} tidak ditemukan`);
        continue;
      }

      if (!shop) {
        console.log(`❌ Shop ${shopId} tidak ditemukan`);
        continue;
      }

      const existing = await prisma.shopStaff.findUnique({
        where: {
          shopId_userId: {
            shopId,
            userId: user.id,
          },
        },
      });

      if (existing) {
        console.log(`⚠️  ${email} sudah di-assign ke ${shop.name}`);
        continue;
      }

      await prisma.shopStaff.create({
        data: {
          shopId,
          userId: user.id,
        },
      });

      console.log(`✅ ${email} berhasil di-assign ke ${shop.name}`);
    }

    console.log('\n✅ Selesai!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignStaff();
