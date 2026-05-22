import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';
import Swal from 'sweetalert2';

declare var $: any;

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss']
})
export class SignInPage implements OnInit {

  myFormCreate!: FormGroup;
  isLoading: boolean = false;


  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private readonly router: Router,

  ) { }

  ngOnInit() {
    this.buildFormCreate();
  }

  buildFormCreate() {
    this.myFormCreate = this.formBuilder.group({
      username: ['', [Validators.required]],
      userpassword: ['', [Validators.required]]
    });
  }

  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  onSubmit() {
    if (this.myFormCreate.valid) {
      this.isLoading = true;
      this.authService.login(this.myFormCreate.value).subscribe({
        next: (response) => {
          if (response?.code === 200) {
            this.router.navigate(['/private']);
            return;
          }
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: response?.message || 'Credenciales inválidas.',
          });
        },
        error: (error) => {
          this.isLoading = false;
          const message = this.translateError(
            error?.message ||
            error?.error?.message ||
            'No fue posible iniciar sesión. Verifica usuario y contraseña.'
          );
          Swal.fire({
            icon: 'error',
            title: 'Error de inicio de sesión',
            text: message,
          });
        },
      });
    }
  }

  private translateError(rawMessage: string): string {
    const raw = String(rawMessage || '').trim();
    if (!raw) return 'No fue posible iniciar sesión. Verifica usuario y contraseña.';
    const msg = raw.toLowerCase();

    if (msg.includes('invalid login credentials')) {
      return 'Usuario o clave inválidos.';
    }
    if (msg.includes('email not confirmed')) {
      return 'La cuenta no está confirmada.';
    }
    if (msg.includes('fetch failed') || msg.includes('network')) {
      return 'No se pudo conectar con el servidor.';
    }
    if (msg.includes('invalid api key')) {
      return 'Configuración inválida de Supabase.';
    }
    if (msg.includes('password should be at least') || msg.includes('password must be at least')) {
      return 'La clave no cumple con la longitud requerida.';
    }

    return raw;
  }





}
