import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloSuplidorData } from 'src/app/core/services/mantenimientos/suplidor';
import { ServicioSuplidor } from 'src/app/core/services/mantenimientos/suplidor/suplidor.service';
declare var $: any;
import Swal from 'sweetalert2';

@Component({
  selector: 'Suplidor',
  templateUrl: './suplidor.html',
  styleUrls: ['./suplidor.css']
})
export class Suplidor implements OnInit {
  habilitarFormiarioSuplidor: boolean = false;
  tituloModalSuplidor!: string;
  formularioSuplidor!: FormGroup;
  clienteList: ModeloSuplidorData[] = [];
  modoedicionSuplidor: boolean = false;
  suplidorid!: number
  modoconsultaSuplidor: boolean = false;
  suplidorList: ModeloSuplidorData[] = [];
  selectedSuplidor: any = null;

  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo: string = '';
  codSuplidor: string = '';
  descripcion: string = '';

  habilitarBusqueda: boolean = false;
  mensagePantalla: boolean = false;
  private codigoBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');



  constructor(private fb: FormBuilder, private servicioSuplidor: ServicioSuplidor) {
    this.crearFormularioSuplidor();
    this.descripcionBuscar.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap(descripcion => {
        this.descripcion = descripcion;
        return this.servicioSuplidor.buscarTodosSuplidor(this.currentPage, this.pageSize, this.codSuplidor, this.descripcion);
      })

    )
      .subscribe(response => {
        this.suplidorList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

    this.codigoBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(codSuplidor => {
        this.codSuplidor = codSuplidor;
        return this.servicioSuplidor.buscarTodosSuplidor(this.currentPage, this.pageSize, this.codSuplidor, this.descripcion);
      })
    )
      .subscribe(response => {
        this.suplidorList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
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


  seleccionarSuplidor(suplidor: any) {
    this.selectedSuplidor = suplidor;
  }
  ngOnInit(): void {
    this.buscarTodosSuplidor(1);
    this.formularioSuplidor.get('su_nomsupl')!.valueChanges.subscribe(value => {
      this.updateCharCount();
    });
  }
  updateCharCount() {
    throw new Error('Method not implemented.');
    // const currentLength = this.formularioInventario.get('in_desmerc')!.value.length;
    // this.remainingChars = this.maxChars - currentLength;
  }

  crearFormularioSuplidor() {
    this.formularioSuplidor = this.fb.group({
      su_rncSupl: ['', Validators.required],
      su_nomSupl: ['', Validators.required],
      su_dirSupl: [''],
      su_telSupl: [''],
      su_contact: [''],
      su_status: [true],
    });
  }
  habilitarFormularioSuplidor() {
    this.habilitarFormiarioSuplidor = false;
  }

  nuevoSuplidor() {
    this.modoedicionSuplidor = false;
    this.tituloModalSuplidor = 'Agregando Suplidor';
    $('#modalsuplidor').modal('show');
    this.habilitarFormiarioSuplidor = true;
  }

  cerrarModalSuplidor() {
    this.habilitarFormiarioSuplidor = false;
    this.formularioSuplidor.reset();
    this.modoedicionSuplidor = false;
    this.modoconsultaSuplidor = false;
    $('#modalsuplidor').modal('hide');
    this.crearFormularioSuplidor();

  }
  editarSuplidor(suplidor: ModeloSuplidorData) {
    this.suplidorid = suplidor.su_codSupl;
    this.modoedicionSuplidor = true;
    this.formularioSuplidor.patchValue(suplidor);
    this.tituloModalSuplidor = 'Editando Suplidor';
    $('#modalsuplidor').modal('show');
    this.habilitarFormiarioSuplidor = true;
  }

  buscarTodosSuplidor(page: number) {
    this.servicioSuplidor.buscarTodosSuplidor(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.suplidorList = response.data;
    });
  }

  consultarSuplidor(Suplidor: ModeloSuplidorData) {
    this.tituloModalSuplidor = 'Consulta Suplidor';
    this.formularioSuplidor.patchValue(Suplidor);
    $('#modalsuplidor').modal('show');
    this.habilitarFormiarioSuplidor = true;
    this.modoconsultaSuplidor = true;
  };

  eliminarSuplidor(suplidor: ModeloSuplidorData) {
    this.servicioSuplidor.eliminarSuplidor(suplidor.su_codSupl).subscribe(response => {
      alert("Suplidor Eliminado");
      this.buscarTodosSuplidor(this.currentPage);
    });
  }


  guardarSuplidor() {
    console.log(this.formularioSuplidor.value);
    if (this.formularioSuplidor.valid) {
      if (this.modoedicionSuplidor) {
        this.servicioSuplidor.editarSuplidor(this.suplidorid, this.formularioSuplidor.value).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Suplidor Guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });
          this.buscarTodosSuplidor(1);
          this.formularioSuplidor.reset();
          this.crearFormularioSuplidor();
          $('#modalsuplidor').modal('hide');
        });
      } else {
        this.servicioSuplidor.guardarSuplidor(this.formularioSuplidor.value).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Suplidor Guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });
          this.buscarTodosSuplidor(1);
          this.formularioSuplidor.reset();
          this.crearFormularioSuplidor();
          $('#modalcliente').modal('hide');
        });
      }
    } else {
      alert("Este Suplidor no fue Guardado");
    }
  }

  // onDescripcionInput(event: Event) {
  //   const inputElement = event.target as HTMLInputElement;
  //   this.descripcionSubject.next(inputElement.value.toUpperCase());
  // }


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

  changePage(page: number) {
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const codigo = this.codigoBuscar.getValue();
    const descripcion = this.descripcionBuscar.getValue();
    this.servicioSuplidor.buscarTodosSuplidor(this.currentPage, this.pageSize, descripcion)
      .subscribe(response => {
        this.suplidorList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = page;
      });
  }
}
