import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  EmpresaPlataforma,
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

  constructor(
    private readonly plataforma: ServicioPlataforma,
    private readonly auth: AuthService,
    private readonly access: AccessControlService,
    private readonly usuarios: ServicioUsuario,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargar();
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
