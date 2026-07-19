/**
 * Sponsorship + impact content for A Night of Angels — the signature dinner of
 * the "Harvest of Everlasting Peace" programme (Isaiah 26:3), Saints Peter and
 * Paul Catholic Church, Oke-Afa, Ejigbo, Lagos.
 *
 * Figures and tiers below are synced to the official 2026 Sponsorship Proposal
 * (Nights of Angels · Harvest Dinner 2026 · 24 October 2026).
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

// The brochure states seating is allocated on a first-confirmed basis and does
// NOT specify a cut-off date. This is the one figure still to be confirmed.
export const SPONSOR_DEADLINE = 'Friday, 29 August 2026';

// Audience numbers — from the official 2026 Sponsorship Prospectus.
export const SPONSOR_STATS: Stat[] = [
  { value: '250+', label: 'Distinguished guests in the room on the night' },
  { value: '6,000+', label: 'Parishioners reached through the Harvest Brochure & church community' },
  { value: '3', label: 'Sponsorship tiers, each offering distinct, uncrowded brand prominence' },
  { value: '100%', label: 'Curated all-white guest list, by invitation and ticket' },
];

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    name: 'Official Brand Partner',
    price: '₦1,500,000',
    slots: 'Category-exclusive — 1 partner',
    summary:
      'The most comprehensive partnership available — one brand per category, uncontested across every touchpoint of the night.',
    benefits: [
      '“Official Brand Partner” lock-up across all event branding',
      'Brand logo on stage backdrop & step-and-repeat',
      '5 premium reserved ticket seats',
      'A speaking or recognition moment on stage',
      'Full-page commercial ad in the Church’s 2026 Harvest Brochure',
      'Social features — Instagram, WhatsApp, Facebook & TikTok mentions',
      'Premier logo placement on website & prospectus',
      'Red-carpet engagement',
      'Roll-up banner feature',
      'Brand logo on the official ticket document',
    ],
    featured: true,
  },
  {
    name: 'Platinum',
    price: '₦1,000,000',
    slots: 'Category-exclusive — 3 partners',
    summary:
      'Premium positioning through the evening, with a Harvest Brochure ad and social reach across the 6,000+ congregation.',
    benefits: [
      'Logo on event branding & step-and-repeat backdrop',
      '3 premium reserved ticket seats',
      'Stage mention of your brand during the evening',
      'Full-page commercial ad in the 2026 Harvest Brochure',
      'Social features: Instagram, WhatsApp, Facebook & TikTok',
      'Premier logo placement on website & prospectus',
    ],
  },
  {
    name: 'Gold',
    price: '₦500,000',
    slots: 'Category-exclusive',
    summary:
      'A considered brand presence with premium website & prospectus placement and full social features.',
    benefits: [
      'Logo on select event branding',
      '2 premium reserved ticket seats',
      'Premier logo placement on website & prospectus',
      'Social features: Instagram, WhatsApp, Facebook & TikTok',
    ],
  },
  {
    name: 'Backdrop & Step-and-Repeat',
    price: '₦100,000',
    slots: 'Add-on opportunity',
    summary:
      'Your brand logo on the event’s primary photo wall — present in every guest’s arrival photograph.',
    benefits: [
      'Brand logo on the dinner backdrop / photo wall',
      'Present in every guest’s arrival & selfie shot',
      'High-visibility placement across arrival imagery',
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
    body: 'A Night of Angels is the centrepiece of Harvest of Everlasting Peace (Isaiah 26:3) — a moment for our parish family and friends to give thanks and break bread together.',
  },
  {
    title: 'Supporting the harvest',
    body: 'Proceeds support the church’s harvest programme and its outreach — sustaining the work of the parish and the people it serves.', // PLACEHOLDER — state exactly what funds support.
  },
  {
    title: 'Goodwill that travels with your brand',
    body: 'Partnership extends beyond one night — your brand is featured in the SS Peter & Paul 2026 Harvest Brochure, a physical and digital publication reaching the full 6,000+ congregation.',
  },
];
