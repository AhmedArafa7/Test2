import { Component, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
    FB?: {
      init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: { authResponse?: { accessToken?: string } }) => void, options?: { scope?: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#f8f9fa] font-sans p-6 selection:bg-[#0d7a80]/20">
      <!-- Background Visuals -->
      <div class="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style="background-image: radial-gradient(#0d7a80 1px, transparent 1px); background-size: 40px 40px;"></div>

      <div class="w-full max-w-[480px] relative z-10">
        <!-- Logo Area -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-3 mb-6 group cursor-pointer" routerLink="/">
            <div class="w-12 h-12 bg-[#0d7a80] rounded-2xl flex items-center justify-center shadow-xl shadow-[#0d7a80]/20 transition-transform group-hover:rotate-6">
              <span class="text-white text-2xl font-black italic">B</span>
            </div>
            <span class="text-3xl font-black tracking-tighter text-gray-900">baytology</span>
          </div>
          <h2 class="text-2xl font-black text-gray-900 mb-2">{{ 'AUTH.LOGIN.TITLE' | translate }}</h2>
          <p class="text-gray-400 font-bold text-sm tracking-wide">{{ 'AUTH.LOGIN.SUBTITLE' | translate }}</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-gray-100 p-10 md:p-14 transition-all hover:shadow-[0_30px_80px_rgba(0,0,0,0.05)]">
          <form (ngSubmit)="login()" class="space-y-8">
            <div class="space-y-3">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ltr:ml-1 rtl:mr-1">{{ 'AUTH.LOGIN.EMAIL_LABEL' | translate }} <span class="text-red-500">*</span></label>
              <div class="relative group">
                <input type="email" [(ngModel)]="email" name="email" 
                       class="w-full bg-gray-50 border border-transparent text-gray-900 rounded-[20px] px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 outline-none transition-all placeholder:text-gray-300" 
                       [placeholder]="'AUTH.LOGIN.EMAIL_PLACEHOLDER' | translate" required>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex justify-between items-center px-1">
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{{ 'AUTH.LOGIN.PASSWORD_LABEL' | translate }} <span class="text-red-500">*</span></label>
                <a routerLink="/auth/forgot-password" class="text-[11px] font-black text-[#0d7a80] hover:underline">{{ 'AUTH.LOGIN.FORGOT_PASSWORD' | translate }}</a>
              </div>
              <div class="relative group">
                <input type="password" [(ngModel)]="password" name="password" 
                       class="w-full bg-gray-50 border border-transparent text-gray-900 rounded-[20px] px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 outline-none transition-all placeholder:text-gray-300" 
                       [placeholder]="'AUTH.LOGIN.PASSWORD_PLACEHOLDER' | translate" required>
              </div>
            </div>

            <button type="submit" [disabled]="loading()" 
                    class="w-full bg-[#0d7a80] hover:bg-[#0b6469] disabled:opacity-70 text-white font-black py-4.5 rounded-[22px] shadow-2xl shadow-[#0d7a80]/20 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]">
              @if (loading()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              }
              {{ 'AUTH.LOGIN.LOGIN_BTN' | translate }}
              <svg class="w-5 h-5 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
          </form>

          <div class="relative my-12">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-50"></div></div>
            <div class="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]"><span class="bg-white px-6 text-gray-300">{{ 'AUTH.LOGIN.OR_CONTINUE' | translate }}</span></div>
          </div>

          <div class="grid grid-cols-2 gap-5">
            <button (click)="loginWithGoogle()" class="flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 rounded-[20px] hover:bg-gray-100 transition-all font-black text-[11px] text-gray-700 active:scale-95">
              <img src="https://www.google.com/favicon.ico" class="w-4 h-4 grayscale group-hover:grayscale-0">
              {{ 'AUTH.LOGIN.GOOGLE' | translate }}
            </button>
            <button (click)="loginWithFacebook()" class="flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 rounded-[20px] hover:bg-gray-100 transition-all font-black text-[11px] text-gray-700 active:scale-95">
              <svg class="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              {{ 'AUTH.LOGIN.FACEBOOK' | translate }}
            </button>
          </div>
        </div>

        <p class="text-center text-sm font-bold text-gray-400 mt-12">
          {{ 'AUTH.LOGIN.NO_ACCOUNT' | translate }} 
          <a routerLink="/auth/register" class="text-[#0d7a80] hover:underline transition-all">{{ 'AUTH.LOGIN.JOIN_NOW' | translate }}</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeGoogleSdk();
    this.initializeFacebookSdk();

    // Pre-fill email if passed from register page
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) {
      this.email = emailParam;
    }
  }

  async login() {
    this.loading.set(true);
    try {
      await this.auth.login({ email: this.email, password: this.password });
      this.toast.success('AUTH.LOGIN.SUCCESS');
      this.router.navigate(['/']);
    } catch (e: any) {
      let errorMessage = 'AUTH.LOGIN.ERROR';
      
      if (e?.error?.detail) {
        errorMessage = e.error.detail;
      } else if (e?.error?.errors) {
        const firstErrorKey = Object.keys(e.error.errors)[0];
        const firstErrorMessages = e.error.errors[firstErrorKey];
        errorMessage = Array.isArray(firstErrorMessages) ? firstErrorMessages[0] : firstErrorMessages;
      } else if (e?.error?.title) {
        errorMessage = e.error.title;
      }

      this.toast.error(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }

  loginWithGoogle() {
    if (!environment.googleClientId) {
      this.toast.error('AUTH.LOGIN.GOOGLE_UNAVAILABLE');
      return;
    }
    if (!window.google?.accounts?.id) {
      this.toast.error('AUTH.LOGIN.GOOGLE_LOADING');
      return;
    }
    window.google.accounts.id.prompt();
  }

  loginWithFacebook() {
    if (!environment.facebookAppId) {
      this.toast.error('AUTH.LOGIN.FB_UNAVAILABLE');
      return;
    }
    if (!window.FB) {
      this.toast.error('AUTH.LOGIN.FB_LOADING');
      return;
    }
    window.FB.login(async response => {
      const accessToken = response.authResponse?.accessToken;
      if (!accessToken) {
        this.toast.error('AUTH.LOGIN.FB_CANCELLED');
        return;
      }
      await this.finishExternalLogin('Facebook', accessToken);
    }, { scope: 'public_profile,email' });
  }

  private initializeGoogleSdk() {
    if (!environment.googleClientId) return;
    this.loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        window.google?.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: async ({ credential }) => {
            if (!credential) return;
            await this.finishExternalLogin('Google', credential);
          },
        });
      })
      .catch(() => {});
  }

  private initializeFacebookSdk() {
    if (!environment.facebookAppId) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: environment.facebookAppId,
        cookie: true,
        xfbml: false,
        version: 'v20.0',
      });
    };
    this.loadScript('https://connect.facebook.net/en_US/sdk.js').catch(() => {});
  }

  private async finishExternalLogin(provider: 'Google' | 'Facebook', idToken: string) {
    this.loading.set(true);
    try {
      const response = await this.auth.externalLogin({ provider, idToken });
      if (response.isNewUser) {
        this.toast.success('AUTH.LOGIN.EXTERNAL_SUCCESS_NEW');
      } else {
        this.toast.success('AUTH.LOGIN.EXTERNAL_SUCCESS_OLD');
      }
      await this.router.navigate(['/']);
    } catch (error: any) {
      this.toast.error('AUTH.LOGIN.EXTERNAL_FAIL');
    } finally {
      this.loading.set(false);
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existingScript) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src; script.async = true; script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load failed: ${src}`));
      document.head.appendChild(script);
    });
  }
}
