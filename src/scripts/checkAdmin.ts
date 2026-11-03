import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@elokapesan.com' },
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Active:', admin.isActive);
    console.log('Password hash:', admin.password);

    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log('\n🔑 Password "admin123" valid?', isValid);

    if (!isValid) {
      console.log('\n⚠️  Password tidak cocok. Reset password...');
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });

      console.log('✅ Password berhasil direset ke: admin123');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
