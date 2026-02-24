const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        // Add email column to Collaborator if it doesn't exist
        const result = await prisma.$queryRaw`PRAGMA table_info(Collaborator)`;
        const hasEmail = result.some(col => col.name === 'email');

        if (!hasEmail) {
            console.log("Adding email column to Collaborator table...");
            await prisma.$executeRaw`ALTER TABLE "Collaborator" ADD COLUMN "email" TEXT`;
            console.log("Column added successfully.");
        } else {
            console.log("Column email already exists.");
        }
    } catch (e) {
        console.error("Error updating database:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
