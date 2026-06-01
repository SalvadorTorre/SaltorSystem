import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';
import { AccessControlService } from '../../services/access/access-control.service';

export const permissionGuard: CanActivateFn = (route, state) => {
  const access = inject(AccessControlService);
  const router = inject(Router);

  const exactPath = String(route.data?.['accessPath'] || '').trim();
  const modulePrefix = String(route.data?.['modulePrefix'] || '').trim();

  if (!exactPath && !modulePrefix) {
    return true;
  }

  return from(access.ensureLoaded()).pipe(
    map(() => {
      const allowed = exactPath
        ? access.canViewPath(exactPath)
        : access.canViewModule(modulePrefix);

      if (allowed) {
        return true;
      }

      const fallbackUrl = access.fallbackUrlForDeniedPath(
        exactPath || state.url || modulePrefix,
      );
      return router.parseUrl(fallbackUrl);
    }),
  );
};
