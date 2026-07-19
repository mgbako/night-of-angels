import {
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { GALLERY_ALBUMS, GalleryImage } from '../../config/gallery.config';
import { SeoService } from '../../shared/seo.service';

interface FlatImage extends GalleryImage {
  albumId: string;
  albumTitle: string;
  year: string;
}

interface Filter {
  id: string;
  label: string;
}

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [RouterLink, LogoComponent, RevealDirective],
  template: `
    <main class="gallery-page" id="top">
      <!-- Header -->
      <header class="g-hero section section--ink">
        <div class="g-hero__grain" aria-hidden="true"></div>
        <div class="wrap g-hero__inner">
          <app-logo [size]="80" />
          <span class="eyebrow">The Gallery</span>
          <h1 class="g-hero__title">Moments From Past Evenings</h1>
          <p class="g-hero__lead">
            A Night of Angels is the signature dinner of
            <em>Harvest of Internal Peace</em>, the annual harvest programme of
            Saints Peter and Paul Catholic Church, Oke Afa. Every edition gathers
            the community in white — for candlelight, live music, fine dining and
            gratitude. Here is a look back. This year, there’s a seat for you.
          </p>
          <div class="g-hero__ctas">
            <a routerLink="/" fragment="tickets" class="btn btn--solid"
              >Reserve Your Seat</a
            >
            <a routerLink="/" class="btn btn--outline">Back to Home</a>
          </div>
        </div>
      </header>

      <!-- Filter + grid -->
      <section class="section section--panel g-body">
        <div class="wrap">
          <div class="g-filters" role="tablist" aria-label="Filter by edition">
            @for (f of filters; track f.id) {
              <button
                class="g-filter"
                role="tab"
                [class.active]="activeFilter() === f.id"
                [attr.aria-selected]="activeFilter() === f.id"
                (click)="setFilter(f.id)"
              >
                {{ f.label }}
              </button>
            }
          </div>

          <div class="g-grid" appReveal>
            @for (img of visible(); track img.src + $index; let i = $index) {
              <figure
                class="g-tile"
                [class.g-tile--tall]="img.shape === 'tall'"
                [class.g-tile--wide]="img.shape === 'wide'"
                (click)="open(i)"
                tabindex="0"
                role="button"
                [attr.aria-label]="'View photo: ' + img.caption"
                (keydown.enter)="open(i)"
                (keydown.space)="open(i); $event.preventDefault()"
              >
                <img
                  [src]="img.src"
                  [alt]="img.alt"
                  loading="lazy"
                  decoding="async"
                  width="900"
                  height="900"
                />
                <figcaption>
                  <span class="g-tile__year">{{ img.year }}</span>
                  <span class="g-tile__caption">{{ img.caption }}</span>
                </figcaption>
                <span class="g-tile__zoom" aria-hidden="true">+</span>
              </figure>
            }
          </div>
        </div>
      </section>
    </main>

    <!-- Lightbox -->
    @if (lightboxOpen()) {
      <div
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        (click)="close()"
      >
        <button class="lb-close" aria-label="Close" (click)="close()">×</button>
        <button
          class="lb-nav lb-prev"
          aria-label="Previous photo"
          (click)="prev(); $event.stopPropagation()"
        >
          ‹
        </button>

        @if (current(); as img) {
          <figure class="lb-figure" (click)="$event.stopPropagation()">
            <img [src]="img.src" [alt]="img.alt" />
            <figcaption>
              <span class="lb-caption">{{ img.caption }}</span>
              <span class="lb-meta">{{ img.albumTitle }} · {{ img.year }}</span>
              <span class="lb-count"
                >{{ activeIndex() + 1 }} / {{ visible().length }}</span
              >
            </figcaption>
          </figure>
        }

        <button
          class="lb-nav lb-next"
          aria-label="Next photo"
          (click)="next(); $event.stopPropagation()"
        >
          ›
        </button>
      </div>
    }
  `,
  styleUrl: './gallery-page.component.scss',
})
export class GalleryPageComponent implements OnInit {
  private isBrowser: boolean;
  private seo = inject(SeoService);

  constructor(
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.seo.setSEO({
      title: 'Gallery — A Night of Angels | Moments From Past Editions',
      description:
        'Relive past editions of A Night of Angels — the all-white harvest dinner in Lagos. Browse photos of guests, tables and celebrations from previous years.',
      path: '/gallery',
    });
  }

  readonly albums = GALLERY_ALBUMS;

  readonly filters: Filter[] = [
    { id: 'all', label: 'All Editions' },
    ...GALLERY_ALBUMS.map((a) => ({ id: a.id, label: a.year })),
  ];

  activeFilter = signal<string>('all');

  private flat: FlatImage[] = GALLERY_ALBUMS.flatMap((album) =>
    album.images.map((img) => ({
      ...img,
      albumId: album.id,
      albumTitle: album.title,
      year: album.year,
    })),
  );

  visible = computed<FlatImage[]>(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.flat : this.flat.filter((i) => i.albumId === f);
  });

  lightboxOpen = signal(false);
  activeIndex = signal(0);

  current = computed<FlatImage | undefined>(() => this.visible()[this.activeIndex()]);

  setFilter(id: string): void {
    this.activeFilter.set(id);
  }

  open(index: number): void {
    this.activeIndex.set(index);
    this.lightboxOpen.set(true);
    if (this.isBrowser) this.doc.body.style.overflow = 'hidden';
  }

  close(): void {
    this.lightboxOpen.set(false);
    if (this.isBrowser) this.doc.body.style.overflow = '';
  }

  next(): void {
    const len = this.visible().length;
    this.activeIndex.update((i) => (i + 1) % len);
  }

  prev(): void {
    const len = this.visible().length;
    this.activeIndex.update((i) => (i - 1 + len) % len);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.lightboxOpen()) return;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
  }
}
