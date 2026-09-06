import { config as loadEnv } from "dotenv";
import {
  DEFAULT_SCORING_CONFIG,
  buildIdentities,
  factsFromSignals,
  identifyingIdentities,
  normalizeAddress,
  normalizeBusinessName,
  normalizePhone,
  normalizeWebsiteUrl,
  scoreProspect,
  type SignalInput,
} from "@leadengine/core";
import { prisma } from "./index";

loadEnv({ path: [".env", "../../.env"], quiet: true });

/**
 * Fixture data.
 *
 * EVERY business here is invented. No real prospect, customer, contact list or
 * private note is ever committed to this repository — the repo is public.
 * Domains use the reserved `.example` TLD so nothing can resolve to a real site.
 *
 * The set is chosen to exercise the product's judgement, not to look full:
 *
 *   Cedar Peak Plumbing    strong business, weak site        the ideal target
 *   Summit HVAC & Air      strong business, agency-built     excluded
 *   Juniper Skin Studio    strong business, competent site   low opportunity
 *   Mesa Electric Co       decent business, no website       different opening
 *   Ironwood Roofing       weak business, weak site          not worth the time
 *   Orange Grove Dental    strong business, site won't load  strong hook
 *   Summit HVAC and Air    near-duplicate of Summit          duplicate review
 *   Harbor Street Auto     out-of-area                       disqualified
 */

interface Fixture {
  name: string;
  category: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  placeId: string;
  businessStatus: string;
  /** Website signals as if enrichment had already run. Null means never inspected. */
  site: null | {
    reachable: boolean;
    https?: boolean;
    title?: string | null;
    metaDescription?: string | null;
    viewport?: boolean;
    contactLink?: boolean;
    bookingLink?: boolean;
    phoneLink?: boolean;
    cms?: string | null;
    agencyCredit?: { text: string; domain: string; confidence: "LOW" | "MEDIUM" | "HIGH" } | null;
    failureReason?: string;
  };
  note?: string;
}

const FIXTURES: Fixture[] = [
  {
    name: "Cedar Peak Plumbing",
    category: "Plumber",
    line1: "418 W State St",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0556,
    longitude: -117.1825,
    phone: "(909) 555-0142",
    email: "office@cedarpeakplumbing.example",
    website: "https://cedarpeakplumbing.example",
    rating: 4.9,
    reviewCount: 384,
    placeId: "demo-cedar-peak-plumbing",
    businessStatus: "OPERATIONAL",
    site: {
      reachable: true,
      https: false,
      title: "Cedar Peak Plumbing",
      metaDescription: null,
      viewport: false,
      contactLink: false,
      bookingLink: false,
      phoneLink: false,
      cms: "WordPress",
      agencyCredit: null,
    },
    note: "Owner answered the phone directly. Site is clearly a decade old.",
  },
  {
    name: "Summit HVAC & Air",
    category: "HVAC contractor",
    line1: "1290 E Cooley Dr",
    city: "Colton",
    region: "CA",
    postalCode: "92324",
    latitude: 34.0501,
    longitude: -117.3131,
    phone: "(909) 555-0177",
    email: "hello@summithvacair.example",
    website: "https://summithvacair.example",
    rating: 4.7,
    reviewCount: 212,
    placeId: "demo-summit-hvac",
    businessStatus: "OPERATIONAL",
    site: {
      reachable: true,
      https: true,
      title: "Summit HVAC & Air — Heating and Cooling in the Inland Empire",
      metaDescription: "Fast, honest HVAC service across the Inland Empire.",
      viewport: true,
      contactLink: true,
      bookingLink: true,
      phoneLink: true,
      cms: "Webflow",
      agencyCredit: {
        text: "Website by Bright Pixel Studio",
        domain: "brightpixelstudio.example",
        confidence: "HIGH",
      },
    },
  },
  {
    name: "Juniper Skin Studio",
    category: "Med spa",
    line1: "77 N 5th St",
    city: "Redlands",
    region: "CA",
    postalCode: "92374",
    latitude: 34.0561,
    longitude: -117.1826,
    phone: "(909) 555-0193",
    email: "book@juniperskinstudio.example",
    website: "https://juniperskinstudio.example",
    rating: 4.8,
    reviewCount: 156,
    placeId: "demo-juniper-skin-studio",
    businessStatus: "OPERATIONAL",
    site: {
      reachable: true,
      https: true,
      title: "Juniper Skin Studio — Redlands Med Spa",
      metaDescription: "Facials, injectables and laser treatments in downtown Redlands.",
      viewport: true,
      contactLink: true,
      bookingLink: true,
      phoneLink: true,
      cms: "Squarespace",
      agencyCredit: null,
    },
  },
  {
    name: "Mesa Electric Co",
    category: "Electrician",
    line1: "830 Nevada St",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0398,
    longitude: -117.2103,
    phone: "(909) 555-0128",
    email: null,
    website: null,
    rating: 4.4,
    reviewCount: 41,
    placeId: "demo-mesa-electric",
    businessStatus: "OPERATIONAL",
    site: null,
    note: "No web presence at all — only a Google listing.",
  },
  {
    name: "Ironwood Roofing",
    category: "Roofing contractor",
    line1: "5 W Olive Ave",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0532,
    longitude: -117.1841,
    phone: "(909) 555-0165",
    email: null,
    website: "https://ironwoodroofing.example",
    rating: 3.9,
    reviewCount: 7,
    placeId: "demo-ironwood-roofing",
    businessStatus: "OPERATIONAL",
    site: {
      reachable: true,
      https: false,
      title: null,
      metaDescription: null,
      viewport: false,
      contactLink: false,
      bookingLink: false,
      phoneLink: false,
      cms: null,
      agencyCredit: null,
    },
  },
  {
    name: "Orange Grove Dental Group",
    category: "Dentist",
    line1: "2201 Orange Tree Ln",
    city: "Redlands",
    region: "CA",
    postalCode: "92374",
    latitude: 34.0623,
    longitude: -117.1704,
    phone: "(909) 555-0110",
    email: "front@orangegrovedental.example",
    website: "https://orangegrovedental.example",
    rating: 4.6,
    reviewCount: 289,
    placeId: "demo-orange-grove-dental",
    businessStatus: "OPERATIONAL",
    site: { reachable: false, failureReason: "DNS_FAILURE" },
  },
  {
    name: "Summit HVAC and Air Inc.",
    category: "Air conditioning contractor",
    line1: "1290 East Cooley Drive Suite B",
    city: "Colton",
    region: "CA",
    postalCode: "92324",
    latitude: 34.0502,
    longitude: -117.3129,
    phone: "(909) 555-0902",
    email: null,
    website: null,
    rating: 4.6,
    reviewCount: 188,
    placeId: "demo-summit-hvac-alt",
    businessStatus: "OPERATIONAL",
    site: null,
    note: "Second listing for what may be the same business as Summit HVAC & Air.",
  },
  {
    name: "Harbor Street Auto Repair",
    category: "Auto repair shop",
    line1: "300 W Harbor St",
    city: "Bend",
    region: "OR",
    postalCode: "97701",
    latitude: 44.0582,
    longitude: -121.3153,
    phone: "(541) 555-0134",
    email: null,
    website: "https://harborstreetauto.example",
    rating: 4.1,
    reviewCount: 118,
    placeId: "demo-harbor-auto",
    businessStatus: "OPERATIONAL",
    site: {
      reachable: true,
      https: true,
      title: "Harbor Street Auto Repair",
      metaDescription: null,
      viewport: true,
      contactLink: true,
      bookingLink: false,
      phoneLink: true,
      cms: "WordPress",
      agencyCredit: null,
    },
    note: "Outside the target service area.",
  },
];

function websiteSignals(fixture: Fixture): SignalInput[] {
  const site = fixture.site;
  if (!site) return [];
  const reference = fixture.website ?? "";

  if (!site.reachable) {
    return [
      {
        type: "WEBSITE_FETCH_FAILED",
        source: "WEBSITE_FETCH",
        booleanValue: true,
        value: site.failureReason ?? "UNREACHABLE",
        confidence: "HIGH",
        evidence: `The domain did not resolve (${site.failureReason ?? "unreachable"}).`,
        sourceReference: reference,
      },
      {
        type: "WEBSITE_REACHABLE",
        source: "WEBSITE_FETCH",
        booleanValue: false,
        confidence: "HIGH",
        evidence: "The site failed to load during inspection.",
        sourceReference: reference,
      },
    ];
  }

  const signals: SignalInput[] = [
    {
      type: "WEBSITE_REACHABLE",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      confidence: "HIGH",
      evidence: "HTTP 200",
      sourceReference: reference,
    },
    {
      type: "HTTPS_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: site.https ?? true,
      confidence: "HIGH",
      evidence: site.https ? "Served over HTTPS" : "Final URL is plain HTTP",
      sourceReference: reference,
    },
    {
      type: "TITLE_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: Boolean(site.title),
      value: site.title ?? null,
      confidence: "HIGH",
      evidence: site.title ? `<title>${site.title}</title>` : "No <title> element",
      sourceReference: reference,
    },
    {
      type: "META_DESCRIPTION_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: Boolean(site.metaDescription),
      value: site.metaDescription ?? null,
      confidence: "HIGH",
      evidence: site.metaDescription ? "Meta description present" : "No meta description",
      sourceReference: reference,
    },
    {
      type: "VIEWPORT_META_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: site.viewport ?? false,
      confidence: "HIGH",
      evidence: site.viewport
        ? "Responsive viewport meta tag present"
        : "No viewport meta tag — likely not built for phones",
      sourceReference: reference,
    },
    {
      type: "CONTACT_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: site.contactLink ?? false,
      confidence: "MEDIUM",
      evidence: site.contactLink
        ? "Contact or quote link found on the homepage"
        : "No obvious contact or quote link on the homepage",
      sourceReference: reference,
    },
    {
      type: "BOOKING_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: site.bookingLink ?? false,
      confidence: "MEDIUM",
      evidence: site.bookingLink ? "Booking link found" : "No booking or scheduling link found",
      sourceReference: reference,
    },
    {
      type: "PHONE_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: site.phoneLink ?? false,
      confidence: "HIGH",
      evidence: site.phoneLink ? "tel: link present" : "No click-to-call link",
      sourceReference: reference,
    },
  ];

  if (site.cms) {
    signals.push({
      type: "CMS_HINT",
      source: "WEBSITE_FETCH",
      value: site.cms,
      confidence: "MEDIUM",
      evidence: `Platform fingerprint: ${site.cms}`,
      sourceReference: reference,
    });
  }

  if (site.agencyCredit) {
    signals.push({
      type: "AGENCY_CREDIT_DETECTED",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      value: site.agencyCredit.domain,
      confidence: site.agencyCredit.confidence,
      evidence: site.agencyCredit.text,
      sourceReference: `https://${site.agencyCredit.domain}`,
    });
  }

  return signals;
}

function providerSignals(fixture: Fixture): SignalInput[] {
  return [
    {
      type: "BUSINESS_CATEGORY",
      source: "DEMO_PROVIDER",
      value: fixture.category,
      confidence: "HIGH",
      evidence: `Category reported by the demo provider: ${fixture.category}`,
      sourceReference: fixture.placeId,
    },
    ...(fixture.rating !== null
      ? [
          {
            type: "GOOGLE_RATING" as const,
            source: "DEMO_PROVIDER" as const,
            numericValue: fixture.rating,
            value: fixture.rating.toFixed(1),
            confidence: "HIGH" as const,
            evidence: `${fixture.rating.toFixed(1)} stars`,
            sourceReference: fixture.placeId,
          },
        ]
      : []),
    ...(fixture.reviewCount !== null
      ? [
          {
            type: "GOOGLE_REVIEW_COUNT" as const,
            source: "DEMO_PROVIDER" as const,
            numericValue: fixture.reviewCount,
            value: String(fixture.reviewCount),
            confidence: "HIGH" as const,
            evidence: `${fixture.reviewCount} reviews`,
            sourceReference: fixture.placeId,
          },
        ]
      : []),
    {
      type: "PHONE_PRESENT",
      source: "DEMO_PROVIDER",
      booleanValue: Boolean(fixture.phone),
      value: normalizePhone(fixture.phone),
      confidence: "HIGH",
      evidence: fixture.phone ? `Public phone: ${fixture.phone}` : "No public phone found",
      sourceReference: fixture.placeId,
    },
    {
      type: "WEBSITE_PRESENT",
      source: "DEMO_PROVIDER",
      booleanValue: Boolean(fixture.website),
      value: fixture.website,
      confidence: "HIGH",
      evidence: fixture.website ? `Website: ${fixture.website}` : "No website on file",
      sourceReference: fixture.placeId,
    },
    ...(fixture.email
      ? [
          {
            type: "PUBLIC_EMAIL_PRESENT" as const,
            source: "DEMO_PROVIDER" as const,
            booleanValue: true,
            value: fixture.email,
            confidence: "HIGH" as const,
            evidence: `Public business email: ${fixture.email}`,
            sourceReference: fixture.placeId,
          },
        ]
      : []),
  ];
}

async function main(): Promise<void> {
  const slug = process.env.SEED_WORKSPACE_SLUG ?? "novenworks";

  const workspace = await prisma.workspace.upsert({
    where: { slug },
    create: { slug, name: "Novenworks", isFixture: true },
    update: { isFixture: true },
  });

  // Idempotent: clearing the fixture workspace's prospects lets the seed be
  // re-run without stacking duplicates.
  await prisma.prospect.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.discoveryRun.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.activityEvent.deleteMany({ where: { workspaceId: workspace.id } });

  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: "dev-operator" } },
    create: { workspaceId: workspace.id, userId: "dev-operator", role: "OWNER" },
    update: {},
  });

  for (const fixture of FIXTURES) {
    const website = normalizeWebsiteUrl(fixture.website);
    const phone = normalizePhone(fixture.phone);
    const formatted = `${fixture.line1}, ${fixture.city}, ${fixture.region} ${fixture.postalCode}`;

    const prospect = await prisma.prospect.create({
      data: {
        workspaceId: workspace.id,
        name: fixture.name,
        normalizedName: normalizeBusinessName(fixture.name),
        primaryCategory: fixture.category,
        rating: fixture.rating,
        reviewCount: fixture.reviewCount,
        hasWebsite: Boolean(website),
        city: fixture.city,
        region: fixture.region,
        sources: {
          create: {
            workspaceId: workspace.id,
            provider: "demo",
            externalId: fixture.placeId,
            raw: { fixture: true, placeId: fixture.placeId },
          },
        },
        stageHistory: {
          create: {
            workspaceId: workspace.id,
            toStage: "DISCOVERED",
            reason: "Seeded fixture data",
          },
        },
      },
    });

    const location = await prisma.businessLocation.create({
      data: {
        workspaceId: workspace.id,
        prospectId: prospect.id,
        line1: fixture.line1,
        city: fixture.city,
        region: fixture.region,
        postalCode: fixture.postalCode,
        country: "US",
        formatted,
        normalized: normalizeAddress({
          line1: fixture.line1,
          city: fixture.city,
          region: fixture.region,
          postalCode: fixture.postalCode,
        }),
        latitude: fixture.latitude,
        longitude: fixture.longitude,
      },
    });

    let websiteId: string | null = null;
    if (website) {
      const site = fixture.site;
      const row = await prisma.website.create({
        data: {
          workspaceId: workspace.id,
          prospectId: prospect.id,
          url: website.url,
          rootDomain: website.rootDomain,
          usesHttps: site?.https ?? website.usesHttps,
          enrichmentStatus: site ? (site.reachable ? "OK" : "UNREACHABLE") : "NOT_ATTEMPTED",
          enrichmentError: site && !site.reachable ? `${site.failureReason}: seeded fixture` : null,
          lastEnrichedAt: site ? new Date() : null,
          httpStatus: site?.reachable ? 200 : null,
          title: site?.title ?? null,
          metaDescription: site?.metaDescription ?? null,
          responseMs: site?.reachable ? 240 : null,
        },
      });
      websiteId = row.id;
    }

    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { primaryLocationId: location.id, primaryWebsiteId: websiteId },
    });

    if (phone) {
      await prisma.businessContact.create({
        data: {
          workspaceId: workspace.id,
          prospectId: prospect.id,
          kind: "PHONE",
          value: fixture.phone!,
          normalized: phone,
          source: "demo",
        },
      });
    }
    if (fixture.email) {
      await prisma.businessContact.create({
        data: {
          workspaceId: workspace.id,
          prospectId: prospect.id,
          kind: "EMAIL",
          value: fixture.email,
          normalized: fixture.email,
          source: "demo",
        },
      });
    }

    for (const identity of identifyingIdentities(
      buildIdentities({
        provider: "demo",
        externalId: fixture.placeId,
        websiteUrl: fixture.website,
        phone: fixture.phone,
        address: {
          line1: fixture.line1,
          city: fixture.city,
          region: fixture.region,
          postalCode: fixture.postalCode,
        },
      }),
    )) {
      await prisma.prospectIdentity.createMany({
        data: [
          {
            workspaceId: workspace.id,
            prospectId: prospect.id,
            kind: identity.kind,
            namespace: identity.namespace,
            value: identity.value,
          },
        ],
        skipDuplicates: true,
      });
    }

    const signals = [...providerSignals(fixture), ...websiteSignals(fixture)];
    for (const signal of signals) {
      await prisma.prospectSignal.create({
        data: {
          workspaceId: workspace.id,
          prospectId: prospect.id,
          type: signal.type,
          source: signal.source,
          confidence: signal.confidence ?? "MEDIUM",
          value: signal.value ?? null,
          numericValue: signal.numericValue ?? null,
          booleanValue: signal.booleanValue ?? null,
          evidence: signal.evidence ?? null,
          sourceReference: signal.sourceReference ?? null,
        },
      });
    }

    if (fixture.note) {
      await prisma.prospectNote.create({
        data: { workspaceId: workspace.id, prospectId: prospect.id, body: fixture.note },
      });
    }

    // Score with the same engine the app uses, so seeded numbers are real.
    const result = scoreProspect(
      factsFromSignals(signals, {
        primaryCategory: fixture.category,
        region: fixture.region,
        hasWebsite: Boolean(website),
        hasPublicPhone: Boolean(phone),
        hasPublicEmail: Boolean(fixture.email),
      }),
      DEFAULT_SCORING_CONFIG,
    );

    await prisma.scoreSnapshot.create({
      data: {
        workspaceId: workspace.id,
        prospectId: prospect.id,
        total: result.total,
        businessFitScore: result.businessFitScore,
        businessStrengthScore: result.businessStrengthScore,
        websiteOpportunityScore: result.websiteOpportunityScore,
        reachabilityScore: result.reachabilityScore,
        suggestedQualification: result.suggestedQualification,
        disqualifiers: result.disqualifiers,
        modelVersion: result.modelVersion,
        components: { create: result.components },
      },
    });

    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        opportunityScore: result.total,
        businessFitScore: result.businessFitScore,
        businessStrengthScore: result.businessStrengthScore,
        websiteOpportunityScore: result.websiteOpportunityScore,
        reachabilityScore: result.reachabilityScore,
        scoredAt: new Date(),
        qualification: result.suggestedQualification,
        agencyManaged: result.disqualifiers.includes("AGENCY_MANAGED"),
        disqualificationReason:
          result.suggestedQualification === "DISQUALIFIED" ? (result.disqualifiers[0] ?? "OTHER") : null,
      },
    });

    await prisma.activityEvent.create({
      data: {
        workspaceId: workspace.id,
        prospectId: prospect.id,
        type: "PROSPECT_ADDED",
        summary: `${fixture.name} added from demo data (fixture)`,
      },
    });

    console.log(
      `  ${fixture.name.padEnd(30)} ${String(result.total).padStart(3)}/100  ${result.suggestedQualification}${
        result.disqualifiers.length > 0 ? ` (${result.disqualifiers.join(", ")})` : ""
      }`,
    );
  }

  // The near-duplicate pair, recorded as a suggestion for a human to resolve.
  const summitA = await prisma.prospect.findFirst({
    where: { workspaceId: workspace.id, name: "Summit HVAC & Air" },
  });
  const summitB = await prisma.prospect.findFirst({
    where: { workspaceId: workspace.id, name: "Summit HVAC and Air Inc." },
  });
  if (summitA && summitB) {
    const [a, b] = summitA.id < summitB.id ? [summitA.id, summitB.id] : [summitB.id, summitA.id];
    await prisma.duplicateCandidate.create({
      data: {
        workspaceId: workspace.id,
        prospectAId: a,
        prospectBId: b,
        confidence: 0.85,
        reasons: ["identical_normalized_name", "same_city"],
      },
    });
  }

  console.log(`\nSeeded ${FIXTURES.length} fictional prospects into workspace "${workspace.slug}".`);
  console.log("All businesses, domains and phone numbers above are invented.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
