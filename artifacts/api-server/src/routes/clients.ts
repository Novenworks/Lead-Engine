import { Router } from "express";
import { db, clientsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody, GetClientParams, UpdateClientParams, DeleteClientParams, GetEmbedCodeParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /clients - list clients
router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  if (role === "admin") {
    const clients = await db.select().from(clientsTable).orderBy(clientsTable.createdAt);
    res.json(clients.map(mapClient));
    return;
  }

  // Owner sees only their client
  if (!userClientId) {
    res.json([]);
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, userClientId))
    .limit(1);

  res.json(client ? [mapClient(client)] : []);
});

// POST /clients - create client (admin only)
router.post("/clients", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = uuidv4().replace(/-/g, "");

  const [client] = await db
    .insert(clientsTable)
    .values({
      businessName: parsed.data.businessName,
      slug: parsed.data.slug,
      ownerEmail: parsed.data.ownerEmail,
      notificationEmail: parsed.data.notificationEmail,
      apiKey,
      websiteUrl: parsed.data.websiteUrl ?? null,
    })
    .returning();

  res.status(201).json(mapClient(client));
});

// GET /clients/:id
router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  if (role !== "admin" && userClientId !== params.data.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(mapClient(client));
});

// PATCH /clients/:id
router.patch("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.businessName !== undefined) updates.businessName = parsed.data.businessName;
  if (parsed.data.ownerEmail !== undefined) updates.ownerEmail = parsed.data.ownerEmail;
  if (parsed.data.notificationEmail !== undefined) updates.notificationEmail = parsed.data.notificationEmail;
  if (parsed.data.websiteUrl !== undefined) updates.websiteUrl = parsed.data.websiteUrl;

  if (Object.keys(updates).length === 0) {
    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(mapClient(existing));
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(updates)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(mapClient(client));
});

// DELETE /clients/:id
router.delete("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [client] = await db
    .delete(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.sendStatus(204);
});

// GET /clients/:id/embed-code
router.get("/clients/:id/embed-code", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmbedCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const role = req.session.userRole;
  const userClientId = req.session.userClientId;

  if (role !== "admin" && userClientId !== params.data.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:80";
  const apiUrl = `https://${domain}/api/leads/capture`;

  const htmlSnippet = `<!-- LeadEngine by Novenworks — Lead Capture Form for ${client.businessName} -->
<form id="leadengine-form" onsubmit="submitLeadForm(event)">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <input type="text" name="serviceInterest" placeholder="Service You're Interested In" />
  <textarea name="message" placeholder="Tell us about your project"></textarea>
  <button type="submit">Send Message</button>
</form>

<script>
async function submitLeadForm(event) {
  event.preventDefault();
  const form = event.target;
  const data = {
    clientSlug: "${client.slug}",
    apiKey: "${client.apiKey}",
    source: window.location.href,
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    serviceInterest: form.serviceInterest.value,
    message: form.message.value,
  };
  try {
    const res = await fetch("${apiUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      alert("Thanks! We'll be in touch soon.");
      form.reset();
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (e) {
    alert("Network error. Please try again.");
  }
}
</script>`;

  res.json({
    clientId: client.id,
    businessName: client.businessName,
    slug: client.slug,
    apiKey: client.apiKey,
    htmlSnippet,
  });
});

function mapClient(c: {
  id: number;
  businessName: string;
  slug: string;
  ownerEmail: string;
  notificationEmail: string;
  apiKey: string;
  websiteUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: c.id,
    businessName: c.businessName,
    slug: c.slug,
    ownerEmail: c.ownerEmail,
    notificationEmail: c.notificationEmail,
    apiKey: c.apiKey,
    websiteUrl: c.websiteUrl,
    createdAt: c.createdAt.toISOString(),
  };
}

export default router;
