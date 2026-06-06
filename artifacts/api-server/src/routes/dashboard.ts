import { Router } from "express";
import { db, leadsTable, clientsTable } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { GetDashboardStatsQueryParams, GetRecentLeadsQueryParams } from "@workspace/api-zod";
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
  };

  for (const row of rows) {
    const n = Number(row.count);
    stats.total += n;
    if (row.status === "New") stats.new = n;
    else if (row.status === "Contacted") stats.contacted = n;
    else if (row.status === "Booked") stats.booked = n;
    else if (row.status === "Won") stats.won = n;
    else if (row.status === "Lost") stats.lost = n;
  }

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
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      lastContactedAt: leadsTable.lastContactedAt,
    })
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leadsTable.createdAt))
    .limit(limit);

  res.json(
    leads.map((lead) => ({
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
    })),
  );
});

export default router;
