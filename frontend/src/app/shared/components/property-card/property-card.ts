import { Component, input, output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PropertyListItem } from '../../../core/models';
import { CurrencyEgpPipe } from '../../pipes/currency-egp.pipe';
import { buildPropertyPlaceholder, getPropertyImageUrl } from '../../../core/utils/media';
import { LocalImageService } from '../../../core/services/local-image.service';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [RouterLink, CurrencyEgpPipe],
  template: `
    <a [routerLink]="['/properties', property().id]" class="glass-card-hover block overflow-hidden group">
      <!-- Image -->
      <div class="relative h-48 overflow-hidden">
        <img [src]="getImageUrl()" [alt]="property().title"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          (error)="onImageError($event)">
        <!-- Badges -->
        <div class="absolute top-3 left-3 flex gap-2">
          <span class="badge-primary">{{ property().listingType }}</span>
          @if (property().isFeatured) {
            <span class="badge-accent">⭐ Featured</span>
          }
        </div>
        <!-- Save Button -->
        @if (showSave()) {
          <button (click)="onSave($event)" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-all border border-white/20 shadow-lg group/heart">
            <svg class="w-5 h-5 transition-all duration-300" 
                 [class.fill-red-500]="saved()" 
                 [class.text-red-500]="saved()" 
                 [class.text-white]="!saved()" 
                 [class.group-hover/heart:scale-110]="true"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        }
        <!-- Status -->
        <div class="absolute bottom-3 right-3">
          <span [class]="'status-' + property().status.toLowerCase()">{{ property().status }}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
        <h3 class="font-semibold text-white truncate group-hover:text-primary-light transition-colors">{{ property().title }}</h3>
        <p class="text-primary font-bold text-lg mt-1">{{ property().price | currencyEgp }}</p>

        <div class="flex items-center gap-4 mt-3 text-sm text-gray-400">
          <span class="flex items-center gap-1">🛏️ {{ property().bedrooms }}</span>
          <span class="flex items-center gap-1">🚿 {{ property().bathrooms }}</span>
          <span class="flex items-center gap-1">📐 {{ property().area }} m²</span>
        </div>

        @if (property().city || property().district) {
          <p class="text-xs text-gray-500 mt-2 flex items-center gap-1">
            📍 {{ property().district ? property().district + ', ' : '' }}{{ property().city }}
          </p>
        }
      </div>
    </a>
  `,
})
export class PropertyCardComponent {
  property = input.required<PropertyListItem>();
  showSave = input(false);
  saved = input(false);
  saveToggle = output<string>();
  
  private localImageService = inject(LocalImageService);

  getImageUrl(): string {
    // 1. Backend primary image
    if (this.property().primaryImageUrl) {
      return getPropertyImageUrl(this.property().primaryImageUrl, this.property().title);
    }
    // 2. Cached thumbnail from localStorage
    const thumb = this.localImageService.getThumbnail(this.property().id);
    if (thumb) return thumb;
    // 3. Fallback SVG placeholder
    return buildPropertyPlaceholder(this.property().title);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = buildPropertyPlaceholder(this.property().title);
  }

  onSave(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.saveToggle.emit(this.property().id);
  }
}
