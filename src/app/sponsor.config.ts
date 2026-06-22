/**
 * Sponsorship + impact content for A Night of Angels — the signature dinner of
 * the "Harvest of Internal Peace" programme, Saints Peter and Paul Catholic
 * Church, Oke Afa.
 *
 * ----------------------------------------------------------------------------
 * Most figures below are PLACEHOLDERS — replace with your real numbers before
 * sharing with sponsors. Honest, modest numbers convert better than none.
 * ----------------------------------------------------------------------------
 */

export interface Stat {
  value: string;
  label: string;
}

export interface SponsorTier {
  name: string;
  price: string;
  slots: string;
  summary: string;
  benefits: string[];
  featured?: boolean;
}

export interface Category {
  label: string;
  status: 'confirmed' | 'available' | 'talking';
  note?: string;
}

export interface Partner {
  name: string;
  logo: string;
  role: string;
  url?: string;
}

export interface ImpactPoint {
  title: string;
  body: string;
}

// PLACEHOLDER deadline — set the real sponsorship cut-off.
export const SPONSOR_DEADLINE = 'Friday, 29 August 2026';

// PLACEHOLDER audience numbers.
export const SPONSOR_STATS: Stat[] = [
  { value: '300+', label: 'Distinguished guests in the room' },
  { value: '60%', label: 'Entrepreneurs, executives & professionals' },
  { value: '50K+', label: 'Combined social & community reach' },
  { value: '3rd', label: 'Annual edition of the dinner' },
];

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    name: 'Title Sponsor',
    price: '₦5,000,000',
    slots: 'Exclusive — 1 partner',
    summary:
      'The evening presented in partnership with your brand. Maximum visibility, woven through every touchpoint.',
    benefits: [
      '“Presented by” lock-up across all event branding',
      'Logo on stage backdrop & step-and-repeat',
      'A premium reserved table of ten',
      'A speaking or recognition moment on stage',
      'Your brand woven into one programme segment',
      '6 social features + email & WhatsApp mentions',
      'Premier logo placement on website & prospectus',
    ],
    featured: true,
  },
  {
    name: 'Platinum',
    price: '₦2,500,000',
    slots: 'Limited — 3 partners',
    summary:
      'Premium positioning within the experience and a reserved table for your guests.',
    benefits: [
      'Logo on event branding & step-and-repeat',
      'A reserved table of ten',
      'Recognition during the toast',
      '4 social features',
      'Logo placement on website & prospectus',
    ],
  },
  {
    name: 'Gold',
    price: '₦1,000,000',
    slots: 'Limited',
    summary:
      'A considered brand moment woven through the programme and guest touchpoints.',
    benefits: [
      'Logo on select event branding',
      '4 premium seats',
      '2 social features',
      'Logo placement on website',
    ],
  },
  {
    name: 'Supporting & In-Kind',
    price: 'Custom',
    slots: 'Open',
    summary:
      'Support the night with product or services — drinks, décor, printing, valet and more — for negotiated visibility.',
    benefits: [
      'Recognition as an official partner',
      'Logo on website',
      'Visibility tailored to your contribution',
    ],
  },
];

export const SPONSOR_CATEGORIES: Category[] = [
  { label: 'Official Wine Partner', status: 'confirmed', note: 'DECLAN de España' },
  { label: 'Official Beverage Partner', status: 'confirmed', note: 'Nigerian Breweries' },
  { label: 'Title Sponsor', status: 'available' },
  { label: 'Banking & Financial Services', status: 'available' },
  { label: 'Décor & Florals', status: 'talking' },
  { label: 'Photography & Film', status: 'talking' },
];

// Confirmed partners — social proof. Replace logos in /public/partners.
export const CURRENT_PARTNERS: Partner[] = [
  {
    name: 'Nigerian Breweries',
    logo: 'partners/nigerian-breweries.svg',
    role: 'Official Beverage Partner',
  },
  {
    name: 'DECLAN de España',
    logo: 'partners/declan.svg',
    role: 'Official Wine Partner',
  },
];

export const IMPACT_POINTS: ImpactPoint[] = [
  {
    title: 'A community gathered in gratitude',
    body: 'A Night of Angels is the centrepiece of Harvest of Internal Peace — a moment for our parish family and friends to give thanks and break bread together.',
  },
  {
    title: 'Supporting the harvest',
    body: 'Proceeds support the church’s harvest programme and its outreach — sustaining the work of the parish and the people it serves.', // PLACEHOLDER — state exactly what funds support.
  },
  {
    title: 'Goodwill that travels with your brand',
    body: 'Partnering places your brand at the heart of a respected faith community — visible, valued and remembered long after the night ends.',
  },
];
