import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db, adminSessionsTable, contentTable, factoryStatsTable, siteSettingsTable, pageTextTable } from "@workspace/db";
import {
  ContentCollection,
  CreateAdminContentBody,
  LoginAdminBody,
  ListAdminContentQueryParams,
  UpdateAdminContentBody,
  UpdateAdminContentParams,
  UpdateAdminSiteBody,
  DeleteAdminContentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SESSION_COOKIE = "ar_admin_session";
const SESSION_DAYS = 7;
const collections = ["designs", "products", "machinery", "services", "blogs", "faqs", "timeline", "categories"] as const;
type Collection = (typeof collections)[number];

const heroImage = "/hero-textile.jpg";
const fabricImage = "/fabric-detail_2.jpg";

const seedContent = [
  {
    collection: "designs",
    slug: "woven-sage-grid",
    title: "Woven Sage Grid",
    shortDescription: "A restrained woven arrangement with a soft, structured finish.",
    description: "A textile design study showing how a calm, repeatable pattern can translate into dependable custom production. Replace this demo entry with an actual Ahmed Riaz design when ready.",
    category: "Woven design",
    image: fabricImage,
    images: [fabricImage, heroImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { note: "Demo content — replace with factory work" },
  },
  {
    collection: "designs",
    slug: "sandline-finish",
    title: "Sandline Finish",
    shortDescription: "Warm neutral textile work with a clean, tactile surface.",
    description: "A sample direction for surface and finishing work across fabric applications. The design record supports multiple images and an optional production video.",
    category: "Surface finishing",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: { note: "Demo content — replace with factory work" },
  },
  {
    collection: "designs",
    slug: "everyday-cotton-repeat",
    title: "Everyday Cotton Repeat",
    shortDescription: "A practical repeat designed for consistent fabric production.",
    description: "A straightforward repeat that can be discussed, adapted, and produced around a customer's quantity and material requirements.",
    category: "Cotton textile",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 3,
    meta: { note: "Demo content — replace with factory work" },
  },
  {
    collection: "products",
    slug: "cotton-cloth",
    title: "Cotton Cloth",
    shortDescription: "Fabric production for custom requirements and local textile work.",
    description: "Ahmed Riaz works with cotton cloth and related fabric requirements for brands, local businesses, and wholesale customers. Final material, quantity, and finish are discussed before production.",
    category: "Fabric",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { application: "Custom fabric requirements" },
  },
  {
    collection: "products",
    slug: "dupatta-textiles",
    title: "Dupatta Textiles",
    shortDescription: "Textile production for dupattas and related applications.",
    description: "Fabric and textile work suitable for dupatta production, with requirements shaped around the customer's material, pattern, quantity, and finishing needs.",
    category: "Textile product",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: { application: "Dupatta production" },
  },
  {
    collection: "products",
    slug: "custom-frock-textile",
    title: "Frock Textile Work",
    shortDescription: "Fabric materials used for women's frocks and related garments.",
    description: "A product category for customers sourcing textile materials for frock-related work. Share the quantity and fabric direction so the factory can review the requirement.",
    category: "Textile product",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 3,
    meta: { application: "Frock textile" },
  },
  {
    collection: "products",
    slug: "womens-headwear-material",
    title: "Women's Headwear Material",
    shortDescription: "Textile materials for women's headwear and coverings.",
    description: "Materials and fabric work for women's headwear and related textile applications. This demo category is editable and can be replaced with the factory's actual production range.",
    category: "Textile product",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: false,
    displayOrder: 4,
    meta: { application: "Headwear textile" },
  },
  {
    collection: "machinery",
    slug: "fabric-production-floor",
    title: "Fabric Production Floor",
    shortDescription: "A practical production setup supporting repeatable textile work.",
    description: "This demo machinery entry represents the production floor without inventing a machine brand, model, or specification. Add the actual machine details from the admin panel when available.",
    category: "Production",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { note: "Generic demo description — replace with actual information" },
  },
  {
    collection: "machinery",
    slug: "textile-processing-area",
    title: "Textile Processing Area",
    shortDescription: "Factory machinery and work areas supporting fabric processing.",
    description: "A flexible place to document the machinery and work area involved in processing, finishing, and preparing textile orders.",
    category: "Processing",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: { note: "Generic demo description — replace with actual information" },
  },
  {
    collection: "services",
    slug: "bulk-textile-manufacturing",
    title: "Custom Textile Manufacturing",
    shortDescription: "Production planning for custom-quantity textile requirements.",
    description: "From an initial requirement to production planning, Ahmed Riaz supports custom textile work with a practical focus on quantity, material, and delivery coordination.",
    category: "Manufacturing",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { audience: "Brands, wholesale buyers, local businesses" },
  },
  {
    collection: "services",
    slug: "custom-textile-orders",
    title: "Custom Textile Orders",
    shortDescription: "A production conversation shaped around your fabric requirements.",
    description: "Share the fabric direction, quantity, application, and finishing requirements. The factory can review the brief and confirm what can be produced.",
    category: "Custom production",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: { audience: "Customers with defined production requirements" },
  },
  {
    collection: "services",
    slug: "wholesale-production",
    title: "Wholesale Textile Production",
    shortDescription: "Direct factory production for wholesale quantities.",
    description: "A practical route for wholesale buyers looking for textile materials and repeat production rather than ready-made retail garments.",
    category: "Wholesale",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 3,
    meta: { audience: "Wholesale customers" },
  },
  {
    collection: "faqs",
    slug: "bulk-orders",
    title: "Do you accept custom orders?",
    shortDescription: "Yes. Custom quantity is a central part of the factory's work.",
    description: "Ahmed Riaz works with custom textile requirements for selected brands, local businesses, and wholesale customers. Share the quantity and fabric brief to start a conversation.",
    category: "Ordering",
    image: "",
    images: [],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: {},
  },
  {
    collection: "faqs",
    slug: "factory-location",
    title: "Where is the factory located?",
    shortDescription: "The factory is based in Baldia, Karachi, Pakistan.",
    description: "The exact factory address and map link can be added or updated from the admin panel.",
    category: "Factory",
    image: "",
    images: [],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: {},
  },
  {
    collection: "faqs",
    slug: "custom-production",
    title: "Can customers request custom textile production?",
    shortDescription: "Custom production can be discussed around material and quantity.",
    description: "Send the textile application, preferred material, quantity, and any design or finishing details. The factory can review the requirement before confirming production.",
    category: "Custom work",
    image: "",
    images: [],
    published: true,
    featured: true,
    displayOrder: 3,
    meta: {},
  },
  {
    collection: "timeline",
    slug: "factory-journey-demo",
    title: "Factory journey",
    shortDescription: "Replace this demo milestone with a verified company date.",
    description: "This editable timeline entry is intentionally a placeholder. Add a verified year and description from the admin panel when the factory history is ready to publish.",
    category: "Replace with year",
    image: heroImage,
    images: [heroImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { placeholder: true },
  },
  {
    collection: "blogs",
    slug: "planning-a-bulk-textile-order",
    title: "Planning a custom textile order",
    shortDescription: "The details that help a factory review a production brief.",
    description: "A useful production brief usually covers the textile application, material direction, approximate quantity, finishing expectations, and timing. Clear information early helps the factory respond more accurately.",
    category: "Custom orders",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { author: "Ahmed Riaz", dateLabel: "Add publication date" },
  },
  {
    collection: "blogs",
    slug: "understanding-cotton-fabric",
    title: "Understanding cotton fabric",
    shortDescription: "A practical starting point for discussing cotton textile requirements.",
    description: "Cotton fabric conversations become more useful when they cover intended use, weight, feel, finishing, color direction, and quantity. These details help align the material with the finished application.",
    category: "Materials",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 2,
    meta: { author: "Ahmed Riaz", dateLabel: "Add publication date" },
  },
] satisfies Array<Record<string, unknown>>;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getToken(req: Request) {
  return req.cookies?.[SESSION_COOKIE] as string | undefined;
}

function slugify(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function recordToApi(record: typeof contentTable.$inferSelect) {
  return {
    id: record.id,
    collection: record.collection as Collection,
    slug: record.slug,
    title: record.title,
    shortDescription: record.shortDescription,
    description: record.description,
    category: record.category,
    image: record.image,
    images: record.images,
    video: record.video,
    published: record.published,
    featured: record.featured,
    displayOrder: record.displayOrder,
    meta: record.meta,
  };
}

async function ensureSeeded() {
  const settings = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
  if (settings.length === 0) {
    await db.insert(siteSettingsTable).values({
      brandName: "Riaz Fabrics",
      location: "Baldia, Karachi, Pakistan",
      phone: "",
      whatsapp: "",
      email: "",
      officeAddress: "Baldia, Karachi, Pakistan",
      factoryAddress: "Baldia, Karachi, Pakistan",
      businessHours: "Add business hours in Admin",
      whatsappMessage: "Hello Riaz Fabrics, I would like to discuss a textile requirement.",
      heroImage,
      heroVideo: null,
      founderName: "Riaz Ahmed",
      founderTitle: "Founder & Managing Director",
      founderQuote: "We started with one machine and a clear idea: make textiles that actually work for the people who use them.",
      founderImage: "/founder.jpg",
    });
    await db.insert(factoryStatsTable).values([
      { value: "99+", label: "Machines", displayOrder: 1 },
      { value: "55+", label: "Workers", displayOrder: 2 },
      { value: "46+", label: "Years", displayOrder: 3 },
      { value: "B2B", label: "Custom Production", displayOrder: 4 },
    ]);
  } else {
    await db.update(siteSettingsTable).set({
      brandName: "Riaz Fabrics",
      location: "Baldia, Karachi, Pakistan",
      officeAddress: "Naval Colony, Baldia, Karachi, Pakistan",
      factoryAddress: "24, Baldia, Karachi, Pakistan",
      businessHours: "Monday to Thursday: 9:00 AM - 5:00 PM. Friday: Closed. Saturday & Sunday: 9:00 AM - 5:00 PM.",
      whatsappMessage: "Hello Riaz Fabrics, I would like to discuss a textile requirement.",
      founderName: "Riaz Ahmed",
      founderTitle: "Founder & Managing Director",
      founderQuote: "We started with one machine and a clear idea: make textiles that actually work for the people who use them.",
      founderImage: "/founder.jpg",
    }).where(eq(siteSettingsTable.id, settings[0].id));
    // Delete all old stats and re-insert correct ones
    await db.delete(factoryStatsTable);
    await db.insert(factoryStatsTable).values([
      { value: "99+", label: "Machines", displayOrder: 1 },
      { value: "55+", label: "Workers", displayOrder: 2 },
      { value: "46+", label: "Years", displayOrder: 3 },
      { value: "B2B", label: "Custom Production", displayOrder: 4 },
    ]);
  }
  const existingContent = await db.select({ id: contentTable.id }).from(contentTable).limit(1);
  if (existingContent.length === 0) {
    await db.insert(contentTable).values(seedContent.map((item) => ({
      collection: item.collection,
      slug: item.slug,
      title: item.title,
      shortDescription: item.shortDescription,
      description: item.description,
      category: item.category,
      image: item.image,
      images: item.images,
      video: null,
      published: item.published,
      featured: item.featured,
      displayOrder: item.displayOrder,
      meta: item.meta,
    })));
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const [session] = await db
    .select()
    .from(adminSessionsTable)
    .where(and(eq(adminSessionsTable.tokenHash, hashToken(token)), gt(adminSessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!session) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: "Session expired" });
    return;
  }
  (req as Request & { adminUsername?: string }).adminUsername = session.username;
  next();
}

router.use(cookieParser());

router.get("/site", async (_req, res) => {
  await ensureSeeded();
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const [stats, content] = await Promise.all([
    db.select().from(factoryStatsTable).orderBy(asc(factoryStatsTable.displayOrder)),
    db.select().from(contentTable).where(eq(contentTable.published, true)).orderBy(asc(contentTable.displayOrder)),
  ]);
  const grouped = Object.fromEntries(collections.map((collection) => [
    collection,
    content.filter((item) => item.collection === collection).map(recordToApi),
  ]));
  res.json({
    settings: {
      brandName: settings.brandName,
      location: settings.location,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      officeAddress: settings.officeAddress,
      factoryAddress: settings.factoryAddress,
      businessHours: settings.businessHours,
      whatsappMessage: settings.whatsappMessage,
      heroImage: settings.heroImage,
      heroVideo: settings.heroVideo,
      aboutHeroImage: settings.aboutHeroImage,
      servicesHeroImage: settings.servicesHeroImage,
      productsHeroImage: settings.productsHeroImage,
      designsHeroImage: settings.designsHeroImage,
      excellenceHeroImage: settings.excellenceHeroImage,
      contactHeroImage: settings.contactHeroImage,
      founderName: settings.founderName,
      founderTitle: settings.founderTitle,
      founderQuote: settings.founderQuote,
      founderImage: settings.founderImage,
    },
    stats: stats.map((stat) => ({ value: stat.value, label: stat.label, displayOrder: stat.displayOrder })),
    ...grouped,
  });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const data = LoginAdminBody.parse(req.body);
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUsername || !configuredPassword) {
    res.status(503).json({ error: "Admin credentials are not configured" });
    return;
  }
  if (!safeEqual(data.username, configuredUsername) || !safeEqual(data.password, configuredPassword)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(adminSessionsTable).values({
    tokenHash: hashToken(token),
    username: configuredUsername,
    expiresAt,
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  res.json({ authenticated: true });
});

router.get("/auth/session", async (req, res) => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [session] = await db
    .select({ username: adminSessionsTable.username })
    .from(adminSessionsTable)
    .where(and(eq(adminSessionsTable.tokenHash, hashToken(token)), gt(adminSessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!session) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ authenticated: true, username: session.username });
});

router.post("/auth/logout", async (req, res) => {
  const token = getToken(req);
  if (token) await db.delete(adminSessionsTable).where(eq(adminSessionsTable.tokenHash, hashToken(token)));
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  res.status(204).send();
});

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  await ensureSeeded();
  const records = await db.select().from(contentTable);
  const recent = await db.select().from(contentTable).orderBy(desc(contentTable.updatedAt)).limit(5);
  const counts = Object.fromEntries(collections.map((collection) => [
    collection,
    records.filter((record) => record.collection === collection).length,
  ]));
  res.json({ counts, recent: recent.map(recordToApi) });
});

router.get("/admin/content", requireAdmin, async (req, res) => {
  const { collection } = ListAdminContentQueryParams.parse({ collection: String(req.query.collection) });
  const records = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.collection, collection))
    .orderBy(asc(contentTable.displayOrder), asc(contentTable.id));
  res.json(records.map(recordToApi));
});

router.post("/admin/content", requireAdmin, async (req, res) => {
  const data = CreateAdminContentBody.parse(req.body);
  const collection = data.collection as Collection;
  const baseSlug = slugify(data.slug || data.title) || `item-${Date.now()}`;
  const slug = `${collection.slice(0, -1)}-${baseSlug}`;
  const [record] = await db.insert(contentTable).values({
    collection,
    slug,
    title: data.title,
    shortDescription: data.shortDescription,
    description: data.description,
    category: data.category ?? "",
    image: data.image ?? "",
    images: data.images ?? [],
    video: data.video ?? null,
    published: data.published ?? false,
    featured: data.featured ?? false,
    displayOrder: data.displayOrder ?? 0,
    meta: data.meta ?? {},
  }).returning();
  res.status(201).json(recordToApi(record));
});

router.patch("/admin/content", requireAdmin, async (req, res) => {
  const data = UpdateAdminSiteBody.parse(req.body);
  await ensureSeeded();
  const [settings] = await db.update(siteSettingsTable).set(data).where(eq(siteSettingsTable.id, 1)).returning();
  res.json({
    brandName: settings.brandName,
    location: settings.location,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    officeAddress: settings.officeAddress,
    factoryAddress: settings.factoryAddress,
    businessHours: settings.businessHours,
    whatsappMessage: settings.whatsappMessage,
    heroImage: settings.heroImage,
    heroVideo: settings.heroVideo,
    aboutHeroImage: settings.aboutHeroImage,
    servicesHeroImage: settings.servicesHeroImage,
    productsHeroImage: settings.productsHeroImage,
    designsHeroImage: settings.designsHeroImage,
    excellenceHeroImage: settings.excellenceHeroImage,
    contactHeroImage: settings.contactHeroImage,
    founderName: settings.founderName,
    founderTitle: settings.founderTitle,
    founderQuote: settings.founderQuote,
    founderImage: settings.founderImage,
  });
});

// Stats update endpoint
router.patch("/admin/stats", requireAdmin, async (req, res) => {
  const { stats } = req.body as { stats: Array<{ value: string; label: string; displayOrder: number }> };
  if (!Array.isArray(stats)) { res.status(400).json({ error: "stats array required" }); return; }
  // Delete all existing stats and re-insert
  await db.delete(factoryStatsTable);
  if (stats.length > 0) {
    await db.insert(factoryStatsTable).values(stats.map((s, i) => ({
      value: s.value,
      label: s.label,
      displayOrder: s.displayOrder || i + 1,
    })));
  }
  const updated = await db.select().from(factoryStatsTable).orderBy(asc(factoryStatsTable.displayOrder));
  res.json(updated.map(s => ({ value: s.value, label: s.label, displayOrder: s.displayOrder })));
});

router.patch("/admin/content/:id", requireAdmin, async (req, res) => {
  const { id } = UpdateAdminContentParams.parse({ id: Number(req.params.id) });
  const data = UpdateAdminContentBody.parse(req.body);
  const [record] = await db.update(contentTable).set(data).where(eq(contentTable.id, id)).returning();
  if (!record) {
    res.status(404).json({ error: "Content not found" });
    return;
  }
  res.json(recordToApi(record));
});

router.delete("/admin/content/:id", requireAdmin, async (req, res) => {
  const { id } = DeleteAdminContentParams.parse({ id: Number(req.params.id) });
  const [record] = await db.delete(contentTable).where(eq(contentTable.id, id)).returning({ id: contentTable.id });
  if (!record) {
    res.status(404).json({ error: "Content not found" });
    return;
  }
  res.status(204).send();
});

// Page text endpoints (public read, admin write)
router.get("/page-text", async (req, res) => {
  const page = req.query.page as string;
  if (!page) { res.status(400).json({ error: "page query required" }); return; }
  const rows = await db.select().from(pageTextTable).where(eq(pageTextTable.page, page));
  const result: Record<string, { value: string; color?: string }> = {};
  for (const row of rows) { result[row.key] = { value: row.value, color: row.color || undefined }; }
  res.json(result);
});

router.patch("/admin/page-text", requireAdmin, async (req, res) => {
  const { page, key, value, color } = req.body as { page: string; key: string; value: string; color?: string };
  if (!page || !key || value === undefined) { res.status(400).json({ error: "page, key, and value required" }); return; }
  const [existing] = await db.select().from(pageTextTable).where(and(eq(pageTextTable.page, page), eq(pageTextTable.key, key))).limit(1);
  if (existing) {
    await db.update(pageTextTable).set({ value, color: color || null }).where(eq(pageTextTable.id, existing.id));
  } else {
    await db.insert(pageTextTable).values({ page, key, value, color: color || null });
  }
  res.json({ ok: true });
});

router.delete("/admin/page-text", requireAdmin, async (req, res) => {
  const { page, key } = req.body as { page: string; key: string };
  if (!page || !key) { res.status(400).json({ error: "page and key required" }); return; }
  await db.delete(pageTextTable).where(and(eq(pageTextTable.page, page), eq(pageTextTable.key, key)));
  res.status(204).send();
});

// Categories endpoint - returns unique categories per collection
router.get("/admin/categories", requireAdmin, async (req, res) => {
  const collection = req.query.collection as string | undefined;
  const whereClause = collection
    ? eq(contentTable.collection, collection)
    : undefined;
  const rows = await db
    .select({ category: contentTable.category, collection: contentTable.collection })
    .from(contentTable)
    .where(whereClause);
  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!row.category) continue;
    const coll = row.collection as string;
    if (!result[coll]) result[coll] = [];
    if (!result[coll].includes(row.category)) result[coll].push(row.category);
  }
  res.json(result);
});

// Bulk operations
router.post("/admin/content/bulk", requireAdmin, async (req, res) => {
  const { ids, action } = req.body as { ids: number[]; action: "publish" | "unpublish" | "feature" | "unfeature" | "delete" };
  if (!ids?.length || !action) { res.status(400).json({ error: "ids and action required" }); return; }
  if (action === "delete") {
    for (const id of ids) {
      await db.delete(contentTable).where(eq(contentTable.id, id));
    }
  } else if (action === "publish") {
    for (const id of ids) {
      await db.update(contentTable).set({ published: true }).where(eq(contentTable.id, id));
    }
  } else if (action === "unpublish") {
    for (const id of ids) {
      await db.update(contentTable).set({ published: false }).where(eq(contentTable.id, id));
    }
  } else if (action === "feature") {
    for (const id of ids) {
      await db.update(contentTable).set({ featured: true }).where(eq(contentTable.id, id));
    }
  } else if (action === "unfeature") {
    for (const id of ids) {
      await db.update(contentTable).set({ featured: false }).where(eq(contentTable.id, id));
    }
  }
  res.json({ processed: ids.length });
});

// Duplicate content
router.post("/admin/content/:id/duplicate", requireAdmin, async (req, res) => {
  const { id } = UpdateAdminContentParams.parse({ id: Number(req.params.id) });
  const [original] = await db.select().from(contentTable).where(eq(contentTable.id, id)).limit(1);
  if (!original) { res.status(404).json({ error: "Content not found" }); return; }
  const baseSlug = original.slug.replace(/^(designs|products|machinery|services|blogs|faqs|timeline|categories)-/, '');
  const newSlug = `${original.collection}-${baseSlug}-copy-${Date.now()}`;
  const [copy] = await db.insert(contentTable).values({
    collection: original.collection,
    slug: newSlug,
    title: `${original.title} (Copy)`,
    shortDescription: original.shortDescription,
    description: original.description,
    category: original.category,
    image: original.image,
    images: original.images,
    video: original.video,
    published: false,
    featured: false,
    displayOrder: original.displayOrder + 1,
    meta: original.meta,
  }).returning();
  res.status(201).json(recordToApi(copy));
});

const sampleItems = [
  { collection: "products", slug: "sample-polyester-fabric", title: "Polyester Blend Fabric", shortDescription: "A durable polyester blend suitable for everyday textile applications.", description: "Polyester blend fabric designed for repeated use in garments, home textiles and commercial applications. The material balances durability with a practical finish.", category: "Fabric", image: fabricImage, images: [fabricImage], published: true, featured: false, displayOrder: 10, meta: { application: "General textile use" } },
  { collection: "designs", slug: "sample-geometric-weave", title: "Geometric Weave Pattern", shortDescription: "A structured geometric pattern for woven textile production.", description: "A geometric weave design created for repeat production on the factory floor. The pattern can be adapted to different thread counts and colour combinations.", category: "Woven design", image: fabricImage, images: [fabricImage], published: true, featured: false, displayOrder: 10, meta: { note: "Sample design entry" } },
  { collection: "machinery", slug: "sample-weaving-loom", title: "Power Loom Section", shortDescription: "The main weaving section with multiple power looms in operation.", description: "Power looms form the core of the weaving section, producing fabric at scale for a range of textile applications. Each loom can be configured for different weave patterns and thread densities.", category: "Weaving", image: heroImage, images: [heroImage], published: true, featured: false, displayOrder: 10, meta: { capacity: "Multiple looms" } },
  { collection: "services", slug: "sample-fabric-dyeing", title: "Fabric Dyeing Service", shortDescription: "Custom dyeing for fabric in various colours and finishes.", description: "The factory offers fabric dyeing services tailored to customer specifications. Colour matching, batch consistency and finishing are managed in-house.", category: "Dyeing", image: fabricImage, images: [fabricImage], published: true, featured: false, displayOrder: 10, meta: { audience: "Customers requiring custom colours" } },
  { collection: "faqs", slug: "sample-minimum-order", title: "Is there a minimum order quantity?", shortDescription: "Minimum order depends on the product and material type.", description: "Minimum order quantities vary based on the textile product, material and production setup. Contact us with your requirements and we will confirm what is possible.", category: "Orders", image: "", images: [], published: true, featured: false, displayOrder: 10, meta: {} },
  { collection: "blogs", slug: "sample-textile-quality", title: "How we maintain textile quality", shortDescription: "Quality checks at every stage of production.", description: "Quality control at Riaz Fabrics starts from raw material inspection and continues through weaving, dyeing, finishing and packing. Each stage has defined checks to maintain consistency.", category: "Quality", image: fabricImage, images: [fabricImage], published: true, featured: false, displayOrder: 10, meta: { author: "Riaz Fabrics" } },
  { collection: "timeline", slug: "sample-new-machinery", title: "New machinery installed", shortDescription: "Added new equipment to expand production capacity.", description: "A new batch of machinery was installed to increase production throughput and support a wider range of textile applications.", category: "2024", image: heroImage, images: [heroImage], published: true, featured: false, displayOrder: 10, meta: {} },
  { collection: "categories", slug: "sample-home-textiles", title: "Home Textiles", shortDescription: "Textile products for home and interior applications.", description: "Home textiles including bed sheets, curtains and upholstery fabric. Each product can be定制ised by material, colour and quantity.", category: "Home", image: fabricImage, images: [fabricImage], published: true, featured: false, displayOrder: 10, meta: {} },
];

router.post("/admin/seed-sample", requireAdmin, async (_req, res) => {
  const existing = await db.select({ id: contentTable.id }).from(contentTable).limit(1);
  if (existing.length === 0) {
    res.status(400).json({ error: "Run initial seed first by visiting the public site." });
    return;
  }
  let added = 0;
  for (const item of sampleItems) {
    const slugExists = await db.select({ id: contentTable.id }).from(contentTable).where(eq(contentTable.slug, item.slug)).limit(1);
    if (slugExists.length === 0) {
      await db.insert(contentTable).values(item);
      added++;
    }
  }
  res.json({ added, total: sampleItems.length });
});

export default router;