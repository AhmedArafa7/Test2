import { Component, signal, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AiService } from '../services/ai.service';
import { RecommendationRequestDetail } from '../../../core/models';
import { CurrencyEgpPipe } from '../../../shared/pipes/currency-egp.pipe';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-recommendations', standalone: true,
  imports: [FormsModule, RouterLink, CurrencyEgpPipe, TranslateModule],
  template: `
    <div class="min-h-screen bg-[#f8f9fa] font-sans py-16 px-6">
      <div class="max-w-4xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-12">
          <div class="mb-4">
            <span class="bg-[#0d7a80]/10 text-[#0d7a80] text-[10px] font-black tracking-[0.3em] uppercase px-6 py-2.5 rounded-full">
              💡 {{ 'AI.BADGE' | translate }}
            </span>
          </div>
          <h1 class="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
            {{ 'AI.RECOMMENDATIONS.TITLE_PREFIX' | translate }} <span class="text-[#0d7a80]">{{ 'AI.RECOMMENDATIONS.TITLE_HIGHLIGHT' | translate }}</span>
          </h1>
          <p class="text-gray-500 text-sm font-medium max-w-lg mx-auto leading-relaxed">
            {{ 'AI.RECOMMENDATIONS.DESC' | translate }}
          </p>
        </div>

        <!-- Controls Card -->
        <div class="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 mb-8">
          <div class="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6 ltr:flex-row rtl:flex-row-reverse">
            <div class="w-10 h-10 bg-[#0d7a80]/10 text-[#0d7a80] rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            </div>
            <h3 class="text-xl font-black text-gray-900">{{ 'AI.RECOMMENDATIONS.SETTINGS_TITLE' | translate }}</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ltr:text-left rtl:text-right">
            <!-- Source Type -->
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{{ 'AI.RECOMMENDATIONS.SOURCE_LABEL' | translate }}</label>
              <div class="relative">
                <select [(ngModel)]="sourceType" 
                        class="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 appearance-none focus:border-[#0d7a80] focus:ring-1 focus:ring-[#0d7a80] outline-none transition-all cursor-pointer">
                  <option value="user_history">{{ 'AI.RECOMMENDATIONS.SOURCE_HISTORY' | translate }}</option>
                  <option value="property">{{ 'AI.RECOMMENDATIONS.SOURCE_PROPERTY' | translate }}</option>
                </select>
                <svg class="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>

            <!-- Count -->
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{{ 'AI.RECOMMENDATIONS.COUNT_LABEL' | translate }}</label>
              <input type="number" [(ngModel)]="topN" min="1" max="20"
                     class="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:border-[#0d7a80] focus:ring-1 focus:ring-[#0d7a80] outline-none transition-all">
            </div>
          </div>

          @if (sourceType === 'property') {
            <div class="mb-8 ltr:text-left rtl:text-right">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{{ 'AI.RECOMMENDATIONS.ENTITY_ID_LABEL' | translate }}</label>
              <input [(ngModel)]="sourceEntityId" [placeholder]="'AI.RECOMMENDATIONS.ENTITY_ID_PLACEHOLDER' | translate"
                     class="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:border-[#0d7a80] focus:ring-1 focus:ring-[#0d7a80] outline-none transition-all">
            </div>
          }

          <button (click)="getRecommendations()" [disabled]="loading()" 
                  class="w-full bg-[#0d7a80] hover:bg-[#0b6469] text-white font-black py-5 px-10 rounded-2xl shadow-xl shadow-[#0d7a80]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (loading()) {
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <span>{{ 'AI.RECOMMENDATIONS.SEARCHING' | translate }}</span>
            } @else {
              <svg class="w-5 h-5 ltr:rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
              <span>{{ 'AI.RECOMMENDATIONS.SUBMIT_BTN' | translate }}</span>
            }
          </button>
        </div>

        <!-- Results -->
        @if (result(); as r) {
          <div class="space-y-6">
            <div class="flex items-center justify-between mb-4 ltr:flex-row rtl:flex-row-reverse">
              <h2 class="text-2xl font-black text-gray-900">{{ 'AI.RECOMMENDATIONS.RESULTS_TITLE' | translate }}</h2>
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-2 rounded-full">
                {{ r.results.length }} {{ 'AI.RECOMMENDATIONS.RESULTS_COUNT' | translate }}
              </span>
            </div>

            @for (rec of r.results; track rec.rank) {
              <a [routerLink]="rec.recommendedPropertyId ? ['/properties', rec.recommendedPropertyId] : []" 
                 class="block bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#0d7a80]/20 transition-all group">
                <div class="flex items-center justify-between ltr:flex-row rtl:flex-row-reverse">
                  <div class="flex items-center gap-5 ltr:flex-row rtl:flex-row-reverse">
                    <div class="w-12 h-12 rounded-2xl bg-[#0d7a80]/10 text-[#0d7a80] flex items-center justify-center font-black text-lg shrink-0">
                      #{{ rec.rank }}
                    </div>
                    <div class="ltr:text-left rtl:text-right">
                      <h3 class="font-black text-gray-900 text-base group-hover:text-[#0d7a80] transition-colors">
                        {{ rec.snapshotTitle || rec.externalReference || ('COMMON.PROPERTY' | translate) }}
                      </h3>
                      @if (rec.snapshotPrice) {
                        <p class="text-sm text-gray-500 font-bold mt-1">{{ rec.snapshotPrice | currencyEgp }}</p>
                      }
                    </div>
                  </div>

                  <div class="flex items-center gap-4 ltr:flex-row rtl:flex-row-reverse">
                    <div class="text-center">
                      <p class="text-xl font-black text-[#0d7a80]">{{ (rec.similarityScore * 100).toFixed(0) }}%</p>
                      <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">{{ 'AI.RECOMMENDATIONS.MATCH_LABEL' | translate }}</p>
                    </div>
                    <svg class="w-5 h-5 text-gray-300 group-hover:text-[#0d7a80] transition-colors ltr:rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                  </div>
                </div>
              </a>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!result() && !loading()) {
          <div class="bg-white rounded-[40px] p-16 shadow-sm border border-gray-100 text-center">
            <div class="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
            <h3 class="text-xl font-black text-gray-900 mb-2">{{ 'AI.RECOMMENDATIONS.EMPTY_TITLE' | translate }}</h3>
            <p class="text-gray-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">{{ 'AI.RECOMMENDATIONS.EMPTY_DESC' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class RecommendationsComponent {
  sourceType = 'user_history'; sourceEntityId = ''; topN = 10;
  loading = signal(false); result = signal<RecommendationRequestDetail | null>(null);
  private translate = inject(TranslateService);
  constructor(private aiService: AiService, private toast: ToastService) {}
  async getRecommendations() {
    this.loading.set(true);
    try {
      const res = await this.aiService.createRecommendation({ sourceEntityType: this.sourceType, sourceEntityId: this.sourceEntityId || undefined, topN: this.topN });
      let attempts = 0;
      while (attempts < 20) { await new Promise(r => setTimeout(r, 2000)); const status = await this.aiService.getRecommendationStatus(res.requestId); if (status.status !== 'Pending') { this.result.set(status); break; } attempts++; }
    } catch (e: any) { this.toast.error(e?.error?.detail || this.translate.instant('AI.RECOMMENDATIONS.ERROR_GENERIC')); } finally { this.loading.set(false); }
  }
}
