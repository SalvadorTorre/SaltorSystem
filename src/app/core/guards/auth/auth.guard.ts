// import { Injectable, inject } from '@angular/core';
// import { Router } from '@angular/router';
// import { AuthService } from '../../services/auth/auth.service';
// import { CanActivateFn } from '@angular/router';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuardService {
//   constructor(private authService: AuthService, private router: Router) {}

//   canActivate(): boolean {
//     console.log(this.authService.isLoggedIn());

//     if (this.authService.isLoggedIn()) {
//       return true;
//     } else {
//       this.router.navigate(['/public/sign-in']);
//       return false;
//     }
//   }
// }
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/public/sign-in']);
  return false;
};

// export const authGuard: CanActivateFn = (route, state) => {
//   const authGuardService = inject(AuthGuardService);
//   return authGuardService.canActivate();
// };
