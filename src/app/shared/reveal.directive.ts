import {
  Directive,
  ElementRef,
  OnDestroy,
  Renderer2,
  afterNextRender,
  inject,
} from '@angular/core';

/**
 * Adds a scroll-triggered fade/rise reveal to the host element.
 * Respects prefers-reduced-motion (reveals immediately).
 *
 * Browser-only: during server prerender the host stays plainly visible
 * (no 'reveal' hide class is applied), so crawlers and no-JS clients see
 * the content. The animation is wired up in the browser via afterNextRender.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      const host = this.el.nativeElement as HTMLElement;
      this.renderer.addClass(host, 'reveal');

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !('IntersectionObserver' in window)) {
        this.renderer.addClass(host, 'in');
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.renderer.addClass(host, 'in');
              this.observer?.unobserve(host);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      this.observer.observe(host);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
