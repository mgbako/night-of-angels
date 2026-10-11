import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from './admin-icon.component';

/**
 * Full pager used across the admin list views: first/prev/next/last,
 * a jump-to-page field, and a page-size selector. Purely presentational —
 * the parent owns `page`/`pageSize` state and reacts to the two outputs.
 */
@Component({
  selector: 'adm-paginator',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    @if (total > 0) {
      <div class="adm-pagination">
        <div class="pg-size">
          <label>
            <span>Show</span>
            <select [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
              @for (opt of pageSizeOptions; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
            <span>per page</span>
          </label>
          <span class="pg-size__total">{{ total }} total</span>
        </div>

        <div class="adm-pagination__controls">
          <button (click)="go(1)" [disabled]="page === 1" aria-label="First page" title="First page">
            <adm-icon name="chevrons-left" [size]="15" />
          </button>
          <button (click)="go(page - 1)" [disabled]="page === 1" aria-label="Previous page" title="Previous page">
            <adm-icon name="chevron-left" [size]="15" />
          </button>

          <span class="pg-jump">
            <span>Page</span>
            <input
              type="number"
              min="1"
              [max]="totalPages"
              [ngModel]="jumpValue()"
              (ngModelChange)="jumpValue.set($event)"
              (keydown.enter)="commitJump()"
              (blur)="commitJump()"
              aria-label="Jump to page"
            />
            <span>of {{ totalPages }}</span>
          </span>

          <button (click)="go(page + 1)" [disabled]="page === totalPages" aria-label="Next page" title="Next page">
            <adm-icon name="chevron-right" [size]="15" />
          </button>
          <button (click)="go(totalPages)" [disabled]="page === totalPages" aria-label="Last page" title="Last page">
            <adm-icon name="chevrons-right" [size]="15" />
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pg-size {
        display: flex;
        align-items: center;
        gap: 0.8rem;
      }
      .pg-size label {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
      .pg-size select {
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--adm-line);
        border-radius: 8px;
        background: var(--adm-surface);
        color: var(--adm-ink);
        font: inherit;
        font-size: 0.84rem;
        cursor: pointer;
      }
      .pg-size select:hover {
        border-color: var(--adm-gold);
      }
      .pg-size__total {
        opacity: 0.8;
      }
      .pg-jump {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0 0.2rem;
      }
      .pg-jump input {
        width: 3.2rem;
        padding: 0.35rem 0.4rem;
        border: 1px solid var(--adm-line);
        border-radius: 8px;
        background: var(--adm-surface);
        color: var(--adm-ink);
        font: inherit;
        font-size: 0.84rem;
        text-align: center;
      }
      .pg-jump input:focus {
        outline: none;
        border-color: var(--adm-gold);
      }
      /* Hide the spinner so the field reads like a compact page box. */
      .pg-jump input::-webkit-outer-spin-button,
      .pg-jump input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .pg-jump input {
        -moz-appearance: textfield;
      }
    `,
  ],
})
export class AdminPaginatorComponent implements OnChanges {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() total = 0;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  jumpValue = signal(1);

  ngOnChanges(): void {
    this.jumpValue.set(this.page);
  }

  go(target: number): void {
    const clamped = Math.min(Math.max(1, Math.round(target)), this.totalPages);
    this.jumpValue.set(clamped);
    if (clamped !== this.page) this.pageChange.emit(clamped);
  }

  commitJump(): void {
    const raw = this.jumpValue();
    const v = raw == null ? NaN : Number(raw);
    if (Number.isFinite(v) && v > 0) this.go(v);
    else this.jumpValue.set(this.page);
  }

  onPageSizeChange(size: string): void {
    const n = Number(size);
    if (Number.isFinite(n) && n > 0) this.pageSizeChange.emit(n);
  }
}
