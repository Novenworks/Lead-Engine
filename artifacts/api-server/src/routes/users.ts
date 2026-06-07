import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      clientId: usersTable.clientId,
      clientName: clientsTable.businessName,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(clientsTable, eq(usersTable.clientId, clientsTable.id))
    .orderBy(usersTable.createdAt);

  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      clientId: u.clientId ?? null,
      clientName: u.clientName ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { email, name, password, role, clientId } = req.body as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
    role?: unknown;
    clientId?: unknown;
  };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!role || (role !== "admin" && role !== "owner")) {
    res.status(400).json({ error: "Role must be admin or owner" });
    return;
  }
  const parsedClientId =
    clientId != null && clientId !== "" ? Number(clientId) : null;

  if (role === "owner" && !parsedClientId) {
    res
      .status(400)
      .json({ error: "Owner accounts must be linked to a workspace" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      role,
      clientId: parsedClientId,
    })
    .returning();

  logger.info({ email: user.email, role: user.role }, "User created by admin");

  let clientName: string | null = null;
  if (user.clientId) {
    const [client] = await db
      .select({ businessName: clientsTable.businessName })
      .from(clientsTable)
      .where(eq(clientsTable.id, user.clientId))
      .limit(1);
    clientName = client?.businessName ?? null;
  }

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId ?? null,
    clientName,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
