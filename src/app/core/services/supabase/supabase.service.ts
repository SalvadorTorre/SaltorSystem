import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly storageKey = 'saltorsystem-auth-token';
  private clientInstance: ReturnType<typeof createClient> | null = null;

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
    this.clearExpiredStoredSession();
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

  private clearExpiredStoredSession(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      const token = String(
        session?.access_token || session?.currentSession?.access_token || ''
      );
      const expiresAt = Number(
        session?.expires_at || session?.currentSession?.expires_at || 0
      );
      if ((expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) || this.isExpiredJwt(token)) {
        localStorage.removeItem(this.storageKey);
        this.clientInstance = null;
      }
    } catch {
      localStorage.removeItem(this.storageKey);
      this.clientInstance = null;
    }
  }

  private isExpiredJwt(token: string): boolean {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const exp = Number(payload?.exp || 0);
      return Boolean(exp && exp <= Math.floor(Date.now() / 1000));
    } catch {
      return false;
    }
  }
}
