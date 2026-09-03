import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db, adminSessionsTable, contentTable, factoryStatsTable, siteSettingsTable } from "@workspace/db";
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
    description: "A textile design study showing how a calm, repeatable pattern can translate into dependable bulk production. Replace this demo entry with an actual Ahmed Riaz design when ready.",
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
    shortDescription: "Fabric production for bulk requirements and local textile work.",
    description: "Ahmed Riaz works with cotton cloth and related fabric requirements for brands, local businesses, and wholesale customers. Final material, quantity, and finish are discussed before production.",
    category: "Fabric",
    image: fabricImage,
    images: [fabricImage],
    published: true,
    featured: true,
    displayOrder: 1,
    meta: { application: "Bulk fabric requirements" },
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
    title: "Bulk Textile Manufacturing",
    shortDescription: "Production planning for large-quantity textile requirements.",
    description: "From an initial requirement to production planning, Ahmed Riaz supports bulk textile work with a practical focus on quantity, material, and delivery coordination.",
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
    title: "Do you accept bulk orders?",
    shortDescription: "Yes. Bulk quantity is a central part of the factory's work.",
    description: "Ahmed Riaz works with bulk textile requirements for selected brands, local businesses, and wholesale customers. Share the quantity and fabric brief to start a conversation.",
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
    title: "Planning a bulk textile order",
    shortDescription: "The details that help a factory review a production brief.",
    description: "A useful production brief usually covers the textile application, material direction, approximate quantity, finishing expectations, and timing. Clear information early helps the factory respond more accurately.",
    category: "Bulk orders",
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
  if (settings.length > 0) return;

  await db.insert(siteSettingsTable).values({
    brandName: "Ahmed Riaz",
    location: "Baldia, Karachi, Pakistan",
    phone: "",
    whatsapp: "",
    email: "",
    officeAddress: "Add office address in Admin",
    factoryAddress: "Baldia, Karachi, Pakistan",
    businessHours: "Add business hours in Admin",
    whatsappMessage: "Hello Ahmed Riaz, I would like to discuss a bulk textile requirement.",
    heroImage,
    heroVideo: null,
  });
  await db.insert(factoryStatsTable).values([
    { value: "97+", label: "Machines", displayOrder: 1 },
    { value: "100+", label: "Workers", displayOrder: 2 },
    { value: "Bulk", label: "Production", displayOrder: 3 },
    { value: "Baldia", label: "Karachi", displayOrder: 4 },
  ]);
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
    },
    stats: stats.map((stat) => ({ value: stat.value, label: stat.label, displayOrder: stat.displayOrder })),
    ...grouped,
  });
});

router.post("/auth/login", async (req, res) => {
  const data = LoginAdminBody.parse(req.body);
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUsername || !configuredPassword) {
    res.status(503).json({ error: "Admin credentials are not configured in Replit Secrets" });
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
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ authenticated: true, username: configuredUsername });
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
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
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
  });
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

export default router;