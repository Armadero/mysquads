const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        // Check if column already exists
        const result = await prisma.$queryRaw`PRAGMA table_info(Role)`;
        const exists = result.some(col => col.name === 'maxSquads');

        if (exists) {
            console.log('Column maxSquads already exists');
        } else {
            await prisma.$executeRaw`ALTER TABLE "Role" ADD COLUMN "maxSquads" INTEGER NOT NULL DEFAULT 1`;
            console.log('Column maxSquads added successfully');
        }
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
