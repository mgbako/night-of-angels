import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GALLERY_PREVIEW } from '../gallery.config';

@Component({
  selector: 'app-gallery-preview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section section--ink gallery-preview" id="gallery">
      <div class="wrap">
        <div class="gallery-preview__head">
          <span class="eyebrow">The Gallery</span>
          <h2 class="section-title">Moments From Past Evenings</h2>
          <p class="gallery-preview__lead">
            A Night of Angels is the signature dinner of
            <em>Harvest of Internal Peace</em> — the annual harvest programme of
            Saints Peter and Paul Catholic Church, Oke Afa. Step into the rooms
            we’ve shared: candlelight, live strings, and a community dressed in
            white.
          </p>
        </div>

        <div class="collage">
          @for (img of preview; track img.src; let i = $index) {
            <figure class="collage__item" [class.collage__item--feature]="i === 0">
              <img
                [src]="img.src"
                [alt]="img.alt"
                loading="lazy"
                decoding="async"
                width="800"
                height="1000"
              />
              <figcaption>{{ img.caption }}</figcaption>
            </figure>
          }
          <a routerLink="/gallery" class="collage__cta">
            <span class="collage__cta-inner">
              <span class="collage__cta-label">View the Full Gallery</span>
              <span class="collage__cta-arrow" aria-hidden="true">→</span>
            </span>
          </a>
        </div>

        <div class="gallery-preview__foot">
          <a routerLink="/gallery" class="btn btn--outline">Explore Past Editions</a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './gallery-preview.component.scss',
})
export class GalleryPreviewComponent {
  preview = GALLERY_PREVIEW;
}
