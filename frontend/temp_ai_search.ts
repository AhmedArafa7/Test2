import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SearchEngine, SearchInputType, SearchRequestDetail } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencyEgpPipe } from '../../../shared/pipes/currency-egp.pipe';
import { AiService } from '../services/ai.service';

@Component({
  selector: 'app-ai-search',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyEgpPipe],
  template: `
    <div class="min-h-screen bg-white font-sans">
      <!-- Header -->
      <div class="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-8 text-center">
        <h1 class="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">Discover Your Next Space</h1>
        <p class="text-gray-500 text-[15px] max-w-xl mx-auto leading-relaxed">
          Search through curated luxury properties using images, voice, or specific textual requirements.
        </p>
      </div>

      <!-- Search Card -->
      <div class="max-w-3xl mx-auto px-4 md:px-8 mb-16">
        <div class="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <!-- Tab Buttons -->
          <div class="flex border-b border-gray-100">
            @for (mode of modes; track mode.value) {
              <button
                (click)="inputType = mode.value"
                [class]="inputType === mode.value ? 'border-b-2 border-[#0d7a80] text-[#0d7a80]' : 'text-gray-400 hover:text-gray-600'"
                class="flex-1 py-4 px-6 flex items-center justify-center gap-2.5 text-sm font-bold transition-all"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  @if (mode.value === SearchInputType.Image) {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  }
                  @if (mode.value === SearchInputType.Voice) {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  }
                  @if (mode.value === SearchInputType.Text) {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  }
                </svg>
                {{ mode.label }}
              </button>
            }
          </div>

          <div class="p-8">
            @switch (inputType) {
              @case (SearchInputType.Image) {
                <div class="space-y-6">
                  <div
                    (click)="imageInput.click()"
                    (dragover)="$event.preventDefault()"
                    (drop)="onImageDrop($event)"
                    class="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-[#0d7a80]/40 hover:bg-[#0d7a80]/[0.02] transition-all"
                  >
                    @if (imagePreviewUrl()) {
                      <img [src]="imagePreviewUrl()" class="max-h-48 mx-auto rounded-xl object-contain mb-4">
                      <p class="text-[#0d7a80] text-sm font-medium">Image ready — click to change</p>
                    } @else {
                      <div class="w-14 h-14 mx-auto mb-4 bg-[#0d7a80]/10 rounded-xl flex items-center justify-center">
                        <svg class="w-7 h-7 text-[#0d7a80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <p class="text-gray-900 font-medium mb-1">Drag & drop an image here</p>
                      <p class="text-gray-400 text-sm">or click to browse files (JPEG, PNG, WEBP)</p>
                    }
                  </div>
                  <input #imageInput type="file" accept="image/*" (change)="onImageSelect($event)" class="hidden">

                  <div class="relative flex items-center gap-4">
                    <div class="flex-1 h-px bg-gray-100"></div>
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Or Specify Details</span>
                    <div class="flex-1 h-px bg-gray-100"></div>
                  </div>

                  <div class="relative">
                    <div class="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-gray-400">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input [(ngModel)]="imageFileUrl" class="w-full bg-gray-50 border border-gray-200 rounded-xl ps-12 pe-4 py-3.5 text-sm focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none placeholder:text-gray-400" placeholder="e.g. Minimalist villa with infinity pool in Dubai...">
                  </div>
                </div>
              }
              @case (SearchInputType.Voice) {
                <div class="text-center space-y-6 py-4">
                  <div
                    class="border-2 border-dashed rounded-2xl p-12 transition-all"
                    [class]="isRecording() ? 'border-red-300 bg-red-50/50' : 'border-gray-200'"
                  >
                    <button
                      (click)="toggleRecording()"
                      [class]="isRecording() ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/20' : 'bg-[#0d7a80] hover:bg-[#0b6469] shadow-[#0d7a80]/20'"
                      class="w-20 h-20 rounded-full text-white flex items-center justify-center mx-auto transition-all shadow-xl"
                    >
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                    </button>
                    <p class="text-sm mt-6">
                      @if (isRecording()) {
                        <span class="text-red-500 font-bold">Recording... click to stop</span>
                      } @else if (audioBlob()) {
                        <span class="text-[#0d7a80] font-bold">Recording ready ({{ recordingDuration() }}s)</span>
                      } @else {
                        <span class="text-gray-500">Click the microphone to describe what you're looking for</span>
                      }
                    </p>
                  </div>
                  @if (audioBlob()) {
                    <div class="flex items-center gap-3 justify-center">
                      <audio [src]="audioPreviewUrl()" controls class="h-10"></audio>
                      <button (click)="clearRecording()" class="text-xs text-red-500 font-bold hover:underline">Clear</button>
                    </div>
                  }
                </div>
              }
              @case (SearchInputType.Text) {
                <div class="space-y-6">
                  <div class="relative">
                    <div class="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-gray-400">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input
                      [(ngModel)]="rawQuery"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl ps-12 pe-4 py-3.5 text-sm focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none placeholder:text-gray-400"
                      placeholder="e.g. Minimalist villa with infinity pool in Dubai..."
                    >
                  </div>
                </div>
              }
            }

            <!-- Advanced Filters Context -->
            <div class="mt-8 pt-8 border-t border-gray-50">
              <button (click)="showFilters.set(!showFilters())" class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#0d7a80] transition-colors mb-6">
                <svg class="w-4 h-4 transition-transform" [class.rotate-180]="showFilters()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                Additional Search Context (Optional)
              </button>

              @if (showFilters())                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-3">الموقع</label>
                    <div class="grid grid-cols-1 gap-3">
                      <div class="relative" (click)="$event.stopPropagation()">
                        <div (click)="showCityDropdown.set(!showCityDropdown())" 
                             class="bg-gray-50 rounded-xl text-xs font-bold p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all">
                          <span [class.text-gray-400]="!filters.city">{{ filters.city || 'المدينة' }}</span>
                          <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        @if (showCityDropdown()) {
                          <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 max-h-48 overflow-y-auto custom-scrollbar animate-slide-up">
                            @for (city of cities; track city) {
                              <button (click)="selectCity(city)" class="w-full px-6 py-2 text-right hover:bg-gray-50 text-xs font-bold transition-all">{{ city }}</button>
                            }
                          </div>
                        }
                      </div>

                      <div class="relative" (click)="$event.stopPropagation()">
                        <div (click)="showDistrictDropdown.set(!showDistrictDropdown())" 
                             class="bg-gray-50 rounded-xl text-xs font-bold p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all">
                          <span [class.text-gray-400]="!filters.district">{{ filters.district || 'الحي' }}</span>
                          <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        @if (showDistrictDropdown()) {
                          <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 max-h-48 overflow-y-auto custom-scrollbar animate-slide-up">
                            @for (district of getDistricts(); track district) {
                              <button (click)="selectDistrict(district)" class="w-full px-6 py-2 text-right hover:bg-gray-50 text-xs font-bold transition-all">{{ district }}</button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-3">نوع العقار</label>
                    <div class="relative" (click)="$event.stopPropagation()">
                      <div (click)="showTypeDropdown.set(!showTypeDropdown())" 
                           class="bg-gray-50 rounded-xl text-xs font-bold p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all">
                        <span [class.text-gray-400]="!filters.propertyType">{{ getSelectedTypeLabel() }}</span>
                        <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                      @if (showTypeDropdown()) {
                        <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 max-h-48 overflow-y-auto custom-scrollbar animate-slide-up">
                          <button (click)="selectType('')" class="w-full px-6 py-2 text-right hover:bg-gray-50 text-xs font-bold transition-all">كل الأنواع</button>
                          @for (type of propertyTypes; track type.id) {
                            <button (click)="selectType(type.id)" class="w-full px-6 py-2 text-right hover:bg-gray-50 text-xs font-bold transition-all flex items-center justify-between">
                              <span class="opacity-50">{{ type.icon }}</span>
                              <span>{{ type.label }}</span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2">نطاق السعر</label>
                    <div class="grid grid-cols-2 gap-2">
                      <input type="number" [(ngModel)]="filters.minPrice" placeholder="الأدنى" class="bg-gray-50 border-none rounded-xl text-xs font-bold p-3 w-full outline-none">
                      <input type="number" [(ngModel)]="filters.maxPrice" placeholder="الأقصى" class="bg-gray-50 border-none rounded-xl text-xs font-bold p-3 w-full outline-none">
                    </div>
                  </div>
�و</option>
                      <option value="Duplex">دوبلكس</option>
                      <option value="Commercial">تجاري</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2">Bedrooms</label>
                    <div class="grid grid-cols-2 gap-2">
                      <input type="number" [(ngModel)]="filters.minBedrooms" placeholder="Min" class="bg-gray-50 border-none rounded-xl text-xs font-bold p-3 w-full outline-none">
                      <input type="number" [(ngModel)]="filters.maxBedrooms" placeholder="Max" class="bg-gray-50 border-none rounded-xl text-xs font-bold p-3 w-full outline-none">
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Search Button -->
            <button (click)="search()" [disabled]="searching() || !canSearch()"
                    class="w-full bg-[#0d7a80] hover:bg-[#0b6469] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-[#0d7a80]/20 transition-all flex items-center justify-center gap-2 group mt-8 active:scale-[0.98]">
              @if (searching()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {{ searchStepMessage() }}
              } @else {
                Search Properties
                <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              }
            </button>

            @if (searching()) {
              <div class="mt-4">
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-[#0d7a80] to-[#0d7a80]/60 rounded-full transition-all duration-1000 ease-out" [style.width.%]="searchProgress()"></div>
                </div>
                <p class="text-xs text-gray-400 mt-2 text-center">{{ searchStepMessage() }}</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Results -->
      @if (result(); as r) {
        <div class="max-w-3xl mx-auto px-4 md:px-8 pb-16">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Results</h2>
            <span class="text-xs font-bold uppercase tracking-widest text-[#0d7a80] bg-[#0d7a80]/5 px-3 py-1.5 rounded-full">{{ r.status }} — {{ r.resultCount }} found</span>
          </div>

          @if (r.results && r.results.length > 0) {
            <div class="space-y-4">
              @for (sr of r.results; track sr.propertyId) {
                <a [routerLink]="['/properties', sr.propertyId]" class="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-bold text-gray-900 text-lg">{{ sr.snapshotTitle || 'Property' }}</h3>
                      <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{{ sr.snapshotCity }}</span>
                        <span class="font-bold text-gray-900">{{ sr.snapshotPrice | currencyEgp }}</span>
                        <span class="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{{ sr.snapshotStatus }}</span>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-2xl font-black text-[#0d7a80]">{{ (sr.relevanceScore * 100).toFixed(0) }}%</p>
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rank #{{ sr.rank }}</p>
                    </div>
                  </div>
                </a>
              }
            </div>
          } @else {
            <div class="text-center py-16 text-gray-400">
              <p class="text-lg font-medium">No matching properties found.</p>
              <p class="text-sm mt-1">Try different criteria or adjust your search.</p>
            </div>
          }
        </div>
      }

      <!-- Smart Suggestions -->
      @if (!result()) {
        <div class="max-w-5xl mx-auto px-4 md:px-8 pb-20">
          <h2 class="text-xl font-bold text-gray-900 mb-8">Smart Suggestions</h2>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="group cursor-pointer">
              <div class="relative overflow-hidden rounded-2xl mb-4">
                <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" class="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute top-3 left-3">
                  <span class="bg-[#0d7a80] text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">High Match</span>
                </div>
              </div>
              <h3 class="font-bold text-gray-900 mb-1">Contemporary Estates</h3>
              <p class="text-sm text-gray-500 leading-relaxed mb-3">Similar to your previous searches focusing on open-plan living and expansive glass...</p>
              <a routerLink="/properties" class="text-[#0d7a80] text-sm font-bold hover:underline inline-flex items-center gap-1">
                Explore Collection
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>
            <div class="group cursor-pointer">
              <div class="relative overflow-hidden rounded-2xl mb-4">
                <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80" class="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110">
              </div>
              <h3 class="font-bold text-gray-900 mb-1">Minimalist Interiors</h3>
              <p class="text-sm text-gray-500 leading-relaxed mb-3">Properties featuring clean lines, neutral palettes, and maximized natural light.</p>
              <a routerLink="/properties" class="text-[#0d7a80] text-sm font-bold hover:underline inline-flex items-center gap-1">
                Explore Collection
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>
            <div class="group cursor-pointer">
              <div class="relative overflow-hidden rounded-2xl mb-4">
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" class="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110">
              </div>
              <h3 class="font-bold text-gray-900 mb-1">Waterfront Living</h3>
              <p class="text-sm text-gray-500 leading-relaxed mb-3">Exclusive access to premium coastal and riverside properties with private amenities.</p>
              <a routerLink="/properties" class="text-[#0d7a80] text-sm font-bold hover:underline inline-flex items-center gap-1">
                Explore Collection
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Footer -->
      <footer class="py-10 bg-white border-t border-gray-100">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 class="text-lg font-bold text-[#0d4a4e] mb-1">Baytology</h4>
            <p class="text-[12px] text-gray-400">© 2024 Baytology Luxury Real Estate. All rights reserved.</p>
          </div>
          <div class="flex flex-wrap justify-center gap-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <a href="#" class="hover:text-[#0d7a80] transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-[#0d7a80] transition-colors">Terms of Service</a>
            <a href="#" class="hover:text-[#0d7a80] transition-colors">Contact Us</a>
            <a href="#" class="hover:text-[#0d7a80] transition-colors">Careers</a>
            <a href="#" class="hover:text-[#0d7a80] transition-colors">About Baytology</a>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class AiSearchComponent {
  readonly SearchInputType = SearchInputType;

  inputType: SearchInputType = SearchInputType.Image;
  rawQuery = '';
  imageFileUrl = '';
  searching = signal(false);
  searchProgress = signal(0);
  searchStepMessage = signal('Analyzing your query...');
  result = signal<SearchRequestDetail | null>(null);
  showFilters = signal(false);
  filters = {
    city: '',
    district: '',
    propertyType: undefined as any,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minBedrooms: undefined as number | undefined,
    maxBedrooms: undefined as number | undefined,
  };

  modes = [
    { value: SearchInputType.Image, label: 'Image Search' },
    { value: SearchInputType.Voice, label: 'Voice Search' },
    { value: SearchInputType.Text, label: 'Text Search' },
  ];

  isRecording = signal(false);
  audioBlob = signal<Blob | null>(null);
  audioPreviewUrl = signal<string>('');
  recordingDuration = signal(0);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private secondsElapsed = 0;

  imagePreviewUrl = signal<string>('');
  private imageFile: File | null = null;

  constructor(private aiService: AiService, private toast: ToastService) {}

  canSearch(): boolean {
    if (this.inputType === SearchInputType.Text) return !!this.rawQuery.trim();
    if (this.inputType === SearchInputType.Voice) return !!this.audioBlob();
    if (this.inputType === SearchInputType.Image) return !!this.imageFile || !!this.imageFileUrl.trim();
    return false;
  }

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.secondsElapsed = 0;

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioBlob.set(blob);
        this.audioPreviewUrl.set(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());

        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingTimer = setInterval(() => {
        this.secondsElapsed++;
        this.recordingDuration.set(this.secondsElapsed);
      }, 1000);
    } catch {
      this.toast.error('Could not access microphone. Please allow microphone permission.');
    }
  }

  private stopRecording() {
    this.mediaRecorder?.stop();
    this.isRecording.set(false);
  }

  clearRecording() {
    if (this.audioPreviewUrl()) {
      URL.revokeObjectURL(this.audioPreviewUrl());
    }

    this.audioBlob.set(null);
    this.audioPreviewUrl.set('');
    this.recordingDuration.set(0);
  }

  onImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleImageFile(file);
    }
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.handleImageFile(file);
    }
  }

  private handleImageFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Image too large. Max 10MB.');
      return;
    }

    this.imageFile = file;
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  private readonly searchSteps = [
    'Analyzing your query...',
    'Searching properties...',
    'Matching with AI...',
    'Ranking results...',
    'Finalizing...',
  ];

  async search() {
    this.searching.set(true);
    this.result.set(null);
    this.searchProgress.set(5);
    this.searchStepMessage.set(this.searchSteps[0]);

    try {
      let audioFileUrl: string | undefined;
      let imageFileUrl: string | undefined;

      if (this.inputType === SearchInputType.Voice && this.audioBlob()) {
        audioFileUrl = await this.blobToBase64(this.audioBlob()!);
      }

      if (this.inputType === SearchInputType.Image) {
        if (this.imageFile) {
          imageFileUrl = await this.blobToBase64(this.imageFile);
        } else {
          imageFileUrl = this.imageFileUrl.trim() || undefined;
        }
      }

      this.searchProgress.set(15);
      this.searchStepMessage.set(this.searchSteps[1]);

      const response = await this.aiService.createSearch({
        inputType: this.inputType,
        searchEngine: SearchEngine.Hybrid,
        rawQuery: this.inputType === SearchInputType.Text ? this.rawQuery.trim() : undefined,
        audioFileUrl,
        imageFileUrl,
        ...this.filters
      });

      let attempts = 0;
      while (attempts < 20) {
        const progress = Math.min(20 + (attempts * 4), 90);
        const stepIndex = Math.min(Math.floor(attempts / 4) + 2, this.searchSteps.length - 1);
        this.searchProgress.set(progress);
        this.searchStepMessage.set(this.searchSteps[stepIndex]);

        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await this.aiService.getSearchStatus(response.searchRequestId);
        if (status.status !== 'Pending') {
          this.searchProgress.set(100);
          this.searchStepMessage.set('Done!');
          this.result.set(status);
          break;
        }
        attempts++;
      }

      if (!this.result()) {
        this.toast.info('Search is still processing. Check back shortly.');
      }
    } catch (error: any) {
      this.toast.error(error?.error?.detail || 'Search failed');
    } finally {
      this.searching.set(false);
      this.searchProgress.set(0);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
