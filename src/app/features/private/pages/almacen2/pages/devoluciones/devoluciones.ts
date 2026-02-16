import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioEntradamerc } from 'src/app/core/services/almacen/entradamerc/entradamerc.service';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioVentainterna } from 'src/app/core/services/almacen/ventainterna/ventainterna.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'Devoluciones',
  templateUrl: './devoluciones.html',
  styleUrls: ['./devoluciones.css'],
})
export class DevolucionesComponent implements OnInit {
  modo: 'factura' | 'productos' = 'factura';
  facturaForm!: FormGroup;
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

  constructor(
    private fb: FormBuilder,
    private entradaSrv: ServicioEntradamerc,
    private inventarioSrv: ServicioInventario,
    private ventainternaSrv: ServicioVentainterna,
    private facturaSrv: ServicioFacturacion
  ) {}

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
      const detalle = resp?.data ?? resp ?? [];

      this.resultadoFactura = detalle.map((d: any) => ({
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

      // next: (info: any) => {
      //   const arr = Array.isArray(info?.data) ? info.data : undefined;
      //   const f = arr ? arr[0] : (info?.data || info);
      //   if (!f || (arr && !arr.length)) {
      //     Swal.fire({ title: 'Factura no encontrada', text: 'Verifique el número e intente de nuevo', icon: 'info' });
      //     return;
      //   }
      //   const nom = f?.fa_nomClie || f?.cliente || '';
      //   const fec = f?.fa_fecFact || f?.fecha || '';
      //   this.clienteNombre = String(nom || '');
      //   this.fechaFactura = this.formatearFecha(fec);
      //   this.facturaSrv
      //     .buscarMercanciaPorFactura(cod)
      //     .subscribe({
      //       next: (resp: any) => {
      //         const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
      //         this.resultadoFactura = data.map((d: any) => ({
      //           cod: d.df_codMerc ?? d.codmerc ?? d.codigo ?? '',
      //           des: d.df_desMerc ?? d.desmerc ?? d.descripcion ?? '',
      //           cantidad: Number(d.df_canMerc ?? d.cantidad ?? 0),
      //           precio: Number(d.df_preMerc ?? d.precio ?? 0),
      //           total: Number(d.df_valMerc ?? d.total ?? (Number(d.df_canMerc ?? d.cantidad ?? 0) * Number(d.df_preMerc ?? d.precio ?? 0))),
      //         }));
      //         this.facturaForm.get('fa_codFact')?.disable();
      //       },
      //       error: () => {
      //         this.resultadoFactura = [];
      //         this.facturaForm.get('fa_codFact')?.disable();
      //       }
      //     });
      // },
 
 
      // error: () => {
      //   Swal.fire({ title: 'Factura no encontrada', text: 'Verifique el número e intente de nuevo', icon: 'info' });
      // }
    });
  }
  deshacerFactura() {
    this.facturaForm.get('fa_codFact')?.enable();
    this.facturaForm.get('fa_codFact')?.reset();
    this.facturaForm.patchValue({ fa_codFact: '', buscarTexto: '' });
    this.clienteNombre = '';
    this.fechaFactura = '';
    this.resultadoFactura = [];
    this.seleccionFactura = [];
    this.totalFactura = 0;
    this.productosForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0 }, { emitEvent: false });
    this.productosForm.get('codigo')?.enable();
    this.productosForm.get('descripcion')?.enable();
    setTimeout(() => this.focusNext('fa-codFact'), 0);
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
    const cantidad = Number(v.cantidad || 0);
    const precio = Number(v.precio || 0);
    const valor = Number(v.valor || cantidad * precio);
    if (!cantidad || cantidad <= 0) {
      Swal.fire({ title: 'Cantidad inválida', icon: 'warning' });
      return;
    }
    const item = {
      cod: String(v.codigo || ''),
      des: String(v.descripcion || ''),
      cantidad,
      precio,
      valor
    };
    this.seleccionDestino.push(item);
    this.recalcularTotalDestino();
    this.destinoForm.reset({ codigo: '', descripcion: '', cantidad: 0, precio: 0, valor: 0 });
  }

  eliminarLineaDestino(idx: number) {
    this.seleccionDestino.splice(idx, 1);
    this.recalcularTotalDestino();
  }

  recalcularTotalDestino() {
    this.totalDestino = this.seleccionDestino.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
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
    if (!this.seleccionFactura.length) {
      Swal.fire({ title: 'Agrega al menos un renglón', icon: 'warning' });
      return;
    }
    const sucursalId = Number(localStorage.getItem('idSucursal') || 1);
    const codEmp = String(localStorage.getItem('codigoempresa') || '');
    const vendedor = String(localStorage.getItem('username') || '');

    const entradamercancias = {
      me_codEntr: null,
      me_fecEntr: new Date().toISOString().split('T')[0],
      me_valEntr: Number(this.totalFactura || 0),
      me_codSupl: null,
      me_nomSupl: 'DEVOLUCIÓN POR FACTURA',
      me_facSupl: this.facturaForm.get('fa_codFact')?.value,
      me_fecSupl: new Date().toISOString().split('T')[0],
      me_status: 'DEVOLUCION',
      me_codVend: null,
      me_nomVend: vendedor,
      me_rncSupl: null,
      me_codEmpr: codEmp,
      me_codSucu: sucursalId
    };

    const detalle = this.seleccionFactura.map((it) => ({
      de_codEntr: '',
      de_codMerc: it.cod,
      de_desMerc: it.des,
      de_canEntr: Number(it.cantidad || 0),
      de_preMerc: Number(it.precio || 0),
      de_valEntr: Number(it.total || 0),
      de_unidad: 'UND',
      de_cosMerc: Number(it.precio || 0),
      de_codSupl: null,
      de_fecEntr: new Date().toISOString().split('T')[0],
      de_codEmpr: codEmp,
      de_codSucu: sucursalId
    }));

    this.entradaSrv.guardarEntradamerc({ entradamercancias, detalle }).subscribe({
      next: (res: any) => {
        const codGenerado = res?.data?.nuevoCodigo || res?.data?.me_codEntr || res?.nuevoCodigo;
        Swal.fire({
          title: 'Devolución guardada',
          text: codGenerado ? `Entrada: ${codGenerado}` : '',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false,
        });
        this.seleccionFactura = [];
        this.totalFactura = 0;
      },
      error: () => {
        Swal.fire({ title: 'Error al guardar', icon: 'error' });
      }
    });
  }

  focusNext(id: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) {
      el.focus();
      try { el.select(); } catch {}
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
}
