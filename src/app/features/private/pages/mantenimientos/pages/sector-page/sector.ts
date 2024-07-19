import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloSector, ModeloSectorData } from 'src/app/core/services/mantenimientos/sector';
import { ServicioSector } from 'src/app/core/services/mantenimientos/sector/sector.service';
import { ModeloZonaData } from 'src/app/core/services/mantenimientos/zonas';
import { ServicioZona } from 'src/app/core/services/mantenimientos/zonas/zonas.service';
declare var $: any;

@Component({
  selector: 'Sector',
  templateUrl: './sector.html',
  styleUrls: ['./sector.css']
})
export class Sector implements OnInit {
  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  codigo: string = '';
  descripcion: string = '';
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');



  habilitarBusqueda: boolean = false;
  tituloModalSector!: string;
  formularioSector!:FormGroup;
  sectorList:ModeloSectorData[] = [];
  zonaList:ModeloZonaData[] = [];
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
          return this.servicioSector.getAllSector(this.currentPage, this.pageSize,this.idUsuario, this.descripcion);
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
    this.getAllSector();
    this.buscartadaZona();
  }

  crearFormularioSector(){
    this.formularioSector = this.fb.group({
      se_dessect: ['', Validators.required],

    });
  }

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoSector(){
   this.tituloModalSector = 'Agregar Sector';
   $('#modalsecto').modal('show');
 }

 editarSector(sector:ModeloSectorData){
  this.sectorcodigo = sector.se_codSect;
  this.sectordescripcion = sector.se_desSect;
  this.sectorzona = sector.se_codZona;
 }

getAllSector(){
  this.servicioSector.obtenerTodasSector().subscribe(response => {
    console.log(response);
    this.sectorList = response.data;
  });
}

buscartadaZona(){
  this.servicioZona.obtenerTodasZonas().subscribe(response => {
    console.log(response);
    this.zonaList = response.data;
  });
}
gualdarSector(){
  if(this.sectordescripcion!= ''){
      var data = {
      se_desSect: this.sectordescripcion.toUpperCase(),
      se_codZona: this.sectorzona
      }
      this.servicioSector.guardarSector(data).subscribe(response => {
      alert("Sector guardado correctamente");
      this.getAllSector();
      this.sectordescripcion = '';
       this.sectorcodigo = '';
       this.sectorzona = '';
       this.formularioSector.reset();
       this.buscartadaZona();
  });

}else{
    alert("Formulario Sector");}
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
  this.servicioSector.getAllSector(this.currentPage, this.pageSize, codigo, descripcion)
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
this.getAllSector(1);
}

}
