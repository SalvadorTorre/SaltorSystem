import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly storageKey = 'saltorsystem-auth-token';
  private clientInstance: ReturnType<typeof createClient> | null = null;
  private authListenerBound = false;

  get url(): string {
    return environment?.supabase?.url || '';
  }

  get schema(): string {
    return environment?.supabase?.schema || 'public';
  }

  get enabled(): boolean {
    return Boolean(
      environment?.supabase?.enabled &&
        environment?.supabase?.url &&
        environment?.supabase?.anonKey
    );
  }

  get client(): ReturnType<typeof createClient> | null {
    if (!this.enabled) {
      return null;
    }
    if (!this.clientInstance) {
      const options: any = {
        db: {
          schema: this.schema,
        },
        auth: {
          storageKey: this.storageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          lockAcquireTimeout: 5000,
          // Evita conflictos del Navigator LockManager en algunos navegadores/escenarios Angular.
          lock: async (_name: string, _timeout: number, fn: () => Promise<any>) =>
            await fn(),
        },
      };
      this.clientInstance = createClient(
        this.url,
        environment.supabase.anonKey,
        options
      );
      this.bindAuthListener(this.clientInstance as any);
    }
    return this.clientInstance;
  }

  clearAuthSession(): void {
    localStorage.removeItem(this.storageKey);
    const client = this.clientInstance as any;
    if (client?.auth?.signOut) {
      void client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    this.clientInstance = null;
  }

  private bindAuthListener(client: any): void {
    if (this.authListenerBound || !client?.auth?.onAuthStateChange) {
      return;
    }

    client.auth.onAuthStateChange((_event: string, session: any) => {
      const token = String(session?.access_token || '').trim();

      if (token) {
        localStorage.setItem('authToken', token);
        return;
      }

      localStorage.removeItem('authToken');
    });

    this.authListenerBound = true;
  }
}
