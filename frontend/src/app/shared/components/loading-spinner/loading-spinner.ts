import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-20 gap-6">
      <div class="relative w-16 h-16">
        <!-- Outer Ring -->
        <div class="absolute inset-0 border-4 border-[#0d7a80]/5 rounded-full"></div>
        <!-- Inner Spinning Ring -->
        <div class="absolute inset-0 border-4 border-transparent border-t-[#0d7a80] rounded-full animate-spin shadow-lg shadow-[#0d7a80]/20"></div>
        <!-- Pulse Core -->
        <div class="absolute inset-4 bg-[#0d7a80]/10 rounded-full animate-pulse"></div>
      </div>
      @if (message()) {
        <div class="flex flex-col items-center gap-2 animate-pulse">
          <p class="text-[10px] font-black text-[#0d7a80] uppercase tracking-[0.4em]">{{ message() }}</p>
          <div class="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#0d7a80]/30 to-transparent"></div>
        </div>
      }
    </div>
  `,
})
export class LoadingSpinnerComponent {
  message = input('');
}
