import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Render modes for the static build.
 * - Ticket pages are per-code (dynamic) -> client-rendered, not prerendered.
 * - Admin is private -> client-rendered, so no admin HTML is emitted publicly.
 * - Everything else (marketing pages) is prerendered to static HTML for SEO.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'tickets/**', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
