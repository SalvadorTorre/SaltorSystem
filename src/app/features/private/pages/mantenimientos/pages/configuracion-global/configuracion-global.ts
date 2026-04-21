import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import {
  CertificadoInspeccion,
  ConfiguracionGlobalData,
} from 'src/app/core/services/mantenimientos/configuracion-global';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';

@Component({
  selector: 'app-configuracion-global',
  templateUrl: './configuracion-global.html',
  styleUrls: ['./configuracion-global.css'],
})
export class ConfiguracionGlobal implements OnInit {
  formulario!: FormGroup;
  isLoading = false;
  isSaving = false;
  isValidatingCert = false;
  hasDatosCargados = false;
  isEditMode = true;

  readonly logoPorDefecto = 'assets/logo.jpg';
  logoPreview = this.logoPorDefecto;

  configActual: ConfiguracionGlobalData | null = null;

  pendingLogoDataUrl: string | null | undefined = undefined;
  pendingLogoNombre: string | null = null;

  pendingCertBase64: string | null | undefined = undefined;
  pendingCertNombre: string | null = null;

  certificadoInfo: CertificadoInspeccion | null = null;

  constructor(
    private fb: FormBuilder,
    private servicioConfiguracionGlobal: ServicioConfiguracionGlobal
  ) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  get endpointDirectCertPreview(): string {
    const base = String(this.formulario?.get('dgiiBaseUrl')?.value || '')
      .trim()
      .replace(/\/+$/, '');
    const ambRaw = String(this.formulario?.get('dgiiAmbiente')?.value || 'test')
      .trim()
      .toLowerCase();
    const ambiente = ambRaw === 'prod' ? 'prod' : 'test';
    if (!base) return '';
    return `${base}/${ambiente}/api/test-body-direct-cert`;
  }

  private crearFormulario(): void {
    this.formulario = this.fb.group({
      dgiiBaseUrl: [
        'https://recepcion.grupohierro.net/ecf/api',
        [Validators.required, Validators.pattern(/^https?:\/\/.+/i)],
      ],
      dgiiAmbiente: ['test', Validators.required],
      logoNombre: [{ value: '', disabled: true }],
      certificadoNombre: [{ value: '', disabled: true }],
      certificadoPassword: [''],
      certificadoVence: [{ value: '', disabled: true }],
      subjectCn: [{ value: '', disabled: true }],
      issuerCn: [{ value: '', disabled: true }],
    });
  }

  private aplicarConfiguracion(config: ConfiguracionGlobalData | null): void {
    this.configActual = config;
    this.hasDatosCargados = this.tieneDatosCargados(config);
    this.isEditMode = !this.hasDatosCargados;

    const logoDataUrl = config?.logoDataUrl || null;
    this.logoPreview = logoDataUrl || this.logoPorDefecto;

    if (logoDataUrl) {
      localStorage.setItem('logo_empresa', logoDataUrl);
    } else {
      localStorage.setItem('logo_empresa', this.logoPorDefecto);
    }

    this.formulario.patchValue(
      {
        dgiiBaseUrl:
          config?.dgiiBaseUrl || 'https://recepcion.grupohierro.net/ecf/api',
        dgiiAmbiente: String(config?.dgiiAmbiente || 'test').toLowerCase() === 'prod' ? 'prod' : 'test',
        logoNombre: config?.logoNombre || (logoDataUrl ? 'Logo personalizado' : 'Logo por defecto'),
        certificadoNombre: config?.certificadoNombre || '',
        certificadoPassword: config?.certificadoPassword || '',
        certificadoVence: config?.certificadoVence || '',
        subjectCn: config?.certificadoSubjectCn || '',
        issuerCn: config?.certificadoIssuerCn || '',
      },
      { emitEvent: false }
    );

    this.pendingLogoDataUrl = undefined;
    this.pendingLogoNombre = null;
    this.pendingCertBase64 = undefined;
    this.pendingCertNombre = null;
    this.certificadoInfo = null;
  }

  private tieneDatosCargados(config: ConfiguracionGlobalData | null): boolean {
    if (!config) return false;

    const baseUrl = String(config.dgiiBaseUrl || '').trim();
    return Boolean(
      String(config.logoDataUrl || '').trim() ||
        String(config.logoNombre || '').trim() ||
        String(config.certificadoNombre || '').trim() ||
        String(config.certificadoP12Base64 || '').trim() ||
        String(config.certificadoPassword || '').trim() ||
        String(config.certificadoVence || '').trim() ||
        String(config.certificadoSubjectCn || '').trim() ||
        String(config.certificadoIssuerCn || '').trim() ||
        (String(config.dgiiAmbiente || '').trim().toLowerCase() === 'prod') ||
        String(config.updatedAt || '').trim() ||
        (baseUrl && baseUrl !== 'https://recepcion.grupohierro.net/ecf/api')
    );
  }

  activarEdicion(): void {
    this.isEditMode = true;
  }

  private asegurarModoEdicion(): boolean {
    if (this.hasDatosCargados && !this.isEditMode) {
      Swal.fire(
        'Modo lectura',
        'Ya hay información cargada. Presiona "Editar información" para modificarla.',
        'info'
      );
      return false;
    }
    return true;
  }

  cargarConfiguracion(): void {
    this.isLoading = true;
    this.servicioConfiguracionGlobal.obtenerConfiguracionGlobal().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.aplicarConfiguracion(response?.data || null);
      },
      error: (error) => {
        this.isLoading = false;
        console.error(error);
        Swal.fire(
          'Error',
          'No se pudo cargar la configuración global. Verifica que exista la tabla configuracion_global en myappdb.',
          'error'
        );
      },
    });
  }

  async onLogoSeleccionado(event: Event): Promise<void> {
    if (!this.asegurarModoEdicion()) return;

    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const tipoValido = /^image\//i.test(file.type || '');
    if (!tipoValido) {
      Swal.fire('Archivo inválido', 'El logo debe ser una imagen.', 'warning');
      input.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      Swal.fire('Archivo muy grande', 'El logo no puede exceder 4MB.', 'warning');
      input.value = '';
      return;
    }

    try {
      const dataUrl = await this.leerArchivoComoDataUrl(file);
      this.logoPreview = dataUrl;
      this.pendingLogoDataUrl = dataUrl;
      this.pendingLogoNombre = file.name;
      this.formulario.patchValue({ logoNombre: file.name });
    } catch {
      Swal.fire('Error', 'No se pudo leer el logo seleccionado.', 'error');
    } finally {
      input.value = '';
    }
  }

  usarLogoPredeterminado(): void {
    if (!this.asegurarModoEdicion()) return;
    this.logoPreview = this.logoPorDefecto;
    this.pendingLogoDataUrl = null;
    this.pendingLogoNombre = null;
    this.formulario.patchValue({ logoNombre: 'Logo por defecto' });
  }

  async onCertificadoSeleccionado(event: Event): Promise<void> {
    if (!this.asegurarModoEdicion()) return;

    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const nombre = String(file.name || '').toLowerCase();
    if (!nombre.endsWith('.p12') && !nombre.endsWith('.pfx')) {
      Swal.fire('Archivo inválido', 'El certificado debe ser .p12 o .pfx.', 'warning');
      input.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire('Archivo muy grande', 'El certificado no puede exceder 8MB.', 'warning');
      input.value = '';
      return;
    }

    try {
      const buffer = await this.leerArchivoComoArrayBuffer(file);
      const base64 = this.arrayBufferToBase64(buffer);
      this.pendingCertBase64 = base64;
      this.pendingCertNombre = file.name;
      this.certificadoInfo = null;

      this.formulario.patchValue({
        certificadoNombre: file.name,
        certificadoVence: '',
        subjectCn: '',
        issuerCn: '',
      });

      const pass = String(this.formulario.get('certificadoPassword')?.value || '').trim();
      if (pass) {
        await this.validarCertificado();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo leer el certificado seleccionado.', 'error');
    } finally {
      input.value = '';
    }
  }

  quitarCertificado(): void {
    if (!this.asegurarModoEdicion()) return;
    this.pendingCertBase64 = null;
    this.pendingCertNombre = null;
    this.certificadoInfo = null;
    this.formulario.patchValue({
      certificadoNombre: '',
      certificadoPassword: '',
      certificadoVence: '',
      subjectCn: '',
      issuerCn: '',
    });
  }

  async validarCertificado(): Promise<void> {
    if (!this.asegurarModoEdicion()) return;

    const certBase64 = this.pendingCertBase64 ?? this.configActual?.certificadoP12Base64 ?? null;
    if (!certBase64) {
      Swal.fire('Sin certificado', 'Primero selecciona un archivo .p12.', 'info');
      return;
    }

    const password = String(this.formulario.get('certificadoPassword')?.value || '').trim();
    if (!password) {
      Swal.fire('Contraseña requerida', 'Debes escribir la contraseña del certificado.', 'warning');
      return;
    }

    this.isValidatingCert = true;
    try {
      const response = await firstValueFrom(
        this.servicioConfiguracionGlobal.inspeccionarCertificado(certBase64, password)
      );
      this.isValidatingCert = false;
      const info = response?.data || {};
      const vence = this.toIsoDate(info?.notAfter);

      this.certificadoInfo = info;
      this.formulario.patchValue({
        certificadoVence: vence || '',
        subjectCn: info?.subjectCn || '',
        issuerCn: info?.issuerCn || '',
      });

      Swal.fire({
        icon: 'success',
        title: 'Certificado válido',
        text: vence
          ? `Vence el ${this.formatearFecha(vence)}.`
          : 'El certificado fue leído correctamente.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error: any) {
      this.isValidatingCert = false;
      this.certificadoInfo = null;
      this.formulario.patchValue({ certificadoVence: '', subjectCn: '', issuerCn: '' });
      Swal.fire(
        'Certificado inválido',
        error?.message ||
          'No se pudo validar el certificado. Revisa archivo, contraseña o despliegue de la función inspect-p12-certificate.',
        'error'
      );
    }
  }

  async guardar(): Promise<void> {
    if (!this.asegurarModoEdicion()) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      Swal.fire('Validación', 'Completa los campos requeridos.', 'warning');
      return;
    }

    const raw = this.formulario.getRawValue();
    const payload: Partial<ConfiguracionGlobalData> = {
      id: 1,
      dgiiBaseUrl: String(raw.dgiiBaseUrl || '').trim(),
      dgiiAmbiente:
        String(raw.dgiiAmbiente || 'test').trim().toLowerCase() === 'prod'
          ? 'prod'
          : 'test',
      certificadoSubjectCn: String(raw.subjectCn || '').trim() || null,
      certificadoIssuerCn: String(raw.issuerCn || '').trim() || null,
      updatedBy: this.usuarioActual(),
    };

    if (this.pendingLogoDataUrl !== undefined) {
      payload.logoDataUrl = this.pendingLogoDataUrl;
      payload.logoNombre = this.pendingLogoNombre;
    }

    if (this.pendingCertBase64 === null) {
      payload.certificadoP12Base64 = null;
      payload.certificadoNombre = null;
      payload.certificadoPassword = null;
      payload.certificadoVence = null;
      payload.certificadoSubjectCn = null;
      payload.certificadoIssuerCn = null;
    }

    if (typeof this.pendingCertBase64 === 'string') {
      const password = String(raw.certificadoPassword || '').trim();
      if (!password) {
        Swal.fire(
          'Contraseña requerida',
          'Debes indicar la contraseña del certificado para guardar.',
          'warning'
        );
        return;
      }

      try {
        this.isValidatingCert = true;
        const response = await firstValueFrom(
          this.servicioConfiguracionGlobal.inspeccionarCertificado(
            this.pendingCertBase64,
            password
          )
        );
        this.isValidatingCert = false;

        const info = response?.data || {};
        const vence = this.toIsoDate(info?.notAfter);

        payload.certificadoP12Base64 = this.pendingCertBase64;
        payload.certificadoNombre = this.pendingCertNombre;
        payload.certificadoPassword = password;
        payload.certificadoVence = vence;
        payload.certificadoSubjectCn = String(info?.subjectCn || '').trim() || null;
        payload.certificadoIssuerCn = String(info?.issuerCn || '').trim() || null;
      } catch (error: any) {
        this.isValidatingCert = false;
        Swal.fire(
          'Certificado inválido',
          error?.message ||
            'No se pudo validar el certificado. Revisa contraseña o función inspect-p12-certificate.',
          'error'
        );
        return;
      }
    } else if (
      this.pendingCertBase64 === undefined &&
      raw.certificadoPassword !== (this.configActual?.certificadoPassword || '')
    ) {
      payload.certificadoPassword = String(raw.certificadoPassword || '').trim() || null;
    }

    this.isSaving = true;
    this.servicioConfiguracionGlobal.guardarConfiguracionGlobal(payload).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.aplicarConfiguracion(response?.data || null);
        this.hasDatosCargados = true;
        this.isEditMode = false;
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          timer: 1400,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        this.isSaving = false;
        console.error(error);
        Swal.fire(
          'Error',
          error?.message || 'No se pudo guardar la configuración global.',
          'error'
        );
      },
    });
  }

  private usuarioActual(): string {
    return String(
      localStorage.getItem('username') || localStorage.getItem('usuario') || 'sistema'
    ).trim();
  }

  private toIsoDate(input: any): string | null {
    if (!input) return null;
    const dt = new Date(String(input));
    if (isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatearFecha(isoDate: string): string {
    const dt = new Date(`${isoDate}T00:00:00`);
    if (isNaN(dt.getTime())) return isoDate;
    return dt.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private leerArchivoComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  private leerArchivoComoArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
}
