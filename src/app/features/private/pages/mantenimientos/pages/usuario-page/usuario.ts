import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { ModeloUsuarioData } from 'src/app/core/services/mantenimientos/usuario';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { EmpresaModelData, SucursalesData } from 'src/app/core/services/mantenimientos/empresas';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service'; declare var $: any;
import { ServicioTipousuario } from 'src/app/core/services/mantenimientos/tipousuario/tipousuario.service';
import Swal from 'sweetalert2';
import { Empresas } from '../empresas-page/empresas';
import { HttpInvokeService } from 'src/app/core/services/http-invoke.service';

@Component({
  selector: 'Usuario',
  templateUrl: './usuario.html',
  styleUrls: ['./usuario.css']
})

export class Usuario implements OnInit {
  totalItems = 0;
  pageSize = 8
  currentPage = 1;
  maxPagesToShow = 5;
  txtdescripcion: string = '';
  txtcodigo: string = '';
  idUsuario: string = '';
  descripcion: string = '';
  mensagePantalla: boolean = false;
  private idBuscar = new BehaviorSubject<string>('');
  private descripcionBuscar = new BehaviorSubject<string>('');

  buscarEmpresa = new FormControl
  resultadoEmpresa: EmpresaModelData[] = [];

  selectedIndex = 1;
  nativeElement = new FormControl();
  selectedIndexEmpresa = 1;
  // *******************
  // sucursales = [];
  // sucursalSeleccionada: any = null;
  sucursales: any[] = [];
  sucursalSeleccionada: any;
  sucursalesList: SucursalesData[] = [];

  habilitarFormulario: boolean = false;
  tituloModalUsuario!: string;
  formularioUsuario!: FormGroup;
  clienteList: ModeloUsuarioData[] = [];
  modoedicionUsuario: boolean = false;
  usuarioid!: number
  modoconsultaUsuario: boolean = false;
  usuarioList: ModeloUsuarioData[] = [];
  selectedUsuario: any = null;
  empresaData: EmpresaModelData[] = [];
  tiposList: any[] = [];
  constructor(
    private fb: FormBuilder,
    private servicioUsuario: ServicioUsuario,
    private servicioEmpresa: ServicioEmpresa,
    private http: HttpInvokeService,
    private servicioSucursal: ServicioSucursal,
    private tipoSrv: ServicioTipousuario
  ) {
    this.crearFormularioUsuario();
    this.descripcionBuscar.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap(descripcion => {
        this.descripcion = descripcion;
        return this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize, this.descripcion);
      })
    )
      .subscribe(response => {
        this.usuarioList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });

    this.idBuscar.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(idusuario => {
        this.idUsuario = idusuario;
        return this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize, this.idUsuario, this.descripcion);
      })
    )
      .subscribe(response => {
        this.usuarioList = response.data;
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
      });
  }
  seleccionarUsuario(usuario: any) { this.selectedUsuario = Usuario; }

  ngOnInit(): void {
    this.buscarTodosUsuario(1);
    this.obtenerSucursales();

    this.buscarEmpresa.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => {
        this.resultadoEmpresa = [];
      }),
      filter((query: string) => query !== ''),
      switchMap((query: string) => this.http.GetRequest<EmpresaModelData>(`/empresa-nombre/${query}`))
    ).subscribe((results: EmpresaModelData) => {
      if (results) {
        if (Array.isArray(results)) {
          this.resultadoEmpresa = results;
        }
      } else {
        this.resultadoEmpresa = [];
      }

    });
    const empresaNombreCtrl = this.formularioUsuario.get('empresaNombre');
    if (empresaNombreCtrl) empresaNombreCtrl.disable();

    // Cargar tipos de usuario para el select
    this.tipoSrv.obtenerTodosTipousuario().subscribe({
      next: (res) => {
        const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.tiposList = items || [];
      },
      error: () => {
        this.tiposList = [];
      }
    });
  }


  crearFormularioUsuario() {
    this.formularioUsuario = this.fb.group({
      idUsuario: ['', Validators.required],
      claveUsuario: ['1234', Validators.required],
      nombreUsuario: ['', Validators.required],
      nivel: [''],
      correo: [''],
      claveCorreo: [''],
      metaVenta: [''],
      despacho: [false],
      idtipoUsuario: [null],
      sucursalid: [null, Validators.required],
      cod_empre: [''],
      empresaNombre: [''], // solo visual
      idpermiso: [null],
      // Permisos existentes (se conservan)
      facturacion: [false],
      factLectura: [false],
      compra: [false],
      compLectura: [false],
      reporte: [false],
      repLectura: [false],
      mantenimiento: [false],
      mantLectura: [false],
      caja: [false],
      caja_Lectura: [false],
      almacen: [false],
      almLectura: [false],
      contabilidad: [false],
      contLectura: [false],
      mercadeo: [false],
      usuario: [false],
      vendedor: [false],
    });
  }
  habilitarFormularioUsuario() {
    this.habilitarFormulario = false;
  }

  nuevoUsuario() {
    this.modoedicionUsuario = false;
    this.tituloModalUsuario = 'Agregando Usuario';
    $('#modalusuario').modal('show');
    this.habilitarFormulario = true;
  }

  cerrarModalUsuario() {
    this.habilitarFormulario = false;
    this.formularioUsuario.reset();
    this.modoedicionUsuario = false;
    this.modoconsultaUsuario = false;
    $('#modalusuario').modal('hide');
    this.crearFormularioUsuario();
  }

  editarUsuario(usuario: ModeloUsuarioData) {
    this.usuarioid = usuario.codUsuario;
    this.modoedicionUsuario = true;
    this.formularioUsuario.patchValue(usuario);
    this.formularioUsuario.patchValue({
      sucursalid: (this.userioSafe(usuario, 'sucursalid') ?? this.userioSafe(usuario, 'sucursal')) ?? null,
      cod_empre: this.userioSafe(usuario, 'cod_empre') ?? this.userioSafe(usuario, 'empresa') ?? '',
      empresaNombre: usuario?.empresaInfo?.nom_empre ?? '',
      claveCorreo: this.userioSafe(usuario, 'claveCorreo') ?? '',
      metaVenta: this.userioSafe(usuario, 'metaVenta') ?? '',
      idtipoUsuario: this.userioSafe(usuario, 'idtipoUsuario') ?? null,
      idpermiso: this.userioSafe(usuario, 'idpermiso') ?? null,
    });
    this.tituloModalUsuario = 'Editando Usuario';
    $('#modalusuario').modal('show');
    this.habilitarFormulario = true;
  }

  buscarTodosUsuario(page: number) {
    this.servicioUsuario.buscarTodosUsuario(page, this.pageSize).subscribe(response => {
      console.log(response);
      this.usuarioList = response.data;
    });
  }
  consultarUsuario(Usuario: ModeloUsuarioData) {
    this.tituloModalUsuario = 'Consulta Usuario';
    this.formularioUsuario.patchValue(Usuario);
    this.formularioUsuario.patchValue({
      sucursalid: (this.userioSafe(Usuario, 'sucursalid') ?? this.userioSafe(Usuario, 'sucursal')) ?? null,
      cod_empre: this.userioSafe(Usuario, 'cod_empre') ?? this.userioSafe(Usuario, 'empresa') ?? '',
      empresaNombre: Usuario?.empresaInfo?.nom_empre ?? '',
      claveCorreo: this.userioSafe(Usuario, 'claveCorreo') ?? '',
      metaVenta: this.userioSafe(Usuario, 'metaVenta') ?? '',
      idtipoUsuario: this.userioSafe(Usuario, 'idtipoUsuario') ?? null,
      idpermiso: this.userioSafe(Usuario, 'idpermiso') ?? null,
    });
    $('#modalusuario').modal('show');
    this.habilitarFormulario = true;
    this.modoconsultaUsuario = true;
  };


  eliminarUsuario(Usuario: ModeloUsuarioData) {
    Swal.fire({
      title: '¿Está seguro de eliminar este Usuario?',
      text: "¡No podrá revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicioUsuario.eliminarUsuario(Usuario.codUsuario).subscribe(response => {
          Swal.fire(
            {
              title: "Excelente!",
              text: "Usuario eliminado correctamente.",
              icon: "success",
              timer: 3000,
              showConfirmButton: false,
            }
          )
          this.buscarTodosUsuario(this.currentPage);
        });
      }
    })
  }

  private userioSafe(obj: any, key: string): any {
    try {
      const v = obj ? obj[key] : null;
      return (v !== undefined && v !== null) ? v : null;
    } catch {
      return null;
    }
  }

  descripcionEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.descripcionBuscar.next(inputElement.value.toUpperCase());
  }
  idEntra(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.idBuscar.next(inputElement.value.toUpperCase());
  }
  guardarUsuario() {
    console.log(this.formularioUsuario.value);
    if (this.formularioUsuario.valid) {
      if (this.modoedicionUsuario) {
        const payload = { ...this.formularioUsuario.value };
        this.servicioUsuario.editarUsuario(this.usuarioid, payload).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Usuario Editado correctamente.",
            icon: "success",
            timer: 5000,
            showConfirmButton: false,
          });
          this.buscarTodosUsuario(1);
          this.formularioUsuario.reset();
          this.crearFormularioUsuario();
          $('#modalusuario').modal('hide');
        });
      }
      else {
        const payload = { ...this.formularioUsuario.value };
        this.servicioUsuario.guardarUsuario(payload).subscribe(response => {
          Swal.fire({
            title: "Excelente!",
            text: "Usuario Guardado correctamente.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
          });

          this.buscarTodosUsuario(1);
          this.formularioUsuario.reset();
          this.crearFormularioUsuario();
          $('#modalusuario').modal('hide');
        });
      }
    }
    else {
      alert("Este Usuario no fue Guardado");
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
    const codigo = this.idBuscar.getValue();
    const descripcion = this.descripcionBuscar.getValue();
    this.servicioUsuario.buscarTodosUsuario(this.currentPage, this.pageSize, codigo, descripcion)
      .subscribe(response => {
        this.usuarioList = response.data;
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
    this.buscarTodosUsuario(1);
  }

  cargarDatosEmpresa(empresa: EmpresaModelData) {
    this.resultadoEmpresa = [];
    this.buscarEmpresa.reset();
    this.formularioUsuario.patchValue({
      cod_empre: empresa.cod_empre,
      empresaNombre: (empresa as any)?.nom_empre ?? '',
    });
  }

  moveFocusEmpresa(event: Event, nextInput: HTMLInputElement) {
    event.preventDefault();
    console.log(nextInput);
    if (event.target instanceof HTMLInputElement) {
      if (!event.target.value) {
        this.mensagePantalla = true;
        Swal.fire({
          icon: "error",
          title: "A V I S O",
          text: 'Por favor complete el campo Nombre del Cliente Para Poder continual.',
        }).then(() => { this.mensagePantalla = false });

      }
      else {
        nextInput.focus(); // Si es válido, mueve el foco al siguiente input
      }
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const maxIndex = this.resultadoEmpresa.length - 1;  // Ajustamos el límite máximo

    if (key === 'ArrowDown') {
      console.log("paso 56");

      // Mueve la selección hacia abajo
      if (this.selectedIndex < maxIndex) {
        this.selectedIndex++;
      } else {
        this.selectedIndex = 0;  // Vuelve al primer ítem
      }
      event.preventDefault();
    } else if (key === 'ArrowUp') {
      console.log("paso 677");

      // Mueve la selección hacia arriba
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
      } else {
        this.selectedIndex = maxIndex;  // Vuelve al último ítem
      }
      event.preventDefault();
    } else if (key === 'Enter') {
      // Selecciona el ítem actual
      if (this.selectedIndex >= 0 && this.selectedIndex <= maxIndex) {
        this.cargarDatosEmpresa(this.resultadoEmpresa[this.selectedIndex]);
      }
      event.preventDefault();
    }
  }


  // buscarSucursal3(event: Event) {
  //   const inputValue = (event.target as HTMLInputElement).value;
  //   this.servicioSucursal.buscarTodasSucursal(inputValue).subscribe((response: any[]) => {
  //     this.sucursales = response;
  //     console.log('Sucursales desde API:', this.sucursales);
  //   });
  // }


  // buscarSucursal(event: Event) {
  //   const query = (event.target as HTMLInputElement).value;
  //   //const query = event.target.value;
  //   if (query.length > 2) { // Empieza la búsqueda después de escribir 2 caracteres
  //     this.servicioSucursal.buscarTodasSucursal(query).subscribe(
  //       (data) => {
  //         this.sucursales = data;
  //         console.log(this.sucursales)
  //       },

  //       (error) => {
  //         console.error('Error al buscar sucursales', error);
  //       }
  //     );
  //   } else {
  //     this.sucursales = [];
  //     console.log("No")
  //     console.log(query.length)
  //   }
  // }

  seleccionarSucursal(sucursal: any) {
    const sucur = this.formularioUsuario.get('sucursalid')!.value;
    this.sucursalSeleccionada = this.sucursalesList.filter(s => s.cod_sucursal === parseInt(sucur));
    console.log('Sucursal seleccionada:', this.sucursalSeleccionada);
    // console.log('Sucursal seleccionada:', this.sucursalSeleccionada[0].cod_empre

    // );
    this.formularioUsuario.patchValue({
      sucursalid: this.sucursalSeleccionada[0].cod_sucursal,
      cod_empre: this.sucursalSeleccionada[0].cod_empre
    });
    this.servicioEmpresa.buscarEmpres(this.sucursalSeleccionada[0].cod_empre).subscribe((response) => {
      console.log('Empresa:', response);
      this.formularioUsuario.patchValue({
        empresaNombre: response.data[0].nom_empre
      });
    })
    this.sucursales = [];
  }


  obtenerSucursales() {
    this.servicioSucursal.buscarTodasSucursal().subscribe(response => {
      this.sucursalesList = response.data;
      console.log(this.sucursalesList);

    });
  }

  // Helpers para mostrar datos tolerantes a distintas formas
  tipoUsuarioDisplay(u: any): string {
    return (
      u?.tipousuario?.descripcion ??
      u?.tipo?.descripcion ??
      u?.tipousuarioDescripcion ??
      u?.idtipoUsuario ??
      ''
    );
  }

  empresaDisplay(u: any): string {
    return (
      u?.empresaInfo?.nom_empre ??
      u?.empresaNombre ??
      u?.cod_empre ??
      ''
    );
  }

  sucursalDisplay(u: any): string {
    return (
      u?.sucursalInfo?.nom_sucursal ??
      u?.sucursalNombre ??
      u?.sucursalid ??
      ''
    );
  }
}

