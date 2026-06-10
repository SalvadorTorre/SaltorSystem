import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import Swal from 'sweetalert2';
import { filter } from 'rxjs/operators';

type DesktopUpdateStage =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

interface DesktopUpdateStatus {
  supported: boolean;
  stage: DesktopUpdateStage;
  message: string;
  currentVersion: string;
  availableVersion?: string | null;
  downloadedVersion?: string | null;
  progress?: number | null;
  checkedAt?: string | null;
  error?: string | null;
}

@Component({
  selector: 'private-root',
  templateUrl: './private.page.html',
  styleUrls: ['./private.page.css'],
})
export class PrivatePage implements OnInit, OnDestroy {
  initials: string = '';
  personName: string = '';
  sucursalName: string = '';
  isDesktopApp: boolean = false;
  updateStatus: DesktopUpdateStatus = {
    supported: false,
    stage: 'idle',
    message: '',
    currentVersion: '',
    availableVersion: null,
    downloadedVersion: null,
    progress: null,
    checkedAt: null,
    error: null,
  };
  private removeUpdateListener: (() => void) | null = null;

  constructor(
    private readonly router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initials = this.getInitialsFromName();
    this.isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.programarModoConsulta());
    this.programarModoConsulta();
    void this.initializeDesktopUpdater();
  }

  ngOnDestroy(): void {
    if (this.removeUpdateListener) {
      this.removeUpdateListener();
      this.removeUpdateListener = null;
    }
  }

  private programarModoConsulta(): void {
    setTimeout(() => this.aplicarModoConsulta(), 250);
  }

  private aplicarModoConsulta(): void {
    const soloConsulta = sessionStorage.getItem('currentAccessReadOnly') === 'S';
    const root = document.querySelector('private-root');
    if (!root) return;

    const accionesEscritura = /(guardar|nuevo|editar|eliminar|borrar|actualizar|cobrar|enviar|generar|marcar)/i;
    const elementos = Array.from(
      root.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a.btn, a.dropdown-item'),
    );

    elementos.forEach((el) => {
      const text = `${el.textContent || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('aria-label') || ''}`.trim();
      const esAccionEscritura = accionesEscritura.test(text);
      const esNavegacion =
        !!el.closest('nav') ||
        !!el.closest('.navbar') ||
        !!el.closest('.swal2-container') ||
        el.hasAttribute('data-bs-dismiss') ||
        el.classList.contains('btn-close');

      if (!esAccionEscritura || esNavegacion) {
        return;
      }

      if (soloConsulta) {
        el.setAttribute('data-readonly-disabled', 'S');
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('disabled');
        if (el instanceof HTMLButtonElement) {
          el.disabled = true;
        }
      } else if (el.getAttribute('data-readonly-disabled') === 'S') {
        el.removeAttribute('data-readonly-disabled');
        el.removeAttribute('aria-disabled');
        el.classList.remove('disabled');
        if (el instanceof HTMLButtonElement) {
          el.disabled = false;
        }
      }
    });
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
      text: '¡No podrá revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, Cerrar sesion!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/public/sign-in']);
      }
    });
  }

  openMyProfile(): void {
    const profile = this.buildProfileFromStorage();
    const roleName = this.resolveRoleName();
    const salesReport = this.buildFakeSalesReport();
    const lastAccessLabel = new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    Swal.fire({
      width: 900,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#2b097b',
      html: `
        <div style="text-align:left;">
          <div style="padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#2b097b,#0d6efd);color:#fff;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:20px;font-weight:700;line-height:1.2;">Mi perfil</div>
                <div style="opacity:.9;font-size:13px;">Datos actuales de sesión</div>
              </div>
              <div style="font-size:26px;font-weight:700;background:rgba(255,255,255,.15);padding:6px 12px;border-radius:999px;">
                ${this.escapeHtml(profile.initials || 'US')}
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr;gap:12px;">
            <div style="border:1px solid #e9ecef;border-radius:12px;padding:12px 14px;background:#fff;">
              <div style="font-weight:700;color:#2b097b;margin-bottom:8px;">Datos del usuario</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;font-size:13px;">
                <div><div style="color:#6c757d;">Nombre</div><div style="font-weight:600;">${this.escapeHtml(profile.username)}</div></div>
                <div><div style="color:#6c757d;">Código usuario</div><div style="font-weight:600;">${this.escapeHtml(profile.codigoUsuario)}</div></div>
                <div><div style="color:#6c757d;">Sucursal</div><div style="font-weight:600;">${this.escapeHtml(profile.sucursal)}</div></div>
                <div><div style="color:#6c757d;">ID sucursal</div><div style="font-weight:600;">${this.escapeHtml(profile.idSucursal)}</div></div>
                <div><div style="color:#6c757d;">Empresa</div><div style="font-weight:600;">${this.escapeHtml(profile.empresa)}</div></div>
                <div><div style="color:#6c757d;">Código empresa</div><div style="font-weight:600;">${this.escapeHtml(profile.codigoEmpresa)}</div></div>
                <div><div style="color:#6c757d;">RNC</div><div style="font-weight:600;">${this.escapeHtml(profile.rncEmpresa)}</div></div>
                <div><div style="color:#6c757d;">Teléfono</div><div style="font-weight:600;">${this.escapeHtml(profile.telefonoEmpresa)}</div></div>
              </div>
            </div>

            <div style="border:1px solid #e9ecef;border-radius:12px;padding:12px 14px;background:#f8fbff;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div style="font-weight:700;color:#0d6efd;">Reporte de ventas | Hierros y Forjas</div>
                <div style="font-size:12px;color:#6c757d;">Resumen comercial del mes</div>
              </div>
              <div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;font-size:13px;">
                <div><div style="color:#6c757d;">Tipo de usuario</div><div style="font-weight:700;">${this.escapeHtml(roleName)}</div></div>
                <div><div style="color:#6c757d;">Meta a Facturar</div><div style="font-weight:700;">${salesReport.metaFacturarMM.toFixed(2)} MM</div></div>
                <div><div style="color:#6c757d;">Meta por vendedor</div><div style="font-weight:700;">${salesReport.metaPorVendedorMM.toFixed(2)} MM</div></div>
                <div><div style="color:#6c757d;">Total de facturas hechas por mí</div><div style="font-weight:700;">${salesReport.totalFactura.toLocaleString('es-DO')}</div></div>
                <div><div style="color:#6c757d;">Valor facturado (oculto)</div><div style="font-weight:700;">${this.escapeHtml(salesReport.valorFacturadoOculto)} MM</div></div>
                <div><div style="color:#6c757d;">Margen de venta</div><div style="font-weight:700;">${salesReport.margenVentaPct.toFixed(2)}%</div></div>
                <div><div style="color:#6c757d;">Porciento facturado</div><div style="font-weight:700;">${salesReport.porcientoFacturado.toFixed(1)}%</div></div>
                <div><div style="color:#6c757d;">Valor a pagar (aprox.)</div><div style="font-weight:700;">${this.formatMoney(salesReport.valorPagar)}</div></div>
                <div><div style="color:#6c757d;">Último acceso</div><div style="font-weight:700;">${this.escapeHtml(lastAccessLabel)}</div></div>
              </div>
              <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fff3cd;color:#856404;font-size:12px;">
                Los valores mostrados son un resumen de seguimiento y no exponen todos los detalles de comisión.
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  openAbout(): void {
    Swal.fire({
      icon: 'info',
      title: 'Acerca de',
      html: '<strong>SaltorSystem</strong><br/>Módulo privado del sistema.',
      confirmButtonText: 'Aceptar',
    });
  }

  async checkForUpdates(manual: boolean = true): Promise<void> {
    if (!this.isDesktopApp || !window.electronAPI?.checkForUpdates) {
      if (manual) {
        this.showUpdateToast('info', 'Esta función solo está disponible en la app desktop.');
      }
      return;
    }

    try {
      const status = await window.electronAPI.checkForUpdates();
      this.applyUpdateStatus(status);

      if (!manual) return;

      if (status.stage === 'checking' || status.stage === 'downloading') {
        this.showUpdateToast('info', status.message || 'Buscando actualizaciones...');
        return;
      }

      if (status.stage === 'downloaded') {
        this.showUpdateToast('success', 'La actualización ya está lista para instalar.');
        return;
      }

      if (status.stage === 'not-available') {
        this.showUpdateToast('info', 'No hay actualizaciones disponibles.');
        return;
      }

      if (status.stage === 'unsupported') {
        this.showUpdateToast('info', status.message || 'Actualizaciones no disponibles aquí.');
        return;
      }

      if (status.stage === 'error') {
        this.showUpdateToast('error', status.error || status.message || 'No se pudo buscar actualizaciones.');
      }
    } catch (error: any) {
      this.showUpdateToast('error', error?.message || 'No se pudo buscar actualizaciones.');
    }
  }

  async installPendingUpdate(): Promise<void> {
    if (!this.isDesktopApp || !window.electronAPI?.installUpdate) {
      this.showUpdateToast('info', 'Esta función solo está disponible en la app desktop.');
      return;
    }

    try {
      const result = await window.electronAPI.installUpdate();
      if (result?.success) {
        this.showUpdateToast('info', 'Reiniciando para instalar la actualización...');
        return;
      }
      this.showUpdateToast(
        'warning',
        result?.error || 'Todavía no hay una actualización lista para instalar.',
      );
    } catch (error: any) {
      this.showUpdateToast('error', error?.message || 'No se pudo instalar la actualización.');
    }
  }

  get updateStage(): DesktopUpdateStage {
    return this.updateStatus.stage;
  }

  get updateMessage(): string {
    return this.updateStatus.message || '';
  }

  get updateVersionLabel(): string {
    const version =
      this.updateStatus.downloadedVersion ||
      this.updateStatus.availableVersion ||
      '';
    return version ? `(v${version})` : '';
  }

  get updateProgressLabel(): string {
    if (this.updateStatus.stage !== 'downloading') return '';
    const progress = Number(this.updateStatus.progress || 0);
    return `Descargando ${progress.toFixed(0)}%`;
  }

  private async initializeDesktopUpdater(): Promise<void> {
    if (!this.isDesktopApp) return;

    this.removeUpdateListener = window.electronAPI?.onUpdateStatus?.((status) => {
      this.applyUpdateStatus(status);
    }) || null;

    if (window.electronAPI?.getUpdateStatus) {
      try {
        const status = await window.electronAPI.getUpdateStatus();
        this.applyUpdateStatus(status);
      } catch {
        // Ignorar error inicial y seguir escuchando eventos.
      }
    }
  }

  private applyUpdateStatus(status?: Partial<DesktopUpdateStatus> | null): void {
    if (!status) return;
    this.updateStatus = {
      ...this.updateStatus,
      ...status,
    };
  }

  private showUpdateToast(
    icon: 'success' | 'info' | 'warning' | 'error',
    title: string,
  ): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
    });
  }

  private buildProfileFromStorage(): {
    username: string;
    initials: string;
    codigoUsuario: string;
    sucursal: string;
    idSucursal: string;
    empresa: string;
    codigoEmpresa: string;
    rncEmpresa: string;
    telefonoEmpresa: string;
  } {
    const username = localStorage.getItem('username') || this.personName || 'Usuario';
    const codigoUsuario = localStorage.getItem('codigousuario') || '-';
    const idSucursal = localStorage.getItem('idSucursal') || '-';
    const codigoEmpresa = localStorage.getItem('codigoempresa') || localStorage.getItem('cod_empre') || '-';
    const rncEmpresa = localStorage.getItem('rnc_empresa') || '-';
    const telefonoEmpresa = localStorage.getItem('telefono_empresa') || '-';
    const sucursalRaw = this.parseStorageJson(localStorage.getItem('sucursal'));
    const empresaRaw = this.parseStorageJson(localStorage.getItem('empresa'));

    const sucursal =
      (sucursalRaw?.nom_sucursal || sucursalRaw?.descripcion || String(sucursalRaw || '').trim()) ||
      '-';
    const empresa =
      (empresaRaw?.nom_empre || empresaRaw?.descripcion || String(empresaRaw || '').trim()) ||
      (localStorage.getItem('nombre_empresa') || '-');

    return {
      username,
      initials: this.initials || this.getInitialsFromName() || 'US',
      codigoUsuario,
      sucursal,
      idSucursal,
      empresa,
      codigoEmpresa,
      rncEmpresa,
      telefonoEmpresa,
    };
  }

  private resolveRoleName(): string {
    const raw = (localStorage.getItem('role') || localStorage.getItem('dashboardRole') || '').toLowerCase();
    if (raw.includes('root')) return 'Cómputos';
    if (raw.includes('admin')) return 'Administrador';
    return 'Vendedor';
  }

  private buildFakeSalesReport(): {
    metaFacturarMM: number;
    metaPorVendedorMM: number;
    totalFactura: number;
    valorFacturadoOculto: string;
    margenVentaPct: number;
    porcientoFacturado: number;
    valorPagar: number;
  } {
    const metaFacturar = 22000000;
    const miembrosSucursal = 3;
    const metaPorVendedor = metaFacturar / miembrosSucursal;
    const totalFactura = 1120;
    const valorFacturadoReal = 11679600;
    const margenVentaPct = 17.92;
    const porcientoFacturado = (valorFacturadoReal / metaPorVendedor) * 100;
    const valorPagar = 13440.12;

    return {
      metaFacturarMM: metaFacturar / 1000000,
      metaPorVendedorMM: metaPorVendedor / 1000000,
      totalFactura,
      valorFacturadoOculto: this.formatCompactMillions(valorFacturadoReal),
      margenVentaPct,
      porcientoFacturado,
      valorPagar,
    };
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatCompactMillions(value: number): string {
    const approx = Math.floor((value / 1000000) * 10) / 10;
    return approx.toFixed(2);
  }

  private parseStorageJson(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
