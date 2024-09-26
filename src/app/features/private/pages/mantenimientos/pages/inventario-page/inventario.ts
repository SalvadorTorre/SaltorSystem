import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloGrupoMercanciasData } from 'src/app/core/services/mantenimientos/grupomerc';
import { ServicioGrupoMercancias } from 'src/app/core/services/mantenimientos/grupomerc/grupomerc.service';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
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
  formularioInventario!:FormGroup;
  invenarioList:ModeloInventarioData[] = [];
  grupomercList:ModeloGrupoMercanciasData[] = [];
  maxChars: number = 30;
  remainingChars: number = this.maxChars;

  totalItems = 0;
  pageSize = 8;
  currentPage = 1;
  maxPagesToShow = 5;

  codigo: string = '';
  descripcion: string = '';
  codigoInput:string = '';

  private codigoSubject = new BehaviorSubject<string>('');
  private descripcionSubject = new BehaviorSubject<string>('');

  constructor(private fb:FormBuilder, private servicioInventario:ServicioInventario, private servicioGrupmerc: ServicioGrupoMercancias) {
    this.crearFormularioInventario();
    this.codigoSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(codigo => {
        this.codigo = codigo;
        return this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, this.codigo, this.descripcion);
      })
    ).subscribe(response => {
      this.invenarioList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
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
      this.invenarioList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = response.pagination.page;
    });
  }
  ngOnInit(): void {
    this.obtenerTodosInventario(1);
    this.obtenerTodosGrupoMercancias();
    this.formularioInventario.get('in_desmerc')!.valueChanges.subscribe(value => {
      this.updateCharCount();
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
    const currentLength = this.formularioInventario.get('in_desmerc')!.value.length;
    this.remainingChars = this.maxChars - currentLength;
  }


  crearFormularioInventario(){
    this.formularioInventario = this.fb.group({
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

  habilitarBuscador(){
    this.habilitarBusqueda = false;
  }

 nuevoProducto(){
   this.tituloModalProducto = 'Agregar Producto';
   $('#modalProducto').modal('show');
 }

 editarProducto(invetario:ModeloInventarioData){
  console.log(invetario);
  this.tituloModalProducto = 'Editar Producto';
  this.formularioInventario.patchValue(invetario);
  $('#modalProducto').modal('show');
}

  onSubmitInventario(){
    if(this.formularioInventario.valid){
      console.log(this.formularioInventario.value);
      this.servicioInventario.guardarInventario(this.formularioInventario.value).subscribe(response =>{
        Swal.fire({
          title: "Excelente!",
          text: "Producto guardado correctamente.",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        this.obtenerTodosInventario(1);
        this.formularioInventario.reset();
        $('#modalProducto').modal('hide');
        this.crearFormularioInventario();
      });
    }else{
      alert("Formulario invalido");
    }
  }

  obtenerTodosInventario(page: number){
    this.servicioInventario.obtenerTodosInventario(page, this.pageSize).subscribe(response =>{
      this.invenarioList = response.data;
      this.totalItems = response.pagination.total;
      this.currentPage = page;
    }
    );
  }

  obtenerTodosGrupoMercancias(){
    this.servicioGrupmerc.obtenerTodosGrupoMercancias().subscribe(response =>{
      this.grupomercList = response.data;
    });
  }

  eliminarProducto(choferId:any){
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
        this.servicioInventario.borrarDeInventario(choferId).subscribe(response => {
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
    this.currentPage = page;
    // Trigger a new search with the current codigo and descripcion
    const codigo = this.codigoSubject.getValue();
    const descripcion = this.descripcionSubject.getValue();
    this.servicioInventario.obtenerTodosInventario(this.currentPage, this.pageSize, codigo, descripcion)
      .subscribe(response => {
        this.invenarioList = response.data;
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
