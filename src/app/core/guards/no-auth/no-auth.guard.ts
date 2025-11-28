import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuardService {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    console.log(this.authService.isLoggedIn());
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/private']);
      return false;
    } else {
      return true;
    }
  }
}

export const noAuthGuard: CanActivateFn = (route, state) => {
  const noAuthGuardService = inject(NoAuthGuardService);
  return noAuthGuardService.canActivate();
};
