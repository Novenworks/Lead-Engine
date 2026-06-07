import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  let clientName: string | null = null;
  if (user.clientId) {
    const [client] = await db
      .select({ businessName: clientsTable.businessName })
      .from(clientsTable)
      .where(eq(clientsTable.id, user.clientId))
      .limit(1);
    clientName = client?.businessName ?? null;
  }

  req.session.userId = user.id;
  req.session.userEmail = user.email;
  req.session.userRole = user.role;
  req.session.userClientId = user.clientId;
  req.session.userName = user.name;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    clientName,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  if (!currentPassword || typeof currentPassword !== "string") {
    res.status(400).json({ error: "Current password is required" });
    return;
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, "Password changed");

  res.json({ success: true, message: "Password changed successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired" });
    return;
  }

  let clientName: string | null = null;
  if (user.clientId) {
    const [client] = await db
      .select({ businessName: clientsTable.businessName })
      .from(clientsTable)
      .where(eq(clientsTable.id, user.clientId))
      .limit(1);
    clientName = client?.businessName ?? null;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    clientName,
  });
});

export default router;
