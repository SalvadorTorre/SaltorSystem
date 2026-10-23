import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioPlataforma } from '../../services/plataforma/plataforma.service';

/** Solo el dueno de la plataforma entra a /private/plataforma. */
export const duenoPlataformaGuard: CanActivateFn = async () => {
  const plataforma = inject(ServicioPlataforma);
  const router = inject(Router);
  const esDueno = await plataforma.esDueno(true);
  return esDueno ? true : router.parseUrl('/private/home');
};
