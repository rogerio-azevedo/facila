import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import postgres from "postgres";

const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

if (!email || !password) {
  throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env");
}

const db = postgres(connectionString, { max: 1 });

try {
  const existing = await db`
    SELECT id, platform_role, password_hash
    FROM "user"
    WHERE email = ${email}
  `;

  if (existing.length > 0) {
    const user = existing[0];

    if (user.platform_role !== "super_admin") {
      await db`
        UPDATE "user"
        SET platform_role = 'super_admin'
        WHERE id = ${user.id}
      `;
      console.log(`Promovido a super_admin: ${email}`);
    } else {
      console.log(`Usuário já é super_admin: ${email}`);
    }

    if (!user.password_hash) {
      const passwordHash = await bcrypt.hash(password, 12);
      await db`
        UPDATE "user"
        SET password_hash = ${passwordHash}
        WHERE id = ${user.id}
      `;
      console.log("Senha definida (usuário não tinha password_hash).");
    }

    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  await db`
    INSERT INTO "user" (id, name, email, password_hash, platform_role, created_at)
    VALUES (${id}, ${name}, ${email}, ${passwordHash}, 'super_admin', now())
  `;

  console.log(`Super admin criado: ${email}`);
} finally {
  await db.end();
}
