import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { PrintingService } from 'src/app/core/services/utils/printing.service';

@Component({
  selector: 'app-pendienteentrega',
  templateUrl: './pendienteentrega.html',
  styleUrls: []
})
export class PendienteEntregaComponent implements OnInit {
  filtroForm!: FormGroup;
  listaPendientes: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  maxPagesToShow = 5;
  tituloModalConsulta = 'Consulta Factura';
  facturaConsulta: any = null;
  detalleConsulta: any[] = [];
  nuevoPendienteNumero = '';
  nuevoPendienteFactura: any = null;
  nuevoPendienteDetalle: any[] = [];
  seleccionPendiente: { [key: string]: boolean } = {};
  cantidadPendiente: { [key: string]: number } = {};
  initialPendiente: { [key: string]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private facturacionSrv: ServicioFacturacion,
    private printing: PrintingService
  ) {}

  ngOnInit(): void {
    this.filtroForm = this.fb.group({
      numero: [''],
      cliente: [''],
      fecha: ['']
    });
    this.cargarPendientesListado(1);
  }

  tieneFiltro(): boolean {
    const { numero, cliente, fecha } = this.filtroForm.getRawValue();
    return !!(String(numero || '').trim() || String(cliente || '').trim() || String(fecha || '').trim());
  }

  buscar(): void {
    if (this.tieneFiltro()) {
      this.cargarPendientes(1);
    } else {
      this.cargarPendientesListado(1);
    }
  }

  limpiar(): void {
    this.filtroForm.reset({ numero: '', cliente: '', fecha: '' });
    this.cargarPendientesListado(1);
  }

  abrirModalConsulta(item: any): void {
    const cod = String(item?.fa_codFact || '').trim();
    if (!cod) return;
    this.tituloModalConsulta = `Consulta Factura ${cod}`;
    this.facturaConsulta = null;
    this.detalleConsulta = [];
    this.facturacionSrv.buscarFacturaDetallePendiente(cod).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data?.rows) ? resp.data.rows :
                     Array.isArray(resp?.data) ? resp.data :
                     (Array.isArray(resp) ? resp : []);
        // Si la API devuelve objeto con facturacion y detalle, normalizamos
        const detalle = Array.isArray(rows) ? rows :
          (Array.isArray(resp?.detalle) ? resp.detalle : []);
        this.facturaConsulta = {
          fa_codFact: item.fa_codFact,
          fa_nomClie: item.fa_nomClie,
          fa_fecFact: item.fa_fecFact,
          fa_valFact: item.fa_valFact,
          fa_nomVend: item.fa_nomVend
        };
        this.detalleConsulta = detalle.map((d: any) => ({
          cod: d.df_codMerc ?? d.df_codmerc ?? d.dc_codmerc ?? d.in_codmerc ?? '',
          des: d.df_desMerc ?? d.df_desmerc ?? d.dc_descrip ?? d.in_desmerc ?? '',
          cantidad: Number(d.df_canMerc ?? d.df_canmerc ?? d.dc_cantida ?? d.cantidad ?? 0),
          precio: Number(d.df_preMerc ?? d.df_premerc ?? d.dc_precio ?? d.precio ?? 0),
          total: Number(d.df_valMerc ?? d.df_valmerc ?? d.dc_valor ?? d.total ?? 0),
          unidad: String(d.df_unidad ?? d.unidad ?? '')
        }));
        setTimeout(() => { (window as any).$?.('#modalConsultaPendiente')?.modal('show'); }, 50);
      },
      error: () => {
        Swal.fire({ title: 'Error', text: 'No se pudo consultar la factura', icon: 'error' });
      }
    });
  }

  abrirModalNuevoPendiente(): void {
    this.nuevoPendienteNumero = '';
    this.nuevoPendienteFactura = null;
    this.nuevoPendienteDetalle = [];
    this.seleccionPendiente = {};
    setTimeout(() => { (window as any).$?.('#modalNuevoPendiente')?.modal('show'); }, 50);
  }

  buscarNuevoPendiente(): void {
    const cod = String(this.nuevoPendienteNumero || '').trim();
    if (!cod) return;
    this.facturacionSrv.getByNumero(cod).subscribe({
      next: (h: any) => {
        const d = Array.isArray(h?.data) ? h.data[0] : (Array.isArray(h) ? h[0] : h?.data || h);
        this.nuevoPendienteFactura = d ? {
          fa_codFact: d.fa_codFact ?? cod,
          fa_nomClie: d.fa_nomClie ?? '',
          fa_fecFact: d.fa_fecFact ?? '',
          fa_valFact: d.fa_valFact ?? 0,
          fa_nomVend: d.fa_nomVend ?? ''
        } : { fa_codFact: cod };
      },
      error: () => {
        this.nuevoPendienteFactura = { fa_codFact: cod };
      }
    });
    this.facturacionSrv.buscarFacturaDetallePendiente(cod).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data?.rows) ? resp.data.rows :
                     Array.isArray(resp?.data) ? resp.data :
                     (Array.isArray(resp) ? resp : []);
        this.nuevoPendienteDetalle = rows.map((d: any) => {
          const codm = d.df_codMerc ?? d.df_codmerc ?? d.dc_codmerc ?? d.in_codmerc ?? '';
          const des = d.df_desMerc ?? d.df_desmerc ?? d.dc_descrip ?? d.in_desmerc ?? '';
          const cantidad = Number(d.df_canMerc ?? d.df_canmerc ?? d.dc_cantida ?? d.cantidad ?? 0);
          const precio = Number(d.df_preMerc ?? d.df_premerc ?? d.dc_precio ?? d.precio ?? 0);
          const total = Number(d.df_valMerc ?? d.df_valmerc ?? d.dc_valor ?? d.total ?? 0);
          const unidad = String(d.df_unidad ?? d.unidad ?? '');
          const canpend = Number(d.df_canpend ?? d.canpend ?? 0);
          const pendienteFlag = String(d.df_pendiente ?? d.pendiente ?? '').toUpperCase();
          const pendiente = pendienteFlag === 'P' || canpend > 0;
          this.initialPendiente[codm] = pendiente;
          this.seleccionPendiente[codm] = pendiente;
          this.cantidadPendiente[codm] = pendiente ? (canpend > 0 ? canpend : cantidad) : (canpend > 0 ? canpend : 0);
          return { cod: codm, des, cantidad, precio, total, unidad, canpend, pendiente };
        });
      },
      error: () => {
        this.nuevoPendienteDetalle = [];
      }
    });
  }

  toggleSeleccion(cod: string, checked: boolean): void {
    // No permitir editar líneas que ya están pendientes inicialmente
    if (this.initialPendiente[cod]) {
      this.seleccionPendiente[cod] = true;
      return;
    }
    const item = this.nuevoPendienteDetalle.find((x) => x.cod === cod);
    const max = Number(item?.cantidad || 0);
    if (checked) {
      Swal.fire({
        title: 'Cantidad pendiente',
        input: 'number',
        inputValue: this.cantidadPendiente[cod] ?? max,
        inputAttributes: { min: '0', max: String(max), step: '1' },
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar'
      }).then((r) => {
        if (!r.isConfirmed) {
          this.seleccionPendiente[cod] = false;
          this.cantidadPendiente[cod] = 0;
          return;
        }
        const val = Number(r.value || 0);
        if (isNaN(val) || val < 0 || val > max) {
          Swal.fire({ title: 'Valor inválido', text: `Debe ser entre 0 y ${max}`, icon: 'error' });
          this.seleccionPendiente[cod] = false;
          this.cantidadPendiente[cod] = 0;
          return;
        }
        this.seleccionPendiente[cod] = true;
        this.cantidadPendiente[cod] = val;
      });
      return;
    }
    // Al desmarcar una línea no inicial, simplemente dejar en 0
    this.seleccionPendiente[cod] = false;
    this.cantidadPendiente[cod] = 0;
  }

  seleccionarTodo(valor: boolean): void {
    this.nuevoPendienteDetalle.forEach((d) => {
      if (this.initialPendiente[d.cod]) {
        this.seleccionPendiente[d.cod] = true;
        this.cantidadPendiente[d.cod] = Number(d.canpend || d.cantidad || 0);
      } else {
        this.seleccionPendiente[d.cod] = valor;
        this.cantidadPendiente[d.cod] = valor ? Number(d.cantidad || 0) : 0;
      }
    });
  }
  
  clampCantidad(cod: string): void {
    const item = this.nuevoPendienteDetalle.find((x) => x.cod === cod);
    const max = Number(item?.cantidad || 0);
    let val = Number(this.cantidadPendiente[cod] || 0);
    if (isNaN(val) || val < 0) val = 0;
    if (val > max) val = max;
    this.cantidadPendiente[cod] = val;
  }

  crearNuevoPendiente(): void {
    const cod = String(this.nuevoPendienteNumero || '').trim();
    if (!cod) return;
    this.facturacionSrv.actutalizarPendienteNuevo(cod).subscribe({
      next: () => {
        (window as any).$?.('#modalNuevoPendiente')?.modal('hide');
        Swal.fire({ title: 'Creado', text: `Se agregó ${cod} a pendientes`, icon: 'success', timer: 1800, showConfirmButton: false });
        this.cargarPendientesListado(this.currentPage);
      },
      error: () => {
        Swal.fire({ title: 'Error', text: 'No se pudo crear el pendiente', icon: 'error' });
      }
    });
  }

  cargarPendientes(page: number): void {
    this.currentPage = page;
    // Para este listado usamos el endpoint de pendientes del backend
    this.facturacionSrv.buscarFacturacionPendiente(this.currentPage, this.pageSize).subscribe({
      next: (resp: any) => {
        const dataRows =
          Array.isArray(resp?.data?.rows) ? resp.data.rows :
          Array.isArray(resp?.rows) ? resp.rows :
          Array.isArray(resp?.data) ? resp.data :
          (Array.isArray(resp) ? resp : []);
        const { numero, cliente, fecha } = this.filtroForm.getRawValue();
        this.listaPendientes = this.aplicarFiltroLocal(dataRows, String(numero || ''), String(cliente || ''), String(fecha || ''));
        const total = resp?.data?.pagination?.total ?? resp?.pagination?.total ?? this.listaPendientes.length;
        this.totalItems = Number(total || 0);
      },
      error: () => {
        this.listaPendientes = [];
        this.totalItems = 0;
      }
    });
  }

  cargarPendientesListado(page: number): void {
    this.currentPage = page;
    this.facturacionSrv.buscarFacturacionPendiente(this.currentPage, this.pageSize).subscribe({
      next: (resp: any) => {
        const dataRows =
          Array.isArray(resp?.data?.rows) ? resp.data.rows :
          Array.isArray(resp?.rows) ? resp.rows :
          Array.isArray(resp?.data) ? resp.data :
          (Array.isArray(resp) ? resp : []);
        this.listaPendientes = dataRows;
        const total = resp?.data?.pagination?.total ?? resp?.pagination?.total ?? this.listaPendientes.length;
        this.totalItems = Number(total || 0);
      },
      error: () => {
        this.listaPendientes = [];
        this.totalItems = 0;
      }
    });
  }

  aplicarFiltroLocal(items: any[], numero: string, cliente: string, fecha: string): any[] {
    const n = (numero || '').toLowerCase();
    const c = (cliente || '').toLowerCase();
    const f = (fecha || '');
    return (items || []).filter((x: any) => {
      const num = String(x.fa_codFact ?? x.codigo ?? '').toLowerCase();
      const nom = String(x.fa_nomClie ?? x.cliente ?? '').toLowerCase();
      const fec = String(x.fa_fecFact ?? x.fecha ?? '');
      const byNum = n ? num.includes(n) : true;
      const byNom = c ? nom.includes(c) : true;
      const byFec = f ? fec.startsWith(f) : true;
      return byNum && byNom && byFec;
    });
  }

  marcarEntregada(item: any): void {
    const cod = String(item.fa_codFact || item.codigo || '').trim();
    if (!cod) return;
    Swal.fire({
      title: '¿Marcar como entregada?',
      text: `Factura ${cod}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar',
      cancelButtonText: 'Cancelar'
    }).then((r) => {
      if (r.isConfirmed) {
        this.facturacionSrv.actualizarEntregaFactura(cod, 'E').subscribe({
          next: () => {
            Swal.fire({ title: 'Actualizada', text: `Factura ${cod} marcada como entregada`, icon: 'success', timer: 1800, showConfirmButton: false });
            this.cargarPendientesListado(this.currentPage);
          },
          error: () => Swal.fire({ title: 'Error', text: 'No se pudo actualizar', icon: 'error' })
        });
      }
    });
  }

  imprimir(item: any): void {
    // Usa el formato tipo conduce con cliente y valor
    const ventaData = {
      fa_codFact: item.fa_codFact,
      fa_fecFact: item.fa_fecFact,
      fa_nomClie: item.fa_nomClie,
      fa_valFact: item.fa_valFact,
      fa_nomVend: item.fa_nomVend
    };
    // Para simplificar, imprimimos sin detalle. Puedes cargar detalle si deseas.
    this.printing.imprimirVentainterna80mm(ventaData, []);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.totalItems || 0) / (this.pageSize || 1)));
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const max = this.maxPagesToShow;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, current - Math.floor(max / 2));
    const end = Math.min(total, start + max - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  changePage(p: number): void {
    const page = Math.min(Math.max(1, p), this.totalPages);
    if (this.tieneFiltro()) this.cargarPendientes(page);
    else this.cargarPendientesListado(page);
  }
}
