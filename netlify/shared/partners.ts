/**
 * Sponsors / partners shown on the public site, editable from the back office.
 * Stored in the Netlify Blobs store `partners`, key `list`, as an ordered array
 * (array order = display order). Seeds the confirmed 2026 partners on first read.
 */
import { getStore } from '@netlify/blobs';

export type PartnerTier = 'title' | 'platinum' | 'gold' | 'partner';

export interface Partner {
  id: string;
  name: string;
  /** Image URL or an existing asset path, e.g. "partners/africhange.svg". */
  logo: string;
  /** Short role line, e.g. "Title Sponsor & Official Payment Partner". */
  role: string;
  /** Official website. Optional — logos link out only when set. */
  url?: string;
  tier: PartnerTier;
}

export const PARTNER_TIERS: PartnerTier[] = ['title', 'platinum', 'gold', 'partner'];

/** Confirmed partners for the 2026 edition — seeded when the store is empty. */
export const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'africhange',
    name: 'AfriChange',
    logo: 'partners/africhange.png',
    role: 'Title Sponsor & Official Payment Partner',
    url: 'https://www.africhange.com',
    tier: 'title',
  },
  {
    id: 'nigerian-breweries',
    name: 'Nigerian Breweries',
    logo: 'partners/nigerian-breweries.svg',
    role: 'Official Beverage Partner',
    url: 'https://nbplc.com',
    tier: 'gold',
  },
  {
    id: 'declan',
    name: 'DECLAN de España',
    logo: 'partners/declan.svg',
    role: 'Official Wine Partner',
    tier: 'gold',
  },
];

const STORE = 'partners';
const KEY = 'list';

function store() {
  return getStore({ name: STORE, consistency: 'strong' });
}

export async function readPartners(): Promise<Partner[]> {
  const data = await store().get(KEY, { type: 'json' });
  if (!Array.isArray(data)) {
    // First run — seed the confirmed partners so the site isn't blank.
    await writePartners(DEFAULT_PARTNERS);
    return [...DEFAULT_PARTNERS];
  }
  return (data as Partner[]).map(coerce);
}

export async function writePartners(list: Partner[]): Promise<void> {
  await store().setJSON(KEY, list.map(coerce));
}

/** Sanitise one record — trims strings, clamps the tier, drops empty urls. */
export function coerce(p: Partial<Partner>): Partner {
  const tier = PARTNER_TIERS.includes(p.tier as PartnerTier) ? (p.tier as PartnerTier) : 'partner';
  const url = String(p.url ?? '').trim();
  return {
    id: String(p.id ?? '').trim() || crypto.randomUUID(),
    name: String(p.name ?? '').trim().slice(0, 120),
    logo: String(p.logo ?? '').trim().slice(0, 500),
    role: String(p.role ?? '').trim().slice(0, 160),
    ...(url ? { url: url.slice(0, 500) } : {}),
    tier,
  };
}
