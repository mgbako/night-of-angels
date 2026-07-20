/**
 * Gallery content for past editions of the dinner.
 *
 * A Night of Angels is the signature dinner of the annual harvest programme
 * "Harvest of Everlasting Peace" by Saints Peter and Paul Catholic Church, Oke Afa.
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
    title: 'Harvest Dinner 2025',
    blurb:
      'Gold and terracotta, a full room, and a community giving thanks together.',
    images: [
      {
        src: 'gallery/2025-couple.jpg',
        alt: 'A couple dressed in rich terracotta and gold at the dinner',
        caption: 'Dressed for the evening',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-gold.jpg',
        alt: 'A guest in a gold outfit at the sponsors backdrop',
        caption: 'Golden elegance',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-arrival.jpg',
        alt: 'A guest arriving in terracotta lace at the church backdrop',
        caption: 'Making an entrance',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-guests.jpg',
        alt: 'Three guests in coordinated terracotta attire',
        caption: 'Friends of the harvest',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-hall.jpg',
        alt: 'The banquet hall dressed in orange and gold, tables set for guests',
        caption: 'The room, set',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-mermaid.jpg',
        alt: 'A guest in a fitted gold mermaid gown on the runway',
        caption: 'Golden hour',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-native.jpg',
        alt: 'A gentleman in terracotta native attire holding a grey hat',
        caption: 'Dressed to receive',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-runway.jpg',
        alt: 'A guest in a shimmering terracotta gown by the sponsors backdrop',
        caption: 'Making an entrance',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-gowngold.jpg',
        alt: 'A guest in a gold gown on the red carpet',
        caption: 'Gold on the carpet',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-redhat.jpg',
        alt: 'A couple in coral, the gentleman in a red fedora',
        caption: 'A perfect pair',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-glam.jpg',
        alt: 'A couple posing together by the church backdrop',
        caption: 'Side by side',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-pair.jpg',
        alt: 'A couple sharing a tender moment during the evening',
        caption: 'A tender moment',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-smile.jpg',
        alt: 'A guest in a patterned outfit holding a straw hat, all smiles',
        caption: 'All smiles',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-gents.jpg',
        alt: 'Two gentlemen in matching terracotta native attire',
        caption: 'The gentlemen',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-pose.jpg',
        alt: 'A guest striking a pose on the stage',
        caption: 'Owning the moment',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-asoebi.jpg',
        alt: 'A group of friends in coordinated orange aso-ebi',
        caption: 'Friends of the harvest',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-friends.jpg',
        alt: 'Guests gathered together by the sponsors backdrop',
        caption: 'Good company',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-host.jpg',
        alt: 'The host addressing the room, microphone in hand',
        caption: 'On the mic',
        shape: 'wide',
      },
      {
        src: 'gallery/2025-masquerade.jpg',
        alt: 'A cultural dancer in a bright feathered masquerade costume',
        caption: 'A taste of tradition',
        shape: 'tall',
      },
      {
        src: 'gallery/2025-feast.jpg',
        alt: 'Chafing dishes of jollof, noodles and more along the buffet',
        caption: 'The feast',
        shape: 'wide',
      },
    ],
  },
  {
    id: '2024',
    year: '2024',
    title: 'Harvest Dinner 2024',
    blurb:
      'An evening in purple and lilac — fine dining, good company and gratitude.',
    images: [
      {
        src: 'gallery/2024-champagne.jpg',
        alt: 'A couple at their table with champagne chilling on ice',
        caption: 'Raising a glass',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-fedora.jpg',
        alt: 'A couple seated together, the gentleman in a black fedora',
        caption: 'Hats off to the evening',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-glow.jpg',
        alt: 'A couple holding glow sticks during the celebration',
        caption: 'Lighting up the night',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-stripes.jpg',
        alt: 'A guest in a bright striped shirt, glass in hand',
        caption: 'In good spirits',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-couple-floral.jpg',
        alt: 'A couple seated side by side, the lady in floral organza',
        caption: 'Side by side',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-sisters.jpg',
        alt: 'Two guests dressed in matching purple',
        caption: 'Dressed in purple',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-pendant.jpg',
        alt: 'A guest in a grey outfit with a gold pendant',
        caption: 'Every detail considered',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-hat.jpg',
        alt: 'A couple smiling together, the gentleman in a pale fedora',
        caption: 'Smiles all round',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-plaid.jpg',
        alt: 'A guest in a checked shirt during the evening',
        caption: 'A quiet moment',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-friends-two.jpg',
        alt: 'Two friends sharing a joyful moment together',
        caption: 'Together for the evening',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-fringe.jpg',
        alt: 'A couple seated together, the lady in a lilac fringed dress',
        caption: 'An elegant pair',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-purple.jpg',
        alt: 'A guest dressed in purple for the harvest dinner',
        caption: 'Dressed for the harvest',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-toast.jpg',
        alt: 'A couple seated behind lilac floral centerpieces',
        caption: 'Among the flowers',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-gentleman.jpg',
        alt: 'A gentleman in a black tuxedo by the floral arch',
        caption: 'Sharp for the evening',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-mermaid.jpg',
        alt: 'A guest in a fitted lilac gown at the arch',
        caption: 'Elegance in lilac',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-lady.jpg',
        alt: 'A guest in a flowing lilac gown',
        caption: 'Poised and proud',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-seated.jpg',
        alt: 'A guest seated in a tailored tuxedo by the arch',
        caption: 'At ease',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-arch-couple.jpg',
        alt: 'A couple by the floral arch, the gentleman in a tuxedo',
        caption: 'By the arch',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-vibrant.jpg',
        alt: 'A guest in a vibrant swirl-patterned gown',
        caption: 'A splash of colour',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-patterned.jpg',
        alt: 'A guest in a patterned top and white trousers',
        caption: 'Effortless style',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-gown.jpg',
        alt: 'A guest in an embellished purple gown',
        caption: 'Dressed to the nines',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-couple-red.jpg',
        alt: 'A gentleman greeting his partner in a playful pose by the arch',
        caption: 'A gallant greeting',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-group.jpg',
        alt: 'A group of friends gathered in purple and lilac',
        caption: 'The ladies of the evening',
        shape: 'wide',
      },
      {
        src: 'gallery/2024-rose.jpg',
        alt: 'A guest in a rose-pink outfit',
        caption: 'Bold in rose',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-embrace.jpg',
        alt: 'A couple side by side, the gentleman in rose-pink',
        caption: 'Together',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-floral-jacket.jpg',
        alt: 'A guest in a floral dinner jacket',
        caption: 'Statement style',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-cape.jpg',
        alt: 'A guest in a caped purple and gold gown',
        caption: 'Sweeping elegance',
        shape: 'tall',
      },
      {
        src: 'gallery/2024-twoofus.jpg',
        alt: 'A couple by the arch, the lady in purple sequins',
        caption: 'Two of us',
        shape: 'tall',
      },
    ],
  },
  {
    id: '2023',
    year: '2023',
    title: 'Harvest Dinner 2023',
    blurb:
      'Old friends and new faces, gathered for a warm night of thanksgiving.',
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
    ],
  },
  {
    id: '2020',
    year: '2020',
    title: 'Where It Began',
    blurb:
      'The very first Night of Angels — the gathering that started it all.',
    images: [
      {
        src: 'gallery/2020-friends.jpg',
        alt: 'Two guests in navy suits and branded caps at the dinner',
        caption: 'In good company',
        shape: 'tall',
      },
      {
        src: 'gallery/2020-hall.jpg',
        alt: 'The hall dressed in yellow and black with blossom centerpieces',
        caption: 'The hall aglow',
        shape: 'wide',
      },
      {
        src: 'gallery/2020-table.jpg',
        alt: 'A dinner table set with black linen, gold chargers and a blossom centerpiece',
        caption: 'Every detail considered',
        shape: 'tall',
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
