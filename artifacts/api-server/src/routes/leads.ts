import { Router } from "express";
import { db, leadsTable, clientsTable, activityLogTable, usersTable } from "@workspace/db";
import { eq, desc, and, ilike, or, gte, lte, sql } from "drizzle-orm";
import {
  ListLeadsQueryParams,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  CaptureLeadBody,
  GetLeadActivityParams,
  CreateLeadActivityParams,
  CreateLeadActivityBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { sendLeadNotification } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

// GET /leads
router.get("/leads", requireAuth, async (req, res): Promise<void> => {
  const params = ListLeadsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  let clientId = params.data.clientId;

  if (role !== "admin") {
    clientId = userClientId ?? -1;
  }

  const conditions = [];

  if (clientId) {
    conditions.push(eq(leadsTable.clientId, clientId));
  }

  if (params.data.status) {
    conditions.push(eq(leadsTable.status, params.data.status));
  }

  if (params.data.source) {
    conditions.push(ilike(leadsTable.source, `%${params.data.source}%`));
  }

  if (params.data.assignedToId) {
    conditions.push(eq(leadsTable.assignedToId, params.data.assignedToId));
  }

  if (params.data.dateFrom) {
    conditions.push(gte(leadsTable.createdAt, new Date(params.data.dateFrom)));
  }

  if (params.data.dateTo) {
    const dateTo = new Date(params.data.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    conditions.push(lte(leadsTable.createdAt, dateTo));
  }

  if (params.data.search) {
    const searchTerm = `%${params.data.search}%`;
    conditions.push(
      or(
        ilike(leadsTable.name, searchTerm),
        ilike(leadsTable.email, searchTerm),
        ilike(leadsTable.phone ?? "", searchTerm),
        ilike(leadsTable.serviceInterest ?? "", searchTerm),
      ),
    );
  }

  const leads = await db
    .select({
      id: leadsTable.id,
      clientId: leadsTable.clientId,
      clientName: clientsTable.businessName,
      name: leadsTable.name,
      email: leadsTable.email,
      phone: leadsTable.phone,
      serviceInterest: leadsTable.serviceInterest,
      message: leadsTable.message,
      source: leadsTable.source,
      status: leadsTable.status,
      notes: leadsTable.notes,
      estimatedValue: leadsTable.estimatedValue,
      monthlyRecurringValue: leadsTable.monthlyRecurringValue,
      assignedToId: leadsTable.assignedToId,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      lastContactedAt: leadsTable.lastContactedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leadsTable.createdAt));

  res.json(leads.map(mapLead));
});

// POST /leads/capture — public endpoint
router.post("/leads/capture", async (req, res): Promise<void> => {
  const parsed = CaptureLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientSlug, apiKey, ...leadData } = parsed.data;

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.slug, clientSlug))
    .limit(1);

  if (!client) {
    res.status(401).json({ error: "Invalid client slug or API key" });
    return;
  }

  if (client.apiKey !== apiKey) {
    res.status(401).json({ error: "Invalid client slug or API key" });
    return;
  }

  if (!client.isActive) {
    res.status(403).json({ error: "Client account is inactive" });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      clientId: client.id,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone ?? null,
      serviceInterest: leadData.serviceInterest ?? null,
      message: leadData.message ?? null,
      source: leadData.source ?? null,
      status: "New",
    })
    .returning();

  // Log capture activity
  db.insert(activityLogTable).values({
    leadId: lead.id,
    clientId: client.id,
    action: "Lead captured via embed form",
    metadata: { source: leadData.source ?? null },
  }).catch((err) => logger.error({ err }, "Failed to log capture activity"));

  // Send email notification asynchronously — don't block response
  sendLeadNotification(client, lead).catch((err) => {
    logger.error({ err }, "Failed to send lead notification email");
  });

  res.status(201).json({ success: true, message: "Lead captured successfully" });
});

// GET /leads/:id
router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  const [lead] = await db
    .select({
      id: leadsTable.id,
      clientId: leadsTable.clientId,
      clientName: clientsTable.businessName,
      name: leadsTable.name,
      email: leadsTable.email,
      phone: leadsTable.phone,
      serviceInterest: leadsTable.serviceInterest,
      message: leadsTable.message,
      source: leadsTable.source,
      status: leadsTable.status,
      notes: leadsTable.notes,
      estimatedValue: leadsTable.estimatedValue,
      monthlyRecurringValue: leadsTable.monthlyRecurringValue,
      assignedToId: leadsTable.assignedToId,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      lastContactedAt: leadsTable.lastContactedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (role !== "admin" && lead.clientId !== userClientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(mapLead(lead));
});

// PATCH /leads/:id
router.patch("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;
  const userId = req.session.userId;

  const [existing] = await db
    .select({ clientId: leadsTable.clientId, status: leadsTable.status })
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (role !== "admin" && existing.clientId !== userClientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.lastContactedAt !== undefined) updates.lastContactedAt = new Date(parsed.data.lastContactedAt);
  if (parsed.data.estimatedValue !== undefined) updates.estimatedValue = parsed.data.estimatedValue;
  if (parsed.data.monthlyRecurringValue !== undefined) updates.monthlyRecurringValue = parsed.data.monthlyRecurringValue;
  if (parsed.data.assignedToId !== undefined) updates.assignedToId = parsed.data.assignedToId;

  const [updatedLead] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  // Log status change activity
  if (parsed.data.status && parsed.data.status !== existing.status) {
    db.insert(activityLogTable).values({
      leadId: params.data.id,
      clientId: existing.clientId,
      userId: userId ?? undefined,
      action: `Status changed from ${existing.status} to ${parsed.data.status}`,
      metadata: { previousStatus: existing.status, newStatus: parsed.data.status },
    }).catch((err) => logger.error({ err }, "Failed to log status change"));
  }

  // Log contact action
  if (parsed.data.lastContactedAt) {
    db.insert(activityLogTable).values({
      leadId: params.data.id,
      clientId: existing.clientId,
      userId: userId ?? undefined,
      action: "Marked as contacted",
      metadata: { contactedAt: parsed.data.lastContactedAt },
    }).catch((err) => logger.error({ err }, "Failed to log contact activity"));
  }

  const [lead] = await db
    .select({
      id: leadsTable.id,
      clientId: leadsTable.clientId,
      clientName: clientsTable.businessName,
      name: leadsTable.name,
      email: leadsTable.email,
      phone: leadsTable.phone,
      serviceInterest: leadsTable.serviceInterest,
      message: leadsTable.message,
      source: leadsTable.source,
      status: leadsTable.status,
      notes: leadsTable.notes,
      estimatedValue: leadsTable.estimatedValue,
      monthlyRecurringValue: leadsTable.monthlyRecurringValue,
      assignedToId: leadsTable.assignedToId,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      lastContactedAt: leadsTable.lastContactedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(eq(leadsTable.id, updatedLead.id))
    .limit(1);

  res.json(mapLead(lead!));
});

// GET /leads/:id/activity
router.get("/leads/:id/activity", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  const [lead] = await db
    .select({ clientId: leadsTable.clientId })
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (role !== "admin" && lead.clientId !== userClientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const entries = await db
    .select({
      id: activityLogTable.id,
      leadId: activityLogTable.leadId,
      clientId: activityLogTable.clientId,
      userId: activityLogTable.userId,
      userName: usersTable.name,
      action: activityLogTable.action,
      metadata: activityLogTable.metadata,
      createdAt: activityLogTable.createdAt,
    })
    .from(activityLogTable)
    .leftJoin(usersTable, eq(activityLogTable.userId, usersTable.id))
    .where(eq(activityLogTable.leadId, params.data.id))
    .orderBy(desc(activityLogTable.createdAt));

  res.json(entries.map((e) => ({
    id: e.id,
    leadId: e.leadId ?? null,
    clientId: e.clientId ?? null,
    userId: e.userId ?? null,
    userName: e.userName ?? null,
    action: e.action,
    metadata: e.metadata ?? null,
    createdAt: e.createdAt.toISOString(),
  })));
});

// POST /leads/:id/activity
router.post("/leads/:id/activity", requireAuth, async (req, res): Promise<void> => {
  const params = CreateLeadActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = CreateLeadActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;
  const userId = req.session.userId;

  const [lead] = await db
    .select({ clientId: leadsTable.clientId })
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .limit(1);

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (role !== "admin" && lead.clientId !== userClientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [entry] = await db
    .insert(activityLogTable)
    .values({
      leadId: params.data.id,
      clientId: lead.clientId,
      userId: userId ?? undefined,
      action: parsed.data.action,
      metadata: parsed.data.metadata ?? null,
    })
    .returning();

  const [user] = userId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    : [null];

  res.status(201).json({
    id: entry.id,
    leadId: entry.leadId ?? null,
    clientId: entry.clientId ?? null,
    userId: entry.userId ?? null,
    userName: user?.name ?? null,
    action: entry.action,
    metadata: entry.metadata ?? null,
    createdAt: entry.createdAt.toISOString(),
  });
});

function mapLead(lead: {
  id: number;
  clientId: number;
  clientName: string | null;
  name: string;
  email: string;
  phone: string | null;
  serviceInterest: string | null;
  message: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  estimatedValue: number | null;
  monthlyRecurringValue: number | null;
  assignedToId: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt: Date | null;
}) {
  return {
    id: lead.id,
    clientId: lead.clientId,
    clientName: lead.clientName ?? null,
    name: lead.name,
    email: lead.email,
    phone: lead.phone ?? null,
    serviceInterest: lead.serviceInterest ?? null,
    message: lead.message ?? null,
    source: lead.source ?? null,
    status: lead.status,
    notes: lead.notes ?? null,
    estimatedValue: lead.estimatedValue ?? null,
    monthlyRecurringValue: lead.monthlyRecurringValue ?? null,
    assignedToId: lead.assignedToId ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
  };
}

export default router;
