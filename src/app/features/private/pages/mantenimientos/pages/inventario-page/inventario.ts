import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloGrupoMercanciasData } from 'src/app/core/services/mantenimientos/grupomerc';
import { ServicioGrupoMercancias } from 'src/app/core/services/mantenimientos/grupomerc/grupomerc.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
declare var $: any;
import Swal from 'sweetalert2';


@Component({
  selector: 'Inventario',
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class Inventario implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalProducto!: string;
  formularioInventario!: FormGroup;
  invenarioList: ModeloInventarioData[] = [];
  grupomercList: ModeloGrupoMercanciasData[] = [];
  maxChars: number = 30;
  remainingChars: number = this.maxChars;

  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;

  codigo: string = '';
  descripcion: string = '';
  codigoInput: string = '';
  modoEdicionProducto = false;
  modoConsultaProducto = false;
  productoEditId: number | null = null;

  private codigoSubject = new BehaviorSubject<string>('');
  private descripcionSubject = new BehaviorSubject<string>('');

  sucursalesList: SucursalesData[] = [];
  inventarioSucursalList: any[] = [];
  productoDetalleSucursal: ModeloInventarioData | null = null;
  guardandoSucursal: Record<number, boolean> = {};
  totalSucursales = 0;

  constructor(
    private fb: FormBuilder,
    private servicioInventario: ServicioInventario,
    private servicioGrupmerc: ServicioGrupoMercancias,
    private servicioSucursal: ServicioSucursal
  ) {
    this.crearFormularioInventario();
    this.codigoSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(codigo => {
        this.codigo = codigo;
        return this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.invenarioList = response?.data || [];
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? this.currentPage);
    });

    this.descripcionSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(descripcion => {
        console.log('descripcion', descripcion);
        this.descripcion = descripcion;
        return this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.invenarioList = response?.data || [];
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? this.currentPage);
    });
  }

  ngOnInit(): void {
    this.obtenerTodosInventario(1);
    this.obtenerTodosGrupoMercancias();
    this.obtenerTodasSucursales();
    this.formularioInventario.get('in_desmerc')!.valueChanges.subscribe(value => {
      this.updateCharCount();
    });
  }

  obtenerTodasSucursales() {
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response) => {
        this.sucursalesList = response?.data || [];
        this.totalSucursales = this.sucursalesList.length;
      },
      error: () => {
        this.sucursalesList = [];
        this.totalSucursales = 0;
      }
    });
  }

  onCodigoInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoSubject.next(inputElement.value.toUpperCase());
  }

  clearInput(): void {
    this.codigoInput = '';
  }

  onDescripcionInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionSubject.next(inputElement.value.toUpperCase());
  }

  updateCharCount() {
    const currentLength = String(this.formularioInventario.get('in_desmerc')?.value || '').length;
    this.remainingChars = this.maxChars - currentLength;
  }


  crearFormularioInventario() {
    this.formularioInventario = this.fb.group({
      id: [null],
      in_codmerc: [""],
      in_desmerc: [""],
      in_grumerc: [""],
      in_tipoproduct: [""],
      in_canmerc: [""],
      in_caninve: [""],
      in_fecinve: [""],
      in_eximini: [""],
      in_cosmerc: [""],
      in_premerc: [""],
      in_precmin: [""],
      in_costpro: [""],
      in_ucosto: [""],
      in_porgana: [""],
      in_peso: [""],
      in_longitud: [""],
      in_unidad: [""],
      in_medida: [""],
      in_fecmodif: [""],
      in_amacen: [""],
      in_imagen: [""],
      in_status: [""],
      in_minvent: [""],
    });
  }

  habilitarBuscador() {
    this.habilitarBusqueda = false;
  }

  nuevoProducto() {
    this.tituloModalProducto = 'Agregar Producto';
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = false;
    this.productoEditId = null;
    this.formularioInventario.enable();
    this.formularioInventario.reset({
      id: null,
      in_status: 'A',
      in_tipoproduct: 'H'
    });
    this.updateCharCount();
    $('#modalProducto').modal('show');
  }

  editarProducto(invetario: ModeloInventarioData) {
    this.tituloModalProducto = 'Editar Producto';
    this.modoEdicionProducto = true;
    this.modoConsultaProducto = false;
    this.formularioInventario.enable();
    this.productoEditId = Number((invetario as any)?.id || 0) || null;
    this.formularioInventario.patchValue(invetario);
    this.updateCharCount();
    $('#modalProducto').modal('show');
  }

  consultarProducto(Inventario: ModeloInventarioData) {
    this.tituloModalProducto = 'Consulta Inventario';
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = true;
    this.productoEditId = Number((Inventario as any)?.id || 0) || null;
    this.formularioInventario.patchValue(Inventario);
    this.formularioInventario.disable();
    this.updateCharCount();
    $('#modalProducto').modal('show');
  };

  abrirDetallePorSucursal(producto: ModeloInventarioData) {
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    if (!codigo) {
      Swal.fire('Código inválido', 'El producto no tiene código válido.', 'warning');
      return;
    }
    this.productoDetalleSucursal = producto;

    if (!this.sucursalesList.length) {
      this.obtenerTodasSucursales();
    }

    this.servicioInventario.obtenerInventarioPorProducto(codigo).subscribe({
      next: (response) => {
        const rows = response?.data || [];
        const mapInv = new Map<number, any>();
        rows.forEach((r: any) => mapInv.set(Number(r.inv_codsucu), r));
        const costoGlobal = Number((producto as any)?.in_cosmerc ?? 0);
        const precioGlobal = Number((producto as any)?.in_premerc ?? 0);

        this.inventarioSucursalList = (this.sucursalesList || []).map((s) => {
          const inv = mapInv.get(Number(s.cod_sucursal));
          const costoLocalRaw = inv?.inv_cosprod;
          const costoLocal = costoLocalRaw === null || costoLocalRaw === undefined || costoLocalRaw === '' ? null : Number(costoLocalRaw);
          return {
            id: inv?.id ?? null,
            cod_sucursal: Number(s.cod_sucursal),
            nom_sucursal: s.nom_sucursal,
            inv_codprod: codigo,
            inv_desprod: (producto as any)?.in_desmerc ?? '',
            inv_existencia: Number(inv?.inv_existencia ?? 0),
            inv_cosprod: costoLocal,
            inv_preprod: Number(inv?.inv_preprod ?? precioGlobal),
            activo: inv?.activo === false ? false : true,
            costo_global: costoGlobal,
            costo_efectivo: costoLocal === null ? costoGlobal : costoLocal,
          };
        });

        $('#modalInventarioSucursal').modal('show');
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el detalle por sucursal.', 'error');
      }
    });
  }

  onCostoLocalChange(item: any) {
    const raw = item?.inv_cosprod;
    if (raw === '' || raw === null || raw === undefined) {
      item.inv_cosprod = null;
      item.costo_efectivo = Number(item.costo_global || 0);
      return;
    }
    const n = Number(raw);
    item.inv_cosprod = Number.isFinite(n) ? n : null;
    item.costo_efectivo = item.inv_cosprod === null ? Number(item.costo_global || 0) : item.inv_cosprod;
  }

  guardarSucursalDetalle(item: any) {
    const cod = String(item?.inv_codprod || '').trim();
    if (!cod) {
      Swal.fire('Error', 'Código de producto inválido.', 'error');
      return;
    }

    this.guardandoSucursal[item.cod_sucursal] = true;
    this.servicioInventario.guardarInventarioSucursal({
      inv_codsucu: Number(item.cod_sucursal),
      inv_codprod: cod,
      inv_desprod: item.inv_desprod,
      inv_existencia: Number(item.inv_existencia || 0),
      inv_cosprod: item.inv_cosprod === '' ? null : item.inv_cosprod,
      inv_preprod: item.inv_preprod,
      activo: !!item.activo
    }).subscribe({
      next: () => {
        this.guardandoSucursal[item.cod_sucursal] = false;
        Swal.fire({
          title: 'Guardado',
          text: `Sucursal ${item.nom_sucursal} actualizada.`,
          icon: 'success',
          timer: 1200,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.guardandoSucursal[item.cod_sucursal] = false;
        const msg = String(err?.message || err?.error?.message || 'No se pudo guardar');
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  cerrarModalProducto(): void {
    this.formularioInventario.reset({
      id: null,
      in_status: 'A',
      in_tipoproduct: 'H'
    });
    this.formularioInventario.enable();
    this.modoEdicionProducto = false;
    this.modoConsultaProducto = false;
    this.productoEditId = null;
    this.updateCharCount();
    $('#modalProducto').modal('hide');
  }

  onSubmitInventario() {
    if (this.modoConsultaProducto) {
      return;
    }

    if (this.formularioInventario.valid) {
      const payload = this.formularioInventario.getRawValue();
      const codigo = String(payload?.in_codmerc || '').trim();
      if (!codigo) {
        Swal.fire({ title: 'Código requerido', text: 'Debe ingresar el código del producto.', icon: 'warning' });
        return;
      }

      const request$ = this.modoEdicionProducto
        ? this.servicioInventario.editarInventario(codigo, {
            ...payload,
            id: this.productoEditId
          } as any)
        : this.servicioInventario.guardarInventario(payload);

      request$.subscribe({
        next: () => {
          Swal.fire({
            title: "Excelente!",
            text: this.modoEdicionProducto ? "Producto actualizado correctamente." : "Producto guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });
          this.obtenerTodosInventario(1);
          this.cerrarModalProducto();
        },
        error: (err) => {
          const msg = (err?.message || err?.error?.message || 'No se pudo guardar el producto').toString();
          Swal.fire({ title: 'Error', text: msg, icon: 'error' });
        }
      });
    } else {
      alert("Formulario invalido");
    }
  }

  obtenerTodosInventario(page: number) {
    this.servicioInventario.obtenerTodosInventario(page, this.pageSize).subscribe(response => {
      const rows = response?.data || [];
      this.invenarioList = rows;
      this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
      this.currentPage = Number(response?.pagination?.page ?? page);
      this.cargarCoberturaSucursalProductos(rows);
    }
    );
  }

  private cargarCoberturaSucursalProductos(rows: ModeloInventarioData[]) {
    const codigos = (rows || []).map((item) => item.in_codmerc);
    if (!codigos.length || !this.totalSucursales) {
      this.invenarioList = (rows || []).map((item) => ({
        ...item,
        sucursales_cargadas: 0,
        sucursales_totales: this.totalSucursales,
        inventario_completo: false,
      }));
      return;
    }

    this.servicioInventario
      .obtenerCoberturaSucursalesPorProductos(codigos, this.totalSucursales)
      .subscribe({
        next: (coverageResp) => {
          const coverageRows = Array.isArray(coverageResp?.data) ? coverageResp.data : [];
          const coverageMap = new Map<string, any>(
            coverageRows.map((item: any) => [String(item.in_codmerc || '').trim(), item])
          );
          this.invenarioList = (rows || []).map((item) => {
            const coverage = coverageMap.get(String(item.in_codmerc || '').trim());
            return {
              ...item,
              sucursales_cargadas: Number(coverage?.sucursales_cargadas || 0),
              sucursales_totales: Number(coverage?.sucursales_totales || this.totalSucursales),
              inventario_completo: !!coverage?.inventario_completo,
            };
          });
        },
        error: () => {
          this.invenarioList = rows;
        },
      });
  }

  obtenerTodosGrupoMercancias() {
    this.servicioGrupmerc.obtenerTodosGrupoMercancias().subscribe(response => {
      this.grupomercList = response?.data || [];
    });
  }

  eliminarProducto(choferId: any) {
    const codigo = String(choferId || '').trim();
    if (!codigo) {
      return;
    }
    Swal.fire({
      title: '¿Está seguro de eliminar este producto?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioInventario.borrarDeInventario(codigo).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Producto eliminado correctamente.",
              icon: "success",
              timer: 3000,
              showConfirmButton: false,
            }
          )
          this.obtenerTodosInventario(this.currentPage);
        });
      }
    })
  }

  changePage(page: number) {
    const maxPage = this.totalPages;
    if (page < 1 || page > maxPage || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const codigo = this.codigoSubject.getValue();
    const descripcion = this.descripcionSubject.getValue();
    this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, codigo, descripcion)
      .subscribe(response => {
        const rows = response?.data || [];
        this.invenarioList = rows;
        this.totalItems = Number(response?.pagination?.total ?? this.invenarioList.length);
        this.currentPage = Number(response?.pagination?.page ?? page);
        this.cargarCoberturaSucursalProductos(rows);
      });
  }


  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pages(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxPagesToShow = this.maxPagesToShow;

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }
}
