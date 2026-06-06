import { Router } from "express";
import { db, leadsTable, clientsTable } from "@workspace/db";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import {
  ListLeadsQueryParams,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  CaptureLeadBody,
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

  // Owners can only see their own leads
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

  const [existing] = await db
    .select({ clientId: leadsTable.clientId })
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

  const [updatedLead] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

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
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
  };
}

export default router;
