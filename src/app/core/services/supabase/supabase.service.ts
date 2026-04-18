import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private clientInstance: ReturnType<typeof createClient> | null = null;

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
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      };
      this.clientInstance = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        options
      );
    }
    return this.clientInstance;
  }
}
