import { Component, signal, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-confirm-email', standalone: true, imports: [RouterLink, TranslateModule], template: `
  <div class="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4 font-sans">
    <div class="bg-white p-12 w-full max-w-md rounded-[40px] border border-gray-100 shadow-sm animate-fade-in text-center">
      @if (loading()) { 
        <div class="space-y-6">
          <div class="w-16 h-16 border-4 border-[#0d7a80]/10 border-t-[#0d7a80] rounded-full animate-spin mx-auto"></div>
          <p class="text-gray-500 font-bold">{{ 'AUTH.CONFIRM_EMAIL.LOADING' | translate }}</p> 
        </div>
      }
      @else if (success()) { 
        <div class="animate-in zoom-in-95 duration-500">
          <div class="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 class="text-3xl font-black text-gray-900 mb-4">{{ 'AUTH.CONFIRM_EMAIL.SUCCESS_TITLE' | translate }}</h2>
          <p class="text-gray-500 font-bold mb-10">{{ 'AUTH.CONFIRM_EMAIL.SUCCESS_DESC' | translate }}</p>
          <a routerLink="/auth/login" class="w-full bg-[#0d7a80] hover:bg-[#0b6469] text-white font-black py-4.5 px-10 rounded-2xl shadow-xl shadow-[#0d7a80]/20 transition-all inline-block active:scale-95">
            {{ 'AUTH.CONFIRM_EMAIL.GOTO_LOGIN' | translate }}
          </a> 
        </div>
      }
      @else { 
        <div class="animate-in zoom-in-95 duration-500">
          <div class="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <h2 class="text-3xl font-black text-gray-900 mb-4">{{ 'AUTH.CONFIRM_EMAIL.FAILED_TITLE' | translate }}</h2>
          <p class="text-gray-500 font-bold">{{ 'AUTH.CONFIRM_EMAIL.FAILED_DESC' | translate }}</p>
          <a routerLink="/auth/login" class="mt-10 text-[#0d7a80] font-black hover:underline block">
            {{ 'AUTH.FORGOT_PASSWORD.RETURN_LOGIN' | translate }}
          </a>
        </div>
      }
    </div>
  </div>` })
export class ConfirmEmailComponent implements OnInit {
  loading = signal(true); success = signal(false);
  constructor(private auth: AuthService, private route: ActivatedRoute) {}
  async ngOnInit() { const userId = this.route.snapshot.queryParams['userId']; const token = this.route.snapshot.queryParams['token']; if (!userId || !token) { this.loading.set(false); return; } try { await this.auth.confirmEmail({ userId, token }); this.success.set(true); } catch {} finally { this.loading.set(false); } }
}
