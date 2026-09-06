import type {
  BusinessDiscoveryProvider,
  DiscoveryBusiness,
  DiscoverySearchInput,
  DiscoverySearchResult,
} from "./types";

/**
 * The demo discovery provider.
 *
 * Every business here is invented. It exists so LeadEngine is fully usable —
 * and demonstrable — without Google credentials. Results are flagged
 * `isFixture: true` and the UI must label them; we never present fixtures as
 * real Google data.
 *
 * The fixture set is chosen to exercise the qualification logic:
 *   - a strong business with a weak site (the ideal target)
 *   - a strong business with an agency-built site (excluded)
 *   - a weak business with a weak site (not worth the time)
 *   - a strong business with a good site (low opportunity)
 *   - a business with no website
 *   - a business whose site does not load
 *   - a near-duplicate of an existing record
 */

interface Fixture extends Omit<DiscoveryBusiness, "raw"> {
  /** Category keywords this fixture answers to, lowercased. */
  keywords: string[];
  /** Cities this fixture answers to, lowercased. */
  cities: string[];
}

const FIXTURES: Fixture[] = [
  {
    externalId: "demo-cedar-peak-plumbing",
    name: "Cedar Peak Plumbing",
    category: "Plumber",
    formattedAddress: "418 W State St, Redlands, CA 92373",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0556,
    longitude: -117.1825,
    phone: "(909) 555-0142",
    websiteUrl: "https://cedarpeakplumbing.example",
    rating: 4.9,
    reviewCount: 384,
    businessStatus: "OPERATIONAL",
    keywords: ["plumber", "plumbing", "drain", "water heater"],
    cities: ["redlands", "san bernardino", "yucaipa", "inland empire"],
  },
  {
    externalId: "demo-summit-hvac",
    name: "Summit HVAC & Air",
    category: "HVAC contractor",
    formattedAddress: "1290 E Cooley Dr, Colton, CA 92324",
    city: "Colton",
    region: "CA",
    postalCode: "92324",
    latitude: 34.0501,
    longitude: -117.3131,
    phone: "(909) 555-0177",
    websiteUrl: "https://summithvacair.example",
    rating: 4.7,
    reviewCount: 212,
    businessStatus: "OPERATIONAL",
    keywords: ["hvac", "heating", "air conditioning", "furnace"],
    cities: ["colton", "redlands", "san bernardino", "inland empire"],
  },
  {
    externalId: "demo-juniper-skin-studio",
    name: "Juniper Skin Studio",
    category: "Med spa",
    formattedAddress: "77 N 5th St, Redlands, CA 92374",
    city: "Redlands",
    region: "CA",
    postalCode: "92374",
    latitude: 34.0561,
    longitude: -117.1826,
    phone: "(909) 555-0193",
    websiteUrl: "https://juniperskinstudio.example",
    rating: 4.8,
    reviewCount: 156,
    businessStatus: "OPERATIONAL",
    keywords: ["med spa", "medspa", "skin", "facial", "aesthetics"],
    cities: ["redlands", "loma linda", "inland empire"],
  },
  {
    externalId: "demo-orange-grove-dental",
    name: "Orange Grove Dental Group",
    category: "Dentist",
    formattedAddress: "2201 Orange Tree Ln, Redlands, CA 92374",
    city: "Redlands",
    region: "CA",
    postalCode: "92374",
    latitude: 34.0623,
    longitude: -117.1704,
    phone: "(909) 555-0110",
    websiteUrl: "https://orangegrovedental.example",
    rating: 4.6,
    reviewCount: 289,
    businessStatus: "OPERATIONAL",
    keywords: ["dental", "dentist", "orthodont"],
    cities: ["redlands", "highland", "inland empire"],
  },
  {
    externalId: "demo-mesa-electric",
    name: "Mesa Electric Co",
    category: "Electrician",
    formattedAddress: "830 Nevada St, Redlands, CA 92373",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0398,
    longitude: -117.2103,
    phone: "(909) 555-0128",
    websiteUrl: null,
    rating: 4.4,
    reviewCount: 41,
    businessStatus: "OPERATIONAL",
    keywords: ["electric", "electrician", "panel", "wiring"],
    cities: ["redlands", "san bernardino", "inland empire"],
  },
  {
    externalId: "demo-ironwood-roofing",
    name: "Ironwood Roofing",
    category: "Roofing contractor",
    formattedAddress: "5 W Olive Ave, Redlands, CA 92373",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0532,
    longitude: -117.1841,
    phone: "(909) 555-0165",
    websiteUrl: "https://ironwoodroofing.example",
    rating: 3.9,
    reviewCount: 7,
    businessStatus: "OPERATIONAL",
    keywords: ["roof", "roofing", "gutter"],
    cities: ["redlands", "yucaipa", "inland empire"],
  },
  {
    externalId: "demo-lantern-pest",
    name: "Lantern Pest Control",
    category: "Pest control service",
    formattedAddress: "1440 Barton Rd, Redlands, CA 92373",
    city: "Redlands",
    region: "CA",
    postalCode: "92373",
    latitude: 34.0324,
    longitude: -117.2278,
    phone: "(909) 555-0151",
    websiteUrl: "https://lanternpest.example",
    rating: 4.5,
    reviewCount: 63,
    businessStatus: "OPERATIONAL",
    keywords: ["pest", "exterminator", "termite"],
    cities: ["redlands", "colton", "inland empire"],
  },
  {
    // Near-duplicate of Summit HVAC & Air: same name shape, same region,
    // different street. Exercises the weak-duplicate suggestion path.
    externalId: "demo-summit-hvac-alt",
    name: "Summit HVAC and Air Inc.",
    category: "Air conditioning contractor",
    formattedAddress: "1290 East Cooley Drive Suite B, Colton, CA 92324",
    city: "Colton",
    region: "CA",
    postalCode: "92324",
    latitude: 34.0502,
    longitude: -117.3129,
    phone: "(909) 555-0902",
    websiteUrl: null,
    rating: 4.6,
    reviewCount: 188,
    businessStatus: "OPERATIONAL",
    keywords: ["hvac", "air conditioning", "heating"],
    cities: ["colton", "redlands", "inland empire"],
  },
  {
    externalId: "demo-blue-oak-landscaping",
    name: "Blue Oak Landscaping",
    category: "Landscaper",
    formattedAddress: "912 Church St, Yucaipa, CA 92399",
    city: "Yucaipa",
    region: "CA",
    postalCode: "92399",
    latitude: 34.0336,
    longitude: -117.0431,
    phone: "(909) 555-0187",
    websiteUrl: "https://blueoaklandscaping.example",
    rating: 4.3,
    reviewCount: 96,
    businessStatus: "OPERATIONAL",
    keywords: ["landscap", "lawn", "gardening", "irrigation"],
    cities: ["yucaipa", "redlands", "inland empire"],
  },
  {
    externalId: "demo-harbor-auto",
    name: "Harbor Street Auto Repair",
    category: "Auto repair shop",
    formattedAddress: "300 W Harbor St, San Bernardino, CA 92408",
    city: "San Bernardino",
    region: "CA",
    postalCode: "92408",
    latitude: 34.0839,
    longitude: -117.2898,
    phone: "(909) 555-0134",
    websiteUrl: "https://harborstreetauto.example",
    rating: 4.1,
    reviewCount: 118,
    businessStatus: "OPERATIONAL",
    keywords: ["auto", "auto repair", "mechanic", "brake"],
    cities: ["san bernardino", "colton", "inland empire"],
  },
];

function matches(fixture: Fixture, input: DiscoverySearchInput): boolean {
  const category = input.category.trim().toLowerCase();
  const location = input.locationText.trim().toLowerCase();

  const categoryHit =
    category.length === 0 ||
    fixture.keywords.some((k) => category.includes(k) || k.includes(category)) ||
    (fixture.category ?? "").toLowerCase().includes(category);

  const locationHit =
    location.length === 0 ||
    fixture.cities.some(
      (c) => location.includes(c) || c.includes(location.split(",")[0]!.trim()),
    ) ||
    (fixture.region ?? "").toLowerCase() === location ||
    location.includes("ca");

  return categoryHit && locationHit;
}

export class DemoDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly id = "demo";
  readonly label = "Demo (fictional fixtures)";
  readonly returnsRealData = false;

  isConfigured(): boolean {
    return true;
  }

  async search(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
    const startedAt = Date.now();

    let hits = FIXTURES.filter((fixture) => matches(fixture, input));

    if (input.minRating !== undefined) {
      hits = hits.filter((f) => (f.rating ?? 0) >= input.minRating!);
    }
    if (input.minReviews !== undefined) {
      hits = hits.filter((f) => (f.reviewCount ?? 0) >= input.minReviews!);
    }
    if (input.websiteFilter === "with") hits = hits.filter((f) => Boolean(f.websiteUrl));
    if (input.websiteFilter === "without") hits = hits.filter((f) => !f.websiteUrl);

    const businesses: DiscoveryBusiness[] = hits.slice(0, input.maxResults).map((fixture) => {
      const { keywords: _keywords, cities: _cities, ...business } = fixture;
      return { ...business, raw: { provider: "demo", fixture: fixture.externalId } };
    });

    return {
      businesses,
      isFixture: true,
      usage: {
        provider: this.id,
        operation: "searchText",
        requestCount: 0,
        resultCount: businesses.length,
        durationMs: Date.now() - startedAt,
        success: true,
      },
    };
  }

  async getDetails(externalId: string): Promise<DiscoveryBusiness | null> {
    const fixture = FIXTURES.find((f) => f.externalId === externalId);
    if (!fixture) return null;
    const { keywords: _keywords, cities: _cities, ...business } = fixture;
    return { ...business, raw: { provider: "demo", fixture: fixture.externalId } };
  }
}

/** Exposed for the seed script so fixture prospects match discovery results. */
export const DEMO_FIXTURES: ReadonlyArray<Omit<Fixture, "keywords" | "cities">> = FIXTURES.map(
  ({ keywords: _keywords, cities: _cities, ...rest }) => rest,
);
