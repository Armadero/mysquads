import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Add the column if it doesn't exist
        await prisma.$executeRaw`ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "maxSquads" INTEGER NOT NULL DEFAULT 1`;
        console.log('✅ Column maxSquads added successfully');
    } catch (e: any) {
        if (e.message?.includes('already exists') || e.message?.includes('duplicate column')) {
            console.log('ℹ️  Column maxSquads already exists, skipping');
        } else {
            console.error('❌ Error:', e.message);
            process.exit(1);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
