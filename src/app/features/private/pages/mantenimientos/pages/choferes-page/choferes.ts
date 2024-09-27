import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ServicioCliente } from 'src/app/core/services/mantenimientos/clientes/cliente.service';
import { ModeloClienteData } from 'src/app/core/services/mantenimientos/clientes';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ModeloChoferData } from 'src/app/core/services/mantenimientos/choferes';
declare var $: any;


@Component({
  selector: 'Choferes',
  templateUrl: './choferes.html',
  styleUrls: ['./choferes.css']
})
export class Choferes implements OnInit {
  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo = '';
  descripcion: string = '';
  private descripcionBuscar = new BehaviorSubject<string>('');


  habilitarFormulario: boolean = false;
  tituloModalChofer!: string;
  formularioChofer!: FormGroup;
  modoedicionChofer: boolean = false;
  choferid!: number
  modoconsultaChofer: boolean = false;
  choferList: ModeloChoferData[] = [];
  selectedChofer: any = null;
  constructor(private fb: FormBuilder, private servicioChofer: ServicioChofer) {
    this.crearFormularioChofer();
    this.descripcionBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nombre => {
        this.descripcion = nombre;
        return this.servicioChofer.buscarTodosChofer(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.choferList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

  }

  onDescripcionInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }

  seleccionarChofer(chofer: any) { this.selectedChofer = Choferes; }
  ngOnInit(): void { this.buscarTodosChofer(1); }

  crearFormularioChofer() {
    this.formularioChofer = this.fb.group({
      cedChofer: ['', Validators.required],
      nomChofer: ['', Validators.required],
      statusChofer: [true, Validators.required],
    });

  } habilitarFormularioChofer() {
    this.habilitarFormulario = false;
  }

  nuevoChofer() {
    this.modoedicionChofer = false;
    this.tituloModalChofer = 'Agregando Chofer';
    $('#modalchofer').modal('show');
    this.habilitarFormulario = true;
  }

  cerrarModalChofer() {
    this.habilitarFormulario = false;
    this.formularioChofer.reset();
    this.modoedicionChofer = false;
    this.modoconsultaChofer = false;
    $('#modalchofer').modal('hide');
    this.crearFormularioChofer();
  }

  editarChofer(Chofer: ModeloChoferData) {
    this.choferid = Chofer.codChofer;
    this.modoedicionChofer = true;
    this.formularioChofer.patchValue(Chofer);
    this.tituloModalChofer = 'Editando Chofer';
    $('#modalchofer').modal('show');
    this.habilitarFormulario = true;
  }

  buscarTodosChofer(page: number) {
    this.servicioChofer.buscarTodosChofer(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.choferList = response.data;
    });
  }
  consultarChofer(Chofer: ModeloChoferData) {
    this.tituloModalChofer = 'Consulta Chofer';
    this.formularioChofer.patchValue(Chofer);
    $('#modalchofer').modal('show');
    this.habilitarFormulario = true;
    this.modoconsultaChofer = true;
  };


  eliminarChofer(Chofer: number) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Chofer?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioChofer.eliminarChofer(Chofer).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Chofer eliminado correctamente.",
              icon: "success",
              timer: 3000,
              showConfirmButton: false,
            }
          )
          this.buscarTodosChofer(this.currentPage);
        });
      }
    })
  }

  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }

  guardarChofer() {
    console.log(this.formularioChofer.value);
    if (this.formularioChofer.valid) {
      if (this.modoedicionChofer) {
        this.servicioChofer.editarChofer(this.choferid, this.formularioChofer.value).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Chofer Editado correctamente.",
            icon: "success",
            timer: 5000,
            showConfirmButton: false,
          });
          this.buscarTodosChofer(1);
          this.formularioChofer.reset();
          this.crearFormularioChofer();
          $('#modalchofer').modal('hide');
        });
      }
      else {
        this.servicioChofer.guardarChofer(this.formularioChofer.value).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Chofer Guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });

          this.buscarTodosChofer(1);
          this.formularioChofer.reset();
          this.crearFormularioChofer();
          $('#modalchofer').modal('hide');
        });
      }
    }
    else {
      alert("Este Chofer no fue Guardado");
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
    const descripcion = this.descripcionBuscar.getValue();
    this.servicioChofer.buscarTodosChofer(this.currentPage, this.pageSize, descripcion)
      .subscribe(response => {
        this.choferList = response.data;
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
    this.buscarTodosChofer(1);
  }
}





