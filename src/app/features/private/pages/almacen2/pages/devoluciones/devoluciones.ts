import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioEntradamerc } from 'src/app/core/services/almacen/entradamerc/entradamerc.service';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioProducto } from 'src/app/core/services/mantenimientos/producto/producto.service';
import { ServicioVentainterna } from 'src/app/core/services/almacen/ventainterna/ventainterna.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServiciodetEntradamerc } from 'src/app/core/services/almacen/detentradamerc/detentradamerc.service';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { DevolucionService } from 'src/app/core/services/almacen/devolucion/devolucion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'Devoluciones',
  templateUrl: './devoluciones.html',
  styleUrls: ['./devoluciones.css'],
})
export class DevolucionesComponent implements OnInit {
  modo: 'factura' | 'productos' = 'factura';
  facturaForm!: FormGroup;
  entraForm!: FormGroup;
  productosForm!: FormGroup;
  resultadoFactura: any[] = [];
  seleccionFactura: any[] = [];
  resultadoProductos: any[] = [];
  seleccionProductos: any[] = [];
  totalFactura = 0;
  totalProductos = 0;
  clienteNombre: string = '';
  fechaFactura: string = '';
  destinoForm!: FormGroup;
  seleccionDestino: any[] = [];
  totalDestino = 0;
  productosBusquedaCodigo: any[] = [];
  productosBusquedaDesc: any[] = [];
  selectedProducto: any = null;
  highlightedIndex: number = -1;
  productosBusqueda: any[] = [];
  detalle: any[] = [];
  productoSeleccionado: any = null;
  // productoSelecciosnado: boolean = false;
  subtotal: number = 0;
  total: number = 0;
  imprimirDisponible: boolean = false;
  ultimoCodigoEntrada: string = '';
  ultimoCodigoSalida: string = '';
  ultimaEntradaCab: any = null;
  ultimaEntradaDet: any[] = [];
  ultimaSalidaCab: any = null;
  ultimaSalidaDet: any[] = [];

  @ViewChild('cantidadInput') cantidadInput!: ElementRef;
  @ViewChild('precioInput') precioInput!: ElementRef;
  @ViewChild('descripcionInput') descripcionInput!: ElementRef;
  @ViewChild('codigoInput') codigoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputNombreSupl') inputNombreSupl!: ElementRef;
  @ViewChild('inputCantidad') inputCantidad!: ElementRef<HTMLInputElement>;
  @ViewChild('inputCodigo') inputCodigo!: ElementRef<HTMLInputElement>;
 @ViewChild('inputCodigoSalida') inputCodigoSalida!: ElementRef;
  @ViewChild('inputPrecio') inputPrecio!: ElementRef<HTMLInputElement>;
  Toast = (Swal as any).mixin({
    toast: true,
    position: 'bottom-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: false
  });

  private extraerMensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    if (err?.message) return String(err.message);
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.message) return String(err.error.message);
    if (err?.error?.error) return String(err.error.error);
    try {
      return JSON.stringify(err.error || err);
    } catch {
      return 'Error desconocido';
    }
  }
  constructor(
    private fb: FormBuilder,
    private contFacturaSrv: ServicioContFactura,
    private inventarioSrv: ServicioInventario,
    private productoSrv: ServicioProducto,
    private servicioEntradamerc: ServicioEntradamerc,
    private servicioDetEntrada: ServiciodetEntradamerc,
    private printing: PrintingService,
    private servicioUsuario: ServicioUsuario,
    private facturaSrv:ServicioFacturacion,
    private ventainternaSrv: ServicioVentainterna,
    private devolucionSrv: DevolucionService
  )
  {
    this.entraForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      cantidad: [0, [Validators.required, Validators.min(0.5)]],
      precio: [0, Validators.required],
      costo:[0]
      });
  }
  ngOnInit(): void {
    this.facturaForm = this.fb.group({
      fa_codFact: ['', [Validators.required]],
      buscarTexto: [''],
    });
    this.productosForm = this.fb.group({
      codigo: [''],
      descripcion: [''],
      cantidad: [0, [Validators.min(0.01)]],
      precio: [0, [Validators.min(0)]],
    });
    this.destinoForm = this.fb.group({
      codigo: [''],
      descripcion: [''],
      cantidad: [0, [Validators.min(0.01)]],
      precio: [0, [Validators.min(0)]],
      valor: [{ value: 0, disabled: true }],
    });
    this.productosForm.get('cantidad')?.valueChanges.subscribe((val) => {
      const n = Number(val || 0);
      const disponible = this.disponibleActualParaCodigo();
      if (n > disponible) {
        Swal.fire({ title: 'Cantidad supera la existente', text: `Disponible: ${disponible}`, icon: 'warning' });
        this.productosForm.get('cantidad')?.setValue(disponible, { emitEvent: false });
      } else if (n <= 0) {
        Swal.fire({ title: 'Cantidad inválida', text: 'Debe ser mayor que 0', icon: 'warning' });
        this.productosForm.get('cantidad')?.setValue(0.01, { emitEvent: false });
      }
    });
    setTimeout(() => this.focusNext('fa-codFact'), 0);
  }


cambiarModo(m: 'factura' | 'productos') {
    this.modo = m;
}
buscarFactura() {
  const cod = String(this.facturaForm.get('fa_codFact')?.value || '').trim();
  console.log('Código digitado:', cod);
  if (!cod) {
    Swal.fire({
      title: 'Falta el número de factura',
      icon: 'warning'
    });
    return;
  }
  this.facturaSrv.getByNumero(cod).subscribe({
    next: (resp: any) => {
      console.log('Respuesta factura:', resp);
      const data = resp?.data ?? resp;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        Swal.fire({
          title: 'Factura no encontrada',
          text: 'Verifique el número e intente de nuevo',
          icon: 'info'
        });
        return;
      }
      const factura = Array.isArray(data) ? data[0] : data;
      this.clienteNombre = factura?.fa_nomClie || factura?.cliente || '';
      this.fechaFactura = this.formatearFecha(
        factura?.fa_fecFact || factura?.fecha
      );
      // 👇 Aquí llamas a la función que carga el detalle
      this.buscarMercanciaFactura();
    },
    error: (error) => {
      console.error(error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo obtener la factura',
        icon: 'error'
      });
    }
  });
}

  buscarMercanciaFactura() {
    const cod = String(this.facturaForm.get('fa_codFact')?.value || '').trim();
    if (!cod) {
      Swal.fire({ title: 'Falta el número de factura', icon: 'warning' });
      return;
    }
    this.clienteNombre = '';
    this.fechaFactura = '';
    this.facturaSrv.getByNumero(cod).subscribe({
      next: (info: any) => {
  console.log('RESPUESTA getByNumero:', info);

  const data = info?.data ?? info;

  if (!data || (Array.isArray(data) && data.length === 0)) {
    Swal.fire({
      title: 'Factura no encontrada',
      text: 'Verifique el número e intente de nuevo',
      icon: 'info'
    });
    return;
  }

  const f = Array.isArray(data) ? data[0] : data;

  this.clienteNombre = f?.fa_nomClie || f?.cliente || '';
  this.fechaFactura = this.formatearFecha(f?.fa_fecFact || f?.fecha);

  this.facturaSrv.buscarMercanciaPorFactura(cod).subscribe({
    next: (resp: any) => {
      const seleccionDestino = resp?.data ?? resp ?? [];
      this.resultadoFactura = seleccionDestino.map((d: any) => ({
        cod: d.df_codMerc ?? d.codmerc ?? d.codigo ?? '',
        des: d.df_desMerc ?? d.desmerc ?? d.descripcion ?? '',
        cantidad: Number(d.df_canMerc ?? d.cantidad ?? 0),
        precio: Number(d.df_preMerc ?? d.precio ?? 0),
        total: Number(
          d.df_valMerc ??
          d.total ??
          (Number(d.df_canMerc ?? d.cantidad ?? 0) *
           Number(d.df_preMerc ?? d.precio ?? 0))
        ),
      }));

      this.facturaForm.get('fa_codFact')?.disable();
    },
    error: () => {
      this.resultadoFactura = [];
    }
  });
}

    });
  }
  deshacerFactura() {
    console.log('SE EJECUTA');
    this.facturaForm.get('fa_codFact')?.enable();
    this.facturaForm.get('fa_codFact')?.reset();
    this.facturaForm.patchValue({ fa_codFact: '', buscarTexto: '' });
    this.clienteNombre = '';
    this.fechaFactura = '';
    this.resultadoFactura = [];
    this.seleccionFactura = [];
    this.totalFactura = 0;
    this.seleccionDestino = [];
    this.totalDestino = 0;

    this.productosForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0 }, { emitEvent: false });
    this.resetFormulario();
     //this.detalle = [];
    this.productosForm.get('codigo')?.enable();
    this.productosForm.get('descripcion')?.enable();
    setTimeout(() => this.focusNext('fa-codFact'), 0);
  }
  buscarProductoSalidaCodigo() {
    const cod = String(this.destinoForm.get('codigo')?.value || '').trim();
    if (!cod) return;
    this.productoSrv.obtenerProductoPorId(cod).subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? resp;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          Swal.fire({ title: 'Producto no encontrado', icon: 'info' });
          return;
        }
        const p = Array.isArray(data) ? data[0] : data;
        const des = p.in_desmerc ?? p.descripcion ?? '';
        const precio = Number(p.in_premerc ?? p.precio ?? 0);
        const cantidad = Number(this.destinoForm.get('cantidad')?.value || 0);
        this.destinoForm.patchValue({ descripcion: des, precio });
        this.destinoForm.get('valor')?.setValue(Number(cantidad * precio));
        setTimeout(() => this.focusNext('dest-cantidad'), 0);
      },
      error: () => {
        Swal.fire({ title: 'Producto no encontrado', icon: 'info' });
      }
    });
  }
  seleccionarItemFactura(it: any) {
    const codSel = String(it.cod || '').trim();
    const yaSeleccionado = this.seleccionFactura
      .filter((i) => String(i.cod || '') === codSel)
      .reduce((acc, i) => acc + Number(i.cantidad || 0), 0);
    const restante = Math.max(0, Number(it.cantidad || 0) - yaSeleccionado);
    this.productosForm.patchValue({
      codigo: it.cod,
      descripcion: it.des,
      cantidad: Math.max(restante, 0.01),
      precio: it.precio
    });
    setTimeout(() => {
      const el = document.getElementById('pf-cantidad') as HTMLInputElement | null;
      if (el) el.focus();
    }, 0);
  }
  selectInput(ev: any) {
    const el = ev?.target as HTMLInputElement | null;
    if (el) el.select();
  }
  agregarLineaFacturaDesdeForm() {
    const v = this.productosForm.getRawValue();
    const cantidad = Number(v.cantidad || 0);
    const precio = Number(v.precio || 0);
    const codSel = String(v.codigo || '').trim();
    const maxFactura = this.resultadoFactura.find((r) => String(r.cod || '') === codSel)?.cantidad || 0;
    const yaSeleccionado = this.seleccionFactura
      .filter((i) => String(i.cod || '') === codSel)
      .reduce((acc, i) => acc + Number(i.cantidad || 0), 0);
    const restante = Math.max(0, Number(maxFactura) - yaSeleccionado);
    const precioFactura = Number(this.resultadoFactura.find((r) => String(r.cod || '') === codSel)?.precio || 0);
    if (!cantidad || cantidad <= 0) {
      Swal.fire({ title: 'Cantidad inválida', icon: 'warning' });
      return;
    }
    if (cantidad > restante) {
      Swal.fire({
        title: 'Cantidad supera la existente',
        text: `Disponible: ${restante}`,
        icon: 'warning',
      });
      return;
    }
    if (precio > precioFactura) {
      Swal.fire({
        title: 'Precio mayor al de la factura',
        text: `Precio factura: ${precioFactura}`,
        icon: 'warning',
      });
      return;
    }
    const item = {
      cod: String(v.codigo || ''),
      des: String(v.descripcion || ''),
      cantidad,
      precio,
      total: cantidad * precio
    };
    this.seleccionFactura.push(item);
    this.recalcularTotalFactura();
    this.productosForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0 }, { emitEvent: false });
    this.productosForm.get('codigo')?.disable();
    this.productosForm.get('descripcion')?.disable();
    this.irACodigoSalida();
  }
  private formatearFecha(f: any): string {
    try {
      const d = new Date(f);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return String(f || '');
    }
  }

  actualizarDestinoCampo(campo: 'cantidad' | 'precio', val: any) {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return;
    const current = this.destinoForm.getRawValue();
    const cantidad = campo === 'cantidad' ? n : Number(current.cantidad || 0);
    const precio = campo === 'precio' ? n : Number(current.precio || 0);
    const valor = cantidad * precio;
    this.destinoForm.patchValue({ [campo]: n });
    this.destinoForm.get('valor')?.setValue(valor);
  }

agregarLineaDestino() {
  const v = this.destinoForm.getRawValue();
  
  const cantidad = Number(v.cantidad) || 0;
  if (cantidad <= 0) {
    Swal.fire({ title: 'Ingrese una cantidad válida', icon: 'warning' });
    return;
  }

  const precio = Number(v.precio) || 0;
  const valor = Number(v.valor) || cantidad * precio;

  const nuevoItem = {
    cod: String(v.codigo || '').trim(),
    des: String(v.descripcion || '').trim(),
    cantidad,
    precio,
    valor,
    total: valor
  };

  this.seleccionDestino.push(nuevoItem);
  
  // Fuerza actualización (elige UNA de estas)
  this.seleccionDestino = [...this.seleccionDestino];           // más simple
  // this.cdr.detectChanges();                                  // si usas OnPush

  this.recalcularTotalDestino();
  
  this.destinoForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0, valor: 0 });
}
  eliminarLineaDestino(idx: number) {
    this.seleccionDestino.splice(idx, 1);
    this.recalcularTotalDestino();
  }

  recalcularTotalDestino() {
    this.totalDestino = this.seleccionDestino.reduce(
      (acc, it) => acc + (Number(it.total ?? it.valor) || 0),
      0,
    );
  }

  agregarLineaFactura(item: any) {
    const linea = { ...item };
    this.seleccionFactura.push(linea);
    this.recalcularTotalFactura();
  }

  actualizarLineaFactura(idx: number, campo: 'cantidad' | 'precio', val: any) {
    const n = Number(val);
    if (!Number.isFinite(n)) return;
    const it = this.seleccionFactura[idx];
    if (campo === 'cantidad') {
      if (n <= 0) {
        Swal.fire({ title: 'Cantidad inválida', text: 'Debe ser mayor que 0', icon: 'warning' });
        return;
      }
      const codSel = String(it.cod || '').trim();
      const maxFactura = Number(this.resultadoFactura.find((r) => String(r.cod || '') === codSel)?.cantidad || 0);
      const otrasCantidades = this.seleccionFactura
        .filter((item, i) => i !== idx && String(item.cod || '') === codSel)
        .reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
      const restante = Math.max(0, maxFactura - otrasCantidades);
      if (n > restante) {
        Swal.fire({
          title: 'Cantidad supera la existente',
          text: `Disponible: ${restante}`,
          icon: 'warning',
        });
        return;
      }
    } else if (campo === 'precio') {
      const codSel = String(it.cod || '').trim();
      const precioFactura = Number(this.resultadoFactura.find((r) => String(r.cod || '') === codSel)?.precio || 0);
      if (precioFactura && n > precioFactura) {
        Swal.fire({
          title: 'Precio mayor al de la factura',
          text: `Precio factura: ${precioFactura}`,
          icon: 'warning',
        });
        return;
      }
    }
    it[campo] = n;
    it.total = it.cantidad * it.precio;
    this.recalcularTotalFactura();
  }

  eliminarLineaFactura(idx: number) {
    this.seleccionFactura.splice(idx, 1);
    this.recalcularTotalFactura();
  }

  recalcularTotalFactura() {
    this.totalFactura = this.seleccionFactura.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }
guardarDevolucionFactura() {
 // 🔴 VALIDAR ENTRADA
  console.log("TOTAL DESTINO:", this.totalDestino);
  if (!this.seleccionFactura || this.seleccionFactura.length === 0) {
    Swal.fire({
      title: 'Debe seleccionar productos para la entrada',
      icon: 'success'
    });
    return;
  }
  // 🔴 VALIDAR SALIDA
  if (!this.seleccionDestino || this.seleccionDestino.length === 0) {
    Swal.fire({
      title: 'Debe seleccionar productos para la salida',
      icon: 'success'
    });
    return;
  }
  if (!this.totalDestino || this.totalDestino <= 0) {
    Swal.fire({
      title: 'El total de salida es inválido',
      icon: 'warning'
    });
    return;
  }
  if (this.totalDestino > this.totalFactura) {
    Swal.fire({
      title: 'El total de salida no coincide con el total de entrada',
      icon: 'warning'
    });
    return;
  }
  const sucursalId = Number(localStorage.getItem('idSucursal') || 1);
  const codEmp = String(localStorage.getItem('codigoempresa') || '');
  const vendedor = String(localStorage.getItem('username') || '');
  // =========================
  // ENTRADA
  // =========================
  const entradamercancia = {
    me_fecEntr: new Date(),
    me_valEntr: Number(this.totalFactura || 0),
    me_nomSupl: this.clienteNombre,
    me_facSupl: this.facturaForm.get('fa_codFact')?.value,
    me_tipo: 'DEVOLUCION',
    me_nomVend: vendedor,
    me_codEmpr: codEmp,
    me_codSucu: sucursalId
  };
  const detalleEntrada = this.seleccionFactura.map((it) => ({
    producto: {
      in_codmerc: it.cod,
      in_desmerc: it.des,
    },
    cantidad: Number(it.cantidad || 0),
    precio: Number(it.precio || 0),
    total: Number(it.total || 0),
  }));
  console.log("TOTAL DESTINO:", this.totalDestino);
  console.log("ANTES DE ENVIAR - seleccionDestino:", this.seleccionDestino);
  console.log("Cantidad elementos:", this.seleccionDestino?.length);
  // =========================
  // SALIDA
  // =========================
  const ventainterna = {
    fa_codSucu: sucursalId,
    fa_codEmpr: codEmp,
    fa_fecFact: new Date(),
    fa_valFact: Number(this.totalDestino || 0),
    fa_codVend: localStorage.getItem('codVendedor')
  ? Number(localStorage.getItem('codVendedor'))
  : null,

fa_codClie: this.facturaForm.get('fa_codClie')?.value
  ? Number(this.facturaForm.get('fa_codClie')?.value)
  : null,
    // fa_codVend: Number(localStorage.getItem('codVendedor') || 0), // 👈 AGREGAR
    // fa_codClie: Number(this.facturaForm.get('fa_codClie')?.value || 0), // 👈 AGREGAR
    fa_nomVend: vendedor,
    fa_nomClie: this.clienteNombre || null,
  };
  const detalleSalida = (this.seleccionDestino || []).map((it) => ({
    producto: {
      in_codmerc: it.cod,
      in_desmerc: it.des,
    },
    cantidad: Number(it.cantidad || 0),
    precio: Number(it.precio || 0),
    total: Number(it.total ?? it.valor ?? 0),
  }));
  const payload = {
    entradamercancia,
    detalleEntrada,
    ventainterna,
    detalleSalida
  };
  console.log("Payload que estoy enviando:", payload);
  this.devolucionSrv.guardarDevolucion(payload).subscribe({
    next: (res: any) => {
      const entradaCodigo =
        res?.data?.entrada?.me_codEntr ||
        res?.entrada?.me_codEntr ||
        res?.data?.me_codEntr ||
        res?.me_codEntr ||
        res?.data?.entradaCodigo ||
        res?.entradaCodigo ||
        res?.data?.nuevoCodigoEntr ||
        res?.nuevoCodigoEntr ||
        res?.data?.nuevoCodigo ||
        res?.nuevoCodigo ||
        '';
      const salidaCodigo =
        res?.data?.vinterna?.fa_codFact ||
        res?.vinterna?.fa_codFact ||
        res?.data?.fa_codFact ||
        res?.fa_codFact ||
        res?.data?.salidaCodigo ||
        res?.salidaCodigo ||
        res?.data?.nuevoCodigoSalida ||
        res?.nuevoCodigoSalida ||
        '';
      this.ultimoCodigoEntrada = String(entradaCodigo || '');
      this.ultimoCodigoSalida = String(salidaCodigo || '');
      this.ultimaEntradaCab = { ...entradamercancia, me_codEntr: this.ultimoCodigoEntrada };
      this.ultimaSalidaCab = { ...ventainterna, fa_codFact: this.ultimoCodigoSalida };
      this.ultimaEntradaDet = detalleEntrada;
      this.ultimaSalidaDet = detalleSalida;
      this.imprimirDisponible = true;
      Swal.fire({
        title: 'Devolución guardada correctamente',
        html: [this.ultimoCodigoEntrada ? `Entrada: ${this.ultimoCodigoEntrada}` : '', this.ultimoCodigoSalida ? `Salida: ${this.ultimoCodigoSalida}` : ''].filter(Boolean).join(' | '),
        icon: 'success'
      });
 
      this.seleccionFactura = [];
      this.seleccionDestino = [];
      this.resultadoFactura = [];
      this.totalFactura = 0;
      this.totalDestino = 0;
 
      // this.facturaForm.get('fa_codFact')?.enable();
      // this.facturaForm.get('fa_codFact')?.reset();
      // this.facturaForm.patchValue({ fa_codFact: '', buscarTexto: '' });
      // this.productosForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0 }, { emitEvent: false });
      // this.resetFormulario();
      // this.productosForm.get('codigo')?.enable();
      // this.productosForm.get('descripcion')?.enable();
      // setTimeout(() => this.focusNext('fa-codFact'), 0);
    },
    error: (err) => {
      console.error(err);
      Swal.fire({
        title: 'Error al guardar devolución',
        text: this.extraerMensajeError(err),
        icon: 'error'
      });
    }
  });
}
  focusNext(param: KeyboardEvent | string) {

    if (typeof param === 'string') {
      const element = document.getElementById(param);
      element?.focus();
    }

    if (param instanceof KeyboardEvent) {
      if (param.key === 'Enter') {
        const input = param.target as HTMLElement;
        const form = input.closest('form');
        const focusable = form?.querySelectorAll<HTMLElement>(
          'input, select, textarea, button'
        );

        if (!focusable) return;

        const index = Array.from(focusable).indexOf(input);

        if (index > -1 && index + 1 < focusable.length) {
          focusable[index + 1].focus();
        }
      }
    }
  }

  disponibleActualParaCodigo(): number {
    const codSel = String(this.productosForm.get('codigo')?.value || '').trim();
    if (!codSel) return 0;
    const maxFactura = Number(this.resultadoFactura.find((r) => String(r.cod || '') === codSel)?.cantidad || 0);
    const yaSeleccionado = this.seleccionFactura
      .filter((i) => String(i.cod || '') === codSel)
      .reduce((acc, i) => acc + Number(i.cantidad || 0), 0);
    return Math.max(0, maxFactura - yaSeleccionado);
  }

  buscarProductos() {
    const cod = String(this.productosForm.get('codigo')?.value || '').trim();
    const des = String(this.productosForm.get('descripcion')?.value || '').trim();
    this.resultadoProductos = [];
    if (cod) {
      this.inventarioSrv.buscarporCodigoMerc(cod).subscribe({
        next: (resp: any) => {
          const lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
          this.resultadoProductos = lista;
        },
        error: () => (this.resultadoProductos = [])
      });
    } else if (des) {
      this.inventarioSrv.buscarPorDescripcionMerc(des).subscribe({
        next: (resp: any) => {
          const lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
          this.resultadoProductos = lista;
        },
        error: () => (this.resultadoProductos = [])
      });
    }
  }

  agregarLineaProducto(p: any) {
    const cantidad = Number(this.productosForm.get('cantidad')?.value || 0);
    const precio = Number(this.productosForm.get('precio')?.value || p.in_premerc || 0);
    if (!cantidad || cantidad <= 0) {
      Swal.fire({ title: 'Cantidad inválida', icon: 'warning' });
      return;
    }
    const item = {
      cod: p.in_codmerc || p.codigo || '',
      des: p.in_desmerc || p.descripcion || '',
      cantidad,
      precio,
      total: cantidad * precio
    };
    this.seleccionProductos.push(item);
    this.recalcularTotalProductos();
  }

  actualizarLineaProducto(idx: number, campo: 'cantidad' | 'precio', val: any) {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return;
    const it = this.seleccionProductos[idx];
    it[campo] = n;
    it.total = it.cantidad * it.precio;
    this.recalcularTotalProductos();
  }

  eliminarLineaProducto(idx: number) {
    this.seleccionProductos.splice(idx, 1);
    this.recalcularTotalProductos();
  }

  recalcularTotalProductos() {
    this.totalProductos = this.seleccionProductos.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }

  imprimirEntradaSalida() {
    if (!this.ultimaEntradaCab || !this.ultimaSalidaCab) {
      Swal.fire({ title: 'No hay datos para imprimir', icon: 'info' });
      return;
    }
    const extras = {
      facturaNumero: String(this.facturaForm.get('fa_codFact')?.value || ''),
      cliente: this.clienteNombre,
      fechaFactura: this.fechaFactura,
      entradaCodigo: this.ultimoCodigoEntrada || '',
      salidaCodigo: this.ultimoCodigoSalida || ''
    };
    this.printing.imprimirDevolucion80mm(this.ultimaEntradaCab, this.ultimaEntradaDet || [], this.ultimaSalidaCab, this.ultimaSalidaDet || [], extras);
 this.imprimirDisponible = false;
  }
  guardarDevolucionProductos() {
    if (!this.seleccionProductos.length) {
      Swal.fire({ title: 'Agrega al menos un renglón', icon: 'warning' });
      return;
    }
    const payload = {
      tipo: 'DEVOLUCION_PRODUCTOS',
      sucursalId: Number(localStorage.getItem('idSucursal') || 1),
      empresaCod: String(localStorage.getItem('codigoempresa') || ''),
      usuario: String(localStorage.getItem('username') || ''),
      total: this.totalProductos,
      items: this.seleccionProductos
    };
    // Placeholder endpoint para backend que afecte ventainterna, inventario y contfactura
    this.ventainternaSrv.guardarVentainterna(payload).subscribe({
      next: () => {
        Swal.fire({ title: 'Devolución registrada', icon: 'success', timer: 2500, showConfirmButton: false });
        this.seleccionProductos = [];
        this.totalProductos = 0;
      },
      error: () => {
        Swal.fire({ title: 'Error al registrar devolución de productos', icon: 'error' });
      }
    });
  }
    // 🔎 BUSCAR PRODUCTO
onInputCodigo() {
  const codigo = this.entraForm.get('codigo')?.value?.trim();
  if (!codigo || codigo.length < 1) {
    this.productosBusqueda = [];
    this.highlightedIndex = -1;
    return;
  }
  this.productoSrv.buscarProductosPorCodigo(codigo).subscribe({
    next: (resp: any) => {
      console.log('RESPUESTA BACKEND:', resp);
      this.productosBusqueda = resp.data ?? []; // 🔥 ESTA ES LA LÍNEA CLAVE
      console.log('ARRAY REAL:', this.productosBusqueda);
      this.highlightedIndex =
      this.productosBusqueda.length > 0 ? 0 : -1;
    },
    error: () => {
      this.productosBusqueda = [];
      this.highlightedIndex = -1;
    }
  });
}
  // ⌨ NAVEGACIÓN TECLADO
onKeyDownCodigo(event: KeyboardEvent) {

  const codigo = this.entraForm.get('codigo')?.value?.trim();

  // 🔴 PRIMERO validar Enter en vacío
  if (event.key === 'Enter' && !codigo) {
    event.preventDefault();

    setTimeout(() => {
      this.descripcionInput.nativeElement.focus();
    }, 0);

    return;
  }

  // 🔵 DESPUÉS validar lista
  if (!this.productosBusqueda || this.productosBusqueda.length === 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.highlightedIndex =
      (this.highlightedIndex + 1) % this.productosBusqueda.length;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.highlightedIndex =
      (this.highlightedIndex - 1 + this.productosBusqueda.length) %
      this.productosBusqueda.length;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const producto = this.productosBusqueda[this.highlightedIndex];
    if (producto) {
      this.seleccionarProducto(producto);
    }
  }
}


  seleccionarProducto(producto: any) {

  console.log('Producto seleccionado:', producto);
console.log('Producto en agregarItem:', this.productoSeleccionado);
  this.entraForm.patchValue({
    codigo: producto.in_codmerc,
    descripcion: producto.in_desmerc,
    precio: producto.in_premerc ?? 0,
    costo: producto.in_costmer,
  });

  this.productoSeleccionado = producto; // ✅ GUARDAMOS EL OBJETO REAL

  this.productosBusqueda = [];
  this.highlightedIndex = -1;

  setTimeout(() => {
    this.cantidadInput.nativeElement.focus();
  });
}
agregarItem() {
  if (!this.productoSeleccionado) {
    Swal.fire({
      icon: 'warning',
      title: 'Seleccione un producto',
      text: 'Debe seleccionar un producto válido'
    });
    return;
  }
  const cantidad = Number(this.entraForm.get('cantidad')?.value);
  if (!cantidad || cantidad <= 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Cantidad inválida',
      text: 'La cantidad debe ser mayor que cero'
    });
    return;
  }

  // const productoSeleccionado = this.productoSeleccionado; // 👈 asegúrate que exista
  const precio = Number(this.entraForm.get('precio')?.value || 0);

  const nuevoItem = {
    cod: this.productoSeleccionado.in_codmerc,
    des: this.productoSeleccionado.in_desmerc,
    cantidad: cantidad,
    precio: precio,
    total: cantidad * precio,
    valor: cantidad * precio
  };

  this.seleccionDestino.push(nuevoItem);

  this.calcularTotales();
  this.resetFormulario();
}
 

  onEnterCantidad(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      
      const cantidad = Number(this.entraForm.get('cantidad')?.value);
      if (!cantidad || cantidad <= 0) {
        event.preventDefault(); // 🔥 evita que siga el flujo
        Swal.fire({
          icon: 'warning',
          title: 'Cantidad inválida',
          text: 'La cantidad debe ser mayor que cero'
        });
        setTimeout(() => {
          this.cantidadInput.nativeElement.focus();
          this.cantidadInput.nativeElement.select();
        });
        return;
      }
      // 🔥 Si es válida, agregar producto
      event.preventDefault();
      setTimeout(() => {
        this.precioInput.nativeElement.focus();
        this.precioInput.nativeElement.select();
      });
    }
  };
  

  // ⌨ ENTER EN PRECIO
onEnterPrecio(event: Event) {

  const precio = Number(this.entraForm.get('precio')?.value);
  const costo  = Number(this.entraForm.get('costo')?.value);

  if (!precio || precio <= 0) {

    event.preventDefault();

    Swal.fire({
      icon: 'warning',
      title: 'Precio inválido',
      text: 'El precio debe ser mayor que cero'
    });

    return;
  }

  if (precio <= costo) {

    event.preventDefault();

    Swal.fire({
      icon: 'error',
      title: 'Precio incorrecto',
      text: 'El precio debe ser mayor que el costo'
    });

    setTimeout(() => {
      this.precioInput.nativeElement.focus();
      this.precioInput.nativeElement.select();
    });

    return;
  }

  // 🔥 Si todo está bien, agregar producto
  this.agregarItem();
}

  // ➕ AGREGAR A TABLA
// agregarItem() {
// const cantidad = Number(this.entraForm.get('cantidad')?.value);

//   if (!cantidad || cantidad <= 0) {
//     Swal.fire({
//       icon: 'warning',
//       title: 'Cantidad inválida',
//       text: 'La cantidad debe ser mayor que cero'
//     });
//     return;
//   }
//   const item = this.entraForm.getRawValue();

//   const nuevoItem = {
//     ...item,
//     total: item.cantidad * item.precio
//   };




//   this.seleccionDestino.push(nuevoItem);

//   this.calcularTotales();
//   this.resetFormulario();
//   setTimeout(() => {
//   this.codigoInput.nativeElement.focus();
//   });
// }

  onInputDescripcion() {
    const descripcion = this.entraForm.get('descripcion')?.value?.trim();
    if (!descripcion || descripcion.length < 2) {
      this.productosBusqueda = [];
      this.highlightedIndex = -1;
      return;
    }
    this.productoSrv.buscarProductosPorDescripcion(descripcion).subscribe({
      next: (resp: any) => {
        this.productosBusqueda = resp.data ?? [];
        this.highlightedIndex =
        this.productosBusqueda.length > 0 ? 0 : -1;
      },
      error: () => {
        this.productosBusqueda = [];
        this.highlightedIndex = -1;
      }
    });
  }
  resetFormulario() {

    this.productoSeleccionado = false;

    this.entraForm.patchValue({
      codigo: '',
      descripcion: '',
      cantidad: 0,
      precio: 0
    });

    setTimeout(() => {
      this.codigoInput.nativeElement.focus();
    });
  }

 
  async eliminarItem(index: number) {

  const result = await Swal.fire({
    title: '¿Eliminar este producto?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {

    this.seleccionDestino.splice(index, 1);
    this.calcularTotales();
  }
  setTimeout(() => {
    this.codigoInput.nativeElement.focus();
  });
}


  // calcularTotales2() {
  //   this.total = this.seleccionDestino.reduce((acc, item) => acc + item.total, 0);
  //   this.subtotal = this.seleccionDestino.reduce((acc, item) => acc + item.total, 0 );

  //   this.total = this.subtotal; // aquí puedes agregar ITBIS luego
  // }
irACodigoSalida() {
  setTimeout(() => {
    this.inputCodigoSalida?.nativeElement.focus();
  }, 0);
}
// calcularTotales() {
//   this.totalDestino = this.seleccionDestino
//     .reduce((acc, item) => acc + Number(item.total || 0), 0);
// }

calcularTotales() {
  this.totalDestino = this.seleccionDestino.reduce((acc, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio) || 0;
    return acc + (cantidad * precio);
  }, 0);

  console.log("TOTAL DESTINO:", this.totalDestino);
}


  onKeyDownDescripcion(event: KeyboardEvent) {
    if (this.productosBusqueda.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex =
        (this.highlightedIndex + 1) % this.productosBusqueda.length;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex =
        (this.highlightedIndex - 1 + this.productosBusqueda.length) %
        this.productosBusqueda.length;
    }
if (event.key === 'Escape') {
  event.preventDefault();
  this.codigoInput.nativeElement.focus();
  return;
}

    if (event.key === 'Enter') {
      event.preventDefault();
      const producto = this.productosBusqueda[this.highlightedIndex];
      if (producto) {
        this.seleccionarProducto(producto);
      }
    }
  }
evitarScrollNumero(event: WheelEvent) {
  (event.target as HTMLElement).blur();
}
}
