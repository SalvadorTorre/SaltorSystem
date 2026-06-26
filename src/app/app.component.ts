import { Component } from '@angular/core';
import { SupabaseService } from './core/services/supabase/supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'SaltorSystem';

  constructor(private supabaseService: SupabaseService) {
    void this.supabaseService.client;
    void this.supabaseService.checkLocalConnection();
    void this.supabaseService.recoverSession();
  }
}
