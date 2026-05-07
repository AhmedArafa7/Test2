import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConversationService } from '../services/conversation.service';
import { Conversation } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, RelativeTimePipe, EmptyStateComponent, TranslateModule],
  template: `
    <div class="min-h-screen bg-[#f8f9fa] font-sans py-20 px-6">
      <div class="max-w-4xl mx-auto">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div class="ltr:text-left rtl:text-right">
            <h1 class="text-4xl font-black text-gray-900 tracking-tight mb-2">{{ 'MESSAGES.TITLE' | translate }}</h1>
            <p class="text-gray-500 font-bold text-sm">{{ 'MESSAGES.SUBTITLE' | translate }}</p>
          </div>
        </div>

        @if (loading()) {
          <div class="flex justify-center py-32"><app-loading-spinner [message]="'MESSAGES.LOADING' | translate" /></div>
        } @else if (conversations().length === 0) {
          <div class="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <app-empty-state 
              [title]="'MESSAGES.EMPTY_TITLE' | translate" 
              [message]="'MESSAGES.EMPTY_MSG' | translate"
              [actionText]="'MESSAGES.BROWSE_BTN' | translate"
              actionRoute="/properties">
              <div icon class="w-12 h-12 text-[#0d7a80]">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </div>
            </app-empty-state>
          </div>
        } @else {
          <div class="space-y-4">
            @for (c of conversations(); track c.id) {
              <a [routerLink]="['/conversations', c.id]"
                 class="group block bg-white rounded-[32px] p-6 border border-gray-50 hover:border-[#0d7a80]/20 hover:shadow-xl hover:shadow-[#0d7a80]/5 transition-all duration-300">
                
                <div class="flex items-center gap-6">
                  <!-- Avatar -->
                  <div class="relative shrink-0">
                    <div class="w-16 h-16 rounded-[24px] bg-white border border-gray-100 flex items-center justify-center shadow-lg shadow-[#0d7a80]/5 transition-transform duration-500 group-hover:rotate-6 overflow-hidden">
                      <svg class="w-10 h-10 text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="font-black text-gray-900 text-lg group-hover:text-[#0d7a80] transition-colors ltr:text-left rtl:text-right">{{ getOtherName(c) | translate }}</h3>
                      <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest tabular-nums">{{ c.lastMessageAt | relativeTime }}</span>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 mb-3">
                      @if (c.propertyTitle) {
                        <span class="inline-flex items-center gap-2 text-[10px] font-black bg-[#0d7a80]/5 text-[#0d7a80] px-3 py-1.5 rounded-xl border border-[#0d7a80]/10 max-w-full">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                          {{ c.propertyTitle }}
                        </span>
                      }
                    </div>
                    
                    <div class="flex items-center justify-between">
                      <p class="text-sm text-gray-500 font-bold truncate ltr:pr-2 rtl:pl-2 max-w-[80%] ltr:text-left rtl:text-right">
                        {{ formatLastMessage(c.lastMessageContent) | translate }}
                      </p>
                      
                      <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#0d7a80] group-hover:text-white transition-all transform translate-x-2 group-hover:translate-x-0">
                        <svg class="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ConversationListComponent implements OnInit {
  conversations = signal<Conversation[]>([]); 
  loading = signal(true);
  
  constructor(
    private conversationService: ConversationService, 
    private auth: AuthService,
    private translate: TranslateService
  ) {}
  
  async ngOnInit() { 
    try { 
      this.conversations.set(await this.conversationService.getAll()); 
    } catch {} finally { 
      this.loading.set(false); 
    } 
  }
  
  getOtherName(c: Conversation): string {
    if (c.buyerUserId === this.auth.userId()) {
      return c.agentDisplayName || 'MESSAGES.AGENT';
    }
    return c.buyerDisplayName || 'MESSAGES.BUYER';
  }

  formatLastMessage(content: string | undefined): string {
    if (!content) return 'MESSAGES.NO_MESSAGES';
    if (content.startsWith('[PROPS:') || content.startsWith('[PROP:')) {
      return 'MESSAGES.SHARED_PROPS';
    }
    return content;
  }
}
