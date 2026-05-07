import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <div class="flex items-center justify-center gap-2 mt-6">
      <button (click)="pageChange.emit(currentPage() - 1)" [disabled]="currentPage() <= 1"
        class="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
      @for (page of pages(); track page) {
        <button (click)="pageChange.emit(page)"
          [class]="page === currentPage() ? 'btn-primary !py-1.5 !px-3 text-sm' : 'btn-ghost text-sm'">
          {{ page }}
        </button>
      }
      <button (click)="pageChange.emit(currentPage() + 1)" [disabled]="currentPage() >= totalPages()"
        class="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
    </div>
  `,
})
export class PaginationComponent {
  currentPage = input(1);
  totalPages = input(1);
  pageChange = output<number>();

  pages = () => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
}
