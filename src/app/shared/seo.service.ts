import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  /** Full page <title>. Also used for og:title / twitter:title. */
  title: string;
  /** 120–155 char meta description with the primary keyword near the start. */
  description: string;
  /** Path only, e.g. '/gallery' (leave blank for home). */
  path?: string;
  /** Absolute or root-relative image; falls back to the default OG image. */
  image?: string;
  /** og:type — 'website' (default), 'article', 'event'… */
  type?: string;
  keywords?: string;
}

/**
 * Per-page SEO: title, description, canonical, Open Graph and Twitter tags.
 * Runs during SSR/prerender (called from component ngOnInit) so the tags are
 * baked into the static HTML Googlebot sees first.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleSvc = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  static readonly BASE_URL = 'https://nightofangels2026.com';
  static readonly SITE_NAME = 'A Night of Angels';
  static readonly OG_IMAGE = '/og-image.jpg';

  setSEO(config: SeoConfig): void {
    const url = `${SeoService.BASE_URL}${config.path ?? ''}`;
    const image = this.absolute(config.image ?? SeoService.OG_IMAGE);

    this.titleSvc.setTitle(config.title);
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }
    this.setCanonical(url);

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:type', content: config.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SeoService.SITE_NAME });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private absolute(src: string): string {
    return src.startsWith('http') ? src : `${SeoService.BASE_URL}${src}`;
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
