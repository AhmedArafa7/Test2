import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex bg-white font-sans selection:bg-[#0d7a80]/20">
      <!-- Left Side: Brand & Visual -->
      <div class="hidden lg:flex w-[40%] bg-[#005f63] relative overflow-hidden flex-col justify-between p-16">
        <!-- Logo -->
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <svg class="w-6 h-6 text-[#005f63]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L4 9v12h16V9l-8-6zm0 2.5l6 4.5V19H6V10l6-4.5z"/></svg>
          </div>
            <span class="text-2xl font-bold text-white tracking-tight ltr:ml-3 rtl:mr-3">Baytology</span>
        </div>

        <!-- Big Text -->
        <div class="relative z-10">
          <h2 class="text-6xl font-bold text-white leading-tight mb-8 ltr:text-left rtl:text-right">
            {{ 'AUTH.REGISTER.LEFT_TITLE' | translate }}
          </h2>
          <p class="text-white/60 text-lg max-w-md leading-relaxed ltr:text-left rtl:text-right">
            {{ 'AUTH.REGISTER.LEFT_DESC' | translate }}
          </p>
        </div>

        <!-- Copyright -->
        <div class="relative z-10 text-white/40 text-[11px] font-medium tracking-widest uppercase ltr:text-left rtl:text-right">
          {{ 'AUTH.REGISTER.COPYRIGHT' | translate }}
        </div>

        <!-- Decorative Pattern -->
        <div class="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style="background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%);"></div>
      </div>

      <!-- Right Side: Registration Form -->
      <div class="flex-1 flex flex-col justify-center items-center p-8 md:p-12 lg:p-20 overflow-y-auto bg-gray-50/50">
        <div class="w-full max-w-[480px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 p-8 md:p-12">
          
          <div class="mb-10 ltr:text-left rtl:text-right">
            <h1 class="text-3xl font-black text-gray-900 mb-2">{{ 'AUTH.REGISTER.TITLE' | translate }}</h1>
            <p class="text-gray-500 text-sm font-bold">{{ 'AUTH.REGISTER.SUBTITLE' | translate }}</p>
          </div>

          <form (ngSubmit)="register()" class="space-y-6">
            <!-- Role Selection -->
            <div class="grid grid-cols-2 gap-4 mb-8">
              <div (click)="role = 'Buyer'" 
                   [class]="role === 'Buyer' ? 'border-[#0d7a80] ring-1 ring-[#0d7a80]' : 'border-gray-100 hover:border-gray-200'"
                   class="relative p-6 bg-white border-2 rounded-2xl cursor-pointer transition-all group">
                <div class="flex flex-col items-center gap-3 text-center">
                  <div class="w-12 h-12 bg-gray-50 group-hover:bg-[#0d7a80]/5 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-6 h-6 text-gray-400 group-hover:text-[#0d7a80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <span class="text-[11px] font-black text-gray-900 leading-tight">{{ 'AUTH.REGISTER.ROLE_BUYER' | translate }}</span>
                </div>
                <div class="absolute top-3 right-3">
                  <div [class]="role === 'Buyer' ? 'bg-[#0d7a80] border-[#0d7a80]' : 'border-gray-200'" class="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                    @if (role === 'Buyer') { <div class="w-1.5 h-1.5 bg-white rounded-full"></div> }
                  </div>
                </div>
              </div>

              <div (click)="role = 'Agent'" 
                   [class]="role === 'Agent' ? 'border-[#0d7a80] ring-1 ring-[#0d7a80]' : 'border-gray-100 hover:border-gray-200'"
                   class="relative p-6 bg-white border-2 rounded-2xl cursor-pointer transition-all group">
                <div class="flex flex-col items-center gap-3 text-center">
                  <div class="w-12 h-12 bg-gray-50 group-hover:bg-[#0d7a80]/5 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-6 h-6 text-gray-400 group-hover:text-[#0d7a80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                  </div>
                  <span class="text-[11px] font-black text-gray-900 leading-tight">{{ 'AUTH.REGISTER.ROLE_AGENT' | translate }}</span>
                </div>
                <div class="absolute top-3 right-3">
                  <div [class]="role === 'Agent' ? 'bg-[#0d7a80] border-[#0d7a80]' : 'border-gray-200'" class="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                    @if (role === 'Agent') { <div class="w-1.5 h-1.5 bg-white rounded-full"></div> }
                  </div>
                </div>
              </div>
            </div>

            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2 ltr:text-left rtl:text-right">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider">{{ 'AUTH.REGISTER.FIRST_NAME' | translate }} <span class="text-red-500">*</span></label>
                <input type="text" [(ngModel)]="firstName" name="firstName" 
                       class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none ltr:text-left rtl:text-right" 
                       [placeholder]="'AUTH.REGISTER.FIRST_NAME' | translate" required>
              </div>
              <div class="space-y-2 ltr:text-left rtl:text-right">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider">{{ 'AUTH.REGISTER.LAST_NAME' | translate }} <span class="text-red-500">*</span></label>
                <input type="text" [(ngModel)]="lastName" name="lastName" 
                       class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none ltr:text-left rtl:text-right" 
                       [placeholder]="'AUTH.REGISTER.LAST_NAME' | translate" required>
              </div>
            </div>

            <div class="space-y-2 ltr:text-left rtl:text-right">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider">{{ 'AUTH.REGISTER.EMAIL' | translate }} <span class="text-red-500">*</span></label>
              <input type="email" [(ngModel)]="email" name="email" 
                     class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none ltr:text-left rtl:text-right" 
                     [placeholder]="'AUTH.REGISTER.EMAIL' | translate" required>
            </div>

            <div class="space-y-2 ltr:text-left rtl:text-right">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider">{{ 'AUTH.REGISTER.PASSWORD' | translate }} <span class="text-red-500">*</span></label>
              <div class="relative">
                <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" 
                       class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-[#0d7a80] focus:ring-4 focus:ring-[#0d7a80]/5 transition-all outline-none ltr:text-left rtl:text-right" 
                       [placeholder]="'AUTH.REGISTER.PASSWORD_HINT' | translate" required>
                <button type="button" (click)="showPassword = !showPassword" class="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
              </div>
            </div>

            <button type="submit" [disabled]="loading()" 
                    class="w-full bg-[#0d7a80] hover:bg-[#0b6469] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#0d7a80]/20 transition-all flex items-center justify-center gap-3 group mt-6 active:scale-95">
              @if (loading()) { <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> }
              {{ 'AUTH.REGISTER.SUBMIT_BTN' | translate }}
              <svg class="w-5 h-5 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
          </form>

          <p class="text-center text-sm font-bold text-gray-400 mt-10">
            {{ 'AUTH.REGISTER.ALREADY_HAVE_ACCOUNT' | translate }} 
            <a routerLink="/auth/login" class="text-[#0d7a80] hover:underline">{{ 'AUTH.REGISTER.LOGIN_LINK' | translate }}</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  role = 'Buyer';
  showPassword = false;
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}

  async register() {
    this.loading.set(true);
    try {
      const displayName = `${this.firstName} ${this.lastName}`.trim();
      await this.auth.register({ 
        email: this.email, 
        password: this.password, 
        displayName: displayName || this.email, 
        role: this.role 
      });
      this.toast.success('AUTH.REGISTER.SUCCESS');
      this.router.navigate(['/auth/login'], { queryParams: { email: this.email } });
    } catch (e: any) {
      console.error('Registration error full details:', e);
      let errorMessage = 'AUTH.REGISTER.ERROR';
      
      if (e?.error?.detail) {
        errorMessage = e.error.detail;
      } else if (e?.error?.errors) {
        // Extract the first error message from the validation errors object
        const firstErrorKey = Object.keys(e.error.errors)[0];
        const firstErrorMessages = e.error.errors[firstErrorKey];
        if (Array.isArray(firstErrorMessages) && firstErrorMessages.length > 0) {
          errorMessage = firstErrorMessages[0];
        } else if (typeof firstErrorMessages === 'string') {
          errorMessage = firstErrorMessages;
        }
      }
      
      if (e?.error?.instance) {
        console.error('Backend Trace ID (Instance):', e.error.instance);
      }
      this.toast.error(errorMessage);
    } finally { this.loading.set(false); }
  }
}
