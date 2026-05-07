import { Component, signal, ElementRef, viewChild, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AiService } from '../services/ai.service';
import { AuthService } from '../../../core/auth/auth.service';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

@Component({
  selector: 'app-chatbot', standalone: true, imports: [FormsModule, TranslateModule],
  template: `
    <div class="bg-white font-sans flex justify-center">
      <!-- Main Chat Area -->
      <div class="w-full max-w-5xl flex flex-col h-[calc(100vh-72px)] border-x border-gray-100 shadow-sm">
        <!-- Top Bar -->
        <div class="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white ltr:flex-row rtl:flex-row-reverse">
          <div class="flex items-center gap-6">
            <button (click)="goBack()" class="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 group ltr:flex-row rtl:flex-row-reverse">
              <svg class="w-5 h-5 transition-transform ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1 ltr:rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="text-xs font-black">{{ 'AI.CHATBOT.BACK_BTN' | translate }}</span>
            </button>
          </div>
          <div class="flex items-center gap-4 ltr:flex-row rtl:flex-row-reverse">
            <button (click)="clearHistory()" class="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors px-4 py-2 border border-gray-50 rounded-full hover:bg-red-50">
              {{ 'AI.CHATBOT.CLEAR_BTN' | translate }}
            </button>
            <span class="text-xs font-black text-[#0d7a80] bg-[#0d7a80]/5 px-4 py-2 rounded-full uppercase tracking-widest">{{ 'AI.CHATBOT.TITLE' | translate }}</span>
          </div>
        </div>

        <!-- Chat Messages -->
        <div #chatContainer class="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-6 bg-gray-50/30">
          @if (messages().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto py-12">
              <!-- AI Icon -->
              <div class="w-24 h-24 rounded-[32px] bg-gradient-to-br from-[#0d7a80] to-[#0a5c60] flex items-center justify-center mb-8 shadow-2xl shadow-[#0d7a80]/30 animate-pulse">
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              </div>

              <h2 class="text-3xl font-black text-gray-900 mb-3 tracking-tight">{{ 'AI.CHATBOT.WELCOME_TITLE' | translate }}</h2>
              <p class="text-gray-500 font-bold mb-12 leading-relaxed">{{ 'AI.CHATBOT.WELCOME_DESC' | translate }}</p>

              <!-- Quick Actions -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button (click)="quickAction('AI.CHATBOT.ACTION_PORTFOLIO_TEXT')" class="p-6 bg-white border border-gray-100 rounded-3xl ltr:text-left rtl:text-right hover:shadow-xl hover:shadow-[#0d7a80]/5 hover:-translate-y-1 transition-all group border-b-4 border-b-transparent hover:border-b-[#0d7a80]">
                  <div class="w-12 h-12 bg-[#0d7a80]/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#0d7a80]/10 transition-colors">
                    <svg class="w-6 h-6 text-[#0d7a80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h4 class="font-black text-gray-900 text-sm mb-2">{{ 'AI.CHATBOT.ACTION_PORTFOLIO_TITLE' | translate }}</h4>
                  <p class="text-[11px] text-gray-400 font-bold leading-relaxed">{{ 'AI.CHATBOT.ACTION_PORTFOLIO_DESC' | translate }}</p>
                </button>

                <button (click)="quickAction('AI.CHATBOT.ACTION_TRENDS_TEXT')" class="p-6 bg-white border border-gray-100 rounded-3xl ltr:text-left rtl:text-right hover:shadow-xl hover:shadow-[#0d7a80]/5 hover:-translate-y-1 transition-all group border-b-4 border-b-transparent hover:border-b-[#0d7a80]">
                  <div class="w-12 h-12 bg-[#0d7a80]/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#0d7a80]/10 transition-colors">
                    <svg class="w-6 h-6 text-[#0d7a80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  </div>
                  <h4 class="font-black text-gray-900 text-sm mb-2">{{ 'AI.CHATBOT.ACTION_TRENDS_TITLE' | translate }}</h4>
                  <p class="text-[11px] text-gray-400 font-bold leading-relaxed">{{ 'AI.CHATBOT.ACTION_TRENDS_DESC' | translate }}</p>
                </button>
              </div>
            </div>
          }
          @for (msg of messages(); track $index) {
            <div [class]="msg.role === 'user' ? 'flex ltr:justify-start rtl:justify-end mb-6' : 'flex ltr:justify-end rtl:justify-start mb-6'">
              <div [class]="msg.role === 'user' ? 'bg-gray-900 text-white rounded-[28px] ltr:rounded-bl-md rtl:rounded-br-md max-w-[85%]' : 'bg-white text-gray-900 rounded-[28px] ltr:rounded-br-md rtl:rounded-bl-md max-w-[85%] border border-gray-100'" class="px-7 py-5 shadow-sm">
                <p class="text-sm font-bold whitespace-pre-wrap leading-loose ltr:text-left rtl:text-right">{{ msg.content }}</p>
              </div>
            </div>
          }
          @if (thinking()) {
            <div class="flex ltr:justify-end rtl:justify-start mb-6">
              <div class="bg-white rounded-[24px] px-6 py-4 border border-gray-100 shadow-sm">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-[#0d7a80] rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2 h-2 bg-[#0d7a80] rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2 h-2 bg-[#0d7a80] rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="px-4 md:px-8 py-6 bg-white border-t border-gray-100">
          <div class="max-w-4xl mx-auto flex items-center gap-4 ltr:flex-row rtl:flex-row-reverse">
            <div class="flex-1 relative">
              <input [(ngModel)]="input" (keydown.enter)="send()"
                     class="w-full bg-gray-50 border border-transparent rounded-[24px] px-7 py-5 ltr:pe-14 rtl:ps-14 text-sm font-bold focus:bg-white focus:border-[#0d7a80]/20 focus:ring-8 focus:ring-[#0d7a80]/5 transition-all outline-none shadow-inner ltr:text-left rtl:text-right"
                     [placeholder]="'AI.CHATBOT.INPUT_PLACEHOLDER' | translate" autofocus>
            </div>
            <button (click)="send()" [disabled]="!input.trim() || thinking()"
                    class="w-14 h-14 ltr:rotate-0 rtl:rotate-180 bg-[#0d7a80] hover:bg-[#0b6469] disabled:opacity-40 text-white rounded-[22px] flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-[#0d7a80]/20">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
          <p class="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest mt-4">{{ 'AI.CHATBOT.DISCLAIMER' | translate }}</p>
        </div>
      </div>
    </div>
  `,
})
export class ChatbotComponent {
  messages = signal<ChatMessage[]>(this.loadHistory());
  input = '';
  thinking = signal(false);
  chatContainer = viewChild<ElementRef>('chatContainer');
  private translate = inject(TranslateService);

  constructor(private aiService: AiService, public auth: AuthService) {}

  goBack() { history.back(); }

  quickAction(key: string) {
    this.input = this.translate.instant(key);
    this.send();
  }

  private loadHistory(): ChatMessage[] {
    try {
      const saved = localStorage.getItem('baytology_chat_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('baytology_chat_history', JSON.stringify(this.messages()));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  clearHistory() {
    if (confirm(this.translate.instant('AI.CHATBOT.CLEAR_CONFIRM'))) {
      this.messages.set([]);
      localStorage.removeItem('baytology_chat_history');
      this.aiService.resetSession();
    }
  }

  async send() {
    const q = this.input.trim();
    if (!q) return;
    this.input = '';
    
    this.messages.update(m => [...m, { role: 'user', content: q }]);
    this.saveHistory();
    this.thinking.set(true);
    this.scroll();

    try {
      const res = await this.aiService.chat({ session_id: this.aiService.getSessionId(), message: q });
      let assistantContent = res.message || '';
      if (res.question) assistantContent += (assistantContent ? '\n\n' : '') + res.question;
      if (res.properties_count > 0 && res.properties?.length > 0) {
        assistantContent += '\n\n' + this.translate.instant('AI.CHATBOT.FOUND_PROPERTIES', { count: res.properties_count });
        for (const p of res.properties.slice(0, 5)) {
          const title = p.title || p.compound || p.name || p.type || this.translate.instant('COMMON.PROPERTY');
          const price = p.price || p.amount || p.cost;
          const priceStr = price ? ` — ${Number(price).toLocaleString()} ${this.translate.instant('COMMON.CURRENCY')}` : '';
          const location = p.location || p.city || p.district || p.address || '';
          const locationStr = location ? ` — ${location}` : '';
          assistantContent += `\n• ${title}${locationStr}${priceStr}`;
        }
      }
      if (!assistantContent) assistantContent = this.translate.instant('AI.CHATBOT.NO_ANSWER');
      this.messages.update(m => [...m, { role: 'assistant', content: assistantContent }]);
      this.saveHistory();
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: this.translate.instant('AI.CHATBOT.ERROR_GENERIC') }]);
    } finally {
      this.thinking.set(false);
      this.scroll();
    }
  }

  private scroll() { setTimeout(() => { const el = this.chatContainer()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }, 50); }
}
