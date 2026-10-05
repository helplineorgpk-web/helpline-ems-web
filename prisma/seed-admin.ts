import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

const ADMIN_EMAIL = "admin@helpline.org";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Helpline Admin";

async function main() {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      passwordHash,
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  console.log("Admin seeded into local MongoDB");
  console.log(`  id:    ${admin.id}`);
  console.log(`  email: ${ADMIN_EMAIL}`);
  console.log(`  pass:  ${ADMIN_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
