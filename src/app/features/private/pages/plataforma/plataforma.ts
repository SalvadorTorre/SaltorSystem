import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  DetalleVentasPlataforma,
  EmpresaPlataforma,
  PreparacionPendientePlataforma,
  ResumenVentasPlataforma,
  ServicioPlataforma,
} from 'src/app/core/services/plataforma/plataforma.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';

interface FormAdmin {
  idUsuario: string;
  nombreUsuario: string;
  claveUsuario: string;
  correo: string;
  sucursalid: number | null;
  idtipoUsuario: number | null;
}

@Component({
  selector: 'app-plataforma',
  templateUrl: './plataforma.html',
  styleUrls: ['./plataforma.css'],
})
export class PlataformaComponent implements OnInit {
  seccionActiva: 'plataforma' | 'ventas' = 'plataforma';
  empresas: EmpresaPlataforma[] = [];
  filtro = '';
  filtroEstado: 'todas' | 'activas' | 'suspendidas' = 'todas';
  cargando = false;
  error = '';
  procesando: string | null = null;
  empresaActual = String(localStorage.getItem('cod_empre') || localStorage.getItem('codigoempresa') || '').trim();

  // Crear usuario administrador
  empresaAdmin: EmpresaPlataforma | null = null;
  sucursalesAdmin: any[] = [];
  tiposUsuario: any[] = [];
  formAdmin: FormAdmin = this.formAdminVacio();
  guardandoAdmin = false;

  sucursalesVentas: any[] = [];
  cargandoSucursalesVentas = false;
  cargandoVentas = false;
  ventasConsultadas = false;
  errorVentas = '';
  resumenVentas: ResumenVentasPlataforma | null = null;
  filtrosVentas = {
    empresa: '',
    sucursal: null as number | null,
    fechaDesde: '',
    fechaHasta: '',
  };
  mostrarCrearPendiente = false;
  montoPendiente: number | null = null;
  preparandoPendiente = false;
  confirmandoPendiente = false;
  preparacionPendiente: PreparacionPendientePlataforma | null = null;
  errorPendiente = '';
  private temporizadorPendiente: ReturnType<typeof setTimeout> | null = null;
  private secuenciaPendiente = 0;

  constructor(
    private readonly plataforma: ServicioPlataforma,
    private readonly auth: AuthService,
    private readonly access: AccessControlService,
    private readonly usuarios: ServicioUsuario,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.establecerPeriodoMesActual();
    this.cargar();
    this.verificarAlertaMesAnterior();
  }

  cambiarSeccion(seccion: 'plataforma' | 'ventas'): void {
    this.seccionActiva = seccion;
    if (seccion === 'ventas' && !this.ventasConsultadas) {
      this.consultarVentas();
    }
  }

  private establecerPeriodoMesActual(): void {
    const hoy = new Date();
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtrosVentas.fechaDesde = this.fechaInput(primero);
    this.filtrosVentas.fechaHasta = this.fechaInput(hoy);
  }

  private fechaInput(fecha: Date): string {
    const ano = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  cambiarEmpresaVentas(): void {
    this.filtrosVentas.sucursal = null;
    this.sucursalesVentas = [];
    const empresa = this.filtrosVentas.empresa;
    if (!empresa) return;

    this.cargandoSucursalesVentas = true;
    this.plataforma.listarSucursales(empresa).subscribe({
      next: (rows) => {
        this.sucursalesVentas = rows;
        this.cargandoSucursalesVentas = false;
      },
      error: (err) => {
        this.cargandoSucursalesVentas = false;
        this.errorVentas = String(err?.message || 'No se pudieron cargar las sucursales.');
      },
    });
  }

  consultarVentas(): void {
    this.errorVentas = '';
    const { fechaDesde, fechaHasta } = this.filtrosVentas;
    if (!fechaDesde || !fechaHasta) {
      this.errorVentas = 'Seleccione la fecha inicial y la fecha final.';
      return;
    }
    if (fechaDesde > fechaHasta) {
      this.errorVentas = 'La fecha inicial no puede ser mayor que la fecha final.';
      return;
    }

    this.cargandoVentas = true;
    this.plataforma.consultarVentas(this.filtrosVentas).subscribe({
      next: (resumen) => {
        this.resumenVentas = resumen;
        this.ventasConsultadas = true;
        this.cargandoVentas = false;
      },
      error: (err) => {
        this.resumenVentas = null;
        this.ventasConsultadas = true;
        this.cargandoVentas = false;
        this.errorVentas = String(err?.message || 'No se pudo consultar el resumen de ventas.');
      },
    });
  }

  abrirCrearPendiente(): void {
    if (!this.filtrosVentas.empresa || !this.filtrosVentas.sucursal) {
      Swal.fire(
        'Empresa y sucursal requeridas',
        'Seleccione una empresa y una sucursal antes de crear el pendiente.',
        'warning',
      );
      return;
    }
    this.montoPendiente = null;
    this.preparacionPendiente = null;
    this.errorPendiente = '';
    this.mostrarCrearPendiente = true;
  }

  cerrarCrearPendiente(): void {
    if (this.confirmandoPendiente) return;
    if (this.temporizadorPendiente) clearTimeout(this.temporizadorPendiente);
    this.secuenciaPendiente++;
    this.mostrarCrearPendiente = false;
    this.preparandoPendiente = false;
    this.preparacionPendiente = null;
    this.errorPendiente = '';
  }

  programarPreparacionPendiente(): void {
    this.preparacionPendiente = null;
    this.errorPendiente = '';
    if (this.temporizadorPendiente) clearTimeout(this.temporizadorPendiente);
    const monto = Number(this.montoPendiente || 0);
    if (monto <= 0) {
      this.preparandoPendiente = false;
      return;
    }
    this.temporizadorPendiente = setTimeout(() => this.prepararPendiente(), 450);
  }

  prepararPendiente(): void {
    const empresa = this.filtrosVentas.empresa;
    const sucursal = Number(this.filtrosVentas.sucursal || 0);
    const monto = Number(this.montoPendiente || 0);
    if (!empresa || !sucursal || monto <= 0) return;

    const secuencia = ++this.secuenciaPendiente;
    this.preparandoPendiente = true;
    this.errorPendiente = '';
    this.plataforma.prepararPendiente({ empresa, sucursal, monto }).subscribe({
      next: (resultado) => {
        if (secuencia !== this.secuenciaPendiente) return;
        this.preparacionPendiente = resultado;
        this.preparandoPendiente = false;
        if (!resultado.cantidad) {
          this.errorPendiente = 'No hay conduces en efectivo disponibles para esta sucursal.';
        }
      },
      error: (err) => {
        if (secuencia !== this.secuenciaPendiente) return;
        this.preparacionPendiente = null;
        this.preparandoPendiente = false;
        this.errorPendiente = String(err?.message || 'No se pudo preparar la selección.');
      },
    });
  }

  async confirmarCreacionPendiente(): Promise<void> {
    const seleccion = this.preparacionPendiente;
    const empresa = this.filtrosVentas.empresa;
    const sucursal = Number(this.filtrosVentas.sucursal || 0);
    const monto = Number(this.montoPendiente || 0);
    if (!seleccion?.cantidad || !empresa || !sucursal || monto <= 0) return;

    const confirmacion = await Swal.fire({
      title: 'Cambiar conduces a pendiente',
      text: `Se cambiarán ${seleccion.cantidad} conduces por RD$ ${seleccion.suma_seleccionada.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, proceder',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.confirmandoPendiente = true;
    this.errorPendiente = '';
    this.plataforma.confirmarPendiente({ empresa, sucursal, monto }).subscribe({
      next: async (resultado) => {
        this.confirmandoPendiente = false;
        this.mostrarCrearPendiente = false;
        this.preparacionPendiente = null;
        await Swal.fire(
          'Pendiente creado',
          `${resultado.cantidad} conduces fueron cambiados a pendiente por RD$ ${Number(resultado.suma_seleccionada || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`,
          'success',
        );
        this.consultarVentas();
      },
      error: (err) => {
        this.confirmandoPendiente = false;
        this.errorPendiente = String(err?.message || 'No se pudieron cambiar los conduces a pendiente.');
      },
    });
  }

  private verificarAlertaMesAnterior(): void {
    this.plataforma.consultarAlertaConducesMesAnterior().subscribe({
      next: (alerta) => {
        if (!alerta.activa || alerta.cantidad <= 0) return;
        void Swal.fire({
          title: 'Conduces del mes anterior',
          text: `Quedan ${alerta.cantidad} conduces sin facturar ni marcar como pendiente, por un valor de RD$ ${alerta.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`,
          icon: 'warning',
          confirmButtonText: 'Revisar',
        });
      },
      error: (err) => console.warn('[Plataforma] No se pudo verificar la alerta mensual.', err),
    });
  }

  etiquetaAgrupacion(): string {
    if (this.resumenVentas?.agrupacion === 'semana') return 'Detalle por semana';
    if (this.resumenVentas?.agrupacion === 'mes') return 'Detalle por mes';
    return 'Detalle por día';
  }

  etiquetaPeriodo(fila: DetalleVentasPlataforma): string {
    const inicio = this.fechaVisual(fila.periodo_inicio);
    const fin = this.fechaVisual(fila.periodo_fin);
    if (this.resumenVentas?.agrupacion === 'dia' || fila.periodo_inicio === fila.periodo_fin) {
      return inicio;
    }
    return `${inicio} – ${fin}`;
  }

  fechaVisual(valor: string): string {
    if (!valor) return '—';
    const [ano, mes, dia] = valor.slice(0, 10).split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.plataforma.listarEmpresas().subscribe({
      next: (rows) => {
        this.empresas = rows;
        this.cargando = false;
      },
      error: (err) => {
        this.error = String(err?.message || 'No se pudieron cargar las empresas');
        this.cargando = false;
      },
    });
  }

  get empresasFiltradas(): EmpresaPlataforma[] {
    const texto = this.filtro.trim().toLowerCase();
    return this.empresas.filter((e) => {
      if (this.filtroEstado === 'activas' && !e.activa) return false;
      if (this.filtroEstado === 'suspendidas' && e.activa) return false;
      if (!texto) return true;
      return [e.cod_empre, e.nom_empre, e.rnc_empre]
        .some((v) => String(v || '').toLowerCase().includes(texto));
    });
  }

  get totalActivas(): number {
    return this.empresas.filter((e) => e.activa).length;
  }

  get totalSuspendidas(): number {
    return this.empresas.filter((e) => !e.activa).length;
  }

  get ventasMesTotal(): number {
    return this.empresas.reduce((s, e) => s + (Number(e.ventas_mes) || 0), 0);
  }

  get facturasMesTotal(): number {
    return this.empresas.reduce((s, e) => s + (Number(e.facturas_mes) || 0), 0);
  }

  esActual(e: EmpresaPlataforma): boolean {
    return !!this.empresaActual && e.cod_empre === this.empresaActual;
  }

  async cambiarEstado(e: EmpresaPlataforma): Promise<void> {
    if (e.activa) {
      const r = await Swal.fire({
        title: `Suspender ${e.nom_empre}`,
        text: 'Sus usuarios no podrán iniciar sesión hasta que la actives otra vez.',
        input: 'text',
        inputLabel: 'Motivo (opcional)',
        inputPlaceholder: 'Ej.: pago pendiente',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Suspender',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
      });
      if (!r.isConfirmed) return;
      this.aplicarEstado(e, false, String(r.value || ''));
    } else {
      const r = await Swal.fire({
        title: `Activar ${e.nom_empre}`,
        text: 'Sus usuarios podrán volver a iniciar sesión.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Activar',
        cancelButtonText: 'Cancelar',
      });
      if (!r.isConfirmed) return;
      this.aplicarEstado(e, true);
    }
  }

  private aplicarEstado(e: EmpresaPlataforma, activa: boolean, motivo = ''): void {
    this.procesando = e.cod_empre;
    this.plataforma.cambiarEstadoEmpresa(e.cod_empre, activa, motivo).subscribe({
      next: (row: any) => {
        e.activa = row?.activa !== false;
        e.motivo_suspension = row?.motivo_suspension ?? null;
        e.fecha_suspension = row?.fecha_suspension ?? null;
        this.procesando = null;
        Swal.fire({
          icon: 'success',
          title: activa ? 'Empresa activada' : 'Empresa suspendida',
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.procesando = null;
        Swal.fire('Error', String(err?.message || err), 'error');
      },
    });
  }

  entrar(e: EmpresaPlataforma): void {
    this.procesando = e.cod_empre;
    this.plataforma.listarSucursales(e.cod_empre).subscribe({
      next: async (sucursales) => {
        this.procesando = null;
        if (!sucursales.length) {
          Swal.fire('Sin sucursales', 'Esta empresa no tiene sucursales. Créala primero en Administrar empresas.', 'warning');
          return;
        }
        const opciones: Record<string, string> = {};
        sucursales.forEach((s: any) => {
          opciones[String(s.cod_sucursal)] = `${s.cod_sucursal} - ${s.nom_sucursal}`;
        });
        const r = await Swal.fire({
          title: `Entrar a ${e.nom_empre}`,
          text: 'Trabajarás dentro de esta empresa hasta que cambies otra vez desde Plataforma.',
          input: 'select',
          inputOptions: opciones,
          inputValue: String(sucursales[0].cod_sucursal),
          showCancelButton: true,
          confirmButtonText: 'Entrar',
          cancelButtonText: 'Cancelar',
        });
        if (!r.isConfirmed) return;
        this.ejecutarEntrada(e, Number(r.value));
      },
      error: (err) => {
        this.procesando = null;
        Swal.fire('Error', String(err?.message || err), 'error');
      },
    });
  }

  private ejecutarEntrada(e: EmpresaPlataforma, sucursalId: number): void {
    this.procesando = e.cod_empre;
    this.plataforma.entrarEmpresa(e.cod_empre, sucursalId).subscribe({
      next: async () => {
        await this.auth.refreshCurrentUserProfile(true);
        this.access.reset();
        await this.router.navigateByUrl('/private/home');
        window.location.reload();
      },
      error: (err) => {
        this.procesando = null;
        Swal.fire('Error', String(err?.message || err), 'error');
      },
    });
  }

  // ---- Usuario administrador ----

  private formAdminVacio(): FormAdmin {
    return {
      idUsuario: '',
      nombreUsuario: '',
      claveUsuario: '',
      correo: '',
      sucursalid: null,
      idtipoUsuario: null,
    };
  }

  abrirAdmin(e: EmpresaPlataforma): void {
    this.empresaAdmin = e;
    this.formAdmin = this.formAdminVacio();
    this.sucursalesAdmin = [];
    this.plataforma.listarSucursales(e.cod_empre).subscribe({
      next: (rows) => {
        this.sucursalesAdmin = rows;
        if (rows.length) this.formAdmin.sucursalid = Number(rows[0].cod_sucursal);
      },
      error: () => (this.sucursalesAdmin = []),
    });
    if (!this.tiposUsuario.length) {
      this.plataforma.listarTiposUsuario().subscribe({
        next: (rows) => {
          this.tiposUsuario = rows;
          this.seleccionarTipoAdmin();
        },
        error: () => (this.tiposUsuario = []),
      });
    } else {
      this.seleccionarTipoAdmin();
    }
  }

  private seleccionarTipoAdmin(): void {
    const admin = this.tiposUsuario.find((t: any) =>
      String(t?.descripcion || '').toLowerCase().includes('admin'),
    );
    this.formAdmin.idtipoUsuario = Number(admin?.id ?? 2);
  }

  cerrarAdmin(): void {
    if (this.guardandoAdmin) return;
    this.empresaAdmin = null;
  }

  guardarAdmin(): void {
    const e = this.empresaAdmin;
    if (!e) return;
    const f = this.formAdmin;
    if (!f.idUsuario.trim() || !f.nombreUsuario.trim()) {
      Swal.fire('Datos requeridos', 'Indique el usuario y el nombre.', 'warning');
      return;
    }
    if (String(f.claveUsuario || '').trim().length !== 4) {
      Swal.fire('Clave inválida', 'La clave debe tener exactamente 4 caracteres.', 'warning');
      return;
    }
    if (!f.sucursalid) {
      Swal.fire('Sucursal requerida', 'La empresa necesita al menos una sucursal.', 'warning');
      return;
    }

    this.guardandoAdmin = true;
    const payload: any = {
      idUsuario: f.idUsuario.trim(),
      nombreUsuario: f.nombreUsuario.trim(),
      claveUsuario: f.claveUsuario.trim(),
      correo: f.correo.trim() || null,
      sucursalid: Number(f.sucursalid),
      idtipoUsuario: Number(f.idtipoUsuario || 2),
      cod_empre: e.cod_empre,
      nivel: 1,
      metaVenta: 0,
    };
    this.usuarios.guardarUsuario(payload).subscribe({
      next: () => {
        this.guardandoAdmin = false;
        this.empresaAdmin = null;
        e.usuarios = Number(e.usuarios || 0) + 1;
        Swal.fire('Usuario creado', `El usuario ${payload.idUsuario} ya puede entrar a ${e.nom_empre}.`, 'success');
      },
      error: (err) => {
        this.guardandoAdmin = false;
        Swal.fire('Error', String(err?.message || err), 'error');
      },
    });
  }
}
