import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { ModeloGrupoMercanciasData } from 'src/app/core/services/mantenimientos/grupomerc';
import { ServicioGrupoMercancias } from 'src/app/core/services/mantenimientos/grupomerc/grupomerc.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
declare var $: any;
import Swal from 'sweetalert2';


@Component({
  selector: 'Grupomerc',
  templateUrl: './grupomerc.html',
  styleUrls: ['./grupomerc.css']
})
export class GrupoMercancias implements OnInit {
  habilitarBusqueda: boolean = false;
  tituloModalProducto!: string;
  formularioInventario!:FormGroup;
  grupoMercList:ModeloGrupoMercanciasData[] = [];
  maxChars: number = 30;
  remainingChars: number = this.maxChars;

  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;

  codigo: string = '';
  descripcion: string = '';

  private codigoSubject = new BehaviorSubject<string>('');
  private descripcionSubject = new BehaviorSubject<string>('');

  constructor(private fb:FormBuilder, private servicioGrupomerc:ServicioGrupoMercancias) {
    this.codigoSubject.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap(codigo => {
        this.codigo = codigo;
        return this.servicioGrupomerc.obtenerGrupoMercancias(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.grupoMercList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
    });

    this.descripcionSubject.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap(descripcion => {
        console.log('descripcion', descripcion);
        this.descripcion = descripcion;
        return this.servicioGrupomerc.obtenerGrupoMercancias(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.grupoMercList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
    });
  }


  ngOnInit(): void {
    this.obtenerGrupoMercancias(1);

  }


  // grupos: any[] = [];



  onCodigoInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.codigoSubject.next(inputElement.value.toUpperCase());
  }

  onDescripcionInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionSubject.next(inputElement.value.toUpperCase());
  }



  // crearFormularioInventario(){
  //   this.formularioInventario = this.fb.group({
  //     in_codmerc: [""],
  //     in_desmerc: [""],
  //     in_grumerc: [null],
  //     in_tipoproduct: [""],
  //     in_canmerc: [""],
  //     in_caninve: [""],
  //     in_fecinve: [null],
  //     in_eximini: [""],
  //     in_cosmerc: [null],
  //     in_premerc: [""],
  //     in_precmin: [""],
  //     in_costpro: [""],
  //     in_ucosto: [""],
  //     in_porgana: [""],
  //     in_peso: [""],
  //     in_longitud: [null],
  //     in_unidad: [""],
  //     in_medida: [null],
  //     in_longitu: [null],
  //     in_fecmodif: [null],
  //     in_amacen: [""],
  //     in_imagen: [""],
  //     in_status: [""],
  //     in_minvent: [null],
  //   });
  // }



 nuevoProducto(){
   this.tituloModalProducto = 'Agregar Producto';
   $('#modalProducto').modal('show');
 }

//  editarProducto(invetario:ModeloInventarioData){
//   this.tituloModalProducto = 'Editar Producto';
//   this.formularioInventario.patchValue(invetario);
//   $('#modalProducto').modal('show');
// }

  // onSubmitInventario(){
  //   if(this.formularioInventario.valid){
  //   this.servicioInventario.guardarInventario(this.formularioInventario.value).subscribe(response =>{
  //     Swal.fire({
  //       title: "Excelente!",
  //       text: "Despachador guardado correctamente.",
  //       icon: "success",
  //       timer: 3000,
  //       showConfirmButton: false,
  //     });
  //     this.formularioInventario.reset();
  //     $('#modalProducto').modal('hide');
  //     this.crearFormularioInventario();
  //   });
  //   }else{
  //     alert("Formulario invalido");
  //   }
  // }

  obtenerGrupoMercancias(page: number){
    this.servicioGrupomerc.obtenerGrupoMercancias(page, this.pageSize).subscribe(response =>{
      this.grupoMercList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = page;
    }
    );
  }

  changePage(page: number) {
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const codigo = this.codigoSubject.getValue();
    const descripcion = this.descripcionSubject.getValue();
    this.servicioGrupomerc.obtenerGrupoMercancias(this.currentPage, this.pageSize, codigo, descripcion)
      .subscribe(response => {
        this.grupoMercList = response.data;
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
}
