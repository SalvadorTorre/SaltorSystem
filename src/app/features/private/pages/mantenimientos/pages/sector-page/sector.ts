import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloSector, ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
declare var $: any;declare var $: any;
import Swal from 'sweetalert2';
@Component({
  selector: 'Sector',
  templateUrl: './sector.html',
  styleUrls: ['./sector.css']
})
export class Sector implements OnInit {
  totalItems = 0;
  pageSize = 3
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  codigo: string = '';
  descripcion: string = '';
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');



  habilitarBusqueda: boolean = false;
  tituloModalSector!: string;
//  cerrarModalSector: boolean = false;
  habilitarFormulario: boolean = false;
  formularioSector!:FormGroup;
  sectorList:ModeloSectorData[] = [];
  sectorid!:number
  zonasList:ModeloZonaData[] = [];
  sectordescripcion:string = '';
  sectorcodigo:any;
  sectorzona:any;
  modoedicionSector:boolean = false;
  modoconsultaSector:boolean = false;
  constructor(private fb:FormBuilder,  private servicioSector:ServicioSector,private servicioZona:ServicioZona) {
    this.crearFormularioSector();
    {this.crearFormularioSector();
      this.descripcionBuscar.pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        switchMap(descripcion => {
          this.descripcion = descripcion;
          return this.servicioSector.buscarTodossector(this.currentPage, this.pageSize, this.descripcion);
        })
      )
      .subscribe(response => {
        this.sectorList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
    }

  }
  ngOnInit(): void {
    this. buscarTodossector(1);
    this.buscartadaZona();
  }

  crearFormularioSector(){
    this.formularioSector = this.fb.group({
      se_desSect: ['', Validators.required],
      se_codZona: ['', Validators.required],
    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoSector(){
  this.modoedicionSector = false;
   this.tituloModalSector = 'Agregar Sector';
   $('#modalsector').modal('show');
   this.habilitarFormulario = true;
 }

  editarSector(sector:ModeloSectorData){
  this.modoedicionSector = true;
  this.tituloModalSector = 'Editar Sector';
  this.sectorid = sector.se_codSect;
  this.sectorcodigo = sector.se_codSect;
  this.sectordescripcion = sector.se_desSect;
  this.formularioSector.patchValue(sector);
  this.sectorzona = sector.se_codZona;
  $('#modalsector').modal('show');
   this.habilitarFormulario = true;
 }

 eliminarSector(Sector:number){
  Swal.fire({
  title: '¿Está seguro de eliminar este Sector?',
  text: "¡No podrá revertir esto!",
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#3085d6',
  cancelButtonColor: '#d33',
  confirmButtonText: 'Si, eliminar!'
  }).then((result) => {
  if (result.isConfirmed) {
    this.servicioSector.eliminarSector(Sector).subscribe(response => {
    Swal.fire(
    {
     title: "Excelente!",
     text: "Chofer eliminado correctamente.",
     icon: "success",
     timer: 3000,
     showConfirmButton: false,
    }
    )
    this.buscarTodossector(this.currentPage);
    });
  }
  })
}

descripcionEntra(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  this.descripcionBuscar.next(inputElement.value.toUpperCase());
}


 buscarTodossector(page:number){
  this.servicioSector.buscarTodossector(page,this.pageSize).subscribe(response => {
    console.log(response);
    this.sectorList = response.data;
  });
}

buscartadaZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonasList = response.data;
  });
}

guardarSector(){
  console.log(this.formularioSector.value);
  if(this.formularioSector.valid){
    if(this.modoedicionSector){
      this.servicioSector.editarSector(this.sectorid, this.formularioSector.value).subscribe(response => {
      Swal.fire({
      title: "Excelente!",
      text: "Sector Editado correctamente.",
      icon: "success",
      timer: 5000,
      showConfirmButton: false,
      });
      this.buscarTodossector(1);
      this.formularioSector.reset();
      this.crearFormularioSector();
      $('#modalusuario').modal('hide');
      });
    }
    else{
      this.servicioSector.guardarSector(this.formularioSector.value).subscribe(response => {
      Swal.fire({
      title: "Excelente!",
      text: "Sector Guardado correctamente.",
      icon: "success",
      timer: 3000,
      showConfirmButton: false,
      });

      this.buscarTodossector(1);
      this.formularioSector.reset();
      this.crearFormularioSector();
      $('#modalusuario').modal('hide');
      });
    }
    }
    else{
      alert("Este Sector no fue Guardado");
    }
  }


cerrarModalSector(){
  this.habilitarFormulario = false;
  this.formularioSector.reset();
  this.modoedicionSector = false;
  this.modoconsultaSector = false;
  $('#modalsector').modal('hide');
  this.crearFormularioSector();
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
  const codigo = this.idBuscar.getValue();
  const descripcion = this.descripcionBuscar.getValue();
  this.servicioSector.buscarTodossector(this.currentPage, this.pageSize,  descripcion)
    .subscribe(response => {
      this.sectorList = response.data;
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

limpiaBusqueda(){
  this.txtdescripcion = '';
this.buscarTodossector(1);
}

}
