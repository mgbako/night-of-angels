/**
 * Gallery content for past editions of the dinner.
 *
 * A Night of Angels is the signature dinner of the annual harvest programme
 * "Harvest of Internal Peace" by Saints Peter and Paul Catholic Church, Oke Afa.
 *
 * ----------------------------------------------------------------------------
 * PLACEHOLDER IMAGES: the files in /public/gallery are tasteful stand-ins.
 * Replace them with real photographs from past editions (keep the same paths,
 * or point `src` at your new files) and update each `caption`/`alt`.
 * Recommended size: ~1600px on the long edge, JPG/WebP.
 * ----------------------------------------------------------------------------
 */

export interface GalleryImage {
  src: string;
  /** Accessible description of the photo. */
  alt: string;
  /** Short caption shown on hover and in the lightbox. */
  caption: string;
  /** Masonry sizing hint. */
  shape?: 'tall' | 'wide' | 'square';
}

export interface GalleryAlbum {
  /** URL-safe id, also used as the filter value. */
  id: string;
  /** Year of the edition. */
  year: string;
  /** Theme / title for that edition. */
  title: string;
  /** One-line note about the evening. */
  blurb: string;
  images: GalleryImage[];
}

export const GALLERY_ALBUMS: GalleryAlbum[] = [
  {
    id: '2025',
    year: '2025',
    title: 'The Inaugural Evening',
    blurb:
      'The very first Night of Angels — a room dressed entirely in white, and a community gathered in gratitude.',
    images: [
      {
        src: 'gallery/2025-couple.jpg',
        alt: 'A couple dressed in rich terracotta and gold at the dinner',
        caption: 'Dressed for the evening',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-guests.jpg',
        alt: 'Three guests in coordinated terracotta attire',
        caption: 'Friends of the harvest',
        shape: 'tall',
      },
      {
        src: 'gallery/candles.svg',
        alt: 'Candlelit tables glowing across the dining room',
        caption: 'Candlelight, end to end',
        shape: 'tall',
      },
      {
        src: 'gallery/toast.svg',
        alt: 'Guests raising glasses for a toast',
        caption: 'A toast to the harvest',
        shape: 'wide',
      },
      {
        src: 'gallery/guests.svg',
        alt: 'Guests in all-white attire mingling',
        caption: 'All in white, as one',
        shape: 'wide',
      },
      {
        src: 'gallery/florals.svg',
        alt: 'Floral centerpiece on a dining table',
        caption: 'Centerpieces in bloom',
        shape: 'square',
      },
      {
        src: 'gallery/crestglow.svg',
        alt: 'The Night of Angels crest illuminated',
        caption: 'Under one banner',
        shape: 'square',
      },
    ],
  },
  {
    id: '2024',
    year: '2024',
    title: 'An Evening of Thanksgiving',
    blurb:
      'Fine dining, live strings and intentional conversation — a night woven around gratitude and grace.',
    images: [
      {
        src: 'gallery/chandelier.svg',
        alt: 'Chandelier suspended above the dinner hall',
        caption: 'Light from above',
        shape: 'tall',
      },
      {
        src: 'gallery/quartet.svg',
        alt: 'String quartet performing live',
        caption: 'Live strings all evening',
        shape: 'wide',
      },
      {
        src: 'gallery/banquet.svg',
        alt: 'A long banquet table set for guests',
        caption: 'The table, set',
        shape: 'square',
      },
      {
        src: 'gallery/dancefloor.svg',
        alt: 'Guests dancing under sparkling lights',
        caption: 'When the music rose',
        shape: 'square',
      },
      {
        src: 'gallery/archway.svg',
        alt: 'Candlelit entrance archway',
        caption: 'A grand welcome',
        shape: 'tall',
      },
    ],
  },
  {
    id: '2023',
    year: '2023',
    title: 'Where It Began',
    blurb:
      'The gathering that started it all — intimate, intentional, and unmistakably warm.',
    images: [
      {
        src: 'gallery/2023-hall.jpg',
        alt: 'Guests seated and standing together in the softly lit banquet hall',
        caption: 'Gathered in gratitude',
        shape: 'wide',
      },
      {
        src: 'gallery/2023-friends.jpg',
        alt: 'Guests sharing a joyful moment together',
        caption: 'Warmth all around',
        shape: 'tall',
      },
      {
        src: 'gallery/florals.svg',
        alt: 'Floral arrangement catching the candlelight',
        caption: 'Quiet details',
        shape: 'square',
      },
      {
        src: 'gallery/guests.svg',
        alt: 'Guests in white sharing a moment',
        caption: 'Old friends, new faces',
        shape: 'wide',
      },
      {
        src: 'gallery/candles.svg',
        alt: 'A cluster of candles on a dressed table',
        caption: 'The first flame',
        shape: 'tall',
      },
      {
        src: 'gallery/toast.svg',
        alt: 'A toast raised among guests',
        caption: 'To peace within',
        shape: 'wide',
      },
    ],
  },
];

/** A small, curated set for the home-page teaser. */
export const GALLERY_PREVIEW: GalleryImage[] = [
  GALLERY_ALBUMS[0].images[0],
  GALLERY_ALBUMS[1].images[0],
  GALLERY_ALBUMS[0].images[1],
  GALLERY_ALBUMS[1].images[1],
  GALLERY_ALBUMS[0].images[4],
];
