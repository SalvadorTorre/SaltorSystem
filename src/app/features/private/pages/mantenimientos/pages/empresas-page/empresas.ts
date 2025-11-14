import { Component, OnInit, ɵNG_COMP_DEF } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { EmpresaModelData, SucursalesData } from 'src/app/core/services/mantenimientos/empresas';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
declare var $: any;


@Component({
  selector: 'Empresas',
  templateUrl: './empresas.html',
  styleUrls: ['./empresas.css']
})
export class Empresas implements OnInit {
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  rnc: string = '';
  descripcion: string = '';
  nomempresa: string = '';
  codigo: string = '';
  private descripcionBuscar = new BehaviorSubject<string>('');
  private codigoBuscar = new BehaviorSubject<string>('');
  habilitarFormulario: boolean = false;
  tituloModalEmpresa!: string;
  formularioEmpresa!: FormGroup;
  formularioSucursal!: FormGroup;
  modoedicionEmpresa: boolean = false;
  empresaid!: string
  modoconsultaEmpresa: boolean = false;
  empresaList: EmpresaModelData[] = [];
  sucursalList: SucursalesData[] = [];
  activatablaSucursal: boolean = false;
  activaformularioSucursal: boolean = false;
  selectedEmpresa: any = null;
  modoedicionSucursal: boolean = false;
  static cod_empre: any;
  constructor(private fb: FormBuilder, private servicioEmpresa: ServicioEmpresa, private servicioSucursal: ServicioSucursal) {
    this.crearFormularioEmpresa();
    this.crearformularioSucursal();
    // this.descripcionBuscar.pipe(
    //   debounceTime(500),
    //   distinctUntilChanged(),
    //   switchMap(nombre => {
    //     this.nomempresa = nombre;
    //     return this.servicioEmpresa.buscarEmpresa(this.currentPage, this.pageSize, this.nomempresa);
    //   })
    // )
      // .subscribe(response => {
      //   this.empresaList = response.data;
      //   this.totalItems = response.pagination.total;
      //   this.currentPage = response.pagination.page;
      // });
    this.codigoBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(rnc => {
        this.codigo = rnc;
        return this.servicioEmpresa.buscarEmpresa(this.currentPage, this.pageSize, this.nomempresa);
      })
    )
      // .subscribe(response => {
      //   this.empresaList = response.data;
      //   this.totalItems = response.pagination.total;
      //   this.currentPage = response.pagination.page;
      // });

  }

  private buildEmpresaPayload(raw: any): any {
    const orden = raw?.orden_compra;
    const ordenNumber = (orden === '' || orden === null || orden === undefined) ? 0 : Number(orden);
    const letra = String(raw?.letra_empre ?? '').trim().toUpperCase();
    const telDigits = String(raw?.tel_empre || '').replace(/\D+/g, '').trim();
    return {
      cod_empre: String(raw?.cod_empre || '').trim().toUpperCase(),
      rnc_empre: String(raw?.rnc_empre ?? '').trim(),
      nom_empre: String(raw?.nom_empre || '').trim().toUpperCase(),
      dir_empre: String(raw?.dir_empre || '').trim().toUpperCase(),
      tel_empre: telDigits,
      letra_empre: letra ? letra[0] : '',
      orden_compra: isNaN(ordenNumber) ? 0 : ordenNumber,
    };
  }

  agregarSucursal() {
    this.formularioEmpresa.disable();
    this.activaformularioSucursal = true;

  }
  cancelarSucursal() {
    this.activaformularioSucursal = false
    this.crearformularioSucursal();
    this.formularioSucursal.reset();
    this.formularioEmpresa.enable();
    this.formularioEmpresa.reset();

  }

  crearformularioSucursal() {
    this.formularioSucursal = this.fb.group({
      cod_empre: ['',],
      nom_sucursal: ['', Validators.required],
      dir_sucursal: ['', Validators.required],
      tel_sucursal: ['', Validators.required],
    });
  }

  seleccionarEmpresa(empresas: any) { this.selectedEmpresa = Empresas; }
  ngOnInit(): void { this.buscarTodasEmpresa(1); }

  crearFormularioEmpresa() {
    this.formularioEmpresa = this.fb.group({
      cod_empre: ['', Validators.required],
      rnc_empre: ['', Validators.required],
      nom_empre: ['', Validators.required],
      dir_empre: ['', Validators.required],
      tel_empre: ['', Validators.required],
      letra_empre: [''],
      orden_compra: [''],
    });
  }

  habilitarFormularioEmpresa() {
    this.habilitarFormulario = false;
  }

  nuevaEmpresa() {
    this.modoedicionEmpresa = false;
    this.tituloModalEmpresa = 'Agregando Empresa';
    $('#modalempresa').modal('show');
    this.habilitarFormulario = true;
    this.activatablaSucursal = false
  }

  cerrarModalEmpresa() {
    this.habilitarFormulario = false;
    this.formularioEmpresa.reset();
    this.modoedicionEmpresa = false;
    this.modoconsultaEmpresa = false;
    this.activatablaSucursal = false;
    this.activaformularioSucursal = false
    $('#modalempresa').modal('hide');
    this.crearFormularioEmpresa();
    this.sucursalList = []
  }


  editarSucursal(sucursal: SucursalesData) {
    this.empresaid = sucursal.cod_empre;
    this.modoedicionSucursal = true;
    this.activatablaSucursal = false;
    this.formularioEmpresa.patchValue(sucursal);
    this.activaformularioSucursal = false;

  }
  editarEmpresa(Empresa: EmpresaModelData) {
    this.empresaid = Empresa.cod_empre;
    this.modoedicionEmpresa = true;
    this.activatablaSucursal = true;
    this.formularioEmpresa.patchValue(Empresa);
    this.tituloModalEmpresa = 'Editando Empresa';
    $('#modalempresa').modal('show');
    this.habilitarFormulario = true;
    this.activaformularioSucursal = false;
    this.activatablaSucursal = true;
    this.sucursalList = Empresa.sucursales || [];
    // Refrescar datos desde backend para asegurar sucursales
    this.servicioEmpresa.buscarEmpres(this.empresaid).subscribe({
      next: (resp) => {
        const data = resp?.data;
        const empresaFull = Array.isArray(data) ? data[0] : data;
        if (empresaFull) {
          // Backend puede devolver 'sucursales' o 'sucursal'
          this.sucursalList = (empresaFull.sucursales || empresaFull.sucursal || []);
          this.formularioEmpresa.patchValue(empresaFull);
        }
      },
      error: () => {
        // Mantener lo que vino en la lista si falla
        this.sucursalList = Empresa.sucursales || [];
      }
    });
  }

  buscarTodasEmpresa(page: number) {
    this.servicioEmpresa.buscarTodasEmpresa(page, this.pageSize).subscribe(response => {
      this.empresaList = response.data;
    });
  }
  consultarEmpresa(Empresa: EmpresaModelData) {
    this.tituloModalEmpresa = 'Consulta Empresa';
    this.formularioEmpresa.patchValue(Empresa);
    $('#modalempresa').modal('show');
    this.habilitarFormulario = true;
    this.modoconsultaEmpresa = true;
    this.formularioEmpresa.disable();
    // Permitir agregar sucursales desde el modal de consulta
    this.empresaid = Empresa.cod_empre;
    this.activaformularioSucursal = true;
    this.activatablaSucursal = true;
    this.sucursalList = Empresa.sucursales || [];
    // Cargar sucursales desde backend para consulta
    this.servicioEmpresa.buscarEmpres(this.empresaid).subscribe({
      next: (resp) => {
        const data = resp?.data;
        const empresaFull = Array.isArray(data) ? data[0] : data;
        if (empresaFull) {
          // Backend puede devolver 'sucursales' o 'sucursal'
          this.sucursalList = (empresaFull.sucursales || empresaFull.sucursal || []);
          // No habilitamos el formulario empresa en consulta, solo refrescamos datos
          this.formularioEmpresa.patchValue(empresaFull);
        }
      },
      error: () => {
        // Si falla, dejamos lo que venía de la lista
        this.sucursalList = Empresa.sucursales || [];
      }
    });
  };

  consultarSucursal(Empresa: EmpresaModelData) {
    //this.tituloModalEmpresa = 'Consulta Empresa';
    this.formularioEmpresa.patchValue(Empresa);
    this.activaformularioSucursal = true;

    this.habilitarFormulario = true;
    this.modoconsultaEmpresa = true;
    this.activatablaSucursal = true;
    this.sucursalList = Empresa.sucursales
  };

  eliminarEmpresa(Empresa: string) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Empresa?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioEmpresa.eliminarEmpresa(Empresa).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Empresa eliminado correctamente.",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            }
          )
          this.buscarTodasEmpresa(this.currentPage);
        });
      }
    })
  }
  eliminarSucursal(sucursal: string | number) {
    const codigo = String(sucursal);
    Swal.fire({
      title: '¿Está seguro de eliminar esta Sucursal?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioSucursal.eliminarSucursal(codigo).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Sucursal eliminado correctamente.",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            }
          )
          // Refrescar la tabla de sucursales dentro del modal
          this.refrescarSucursalesModal();
        });
      }
    })
  }

  private refrescarSucursalesModal(): void {
    const cod = this.empresaid || this.formularioEmpresa.getRawValue()?.cod_empre;
    if (!cod) { return; }
    this.servicioEmpresa.buscarEmpres(cod).subscribe({
      next: (resp) => {
        const data = resp?.data;
        const empresaFull = Array.isArray(data) ? data[0] : data;
        if (empresaFull) {
          // Backend puede devolver 'sucursales' o 'sucursal'
          this.sucursalList = (empresaFull.sucursales || empresaFull.sucursal || []);
        }
      }
    });
  }


  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }

  codigoEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }
  guardarSucursal() {
    const datosEmpresa = this.formularioEmpresa.getRawValue();
    const codEmpre = datosEmpresa?.cod_empre || this.empresaid;
    this.formularioSucursal.patchValue({ cod_empre: codEmpre });
    if (this.formularioSucursal.valid && codEmpre) {
      this.servicioSucursal.guardarSucursal(this.formularioSucursal.value).subscribe({
        next: () => {
          Swal.fire({
            title: "Excelente!",
            text: "Sucursal Guardada correctamente.",
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
          });
          // Refrescar la tabla de sucursales dentro del modal
          this.refrescarSucursalesModal();
          this.formularioSucursal.reset();
          this.crearformularioSucursal();
          this.formularioEmpresa.enable();
          this.activaformularioSucursal = false;
        },
        error: (err) => {
          const msg = (err?.error?.message || err?.message || 'Error al guardar la sucursal').toString();
          Swal.fire({ title: 'Error', text: msg, icon: 'error' });
        }
      });
    } else {
      Swal.fire({ title: 'Datos incompletos', text: 'Falta el Código de Empresa.', icon: 'warning' });
    }

  }

  guardarEmpresa() {
    const raw = this.formularioEmpresa.getRawValue();
    const payload = this.buildEmpresaPayload(raw);
    console.log('Payload Empresa:', payload);
    if (this.formularioEmpresa.valid && payload.cod_empre && payload.nom_empre) {
      if (this.modoedicionEmpresa) {
        this.servicioEmpresa.editarEmpresa(this.empresaid, payload).subscribe({
          next: () => {
            Swal.fire({
              title: "Excelente!",
              text: "Empresa Editada correctamente.",
              icon: "success",
              timer: 5000,
              showConfirmButton: false,
            });
            this.buscarTodasEmpresa(1);
            this.formularioEmpresa.reset();
            this.crearFormularioEmpresa();
            $('#modalempresa').modal('hide');
          },
          error: (err) => {
            const details = err?.error?.details ? `\n${JSON.stringify(err.error.details)}` : '';
            const msg = ((err?.error?.message || err?.message || 'Error al editar la empresa').toString()) + details;
            Swal.fire({ title: 'Error', text: msg, icon: 'error' });
          }
        });
      } else {
        this.servicioEmpresa.guardarEmpresa(payload).subscribe({
          next: () => {
            // Crear una sucursal por defecto automáticamente
            const defaultSucursal = {
              cod_empre: payload.cod_empre,
              nom_sucursal: payload.nom_empre,
              dir_sucursal: payload.dir_empre || 'NO APLICA',
              tel_sucursal: payload.tel_empre || '0000000000',
            };
            this.servicioSucursal.guardarSucursal(defaultSucursal).subscribe({
              next: () => {
                Swal.fire({
                  title: "Excelente!",
                  text: "Empresa y Sucursal guardadas correctamente.",
                  icon: 'success',
                  timer: 5000,
                  showConfirmButton: false,
                });
                this.buscarTodasEmpresa(1);
                this.formularioEmpresa.reset();
                this.crearFormularioEmpresa();
                $('#modalempresa').modal('hide');
              },
              error: (err) => {
                const details = err?.error?.details ? `\n${JSON.stringify(err.error.details)}` : '';
                const msg = ((err?.error?.message || err?.message || 'Empresa guardada, pero error creando la Sucursal').toString()) + details;
                Swal.fire({ title: 'Aviso', text: msg, icon: 'warning' });
                this.buscarTodasEmpresa(1);
                this.formularioEmpresa.reset();
                this.crearFormularioEmpresa();
                $('#modalempresa').modal('hide');
              }
            });
          },
          error: (err) => {
            const details = err?.error?.details ? `\n${JSON.stringify(err.error.details)}` : '';
            const msg = ((err?.error?.message || err?.message || 'Error al guardar la empresa').toString()) + details;
            Swal.fire({ title: 'Error', text: msg, icon: 'error' });
          }
        });
      }
    } else {
      this.formularioEmpresa.markAllAsTouched();
      Swal.fire({ title: 'Formulario incompleto', text: 'Complete los campos requeridos.', icon: 'warning' });
    }
  }

  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  moveFocus(event: KeyboardEvent, nextElement: HTMLInputElement | null): void {
    if (event.key === 'Enter' && nextElement) {
      event.preventDefault(); // Evita el comportamiento predeterminado del Enter
      nextElement.focus(); // Enfoca el siguiente campo
    }
  }

  changePage(page: number) {
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const nomempresa = this.descripcionBuscar.getValue();
    this.servicioEmpresa.buscarEmpresa(this.currentPage, this.pageSize, nomempresa)
      .subscribe(response => {
        this.empresaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = page;
      });
  }


  get totalPages() {
    // Asegúrate de que totalItems sea un número antes de calcular el total de páginas
    return Math.ceil(this.totalItems / this.pageSize);
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
  limpiaBusqueda() {
    this.txtdescripcion = '';
    this.txtcodigo = '';
    this.buscarTodasEmpresa(1);
  }
}





