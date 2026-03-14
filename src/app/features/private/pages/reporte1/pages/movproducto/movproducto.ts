import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ServicioProducto } from 'src/app/core/services/mantenimientos/producto/producto.service';
import { ServicioReporteMovProducto } from 'src/app/core/services/reportes/movimientos-producto.service';

interface Movimiento {
  origen: string;
  fecha: string;
  codigo: string;
  producto: string;
  tipo: string;
  cantidad: number;
  salida: number;
  entrada: number;
  cliente: string;
  balance: number;
  precio: number;
}

@Component({
  selector: 'app-movimiento-producto',
  templateUrl: './movproducto.html',
  styleUrls: ['./movproducto.css']
})
export class MovimientoProducto {
  title = 'Movimientos de Productos';
  filtroForm: FormGroup;
  movimientos: Movimiento[] = [];
  resultados: Movimiento[] = [];
  sugerenciasCodigo: any[] = [];
  sugerenciasNombre: any[] = [];
  existenciaActual: number = 0;
  idxCodigo = -1;
  idxNombre = -1;
  nombreDeshabilitado = false;

  @ViewChild('codigoInput') codigoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('nombreInput') nombreInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaInicioInput') fechaInicioInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput') fechaFinInput!: ElementRef<HTMLInputElement>;
  @ViewChild('tipoSelect') tipoSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('buscarBtn') buscarBtn!: ElementRef<HTMLButtonElement>;

  constructor(private fb: FormBuilder, private productoSrv: ServicioProducto, private reporteSrv: ServicioReporteMovProducto) {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${yyyy}-${mm}-${dd}`;

    this.filtroForm = this.fb.group({
      fechaInicio: [''],
      fechaFin: [hoyStr],
      codigo: [''],
      producto: [''],
      tipo: ['']
    });

    // datos de ejemplo
    this.movimientos = [];

    this.resultados = [...this.movimientos];
  }


// filtrar() {

//   console.log("Filtrando...");

//   const { fechaInicio, fechaFin, codigo } = this.filtroForm.value;

//   const cod = String(codigo || '').trim();

//   if (!cod) {
//     this.resultados = [];
//     return;
//   }

//   this.reporteSrv.buscarMovimientosPorProducto(cod, fechaInicio || '', fechaFin || '').subscribe({

//     next: (resp:any) => {

//       this.resultados = resp?.data?.rows || [];
//       console.log(this.resultados);
//     }
//     // next: (resp: any) => {

//     //   const lista = resp?.data?.rows || [];

//     //   this.resultados = this.normalizarMovimientos(lista, cod);

//     //   console.log("Movimientos:", this.resultados);

//     // },

//     // error: (err) => {
//     //   console.error(err);
//     //   this.resultados = [];
//     // }

//   });

// }
filtrar() {

  const { fechaInicio, fechaFin, codigo, tipo } = this.filtroForm.value;

  this.reporteSrv.buscarMovimientosPorProducto(
    codigo,
    fechaInicio,
    fechaFin,
    tipo
  ).subscribe({

    next:(resp:any)=>{

      this.resultados = resp?.data?.rows || [];

      this.existenciaActual = resp?.data?.existenciaActual || 0;

    }

  });

}
  limpiar() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${yyyy}-${mm}-${dd}`;

    this.filtroForm.reset({
      fechaInicio: '',
      fechaFin: hoyStr,
      codigo: '',
      producto: '',
      tipo: ''
    });
    this.resultados = [...this.movimientos];
    this.sugerenciasCodigo = [];
    this.sugerenciasNombre = [];
    this.idxCodigo = -1;
    this.idxNombre = -1;
  }

  focusNext(desde: 'codigo' | 'nombre' | 'fechaInicio' | 'fechaFin' | 'tipo'): void {
    if (desde === 'codigo') {
      if (this.nombreDeshabilitado) {
        this.fechaInicioInput?.nativeElement?.focus();
      } else {
        this.nombreInput?.nativeElement?.focus();
      }
      return;
    }
    if (desde === 'nombre') {
      this.fechaInicioInput?.nativeElement?.focus();
      return;
    }
    if (desde === 'fechaInicio') {
      this.fechaFinInput?.nativeElement?.focus();
      return;
    }
    if (desde === 'fechaFin') {
      this.tipoSelect?.nativeElement?.focus();
      return;
    }
    if (desde === 'tipo') {
      this.buscarBtn?.nativeElement?.focus();
      return;
    }
  }

  onCodigoInput(): void {
    const val = String(this.filtroForm.get('codigo')?.value || '').trim();
    if (val.length < 1) {
      this.sugerenciasCodigo = [];
      this.idxCodigo = -1;
      this.nombreDeshabilitado = false;
      return;
    }
    this.productoSrv.buscarProductosPorCodigo(val).subscribe({
      next: (resp: any) => {
        const lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        this.sugerenciasCodigo = lista;
        this.idxCodigo = this.sugerenciasCodigo.length > 0 ? 0 : -1;
      },
      error: () => {
        this.sugerenciasCodigo = [];
        this.idxCodigo = -1;
      }
    });
  }

  onCodigoKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const val = String(this.filtroForm.get('codigo')?.value || '').trim();
      if (this.sugerenciasCodigo.length > 0) {
        const item = this.sugerenciasCodigo[this.idxCodigo] ?? this.sugerenciasCodigo[0];
        if (item) {
          this.seleccionarSugerenciaCodigo(item);
          this.focusNext('codigo');
          return;
        }
      }
      if (val) {
        this.verificarCodigoExistente(val);
      } else {
        this.nombreDeshabilitado = false;
        this.focusNext('codigo');
      }
      return;
    }
    if (this.sugerenciasCodigo.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.idxCodigo = Math.min(this.idxCodigo + 1, this.sugerenciasCodigo.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.idxCodigo = Math.max(this.idxCodigo - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.sugerenciasCodigo[this.idxCodigo] ?? this.sugerenciasCodigo[0];
      if (item) this.seleccionarSugerenciaCodigo(item);
    } else if (event.key === 'Escape') {
      this.sugerenciasCodigo = [];
      this.idxCodigo = -1;
    }
  }

  seleccionarSugerenciaCodigo(item: any): void {
    const cod = item.in_codmerc ?? item.codigo ?? '';
    const des = item.in_desmerc ?? item.descripcion ?? '';
    this.filtroForm.patchValue({ codigo: cod, producto: des });
    this.sugerenciasCodigo = [];
    this.idxCodigo = -1;
    this.nombreDeshabilitado = true;
  }

  onNombreInput(): void {
    const val = String(this.filtroForm.get('producto')?.value || '').trim();
    if (val.length < 2) {
      this.sugerenciasNombre = [];
      this.idxNombre = -1;
      return;
    }
    this.productoSrv.buscarProductosPorDescripcion(val).subscribe({
      next: (resp: any) => {
        const lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        this.sugerenciasNombre = lista;
        this.idxNombre = this.sugerenciasNombre.length > 0 ? 0 : -1;
      },
      error: () => {
        this.sugerenciasNombre = [];
        this.idxNombre = -1;
      }
    });
  }

  onNombreKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.sugerenciasNombre.length > 0) {
        const item = this.sugerenciasNombre[this.idxNombre] ?? this.sugerenciasNombre[0];
        if (item) {
          this.seleccionarSugerenciaNombre(item);
        }
      }
      this.focusNext('nombre');
      return;
    }
    if (this.sugerenciasNombre.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.idxNombre = Math.min(this.idxNombre + 1, this.sugerenciasNombre.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.idxNombre = Math.max(this.idxNombre - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.sugerenciasNombre[this.idxNombre] ?? this.sugerenciasNombre[0];
      if (item) this.seleccionarSugerenciaNombre(item);
    } else if (event.key === 'Escape') {
      this.sugerenciasNombre = [];
      this.idxNombre = -1;
    }
  }

  seleccionarSugerenciaNombre(item: any): void {
    const cod = item.in_codmerc ?? item.codigo ?? '';
    const des = item.in_desmerc ?? item.descripcion ?? '';
    this.filtroForm.patchValue({ codigo: cod, producto: des });
    this.sugerenciasNombre = [];
    this.idxNombre = -1;
    this.nombreDeshabilitado = false;
  }

  private verificarCodigoExistente(codigo: string): void {
    this.productoSrv.obtenerProductoPorId(codigo).subscribe({
      next: (resp: any) => {
        const data = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data ?? resp);
        if (data) {
          const des = data.in_desmerc ?? data.descripcion ?? '';
          this.filtroForm.patchValue({ producto: des });
          this.nombreDeshabilitado = true;
          this.focusNext('codigo');
        } else {
          this.nombreDeshabilitado = false;
          this.focusNext('codigo');
        }
      },
      error: () => {
        this.nombreDeshabilitado = false;
        this.focusNext('codigo');
      }
    });
  }

  // private normalizarMovimientos(data: any[], cod: string): Movimiento[] {
  //   let balance = 0;
  //   return data.map((d: any) => {
  //     const fecha =
  //       d.fecha ||
  //       d.df_fecfac ||
  //       d.fa_fecfact ||
  //       d.me_fecEntr ||
  //       d.de_fecha ||
  //       d.fecha_mov ||
  //       '';
  //     const cliente =
  //       d.cliente ||
  //       d.fa_nomClie ||
  //       d.nombreCliente ||
  //       d.me_nomSupl ||
  //       d.proveedor ||
  //       '';
  //     const tipoBase = (d.tipo || d.origen || '').toString().toLowerCase();
  //     const tipo = tipoBase.includes('entr') ? 'Entrada' : (tipoBase.includes('sal') || tipoBase.includes('vent')) ? 'Salida' : (d.tipo || 'Salida');
  //     let origen = 'salida';
  //     if (tipoBase.includes('entr')) {
  //       origen = 'entrada';
  //     } else if (tipoBase.includes('vent')) {
  //       origen = 'ventainterna';
  //     } else if (d.me_codEntr || d.de_codentra || d.me_codentr) {
  //       origen = 'entrada';
  //     } else if (d.fa_codFact || d.df_codFact || d.fa_codfact || d.df_codfact) {
  //       origen = 'ventainterna';
  //     } else if (tipo === 'Entrada') {
  //       origen = 'entrada';
  //     }
  //     const cantidad = Number(d.cantidad ?? d.df_cantidad ?? d.dc_cantidad ?? d.de_canEntr ?? 0);
  //     const balance = Number(d.balance ?? d.saldo ?? d.exist ?? d.existencia ?? 0);
  //     const precio = Number(d.precio ?? d.df_precio ?? d.dc_precio ?? d.de_preMerc ?? 0);
  //     const nombreProd = d.producto ?? d.df_desMerc ?? d.de_desMerc ?? d.in_desmerc ?? '';
  //     return {
  //       origen,
  //       fecha: typeof fecha === 'string' ? fecha : String(fecha || ''),
  //       codigo: cod,
  //       producto: nombreProd,
  //       tipo,
  //       cantidad,
  //       cliente,
  //       balance,
  //       precio,
  //     };
  //   });
  // }

  private normalizarMovimientos(data: any[], cod: string): Movimiento[] {
    let balance = 0;
    return data.map((d: any) => {
      const fecha =
        d.fecha ||
        d.df_fecfac ||
        d.fa_fecfact ||
        d.me_fecEntr ||
        d.de_fecha ||
        d.fecha_mov ||
        '';
      const cliente =
        d.cliente ||
        d.fa_nomClie ||
        d.nombreCliente ||
        d.me_nomSupl ||
        d.proveedor ||
        '';
      const tipoBase = (d.tipo || d.origen || '').toString().toLowerCase();
      const tipo = tipoBase.includes('entr') ? 'Entrada' : (tipoBase.includes('sal') || tipoBase.includes('vent')) ? 'Salida' : (d.tipo || 'Salida');
      let origen = 'salida';
      if (tipoBase.includes('entr')) {
        origen = 'entrada';
      } else if (tipoBase.includes('vent')) {
        origen = 'ventainterna';
      } else if (d.me_codEntr || d.de_codentra || d.me_codentr) {
        origen = 'entrada';
      } else if (d.fa_codFact || d.df_codFact || d.fa_codfact || d.df_codfact) {
        origen = 'ventainterna';
      } else if (tipo === 'Entrada') {
        origen = 'entrada';
      }
      const cantidad = Number(d.cantidad ?? d.df_cantidad ?? d.dc_cantidad ?? d.de_canEntr ?? 0);
      const balance = Number(d.balance ?? d.saldo ?? d.exist ?? d.existencia ?? 0);
      const precio = Number(d.precio ?? d.df_precio ?? d.dc_precio ?? d.de_preMerc ?? 0);
      const nombreProd = d.producto ?? d.df_desMerc ?? d.de_desMerc ?? d.in_desmerc ?? '';
      const salida = tipo === 'Salida' ? cantidad : 0;
      const entrada = tipo === 'Entrada' ? cantidad : 0;
      return {
        origen,
        fecha: typeof fecha === 'string' ? fecha : String(fecha || ''),
        codigo: cod,
        producto: nombreProd,
        tipo,
        cantidad,
        salida,
        entrada,
        cliente,
        balance,
        precio,
      };
    });
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      const base = fecha.slice(0, 10);
      const parts = base.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const d = Number(parts[2]);
          const dd = String(d).padStart(2, '0');
          const mm = String(m).padStart(2, '0');
          const yyyy = String(y).padStart(4, '0');
          return `${dd}/${mm}/${yyyy}`;
        } else {
          const d = Number(parts[0]);
          const m = Number(parts[1]);
          const y = Number(parts[2]);
          const dd = String(d).padStart(2, '0');
          const mm = String(m).padStart(2, '0');
          const yyyy = String(y).padStart(4, '0');
          return `${dd}/${mm}/${yyyy}`;
        }
      }
    }
    const date = new Date(fecha);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  getDocumento(mov: any): string {
    return (
      mov?.numdoc ??
      mov?.me_codEntr ??
      mov?.de_codentra ??
      mov?.me_codentr ??
      mov?.fa_codFact ??
      mov?.df_codFact ??
      mov?.fa_codfact ??
      mov?.df_codfact ??
      mov?.dc_numero ??
      mov?.numeroDocumento ??
      mov?.num_doc ??
      mov?.doc ??
      ''
    );
  }
}
