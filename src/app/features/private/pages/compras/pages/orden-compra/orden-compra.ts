import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import {
  OrdenCompra,
  OrdenCompraDetalle,
  ServicioOrdenCompra,
} from 'src/app/core/services/compras/orden-compra.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface LineaOrden extends OrdenCompraDetalle {
  uid: number;
}

@Component({
  selector: 'app-orden-compra',
  templateUrl: './orden-compra.html',
  styleUrls: ['./orden-compra.css'],
})
export class OrdenCompraComponent implements OnInit {
  tab: 'nueva' | 'consulta' = 'nueva';

  readonly condicionesPago = ['Crédito', 'Contado'];

  /** Codigo y nombre del usuario conectado (se guarda en codusuario). */
  readonly usuarioTexto = [
    String(localStorage.getItem('codigousuario') || '').trim(),
    String(localStorage.getItem('username') || '').trim(),
  ].filter(Boolean).join(' - ');
  readonly estados: Record<string, string> = { P: 'Pendiente', R: 'Recibida', A: 'Anulada' };

  // ---- Nueva / editar orden ----
  orden: OrdenCompra = this.ordenVacia();
  lineas: LineaOrden[] = [];
  private uid = 1;
  guardando = false;
  soloLectura = false;

  textoSuplidor = '';
  suplidores: any[] = [];
  /** Fila resaltada en la lista de suplidores (flechas arriba/abajo). */
  indiceSuplidor = 0;
  /** Fila resaltada en la lista de productos (flechas arriba/abajo). */
  indiceProducto = 0;
  buscandoSuplidor = false;
  private timerSuplidor: any = null;

  // Captura de producto
  capturaCodigo = '';
  capturaDescripcion = '';
  capturaCantidad = 1;
  capturaCosto = 0;
  productos: any[] = [];
  buscandoProducto = false;
  private timerProducto: any = null;

  // ---- Empresas y sucursales (la orden se hace para cualquier empresa) ----
  empresas: any[] = [];
  sucursales: any[] = [];

  sucursalesDe(codEmpre: any): any[] {
    const empresa = String(codEmpre || '').trim().toUpperCase();
    if (!empresa) return [];
    return this.sucursales.filter(
      (s) => String(s?.cod_empre || '').trim().toUpperCase() === empresa,
    );
  }

  nombreEmpresa(codEmpre: any): string {
    const cod = String(codEmpre || '').trim().toUpperCase();
    const e = this.empresas.find((x) => String(x?.cod_empre || '').trim().toUpperCase() === cod);
    return e?.nom_empre || String(codEmpre || '');
  }

  nombreSucursal(codSucursal: any): string {
    const s = this.sucursales.find((x) => Number(x?.cod_sucursal) === Number(codSucursal));
    return s?.nom_sucursal || String(codSucursal || '');
  }

  /** Empresa y sucursal elegidas: requisito para buscar productos y guardar. */
  get destinoElegido(): boolean {
    return !!String(this.orden.codempresa || '').trim() && Number(this.orden.codsucursal) > 0;
  }

  /** No se cambia la empresa/sucursal con productos cargados o una orden ya guardada. */
  get destinoBloqueado(): boolean {
    return this.soloLectura || !!this.orden.codorden || this.lineas.length > 0;
  }

  /** Pone el foco (y selecciona el texto) en el campo con ese id. */
  private enfocar(id: string): void {
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (!el || el.disabled) return;
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }, 30);
  }

  /** Al entrar a Cantidad o Costo se selecciona el valor para escribir encima. */
  seleccionarTexto(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    setTimeout(() => input.select(), 0);
  }

  /** Al elegir la empresa pasa a la sucursal (o al suplidor si solo tiene una). */
  onEmpresaOrden(): void {
    const sucursales = this.sucursalesDe(this.orden.codempresa);
    this.orden.codsucursal = sucursales.length === 1 ? Number(sucursales[0].cod_sucursal) : null;
    this.productos = [];
    if (!this.orden.codempresa) return;
    this.enfocar(this.orden.codsucursal ? 'ocSuplidor' : 'ocSucursal');
  }

  /** Al elegir la sucursal pasa al suplidor. */
  onSucursalOrden(): void {
    if (this.orden.codsucursal) this.enfocar('ocSuplidor');
  }

  private cargarCatalogos(): void {
    this.empresas = [];
    this.servicioEmpresa.buscarTodasEmpresa(1, 500).subscribe({
      next: (resp: any) => {
        this.empresas = Array.isArray(resp?.data) ? resp.data : [];
      },
      error: () => (this.empresas = []),
    });
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (resp: any) => {
        this.sucursales = Array.isArray(resp?.data) ? resp.data : [];
      },
      error: () => (this.sucursales = []),
    });
  }

  // ---- Consulta ----
  filtroEmpresa = '';
  filtroSucursal: number | '' = '';
  filtroDesde = '';
  filtroHasta = '';
  filtroTexto = '';
  filtroStatus = '';
  ordenes: OrdenCompra[] = [];
  cargandoConsulta = false;
  consultaRealizada = false;

  constructor(
    private readonly servicio: ServicioOrdenCompra,
    private readonly servicioEmpresa: ServicioEmpresa,
    private readonly servicioSucursal: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    const hoy = new Date();
    this.filtroDesde = this.fechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.filtroHasta = this.fechaIso(hoy);
  }

  // ===================== utilidades =====================
  private fechaIso(fecha: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
  }

  formatearFecha(valor: any): string {
    const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor || '');
  }

  private ordenVacia(): OrdenCompra {
    return {
      codorden: null,
      codempresa: '',
      codsucursal: null,
      fecorden: this.fechaIso(new Date()),
      codsuplidor: null,
      nomsuplidor: '',
      rncsuplidor: '',
      condicionpago: 'Crédito',
      observacion: '',
      status: 'P',
      estadocxp: 'PENDIENTE',
    };
  }

  private redondear(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  subtotalLinea(l: OrdenCompraDetalle): number {
    return this.redondear((Number(l.cantidad) || 0) * (Number(l.costo) || 0));
  }


  get subtotal(): number {
    return this.redondear(this.lineas.reduce((s, l) => s + this.subtotalLinea(l), 0));
  }


  get total(): number {
    // Los costos se digitan con el ITBIS incluido.
    return this.subtotal;
  }

  estadoTexto(status: any): string {
    return this.estados[String(status || '').toUpperCase()] || String(status || '');
  }

  estadoClase(status: any): string {
    const s = String(status || '').toUpperCase();
    if (s === 'A') return 'badge bg-danger';
    if (s === 'R') return 'badge bg-success';
    return 'badge bg-warning text-dark';
  }

  // ===================== Enter = siguiente campo =====================
  /**
   * Enter pasa al siguiente campo habilitado. En suplidor y producto, si hay
   * resultados abiertos, primero toma el primero. En Costo agrega la linea y
   * vuelve al codigo.
   */
  onEnter(event: Event): void {
    const actual = event.target as HTMLElement | null;
    if (!actual || actual.tagName === 'BUTTON' || actual.tagName === 'TEXTAREA') return;
    event.preventDefault();

    const accion = actual.getAttribute('data-enter');
    if (accion === 'producto-codigo') {
      void this.enterEnCodigo();
      return;
    }
    if (accion === 'producto-descripcion') {
      // Con lista abierta toma el resaltado; sin lista, la descripcion es
      // texto libre (ej. "Reparacion de gomas") y pasa a la cantidad.
      if (this.productos.length) {
        this.seleccionarProducto(this.productos[this.indiceProducto] || this.productos[0], true);
      } else {
        this.limpiarBusquedaProducto();
        this.enfocar('ocCapturaCantidad');
      }
      return;
    }
    if (accion === 'suplidor' && this.suplidores.length) {
      this.seleccionarSuplidor(this.suplidores[this.indiceSuplidor] || this.suplidores[0], true);
      return;
    } else if (accion === 'agregar') {
      this.agregarLinea();
      return;
    }

    setTimeout(() => this.enfocarSiguiente(actual), 0);
  }

  private limpiarBusquedaProducto(): void {
    this.productos = [];
    this.busquedaProductoId++;
    this.buscandoProducto = false;
    clearTimeout(this.timerProducto);
  }

  /**
   * Enter en Codigo: vacio -> pasa a Descripcion (articulo libre); con lista
   * abierta -> toma el resaltado; si no, busca el codigo exacto y avisa si no
   * existe.
   */
  private async enterEnCodigo(): Promise<void> {
    const codigo = this.capturaCodigo.trim();
    if (!codigo) {
      this.limpiarBusquedaProducto();
      this.enfocar('ocCapturaDescripcion');
      return;
    }
    if (this.productos.length && this.campoProducto === 'codigo') {
      this.seleccionarProducto(this.productos[this.indiceProducto] || this.productos[0], true);
      return;
    }
    this.limpiarBusquedaProducto();
    try {
      const producto = await firstValueFrom(this.servicio.buscarProductoPorCodigo(codigo));
      if (producto) {
        this.seleccionarProducto(producto, true);
        return;
      }
      await Swal.fire({
        icon: 'warning',
        title: 'Código no existe',
        text: `El código ${codigo} no existe en productos. Verifique el código o déjelo en blanco y escriba la descripción.`,
      });
    } catch (error: any) {
      await Swal.fire('Error', String(error?.message || 'No se pudo buscar el código.'), 'error');
    }
    this.enfocar('ocCapturaCodigo');
  }

  private enfocarSiguiente(actual: HTMLElement): void {
    const contenedor = actual.closest('.oc-card');
    if (!contenedor) return;
    const campos = Array.from(
      contenedor.querySelectorAll<HTMLElement>('input, select'),
    ).filter((el) => {
      const campo = el as HTMLInputElement;
      return !campo.disabled && !campo.readOnly && el.offsetParent !== null && el.tabIndex !== -1;
    });
    const indice = campos.indexOf(actual);
    const siguiente = indice >= 0 ? campos[indice + 1] : null;
    if (siguiente) {
      siguiente.focus();
      if (siguiente instanceof HTMLInputElement) siguiente.select();
    }
  }

  // ===================== suplidor =====================
  private busquedaSuplidorId = 0;

  /** Busqueda por nombre mientras se escribe; ignora respuestas viejas. */
  onTextoSuplidor(): void {
    clearTimeout(this.timerSuplidor);
    const texto = this.textoSuplidor.trim();
    // Al escribir de nuevo, el suplidor elegido (y su RNC) deja de valer.
    if (this.orden.codsuplidor) this.orden.rncsuplidor = '';
    this.orden.codsuplidor = null;
    this.orden.nomsuplidor = texto;
    if (!texto) {
      this.suplidores = [];
      this.buscandoSuplidor = false;
      return;
    }
    const id = ++this.busquedaSuplidorId;
    this.timerSuplidor = setTimeout(() => {
      this.buscandoSuplidor = true;
      this.servicio.buscarSuplidores(texto).subscribe({
        next: (rows) => {
          if (id !== this.busquedaSuplidorId) return;
          this.suplidores = rows;
          this.indiceSuplidor = 0;
          this.buscandoSuplidor = false;
        },
        error: () => {
          if (id !== this.busquedaSuplidorId) return;
          this.suplidores = [];
          this.buscandoSuplidor = false;
        },
      });
    }, 150);
  }

  seleccionarSuplidor(s: any, moverFoco = false): void {
    this.orden.codsuplidor = Number(s?.su_codsupl) || null;
    this.orden.nomsuplidor = String(s?.su_nomsupl || '').trim();
    this.orden.rncsuplidor = String(s?.su_rncsupl || '').trim();
    this.textoSuplidor = this.orden.nomsuplidor;
    this.suplidores = [];
    this.buscandoSuplidor = false;
    this.busquedaSuplidorId++;
    clearTimeout(this.timerSuplidor);
    // Con RNC ya cargado se salta el RNC y se va a la condicion de pago.
    if (moverFoco) this.enfocar(this.orden.rncsuplidor ? 'ocCondicion' : 'ocRnc');
  }

  // ===================== productos =====================
  onBuscarProducto(campo: 'codigo' | 'descripcion'): void {
    clearTimeout(this.timerProducto);
    const valor = (campo === 'codigo' ? this.capturaCodigo : this.capturaDescripcion).trim();
    if (!valor) {
      this.productos = [];
      return;
    }
    if (!this.destinoElegido) {
      this.productos = [];
      return;
    }
    this.campoProducto = campo;
    const id = ++this.busquedaProductoId;
    this.timerProducto = setTimeout(() => {
      this.buscandoProducto = true;
      this.servicio.buscarProductos(campo, valor).subscribe({
        next: (rows: any[]) => {
          if (id !== this.busquedaProductoId) return;
          this.productos = Array.isArray(rows) ? rows : [];
          this.indiceProducto = 0;
          this.buscandoProducto = false;
        },
        error: () => {
          if (id !== this.busquedaProductoId) return;
          this.productos = [];
          this.buscandoProducto = false;
        },
      });
    }, 150);
  }

  /** Campo donde se busco el producto (la lista se muestra debajo de ese campo). */
  campoProducto: 'codigo' | 'descripcion' = 'descripcion';
  private busquedaProductoId = 0;

  /** Flechas arriba/abajo en las listas de suplidor y producto. */
  onFlechas(event: KeyboardEvent, lista: 'suplidor' | 'producto'): void {
    const filas = lista === 'suplidor' ? this.suplidores : this.productos;
    if (!filas.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const paso = event.key === 'ArrowDown' ? 1 : -1;
    const actual = lista === 'suplidor' ? this.indiceSuplidor : this.indiceProducto;
    const nuevo = (actual + paso + filas.length) % filas.length;
    if (lista === 'suplidor') this.indiceSuplidor = nuevo;
    else this.indiceProducto = nuevo;
    setTimeout(() => {
      document
        .querySelector(`.oc-dropdown [data-fila="${lista}-${nuevo}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  seleccionarProducto(p: any, moverFoco = false): void {
    this.capturaCodigo = String(p?.in_codmerc || '').trim();
    this.capturaDescripcion = String(p?.in_desmerc || '').trim();
    this.capturaCosto = this.redondear(Number(p?.in_cosmerc ?? p?.in_costmer ?? 0));
    this.productos = [];
    this.busquedaProductoId++;
    this.buscandoProducto = false;
    clearTimeout(this.timerProducto);
    if (moverFoco) this.enfocar('ocCapturaCantidad');
  }

  agregarLinea(): void {
    if (this.soloLectura) return;
    if (!this.destinoElegido) {
      Swal.fire('Empresa y sucursal', 'Seleccione primero la empresa y la sucursal de la orden.', 'warning');
      return;
    }
    const descripcion = this.capturaDescripcion.trim();
    const cantidad = Number(this.capturaCantidad) || 0;
    const costo = Number(this.capturaCosto) || 0;
    if (!descripcion) {
      Swal.fire('Producto requerido', 'Busque un producto o escriba la descripción.', 'warning');
      return;
    }
    if (cantidad <= 0) {
      Swal.fire('Cantidad inválida', 'La cantidad debe ser mayor que cero.', 'warning');
      return;
    }
    if (costo < 0) {
      Swal.fire('Costo inválido', 'El costo no puede ser negativo.', 'warning');
      return;
    }
    const editando = this.lineas.find((l) => l.uid === this.lineaEditandoUid);
    if (editando) {
      editando.codproducto = this.capturaCodigo.trim();
      editando.descripcion = descripcion;
      editando.cantidad = cantidad;
      editando.costo = costo;
    } else {
      this.lineas.push({
        uid: this.uid++,
        codproducto: this.capturaCodigo.trim(),
        descripcion,
        cantidad,
        costo,
        // El costo digitado ya incluye el ITBIS.
        porc_itbis: 0,
      });
    }
    this.limpiarCaptura();
    this.enfocar('ocCapturaCodigo');
  }

  /** Item de la tabla que se esta editando en la fila de captura. */
  lineaEditandoUid: number | null = null;

  private limpiarCaptura(): void {
    this.lineaEditandoUid = null;
    this.capturaCodigo = '';
    this.capturaDescripcion = '';
    this.capturaCantidad = 1;
    this.capturaCosto = 0;
    this.limpiarBusquedaProducto();
  }

  /** Carga el item en la fila de captura y pone el foco en la cantidad. */
  editarLinea(linea: LineaOrden): void {
    if (this.soloLectura) return;
    this.lineaEditandoUid = linea.uid;
    this.capturaCodigo = linea.codproducto || '';
    this.capturaDescripcion = linea.descripcion || '';
    this.capturaCantidad = Number(linea.cantidad) || 0;
    this.capturaCosto = Number(linea.costo) || 0;
    this.limpiarBusquedaProducto();
    // Llevar la vista a la fila de captura y dejar la cantidad seleccionada.
    setTimeout(() => {
      document.getElementById('ocCapturaCantidad')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
    this.enfocar('ocCapturaCantidad');
  }

  cancelarEdicionLinea(): void {
    this.limpiarCaptura();
    this.enfocar('ocCapturaCodigo');
  }

  quitarLinea(linea: LineaOrden): void {
    if (this.soloLectura) return;
    if (this.lineaEditandoUid === linea.uid) this.limpiarCaptura();
    this.lineas = this.lineas.filter((l) => l.uid !== linea.uid);
  }

  // ===================== guardar =====================
  nuevaOrden(): void {
    this.orden = this.ordenVacia();
    this.lineas = [];
    this.textoSuplidor = '';
    this.suplidores = [];
    this.productos = [];
    this.soloLectura = false;
    this.tab = 'nueva';
  }

  async guardar(): Promise<void> {
    if (this.guardando || this.soloLectura) return;
    if (!this.destinoElegido) {
      Swal.fire('Empresa y sucursal', 'Seleccione la empresa y la sucursal de la orden.', 'warning');
      return;
    }
    if (!this.orden.nomsuplidor.trim()) {
      Swal.fire('Suplidor requerido', 'Seleccione el suplidor de la orden.', 'warning');
      return;
    }
    if (!this.lineas.length) {
      Swal.fire('Sin productos', 'Agregue al menos un producto a la orden.', 'warning');
      return;
    }

    this.guardando = true;
    try {
      const resp: any = await firstValueFrom(this.servicio.guardar(this.orden, this.lineas));
      const esNueva = !this.orden.codorden;
      this.orden.codorden = resp?.codorden || this.orden.codorden;
      this.orden.valorden = Number(resp?.valorden ?? this.total);
      await Swal.fire({
        icon: 'success',
        title: esNueva ? 'Orden creada' : 'Orden actualizada',
        text: `Orden de compra No. ${this.orden.codorden}`,
      });
      if (this.consultaRealizada) this.consultar();
    } catch (error: any) {
      Swal.fire('Error', String(error?.message || 'No se pudo guardar la orden.'), 'error');
    } finally {
      this.guardando = false;
    }
  }

  // ===================== consulta =====================
  consultar(): void {
    this.cargandoConsulta = true;
    this.consultaRealizada = true;
    this.servicio
      .listar({
        desde: this.filtroDesde,
        hasta: this.filtroHasta,
        texto: this.filtroTexto,
        status: this.filtroStatus,
        empresa: this.filtroEmpresa,
        sucursal: this.filtroSucursal || null,
      })
      .subscribe({
        next: (rows) => {
          this.ordenes = rows;
          this.cargandoConsulta = false;
        },
        error: (error) => {
          this.ordenes = [];
          this.cargandoConsulta = false;
          Swal.fire('Error', String(error?.message || 'No se pudieron consultar las órdenes.'), 'error');
        },
      });
  }

  get totalConsulta(): number {
    return this.redondear(
      this.ordenes
        .filter((o) => String(o.status || '').toUpperCase() !== 'A')
        .reduce((s, o) => s + (Number(o.valorden) || 0), 0),
    );
  }

  async abrirOrden(o: OrdenCompra): Promise<void> {
    try {
      const data = await firstValueFrom(this.servicio.obtener(String(o.codorden)));
      if (!data) {
        Swal.fire('No encontrada', `No se encontró la orden ${o.codorden}.`, 'warning');
        return;
      }
      this.orden = {
        ...data.orden,
        fecorden: String(data.orden.fecorden || '').slice(0, 10),
      };
      this.textoSuplidor = this.orden.nomsuplidor;
      this.lineas = data.detalles.map((d) => ({
        uid: this.uid++,
        codproducto: String(d.codproducto || ''),
        descripcion: String(d.descripcion || ''),
        cantidad: Number(d.cantidad) || 0,
        costo: Number(d.costo) || 0,
        porc_itbis: 0, // costos con ITBIS incluido
      }));
      this.soloLectura = String(this.orden.status || '').toUpperCase() !== 'P';
      this.tab = 'nueva';
    } catch (error: any) {
      Swal.fire('Error', String(error?.message || 'No se pudo abrir la orden.'), 'error');
    }
  }

  async anular(o: OrdenCompra): Promise<void> {
    const r = await Swal.fire({
      title: `Anular orden ${o.codorden}`,
      text: 'La orden quedará anulada y no se podrá editar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });
    if (!r.isConfirmed) return;
    try {
      await firstValueFrom(this.servicio.anular(String(o.codorden)));
      o.status = 'A';
      if (this.orden.codorden === o.codorden) {
        this.orden.status = 'A';
        this.soloLectura = true;
      }
      Swal.fire({ icon: 'success', title: 'Orden anulada', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire('Error', String(error?.message || 'No se pudo anular la orden.'), 'error');
    }
  }

  // ===================== imprimir =====================
  private esc(v: any): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private dinero(v: any): string {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
  }

  imprimir(): void {
    if (!this.orden.codorden) {
      Swal.fire('Guarde la orden', 'Guarde la orden antes de imprimirla.', 'info');
      return;
    }
    const empresaOrden = this.empresas.find(
      (e) => String(e?.cod_empre || '').trim().toUpperCase() === String(this.orden.codempresa || '').trim().toUpperCase(),
    );
    const empresa = empresaOrden?.nom_empre || String(this.orden.codempresa || '');
    const rncEmpresa = empresaOrden?.rnc_empre || '';
    const sucursalNombre = this.nombreSucursal(this.orden.codsucursal);
    const filas = this.lineas
      .map(
        (l, i) => `<tr>
          <td>${i + 1}</td><td>${this.esc(l.codproducto)}</td><td>${this.esc(l.descripcion)}</td>
          <td class="n">${this.dinero(l.cantidad)}</td><td class="n">${this.dinero(l.costo)}</td>
          <td class="n">${this.dinero(this.subtotalLinea(l))}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orden ${this.esc(this.orden.codorden)}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
        h1{font-size:18px;margin:0}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ccc;padding:5px}
        th{background:#f1f5f9;text-align:left}
        .n{text-align:right}
        .cab{display:flex;justify-content:space-between;margin-top:8px}
        .tot{margin-top:10px;margin-left:auto;width:260px}
        .tot div{display:flex;justify-content:space-between;padding:2px 0}
        .firma{margin-top:60px;display:flex;justify-content:space-around}
        .firma div{border-top:1px solid #333;width:200px;text-align:center;padding-top:4px}
      </style></head><body>
      <h1>${this.esc(empresa)}</h1><div>RNC: ${this.esc(rncEmpresa)} · Sucursal: ${this.esc(sucursalNombre)}</div>
      <h2 style="font-size:16px;margin:14px 0 4px">ORDEN DE COMPRA No. ${this.esc(this.orden.codorden)}</h2>
      <div class="cab">
        <div><b>Suplidor:</b> ${this.esc(this.orden.nomsuplidor)}<br><b>RNC:</b> ${this.esc(this.orden.rncsuplidor)}</div>
        <div><b>Fecha:</b> ${this.esc(this.formatearFecha(this.orden.fecorden))}<br>
          <b>Condición:</b> ${this.esc(this.orden.condicionpago)}<br>
          <b>Estado:</b> ${this.esc(this.estadoTexto(this.orden.status))}</div>
      </div>
      <table><thead><tr><th>#</th><th>Código</th><th>Descripción</th><th class="n">Cant.</th>
        <th class="n">Costo</th><th class="n">Total</th></tr></thead>
        <tbody>${filas}</tbody></table>
      <div class="tot">
        <div><span>Total (ITBIS incluido)</span><b>${this.dinero(this.total)}</b></div>
      </div>
      ${this.orden.observacion ? `<p><b>Observación:</b> ${this.esc(this.orden.observacion)}</p>` : ''}
      <div class="firma"><div>Preparado por</div><div>Autorizado por</div></div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      Swal.fire('Ventana bloqueada', 'Permita las ventanas emergentes para imprimir.', 'info');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
}
