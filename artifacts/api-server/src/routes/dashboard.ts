import { Router } from "express";
import { db, leadsTable, clientsTable, activityLogTable, usersTable } from "@workspace/db";
import { eq, desc, and, count, sql, isNull, or, lte } from "drizzle-orm";
import { GetDashboardStatsQueryParams, GetRecentLeadsQueryParams, GetFollowUpLeadsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetDashboardStatsQueryParams.safeParse(req.query);

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  let clientId = params.success ? params.data.clientId : undefined;

  if (role !== "admin") {
    clientId = userClientId ?? -1;
  }

  const condition = clientId ? eq(leadsTable.clientId, clientId) : undefined;

  const rows = await db
    .select({
      status: leadsTable.status,
      count: count(),
      totalEstimated: sql<string>`sum(estimated_value)`,
      totalMrr: sql<string>`sum(monthly_recurring_value)`,
    })
    .from(leadsTable)
    .where(condition)
    .groupBy(leadsTable.status);

  const stats = {
    total: 0,
    new: 0,
    contacted: 0,
    booked: 0,
    won: 0,
    lost: 0,
    pipelineValue: 0,
    wonRevenue: 0,
    mrr: 0,
    followUpCount: 0,
  };

  for (const row of rows) {
    const n = Number(row.count);
    const ev = parseFloat(row.totalEstimated ?? "0") || 0;
    const mrr = parseFloat(row.totalMrr ?? "0") || 0;
    stats.total += n;
    if (row.status === "New") { stats.new = n; stats.pipelineValue += ev; }
    else if (row.status === "Contacted") { stats.contacted = n; stats.pipelineValue += ev; }
    else if (row.status === "Booked") { stats.booked = n; stats.pipelineValue += ev; }
    else if (row.status === "Won") { stats.won = n; stats.wonRevenue += ev; stats.mrr += mrr; }
    else if (row.status === "Lost") { stats.lost = n; }
  }

  // Count follow-up leads (New or Contacted, not contacted in 3+ days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const followUpConditions = [
    sql`${leadsTable.status} IN ('New', 'Contacted')`,
    or(isNull(leadsTable.lastContactedAt), lte(leadsTable.lastContactedAt, threeDaysAgo)),
  ];
  if (condition) followUpConditions.push(condition);

  const [followUpRow] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(and(...followUpConditions));

  stats.followUpCount = Number(followUpRow?.count ?? 0);

  res.json(stats);
});

// GET /dashboard/recent
router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const params = GetRecentLeadsQueryParams.safeParse(req.query);

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  let clientId = params.success ? params.data.clientId : undefined;
  const limit = params.success && params.data.limit ? Number(params.data.limit) : 10;

  if (role !== "admin") {
    clientId = userClientId ?? -1;
  }

  const conditions = [];
  if (clientId) conditions.push(eq(leadsTable.clientId, clientId));

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
    .orderBy(desc(leadsTable.createdAt))
    .limit(limit);

  res.json(leads.map(mapLead));
});

// GET /dashboard/followups
router.get("/dashboard/followups", requireAuth, async (req, res): Promise<void> => {
  const params = GetFollowUpLeadsQueryParams.safeParse(req.query);

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  let clientId = params.success ? params.data.clientId : undefined;
  const limit = params.success && params.data.limit ? Number(params.data.limit) : 20;

  if (role !== "admin") {
    clientId = userClientId ?? -1;
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const conditions = [
    sql`${leadsTable.status} IN ('New', 'Contacted')`,
    or(isNull(leadsTable.lastContactedAt), lte(leadsTable.lastContactedAt, threeDaysAgo)),
  ];

  if (clientId) {
    conditions.push(eq(leadsTable.clientId, clientId));
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
    .where(and(...conditions))
    .orderBy(leadsTable.createdAt)
    .limit(limit);

  res.json(leads.map(mapLead));
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
