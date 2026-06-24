import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';

type DashboardRole = 'root' | 'admin' | 'vendedor';

interface CanalVenta {
  nombre: string;
  monto: number;
}

interface FacturaReciente {
  numero: string;
  ncf: string;
  cliente: string;
  rnc: string;
  fecha: string;
  condicion: 'Contado' | 'Crédito';
  monto: number;
  estado: 'Cobrada' | 'Pendiente' | 'En ruta';
}

interface TareaAgenda {
  titulo: string;
  hora: string;
  fechaISO: string;
  completada: boolean;
}

interface VentaDia {
  dia: string;
  monto: number;
}

interface DashboardVendedor {
  metaFacturar: number;
  metaFacturarMM: number;
  miembrosSucursal: number;
  metaPorVendedor: number;
  metaPorVendedorMM: number;
  totalFactura: number;
  valorFacturadoReal: number;
  valorFacturadoOculto: string;
  margenVentaPct: number;
  porcientoFacturado: number;
  valorPagar: number;
  ticketPromedio: number;
  ventasSemana: VentaDia[];
  canales: CanalVenta[];
  facturasRecientes: FacturaReciente[];
  agenda: TareaAgenda[];
}

interface SucursalGlobal {
  nombre: string;
  vendedores: number;
  facturas: number;
  facturado: number;
  margenPct: number;
}

interface VendedorGlobal {
  nombre: string;
  sucursal: string;
  facturas: number;
  facturado: number;
  cumplimientoPct: number;
}

interface FormaPagoGlobal {
  nombre: string;
  monto: number;
}

interface DashboardGlobal {
  metaMensual: number;
  facturadoGeneral: number;
  cumplimientoGeneralPct: number;
  totalFacturas: number;
  ticketPromedio: number;
  vendedoresActivos: number;
  sucursalesActivas: number;
  sucursales: SucursalGlobal[];
  topVendedores: VendedorGlobal[];
  formasPago: FormaPagoGlobal[];
  alertas: string[];
}

@Component({
  selector: 'home',
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  role: DashboardRole = 'vendedor';
  username: string = '';
  empresaNombre: string = '';
  sucursalNombre: string = '';
  logoEmpresa: string = 'assets/logo.jpg';
  periodoActual: string = '';
  desktopReleaseUrl: string = 'https://github.com/SalvadorTorre/SaltorSystem/releases/download/desktop-latest/SaltorSystem-Desktop-Setup.exe';
  isDesktopApp: boolean = false;

  vendedor: DashboardVendedor = {
    metaFacturar: 0,
    metaFacturarMM: 0,
    miembrosSucursal: 3,
    metaPorVendedor: 0,
    metaPorVendedorMM: 0,
    totalFactura: 0,
    valorFacturadoReal: 0,
    valorFacturadoOculto: '0.00',
    margenVentaPct: 0,
    porcientoFacturado: 0,
    valorPagar: 0,
    ticketPromedio: 0,
    ventasSemana: [],
    canales: [],
    facturasRecientes: [],
    agenda: [],
  };
  global: DashboardGlobal = {
    metaMensual: 22000000,
    facturadoGeneral: 0,
    cumplimientoGeneralPct: 0,
    totalFacturas: 0,
    ticketPromedio: 0,
    vendedoresActivos: 0,
    sucursalesActivas: 0,
    sucursales: [],
    topVendedores: [],
    formasPago: [],
    alertas: [],
  };

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private servicioSucursal: ServicioSucursal,
    private servicioUsuario: ServicioUsuario,
    private servicioTipousuario: ServicioTipousuario,
  ) {}

  ngOnInit(): void {
    this.isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
    this.periodoActual = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric' }).format(new Date());
    this.loadSession();
    this.buildVendedorDashboard();
    this.buildGlobalDashboard();
    this.cargarDashboardReal();
  }

  abrirInstaladorDesktop(): void {
    if (this.isDesktopApp) return;
    window.open(this.desktopReleaseUrl, '_blank');
  }

  get agendaDelDia(): TareaAgenda[] {
    const hoy = this.todayISO();
    return this.vendedor.agenda.filter((t) => t.fechaISO === hoy);
  }

  formatoFechaAgenda(fechaISO: string): string {
    if (!fechaISO) return '-';
    if (fechaISO === this.todayISO()) return 'Hoy';
    const date = new Date(`${fechaISO}T00:00:00`);
    return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  formatDateShort(fechaISO: string): string {
    if (!fechaISO) return '-';
    const value = fechaISO.includes('T') ? fechaISO : `${fechaISO}T00:00:00`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fechaISO;
    return new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  openAgendaModal(): void {
    Swal.fire({
      width: 980,
      title: '<span style="font-size:1.12rem;font-weight:700;color:#10233e;">Todas mis agendas</span>',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0d6efd',
      html: this.renderAgendaModalHtml(),
      didOpen: () => this.bindAgendaModalActions(),
    });
  }

  agendarNuevaTarea(): void {
    const hoy = this.todayISO();
    Swal.fire({
      width: 640,
      title: '<span style="font-size:1.15rem;font-weight:700;color:#10233e;">Nueva agenda comercial</span>',
      html: `
        <div style="text-align:left;background:#f7fbff;border:1px solid #e2ecfb;border-radius:14px;padding:14px;">
          <div style="font-size:13px;color:#47607a;margin-bottom:12px;">
            Registra una tarea para darle seguimiento a tu ruta y compromisos del día.
          </div>
          <div>
            <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Tarea</label>
            <input id="agenda-titulo" class="swal2-input" placeholder="Ej: Llamar cliente pendiente" style="margin:6px 0 10px;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
            <div>
              <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Fecha</label>
              <input id="agenda-fecha" type="date" class="swal2-input" value="${hoy}" style="margin:6px 0 0;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
            </div>
            <div>
              <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Hora</label>
              <input id="agenda-hora" type="time" class="swal2-input" value="09:00" style="margin:6px 0 0;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
            </div>
          </div>
          <div style="margin-top:12px;font-size:12px;color:#6c757d;">
            Consejo: usa nombres cortos para encontrar tareas rápido en "Ver todas".
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar agenda',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      focusConfirm: false,
      preConfirm: () => {
        const titulo = (document.getElementById('agenda-titulo') as HTMLInputElement)?.value?.trim();
        const fechaISO = (document.getElementById('agenda-fecha') as HTMLInputElement)?.value;
        const horaRaw = (document.getElementById('agenda-hora') as HTMLInputElement)?.value;
        if (!titulo || !fechaISO || !horaRaw) {
          Swal.showValidationMessage('Completa título, fecha y hora');
          return null;
        }
        const [hh, mm] = horaRaw.split(':');
        const hora = this.to12Hour(`${hh}:${mm}`);
        return { titulo, fechaISO, hora };
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      this.vendedor.agenda = [
        {
          titulo: result.value.titulo,
          fechaISO: result.value.fechaISO,
          hora: result.value.hora,
          completada: false,
        },
        ...this.vendedor.agenda,
      ];
      Swal.fire({
        icon: 'success',
        title: 'Agenda creada',
        text: 'La tarea fue agregada correctamente.',
        timer: 1800,
        showConfirmButton: false,
      });
    });
  }

  canalPct(monto: number): number {
    if (!this.vendedor.valorFacturadoReal) return 0;
    return (monto / this.vendedor.valorFacturadoReal) * 100;
  }

  semanaPct(monto: number): number {
    const total = this.totalSemanaMonto();
    if (!total) return 0;
    return (monto / total) * 100;
  }

  totalSemanaMonto(): number {
    return this.vendedor.ventasSemana.reduce((acc, item) => acc + item.monto, 0);
  }

  promedioSemanaMonto(): number {
    if (!this.vendedor.ventasSemana.length) return 0;
    return this.totalSemanaMonto() / this.vendedor.ventasSemana.length;
  }

  ventasSemanaPreview(): VentaDia[] {
    return this.vendedor.ventasSemana.slice(0, 3);
  }

  mejorDiaSemana(): VentaDia | null {
    if (!this.vendedor.ventasSemana.length) return null;
    return this.vendedor.ventasSemana.reduce((max, item) => (item.monto > max.monto ? item : max));
  }

  mejorDiaSemanaMonto(): number {
    return this.mejorDiaSemana()?.monto || 0;
  }

  openSemanaModal(): void {
    const rows = this.vendedor.ventasSemana
      .map(
        (dia) => `
          <tr>
            <td style="padding:8px 6px;">${this.escapeHtml(dia.dia)}</td>
            <td style="padding:8px 6px;">${this.semanaPct(dia.monto).toFixed(1)}%</td>
            <td style="padding:8px 6px;text-align:right;font-weight:700;">${this.escapeHtml(this.currency(dia.monto))}</td>
          </tr>
        `
      )
      .join('');

    Swal.fire({
      width: 720,
      title: 'Detalle semanal',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0d6efd',
      html: `
        <div style="text-align:left;">
          <div style="margin-bottom:8px;color:#556270;font-size:13px;">Ventas por día de la semana</div>
          <div style="border:1px solid #e8edf4;border-radius:12px;overflow:hidden;">
            <table class="table table-sm mb-0 align-middle">
              <thead style="background:#f7f9fc;">
                <tr>
                  <th style="padding:9px 6px;">Día</th>
                  <th style="padding:9px 6px;">Participación</th>
                  <th style="padding:9px 6px;text-align:right;">Monto</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    });
  }

  currency(value: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 2,
    }).format(value);
  }

  sucursalPctFacturado(facturado: number): number {
    if (!this.global.facturadoGeneral) return 0;
    return (facturado / this.global.facturadoGeneral) * 100;
  }

  formaPagoPct(monto: number): number {
    if (!this.global.facturadoGeneral) return 0;
    return (monto / this.global.facturadoGeneral) * 100;
  }

  private renderAgendaModalHtml(): string {
    if (!this.vendedor.agenda.length) {
      return `
        <div style="padding:18px;border:1px solid #e9ecef;border-radius:12px;background:#f8f9fa;color:#556270;">
          No tienes tareas registradas todavía.
        </div>
      `;
    }

    const rows = this.vendedor.agenda
      .map((tarea, index) => {
        const estado = tarea.completada
          ? '<span style="color:#0f5132;background:#d1e7dd;padding:2px 8px;border-radius:999px;font-size:11px;">Completada</span>'
          : '<span style="color:#664d03;background:#fff3cd;padding:2px 8px;border-radius:999px;font-size:11px;">Pendiente</span>';

        return `
          <tr>
            <td style="padding:8px 6px;min-width:220px;">
              <div style="font-weight:600;color:#12263d;">${this.escapeHtml(tarea.titulo)}</div>
            </td>
            <td style="padding:8px 6px;white-space:nowrap;">${this.formatoFechaAgenda(tarea.fechaISO)}</td>
            <td style="padding:8px 6px;white-space:nowrap;">${this.escapeHtml(tarea.hora)}</td>
            <td style="padding:8px 6px;">${estado}</td>
            <td style="padding:8px 6px;white-space:nowrap;">
              <button class="btn btn-sm btn-outline-success me-1 mb-1" data-action="toggle" data-index="${index}">
                ${tarea.completada ? 'Pendiente' : 'Completar'}
              </button>
              <button class="btn btn-sm btn-outline-primary me-1 mb-1" data-action="edit" data-index="${index}">
                Editar
              </button>
              <button class="btn btn-sm btn-outline-danger mb-1" data-action="delete" data-index="${index}">
                Borrar
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="text-align:left;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
          <div style="font-size:13px;color:#5d6d80;">Administra tus tareas: completa, edita o elimina.</div>
          <div style="font-size:12px;color:#6c757d;">Total: ${this.vendedor.agenda.length}</div>
        </div>
        <div style="border:1px solid #e8edf4;border-radius:12px;overflow:auto;max-height:380px;background:#fff;">
          <table class="table table-sm mb-0 align-middle">
            <thead style="position:sticky;top:0;background:#f7f9fc;z-index:1;">
              <tr>
                <th style="padding:9px 6px;">Tarea</th>
                <th style="padding:9px 6px;">Fecha</th>
                <th style="padding:9px 6px;">Hora</th>
                <th style="padding:9px 6px;">Estado</th>
                <th style="padding:9px 6px;">Acciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  private bindAgendaModalActions(): void {
    const container = Swal.getHtmlContainer();
    if (!container) return;

    const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-action][data-index]');
    buttons.forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.getAttribute('data-action');
        const index = Number(button.getAttribute('data-index'));
        if (Number.isNaN(index)) return;
        await this.handleAgendaAction(action, index);
      });
    });
  }

  private async handleAgendaAction(action: string | null, index: number): Promise<void> {
    const tarea = this.vendedor.agenda[index];
    if (!tarea || !action) return;

    if (action === 'toggle') {
      tarea.completada = !tarea.completada;
      Swal.close();
      this.openAgendaModal();
      return;
    }

    if (action === 'delete') {
      const result = await Swal.fire({
        title: '¿Eliminar tarea?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
      });
      if (result.isConfirmed) {
        this.vendedor.agenda.splice(index, 1);
      }
      this.openAgendaModal();
      return;
    }

    if (action === 'edit') {
      await this.openEditAgendaModal(index);
      this.openAgendaModal();
    }
  }

  private async openEditAgendaModal(index: number): Promise<void> {
    const tarea = this.vendedor.agenda[index];
    if (!tarea) return;

    const result = await Swal.fire({
      width: 640,
      title: '<span style="font-size:1.08rem;font-weight:700;color:#10233e;">Editar agenda</span>',
      html: `
        <div style="text-align:left;background:#f7fbff;border:1px solid #e2ecfb;border-radius:14px;padding:14px;">
          <div>
            <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Tarea</label>
            <input id="edit-agenda-titulo" class="swal2-input" value="${this.escapeHtml(tarea.titulo)}" style="margin:6px 0 10px;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
            <div>
              <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Fecha</label>
              <input id="edit-agenda-fecha" type="date" class="swal2-input" value="${tarea.fechaISO}" style="margin:6px 0 0;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
            </div>
            <div>
              <label style="font-size:12px;color:#5f6b7a;font-weight:600;">Hora</label>
              <input id="edit-agenda-hora" type="time" class="swal2-input" value="${this.to24Hour(tarea.hora)}" style="margin:6px 0 0;height:40px;border-radius:10px;border:1px solid #c8d8ef;background:#fff;" />
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      preConfirm: () => {
        const titulo = (document.getElementById('edit-agenda-titulo') as HTMLInputElement)?.value?.trim();
        const fechaISO = (document.getElementById('edit-agenda-fecha') as HTMLInputElement)?.value;
        const horaRaw = (document.getElementById('edit-agenda-hora') as HTMLInputElement)?.value;
        if (!titulo || !fechaISO || !horaRaw) {
          Swal.showValidationMessage('Completa título, fecha y hora');
          return null;
        }
        return { titulo, fechaISO, hora: this.to12Hour(horaRaw) };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    this.vendedor.agenda[index] = {
      ...tarea,
      titulo: result.value.titulo,
      fechaISO: result.value.fechaISO,
      hora: result.value.hora,
    };
  }

  private to12Hour(time24: string): string {
    const [hh = '0', mm = '00'] = String(time24).split(':');
    const h = Number(hh);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, '0')}:${mm} ${suffix}`;
  }

  private to24Hour(time12: string): string {
    const match = String(time12).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return '09:00';

    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    return `${String(hour).padStart(2, '0')}:${match[2]}`;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private loadSession(): void {
    this.username = localStorage.getItem('username') || 'Vendedor';
    this.empresaNombre = localStorage.getItem('nombre_empresa') || 'Mi Empresa';
    this.logoEmpresa = localStorage.getItem('logo_empresa') || 'assets/logo.jpg';

    const sucRaw = this.parseStorage(localStorage.getItem('sucursal'));
    this.sucursalNombre = sucRaw?.nom_sucursal || sucRaw?.descripcion || 'Sucursal principal';

    const roleRaw = (
      localStorage.getItem('role') ||
      localStorage.getItem('dashboardRole') ||
      ''
    ).toLowerCase();
    if (roleRaw.includes('root')) {
      this.role = 'root';
    } else if (roleRaw.includes('admin')) {
      this.role = 'admin';
    } else {
      this.role = 'vendedor';
    }
  }

  private buildVendedorDashboard(): void {
    const metaFacturar = 22000000;
    const metaFacturarMM = 22.0;
    const miembrosSucursal = 3;
    const metaPorVendedor = metaFacturar / miembrosSucursal;
    const metaPorVendedorMM = metaFacturarMM / miembrosSucursal;
    const valorFacturadoReal = 11679600;
    const totalFactura = 1120;
    const ticketPromedio = valorFacturadoReal / totalFactura;
    const margenVentaPct = 17.92;
    const porcientoFacturado = (valorFacturadoReal / metaPorVendedor) * 100;
    const valorPagar = 13440.12;
    const facturasRecientesStorage = this.loadFacturasFromStorage();

    this.vendedor = {
      metaFacturar,
      metaFacturarMM,
      miembrosSucursal,
      metaPorVendedor,
      metaPorVendedorMM,
      totalFactura,
      valorFacturadoReal,
      valorFacturadoOculto: this.toObfuscatedMillions(valorFacturadoReal),
      margenVentaPct,
      porcientoFacturado,
      valorPagar,
      ticketPromedio,
      ventasSemana: [
        { dia: 'Lun', monto: 1450000 },
        { dia: 'Mar', monto: 1680000 },
        { dia: 'Mié', monto: 1320000 },
        { dia: 'Jue', monto: 1910000 },
        { dia: 'Vie', monto: 1740000 },
        { dia: 'Sáb', monto: 820000 },
      ],
      canales: [
        { nombre: 'Hierros', monto: 8344200 },
        { nombre: 'Forjas', monto: 3335400 },
      ],
      facturasRecientes: facturasRecientesStorage.length ? facturasRecientesStorage : [
        {
          numero: 'FAC-11902',
          ncf: 'E32000011902',
          cliente: 'To Do Hierro',
          rnc: '130123456',
          fecha: '2026-03-05',
          condicion: 'Contado',
          monto: 385000,
          estado: 'Cobrada'
        },
        {
          numero: 'FAC-11898',
          ncf: 'E32000011898',
          cliente: 'Canal Hierro',
          rnc: '131998877',
          fecha: '2026-03-04',
          condicion: 'Crédito',
          monto: 242500,
          estado: 'Pendiente'
        },
        {
          numero: 'FAC-11895',
          ncf: 'E32000011895',
          cliente: 'Max Hierro',
          rnc: '132112233',
          fecha: '2026-03-04',
          condicion: 'Crédito',
          monto: 169900,
          estado: 'En ruta'
        },
        {
          numero: 'FAC-11891',
          ncf: 'E32000011891',
          cliente: 'Gigante Hierro',
          rnc: '101889944',
          fecha: '2026-03-03',
          condicion: 'Contado',
          monto: 420800,
          estado: 'Cobrada'
        },
      ],
      agenda: [
        { titulo: 'Llamar clientes con cotización abierta', hora: '09:30 AM', fechaISO: this.todayISO(), completada: true },
        { titulo: 'Seguimiento entrega FAC-11898', hora: '11:00 AM', fechaISO: this.todayISO(), completada: false },
        { titulo: 'Visita comercial Zona Norte', hora: '02:00 PM', fechaISO: this.todayISO(), completada: false },
        { titulo: 'Actualizar pipeline de cierre semanal', hora: '04:30 PM', fechaISO: this.todayISO(), completada: false },
        { titulo: 'Revisión de pedidos quincenales', hora: '10:00 AM', fechaISO: '2026-03-09', completada: false },
      ],
    };
  }

  private buildGlobalDashboard(): void {
    const facturas = this.loadFacturasFromStorage();
    const totalFacturas = facturas.length || 3054;
    const facturadoGeneral = facturas.length
      ? facturas.reduce((acc, f) => acc + Number(f.monto || 0), 0)
      : 25790000;

    const ticketPromedio = totalFacturas ? facturadoGeneral / totalFacturas : 0;
    const metaMensual = 22000000;
    const cumplimientoGeneralPct = metaMensual ? (facturadoGeneral / metaMensual) * 100 : 0;

    this.global = {
      metaMensual,
      facturadoGeneral,
      cumplimientoGeneralPct,
      totalFacturas,
      ticketPromedio,
      vendedoresActivos: 4,
      sucursalesActivas: 3,
      sucursales: [
        {
          nombre: 'Canal Hierro',
          vendedores: 2,
          facturas: 1450,
          facturado: 12040000,
          margenPct: 18.4,
        },
        {
          nombre: 'Zona Norte',
          vendedores: 1,
          facturas: 980,
          facturado: 7740000,
          margenPct: 17.6,
        },
        {
          nombre: 'Santo Domingo Oeste',
          vendedores: 1,
          facturas: 624,
          facturado: 6010000,
          margenPct: 16.9,
        },
      ],
      topVendedores: [
        {
          nombre: 'NANI',
          sucursal: 'Canal Hierro',
          facturas: 1120,
          facturado: 11200000,
          cumplimientoPct: 50.9,
        },
        {
          nombre: 'NATALIA',
          sucursal: 'Canal Hierro',
          facturas: 1304,
          facturado: 11400000,
          cumplimientoPct: 51.8,
        },
        {
          nombre: 'SONIA',
          sucursal: 'Zona Norte',
          facturas: 628,
          facturado: 3190000,
          cumplimientoPct: 14.5,
        },
        {
          nombre: 'VICTOR',
          sucursal: 'Santo Domingo Oeste',
          facturas: 2,
          facturado: 0,
          cumplimientoPct: 0,
        },
      ],
      formasPago: [
        { nombre: 'Contado', monto: facturadoGeneral * 0.58 },
        { nombre: 'Crédito 30 días', monto: facturadoGeneral * 0.27 },
        { nombre: 'Transferencia', monto: facturadoGeneral * 0.15 },
      ],
      alertas: [
        '2 vendedores por debajo del 20% de cumplimiento.',
        'La sucursal Santo Domingo Oeste tiene margen menor al 17%.',
        'Hay 17 facturas pendientes de cobro en el corte actual.',
      ],
    };
  }

  private cargarDashboardReal(): void {
    const sucursalId = this.currentSucursalId();

    forkJoin({
      sucursales: (
        sucursalId
          ? this.servicioSucursal.buscarsucursal(String(sucursalId))
          : this.servicioSucursal.buscarTodasSucursal()
      ).pipe(catchError(() => of({ data: [] }))),
      facturas: this.servicioFacturacion.buscarFacturasParaCierre(10000).pipe(catchError(() => of({ data: [] }))),
      usuarios: (
        sucursalId
          ? this.servicioUsuario.buscarUsuariosPorSucursal(sucursalId, 10000)
          : this.servicioUsuario.buscarTodosUsuario(1, 10000)
      ).pipe(catchError(() => of({ data: [] }))),
      tipos: this.servicioTipousuario.obtenerTodosTipousuario().pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ sucursales, facturas, usuarios, tipos }) => {
      const sucursalesList = this.filtrarSucursalesPorUsuario(this.unwrapList(sucursales), sucursalId);
      const facturasList = this.filtrarFacturasPorSucursal(this.unwrapList(facturas), sucursalId);
      const usuariosList = this.filtrarUsuariosPorSucursal(this.unwrapList(usuarios), sucursalId);
      const tiposList = this.unwrapList(tipos);
      const facturasMes = facturasList.filter((factura) => this.esFechaDelMesActual(factura?.fa_fecFact ?? factura?.fa_fecfact));

      this.aplicarDashboardSucursal(sucursalesList, facturasMes, usuariosList, tiposList);
      this.aplicarDashboardGlobal(sucursalesList, facturasMes, usuariosList, tiposList);
    });
  }

  private aplicarDashboardSucursal(
    sucursales: any[],
    facturasMes: any[],
    usuarios: any[],
    tipos: any[],
  ): void {
    const sucursalId = this.currentSucursalId();
    const sucursal = this.buscarSucursalActual(sucursales, sucursalId);
    const facturasSucursal = sucursalId
      ? facturasMes.filter((factura) => this.numeroSucursalFactura(factura) === sucursalId)
      : facturasMes;
    const vendedoresSucursal = this.filtrarVendedoresSucursal(usuarios, tipos, sucursalId);

    const metaFacturar = this.metaVentaSucursal(sucursal);
    const miembrosSucursal = vendedoresSucursal.length || 1;
    const valorFacturadoReal = this.sumarCampo(facturasSucursal, 'fa_valFact', 'fa_valfact');
    const costoFacturado = this.sumarCampo(facturasSucursal, 'fa_cosFact', 'fa_cosfact');
    const totalFactura = facturasSucursal.length;
    const ticketPromedio = totalFactura ? valorFacturadoReal / totalFactura : 0;
    const margenVentaPct = valorFacturadoReal ? ((valorFacturadoReal - costoFacturado) / valorFacturadoReal) * 100 : 0;
    const porcientoFacturado = metaFacturar ? (valorFacturadoReal / metaFacturar) * 100 : 0;
    const metaPorVendedor = miembrosSucursal ? metaFacturar / miembrosSucursal : metaFacturar;

    this.vendedor = {
      ...this.vendedor,
      metaFacturar,
      metaFacturarMM: metaFacturar / 1000000,
      miembrosSucursal,
      metaPorVendedor,
      metaPorVendedorMM: metaPorVendedor / 1000000,
      totalFactura,
      valorFacturadoReal,
      valorFacturadoOculto: this.toObfuscatedMillions(valorFacturadoReal),
      margenVentaPct,
      porcientoFacturado,
      ticketPromedio,
      canales: [{ nombre: 'Ventas del mes', monto: valorFacturadoReal }],
      facturasRecientes: this.mapFacturasRecientes(facturasSucursal),
    };

    if (sucursal?.nom_sucursal || sucursal?.descripcion) {
      this.sucursalNombre = sucursal.nom_sucursal || sucursal.descripcion;
    }
  }

  private aplicarDashboardGlobal(
    sucursales: any[],
    facturasMes: any[],
    usuarios: any[],
    tipos: any[],
  ): void {
    const sucursalRows = sucursales.map((sucursal) => {
      const sucursalId = Number(sucursal?.cod_sucursal ?? sucursal?.id ?? 0);
      const facturasSucursal = facturasMes.filter((factura) => this.numeroSucursalFactura(factura) === sucursalId);
      const facturado = this.sumarCampo(facturasSucursal, 'fa_valFact', 'fa_valfact');
      const costo = this.sumarCampo(facturasSucursal, 'fa_cosFact', 'fa_cosfact');
      const vendedores = this.filtrarVendedoresSucursal(usuarios, tipos, sucursalId).length;
      return {
        nombre: String(sucursal?.nom_sucursal ?? sucursal?.descripcion ?? `Sucursal ${sucursalId}`),
        vendedores,
        facturas: facturasSucursal.length,
        facturado,
        margenPct: facturado ? ((facturado - costo) / facturado) * 100 : 0,
      };
    });

    const metaMensual = sucursales.reduce((acc, sucursal) => acc + this.metaVentaSucursal(sucursal), 0);
    const facturadoGeneral = this.sumarCampo(facturasMes, 'fa_valFact', 'fa_valfact');
    const totalFacturas = facturasMes.length;
    const ticketPromedio = totalFacturas ? facturadoGeneral / totalFacturas : 0;
    const cumplimientoGeneralPct = metaMensual ? (facturadoGeneral / metaMensual) * 100 : 0;

    this.global = {
      ...this.global,
      metaMensual,
      facturadoGeneral,
      cumplimientoGeneralPct,
      totalFacturas,
      ticketPromedio,
      vendedoresActivos: this.filtrarVendedoresSucursal(usuarios, tipos, 0).length,
      sucursalesActivas: sucursales.length,
      sucursales: sucursalRows,
      topVendedores: this.construirTopVendedores(facturasMes, usuarios, tipos, metaMensual),
      formasPago: this.construirFormasPago(facturasMes),
      alertas: this.construirAlertas(sucursalRows, metaMensual, facturadoGeneral),
    };
  }

  private unwrapList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (response?.data && typeof response.data === 'object') return [response.data];
    return [];
  }

  private currentSucursalId(): number {
    const sucRaw = this.parseStorage(localStorage.getItem('sucursal'));
    const value =
      localStorage.getItem('idSucursal') ||
      sucRaw?.cod_sucursal ||
      sucRaw?.id ||
      sucRaw?.sucursalid ||
      localStorage.getItem('sucursalid') ||
      '';
    const id = Number(value);
    return Number.isFinite(id) ? id : 0;
  }

  private buscarSucursalActual(sucursales: any[], sucursalId: number): any {
    if (!sucursalId) return sucursales[0] || null;
    return sucursales.find((sucursal) => Number(sucursal?.cod_sucursal ?? sucursal?.id ?? 0) === sucursalId) || null;
  }

  private filtrarSucursalesPorUsuario(sucursales: any[], sucursalId: number): any[] {
    if (!sucursalId) return sucursales;
    return sucursales.filter((sucursal) => Number(sucursal?.cod_sucursal ?? sucursal?.id ?? 0) === sucursalId);
  }

  private filtrarFacturasPorSucursal(facturas: any[], sucursalId: number): any[] {
    if (!sucursalId) return [];
    return facturas.filter((factura) => this.numeroSucursalFactura(factura) === sucursalId);
  }

  private filtrarUsuariosPorSucursal(usuarios: any[], sucursalId: number): any[] {
    if (!sucursalId) return [];
    return usuarios.filter((usuario) => Number(usuario?.sucursalid ?? usuario?.sucursal ?? 0) === sucursalId);
  }

  private metaVentaSucursal(sucursal: any): number {
    return this.toNumber(
      sucursal?.meta_vents ??
      sucursal?.meta_venta ??
      sucursal?.metaVenta ??
      sucursal?.metaventa ??
      0,
    );
  }

  private numeroSucursalFactura(factura: any): number {
    return this.toNumber(
      factura?.fa_codSucu ??
      factura?.fa_codsucu ??
      factura?.cod_sucursal ??
      factura?.sucursalid ??
      0,
    );
  }

  private esFechaDelMesActual(value: any): boolean {
    if (!value) return false;
    const fechaTexto = String(value).trim();
    const fecha = fechaTexto.includes('T') ? new Date(fechaTexto) : new Date(`${fechaTexto}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return false;
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
  }

  private sumarCampo(rows: any[], ...keys: string[]): number {
    return rows.reduce((acc, row) => {
      const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null);
      return acc + this.toNumber(value);
    }, 0);
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private filtrarVendedoresSucursal(usuarios: any[], tipos: any[], sucursalId: number): any[] {
    const tipoMap = new Map<number, string>(
      tipos.map((tipo) => [
        Number(tipo?.id ?? tipo?.idtipoUsuario ?? 0),
        String(tipo?.descripcion ?? '').trim().toLowerCase(),
      ]),
    );

    return usuarios.filter((usuario) => {
      const usuarioSucursal = Number(usuario?.sucursalid ?? usuario?.sucursal ?? 0);
      if (sucursalId && usuarioSucursal !== sucursalId) return false;
      const tipoDesc = tipoMap.get(Number(usuario?.idtipoUsuario ?? usuario?.idtipousuario ?? 0)) || '';
      const esTipoVendedor = tipoDesc.includes('vendedor') || tipoDesc.includes('venta');
      const flagVendedor = usuario?.vendedor === true || String(usuario?.vendedor ?? '').toUpperCase() === 'S';
      const codigoVendedor = String(usuario?.claveUsuario ?? usuario?.claveusuario ?? '').trim();
      return esTipoVendedor || flagVendedor || !!codigoVendedor;
    });
  }

  private mapFacturasRecientes(facturas: any[]): FacturaReciente[] {
    return [...facturas]
      .sort((a, b) => String(b?.fa_fecFact ?? b?.fa_fecfact ?? '').localeCompare(String(a?.fa_fecFact ?? a?.fa_fecfact ?? '')))
      .slice(0, 12)
      .map((factura) => {
        const fpago = String(factura?.fa_fpago ?? '').trim().toUpperCase();
        const pendiente = String(factura?.fa_pendiente ?? '').trim().toUpperCase();
        const estado: FacturaReciente['estado'] =
          fpago === 'S' ? 'Cobrada' : pendiente === 'P' ? 'Pendiente' : 'En ruta';
        const codfpago = String(factura?.fa_codfpago ?? '').trim();
        return {
          numero: String(factura?.fa_codFact ?? factura?.fa_codfact ?? ''),
          ncf: String(factura?.fa_ncfFact ?? factura?.fa_ncffact ?? '-'),
          cliente: String(factura?.fa_nomClie ?? factura?.fa_nomclie ?? ''),
          rnc: String(factura?.fa_rncFact ?? factura?.fa_rncfact ?? '-'),
          fecha: String(factura?.fa_fecFact ?? factura?.fa_fecfact ?? '').slice(0, 10),
          condicion: codfpago === '2' ? 'Crédito' : 'Contado',
          monto: this.toNumber(factura?.fa_valFact ?? factura?.fa_valfact),
          estado,
        };
      });
  }

  private construirTopVendedores(facturas: any[], usuarios: any[], tipos: any[], metaMensual: number): VendedorGlobal[] {
    const vendedores = this.filtrarVendedoresSucursal(usuarios, tipos, 0);
    const nombrePorCodigo = new Map<string, string>();
    vendedores.forEach((usuario) => {
      const claves = [
        usuario?.claveUsuario,
        usuario?.claveusuario,
        usuario?.codUsuario,
        usuario?.codusuario,
        usuario?.idUsuario,
        usuario?.idusuario,
      ].map((v) => String(v ?? '').trim()).filter(Boolean);
      claves.forEach((clave) => nombrePorCodigo.set(clave, String(usuario?.nombreUsuario ?? usuario?.nombreusuario ?? usuario?.idUsuario ?? clave)));
    });

    const grupos = new Map<string, VendedorGlobal>();
    facturas.forEach((factura) => {
      const codigo = String(factura?.fa_codVend ?? factura?.fa_codvend ?? factura?.fa_nomVend ?? factura?.fa_nomvend ?? 'SIN VENDEDOR').trim();
      const nombre = String(factura?.fa_nomVend ?? factura?.fa_nomvend ?? nombrePorCodigo.get(codigo) ?? codigo);
      const sucursal = String(factura?.fa_desSucu ?? factura?.sucursal ?? this.sucursalNombre ?? '');
      const actual = grupos.get(codigo) || {
        nombre,
        sucursal,
        facturas: 0,
        facturado: 0,
        cumplimientoPct: 0,
      };
      actual.facturas += 1;
      actual.facturado += this.toNumber(factura?.fa_valFact ?? factura?.fa_valfact);
      grupos.set(codigo, actual);
    });

    const metaPorVendedor = vendedores.length ? metaMensual / vendedores.length : metaMensual;
    return [...grupos.values()]
      .map((vendedor) => ({
        ...vendedor,
        cumplimientoPct: metaPorVendedor ? (vendedor.facturado / metaPorVendedor) * 100 : 0,
      }))
      .sort((a, b) => b.facturado - a.facturado)
      .slice(0, 10);
  }

  private construirFormasPago(facturas: any[]): FormaPagoGlobal[] {
    const grupos = new Map<string, number>();
    facturas.forEach((factura) => {
      const codigo = String(factura?.fa_codfpago ?? factura?.fa_codFpago ?? 'SIN PAGO').trim() || 'SIN PAGO';
      grupos.set(codigo, (grupos.get(codigo) || 0) + this.toNumber(factura?.fa_valFact ?? factura?.fa_valfact));
    });
    return [...grupos.entries()].map(([nombre, monto]) => ({ nombre: `Pago ${nombre}`, monto }));
  }

  private construirAlertas(sucursales: SucursalGlobal[], metaMensual: number, facturadoGeneral: number): string[] {
    const alertas: string[] = [];
    const cumplimiento = metaMensual ? (facturadoGeneral / metaMensual) * 100 : 0;
    if (cumplimiento < 50) {
      alertas.push(`El cumplimiento mensual esta en ${cumplimiento.toFixed(1)}%.`);
    }
    const sinVentas = sucursales.filter((sucursal) => sucursal.facturado <= 0);
    if (sinVentas.length) {
      alertas.push(`${sinVentas.length} sucursal(es) sin ventas registradas este mes.`);
    }
    const pocosVendedores = sucursales.filter((sucursal) => sucursal.vendedores <= 0);
    if (pocosVendedores.length) {
      alertas.push(`${pocosVendedores.length} sucursal(es) sin vendedores asignados.`);
    }
    return alertas.length ? alertas : ['Ventas del mes actualizadas correctamente.'];
  }

  private loadFacturasFromStorage(): FacturaReciente[] {
    const candidates = [
      localStorage.getItem('facturasRecientes'),
      localStorage.getItem('facturacionList'),
      localStorage.getItem('dashboardFacturas'),
    ].filter(Boolean) as string[];

    for (const raw of candidates) {
      const parsed = this.parseStorage(raw);
      if (!Array.isArray(parsed) || !parsed.length) continue;

      const mapped = parsed
        .map((item: any) => {
          const numero = String(item?.numero || item?.fa_codFact || item?.fa_numFact || '').trim();
          const cliente = String(item?.cliente || item?.fa_nomClie || '').trim();
          const fecha = String(item?.fecha || item?.fa_fecFact || '').trim();
          const montoRaw = Number(item?.monto || item?.fa_valFact || item?.total || 0);
          if (!numero || !cliente || !fecha || !Number.isFinite(montoRaw)) return null;

          const estadoRaw = String(item?.estado || item?.fa_estatus || item?.status || '').toLowerCase();
          const estado: FacturaReciente['estado'] =
            estadoRaw.includes('ruta') ? 'En ruta' :
            estadoRaw.includes('pend') ? 'Pendiente' : 'Cobrada';

          const condicionRaw = String(item?.condicion || item?.fa_condicion || item?.tipoPago || '').toLowerCase();
          const condicion: FacturaReciente['condicion'] =
            condicionRaw.includes('cred') ? 'Crédito' : 'Contado';

          return {
            numero,
            ncf: String(item?.ncf || item?.fa_ncfFact || item?.fa_ncf || '-'),
            cliente,
            rnc: String(item?.rnc || item?.fa_rncFact || '-'),
            fecha: fecha.slice(0, 10),
            condicion,
            monto: montoRaw,
            estado,
          } as FacturaReciente;
        })
        .filter(Boolean) as FacturaReciente[];

      if (mapped.length) {
        return mapped.slice(0, 12);
      }
    }

    return [];
  }

  private toObfuscatedMillions(value: number): string {
    const approx = Math.floor((value / 1000000) * 10) / 10;
    return approx.toFixed(2);
  }

  private parseStorage(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
