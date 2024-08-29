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
  constructor(private fb: FormBuilder, private servicioEmpresa: ServicioEmpresa, private servicioSucursal: ServicioSucursal) {
    this.crearFormularioEmpresa();
    this.crearformularioSucursal();
    this.descripcionBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nombre => {
        this.descripcion = nombre;
        return this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.empresaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
    this.codigoBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(rnc => {
        this.codigo = rnc;
        return this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.empresaList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

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
    this.sucursalList = Empresa.sucursales
  }

  buscarTodasEmpresa(page: number) {
    this.servicioEmpresa.buscarTodasEmpresa(page, this.pageSize).subscribe(response => {
      console.log(response);
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

    this.activaformularioSucursal = false;
    this.activatablaSucursal = true;
    this.sucursalList = Empresa.sucursales
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
  eliminarSucursal(sucursal: string) {
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
        this.servicioSucursal.eliminarSucursal(sucursal).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Sucursal eliminado correctamente.",
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


  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }

  codigoEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoBuscar.next(inputElement.value.toUpperCase());
  }
  guardarSucursal() {
    console.log(this.formularioSucursal.value);
    var datosFormulariEmpresa = this.formularioEmpresa.value;
    this.formularioSucursal.patchValue({ cod_empre: datosFormulariEmpresa.cod_empre });
    if (this.formularioSucursal.valid) {
      this.servicioSucursal.guardarSucursal(this.formularioSucursal.value).subscribe(response => {
        Swal.fire
          ({
            title: "Excelente!",
            text: "Sucursal Guardada correctamente.",
            icon: 'warning',
            timer: 3000,
            showConfirmButton: false,
          })
        this.buscarTodasEmpresa(1);
        this.formularioSucursal.reset();
        this.crearformularioSucursal();
        this.cerrarModalEmpresa();
        $('#modalsucursal').modal('hide');
      })
    }
    else {
      alert("Esta Sucursal no fue Guardado");
    }

  }

  guardarEmpresa() {
    console.log(this.formularioEmpresa.value);
    if (this.formularioEmpresa.valid) {
      if (this.modoedicionEmpresa) {
        this.servicioEmpresa.editarEmpresa(this.empresaid, this.formularioEmpresa.value).subscribe(response => {
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
        });
      }
      else {
        this.servicioEmpresa.guardarEmpresa(this.formularioEmpresa.value).subscribe(response => {
          Swal.fire
            ({
              title: "Empresa Guardada correctamente",
              text: "Desea Crear una Sucursal",
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Crear Sucursal'
            }).then((result) => {
              if (result.isConfirmed) {

                this.formularioEmpresa.disable();
                this.activaformularioSucursal = true;
                this.activatablaSucursal = false;
              }
              else {
                this.activaformularioSucursal = false;
                this.buscarTodasEmpresa(1);
                this.formularioEmpresa.reset();
                this.crearFormularioEmpresa();
                this.formularioEmpresa.enable();
                $('#modalempresa').modal('hide');

              }

            });
        })
      }
    }
    else {
      alert("Esta Empresa no fue Guardado");
    }
  }

  convertToUpperCase(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
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
    const descripcion = this.descripcionBuscar.getValue();
    this.servicioEmpresa.buscarTodasEmpresa(this.currentPage, this.pageSize, descripcion)
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





