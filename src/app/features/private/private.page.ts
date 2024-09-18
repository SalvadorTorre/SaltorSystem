import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'private-root',
  templateUrl: './private.page.html',
  styleUrls: ['./private.page.css']
})
export class PrivatePage implements OnInit {
  initials: string = '';
  personName: string = '';
  sucursalName: string = '';

  constructor(
    private readonly router: Router,
    private authService: AuthService,
  ) {

  }

  ngOnInit() {
    this.initials = this.getInitialsFromName();

  }

  getInitialsFromName(): string {
    const name = localStorage.getItem('username');
    this.sucursalName = localStorage.getItem('sucursal') || '';
    this.personName = name || '';
    if (!name) {
      return '';
    }

    const nameParts = name.split(' ');
    let initials = '';
    for (let i = 0; i < nameParts.length; i++) {
      if (nameParts[i]) {
        initials += nameParts[i].charAt(0).toUpperCase();
      }
    }

    return initials || '';
  }

  async logout() {
    Swal.fire({
      title: '¿Está seguro que quieres cerrar sesion?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, Cerrar sesion!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/public/sign-in']);
      }
    })

  }
}
