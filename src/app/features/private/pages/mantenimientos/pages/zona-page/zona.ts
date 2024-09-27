import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
declare var $: any;

@Component({
  selector: 'Zona',
  templateUrl: './zona.html',
  styleUrls: ['./zona.css']
})
export class Zona implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalZona!: string;
  formularioZona!: FormGroup;
  zonasList: ModeloZonaData[] = [];
  zonadescripcion: string = '';
  zonacodigo: any;


  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo: string = '';
  codSuplidor: string = '';
  descripcion: string = '';

  constructor(private fb: FormBuilder, private servicioZona: ServicioZona) {
    this.crearFormularioZona();
  }
  ngOnInit(): void {
    this.getAllZona();
  }

  crearFormularioZona() {
    this.formularioZona = this.fb.group({
      zo_descrip: ['', Validators.required],

    });
  }

  habilitarBuscador() {
    this.habilitarBusqueda = false;
  }

  nuevoZona() {
    this.tituloModalZona = 'Agregar Cliente';
    $('#modalcliente').modal('show');
  }

  editarZona(zona: ModeloZonaData) {
    this.zonacodigo = zona.zo_codZona;
    this.zonadescripcion = zona.zo_descrip;

  }

  getAllZona() {
    this.servicioZona.obtenerTodasZonas().subscribe(response => {
      console.log(response);
      this.zonasList = response.data;
    });
  }

  gualdarZona() {
    if (this.zonadescripcion != '') {
      this.servicioZona.guardarZona({ zo_descrip: this.zonadescripcion.toUpperCase() }).subscribe(response => {
        alert("Zona guardado correctamente");
        this.getAllZona();
        this.zonadescripcion = '';
        this.zonacodigo = '';
      });
    } else {
      alert("Formulario Zona");
    }
  }
  eliminarZona(zona: ModeloZonaData) {
    this.zonacodigo = zona.zo_codZona;
    this.zonadescripcion = zona.zo_descrip;
  }

  changePage(page: number) {
    // this.currentPage = page;
    // // Trigger a new search with the current codigo and descripcion
    // const codigo = this.codigoBuscar.getValue();
    // const descripcion = this.descripcionBuscar.getValue();
    // this.servicioSuplidor.buscarTodosSuplidor(this.currentPage, this.pageSize,  descripcion)
    //   .subscribe(response => {
    //     this.suplidorList = response.data;
    //   this.totalItems = response.pagination.total;
    //   this.currentPage = page;
    //   });
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
}
