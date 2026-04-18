import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'private-root',
  templateUrl: './private.page.html',
  styleUrls: ['./private.page.css'],
})
export class PrivatePage implements OnInit {
  initials: string = '';
  personName: string = '';
  sucursalName: string = '';

  constructor(
    private readonly router: Router,
    private authService: AuthService
  ) {}

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
    const raw = (localStorage.getItem('dashboardRole') || localStorage.getItem('role') || '').toLowerCase();
    if (raw.includes('root')) return 'ROOT';
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
