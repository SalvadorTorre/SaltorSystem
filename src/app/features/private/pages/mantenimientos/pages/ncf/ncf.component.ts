import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NCF, NCFModel, TipoNCF } from './ncf-modelo';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

declare var bootstrap: any;

@Component({
  selector: 'app-ncf',
  templateUrl: './ncf.html',
  styleUrls: ['./ncf.component.css'],
  providers: [DatePipe]
})
export class NcfComponent implements OnInit {
  // Formulario reactivo
  ncfForm: FormGroup;
  
  // Lista de NCFs
  ncfList: NCF[] = [];
  
  // NCF seleccionado para editar o eliminar
  ncfSeleccionado: NCF | null = null;
  
  // Filtro para la tabla
  filtroNCF: string = '';
  
  // Modal de eliminación
  modalEliminar: any;

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarNCFs();
    
    // Inicializar modal de eliminación
    this.modalEliminar = new bootstrap.Modal(document.getElementById('eliminarNCFModal'));
    
    // Suscribirse a cambios en alertaEmail para validar el email cuando se activa
    this.ncfForm.get('alertaEmail')?.valueChanges.subscribe(value => {
      const emailControl = this.ncfForm.get('emailAlerta');
      if (value) {
        emailControl?.setValidators([Validators.required, Validators.email]);
      } else {
        emailControl?.clearValidators();
      }
      emailControl?.updateValueAndValidity();
    });
  }

  /**
   * Inicializa el formulario reactivo con validaciones
   */
  inicializarFormulario(): void {
    this.ncfForm = this.fb.group({
      id: [null],
      empresaRNC: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(11)]],
      empresaNombre: ['', [Validators.required]],
      empresaDireccion: [''],
      tipoNCF: ['', [Validators.required]],
      serie: ['', [Validators.required, Validators.maxLength(1)]],
      secuenciaInicial: [0, [Validators.required, Validators.min(0)]],
      secuenciaActual: [0, [Validators.required, Validators.min(0)]],
      cantidadNCF: [0, [Validators.required, Validators.min(1)]],
      cantidadDisponible: [{ value: 0, disabled: true }],
      fechaVencimiento: ['', [Validators.required]],
      fechaEmision: ['', [Validators.required]],
      umbralAlerta: [100, [Validators.required, Validators.min(1)]],
      diasAlerta: [30, [Validators.required, Validators.min(1)]],
      alertaEmail: [false],
      emailAlerta: ['']
    });
  }

  /**
   * Carga la lista de NCFs (simulado)
   */
  cargarNCFs(): void {
    // Aquí se conectaría con el servicio para obtener los datos
    // Por ahora usamos datos de ejemplo
    this.ncfList = [
      new NCFModel({
        id: 1,
        empresaRNC: '123456789',
        empresaNombre: 'Empresa Ejemplo, SRL',
        empresaDireccion: 'Calle Principal #123, Santo Domingo',
        tipoNCF: TipoNCF.FACTURA_CREDITO_FISCAL,
        serie: 'A',
        secuenciaInicial: 1000,
        secuenciaActual: 1050,
        cantidadNCF: 1000,
        cantidadDisponible: 950,
        fechaVencimiento: new Date(2023, 11, 31),
        fechaEmision: new Date(2023, 0, 1),
        umbralAlerta: 100,
        diasAlerta: 30,
        alertaEmail: true,
        emailAlerta: 'alertas@empresa.com',
        activo: true
      }),
      new NCFModel({
        id: 2,
        empresaRNC: '123456789',
        empresaNombre: 'Empresa Ejemplo, SRL',
        empresaDireccion: 'Calle Principal #123, Santo Domingo',
        tipoNCF: TipoNCF.FACTURA_CONSUMO,
        serie: 'B',
        secuenciaInicial: 5000,
        secuenciaActual: 5200,
        cantidadNCF: 1000,
        cantidadDisponible: 800,
        fechaVencimiento: new Date(2023, 11, 31),
        fechaEmision: new Date(2023, 0, 1),
        umbralAlerta: 100,
        diasAlerta: 30,
        alertaEmail: false,
        emailAlerta: '',
        activo: true
      }),
      new NCFModel({
        id: 3,
        empresaRNC: '123456789',
        empresaNombre: 'Empresa Ejemplo, SRL',
        empresaDireccion: 'Calle Principal #123, Santo Domingo',
        tipoNCF: TipoNCF.NOTA_CREDITO,
        serie: 'C',
        secuenciaInicial: 1000,
        secuenciaActual: 1090,
        cantidadNCF: 100,
        cantidadDisponible: 10,
        fechaVencimiento: new Date(2023, 6, 30),
        fechaEmision: new Date(2023, 0, 1),
        umbralAlerta: 20,
        diasAlerta: 15,
        alertaEmail: true,
        emailAlerta: 'alertas@empresa.com',
        activo: true
      })
    ];
  }

  /**
   * Guarda o actualiza un NCF
   */
  guardarNCF(): void {
    if (this.ncfForm.invalid) {
      this.marcarCamposComoTocados();
      this.toastr.error('Por favor, complete correctamente todos los campos requeridos', 'Error de validación');
      return;
    }

    const formValues = this.ncfForm.getRawValue();
    const ncf = new NCFModel(formValues);
    
    // Calcular cantidad disponible
    ncf.cantidadDisponible = ncf.calcularDisponibles();
    
    if (ncf.id) {
      // Actualizar NCF existente
      const index = this.ncfList.findIndex(item => item.id === ncf.id);
      if (index !== -1) {
        this.ncfList[index] = ncf;
        this.toastr.success('NCF actualizado correctamente', 'Éxito');
      }
    } else {
      // Crear nuevo NCF
      ncf.id = this.generarNuevoId();
      this.ncfList.push(ncf);
      this.toastr.success('NCF creado correctamente', 'Éxito');
    }
    
    this.limpiarFormulario();
  }

  /**
   * Marca todos los campos del formulario como tocados para mostrar validaciones
   */
  marcarCamposComoTocados(): void {
    Object.keys(this.ncfForm.controls).forEach(key => {
      this.ncfForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Limpia el formulario para crear un nuevo NCF
   */
  limpiarFormulario(): void {
    this.ncfForm.reset({
      umbralAlerta: 100,
      diasAlerta: 30,
      alertaEmail: false,
      secuenciaInicial: 0,
      secuenciaActual: 0,
      cantidadNCF: 0,
      cantidadDisponible: 0
    });
    this.ncfSeleccionado = null;
  }

  /**
   * Edita un NCF existente
   */
  editarNCF(ncf: NCF): void {
    this.ncfSeleccionado = ncf;
    
    // Formatear fechas para el formulario
    const fechaVencimiento = this.datePipe.transform(ncf.fechaVencimiento, 'yyyy-MM-dd');
    const fechaEmision = this.datePipe.transform(ncf.fechaEmision, 'yyyy-MM-dd');
    
    this.ncfForm.patchValue({
      ...ncf,
      fechaVencimiento: fechaVencimiento,
      fechaEmision: fechaEmision
    });
    
    // Hacer scroll al inicio del formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Muestra el modal de confirmación para eliminar
   */
  eliminarNCF(ncf: NCF): void {
    this.ncfSeleccionado = ncf;
    this.modalEliminar.show();
  }

  /**
   * Confirma la eliminación del NCF
   */
  confirmarEliminarNCF(): void {
    if (this.ncfSeleccionado && this.ncfSeleccionado.id) {
      this.ncfList = this.ncfList.filter(item => item.id !== this.ncfSeleccionado?.id);
      this.modalEliminar.hide();
      this.toastr.success('NCF eliminado correctamente', 'Éxito');
      this.ncfSeleccionado = null;
    }
  }

  /**
   * Muestra el detalle de un NCF (pendiente de implementar)
   */
  verDetalleNCF(ncf: NCF): void {
    // Aquí se implementaría la lógica para mostrar el detalle
    this.toastr.info(`Mostrando detalle del NCF: ${ncf.tipoNCF}${ncf.serie}`, 'Información');
  }

  /**
   * Verifica si un NCF está activo
   */
  isActive(ncf: NCF): boolean {
    // Verificar si está activo y no ha vencido
    const fechaVencimiento = new Date(ncf.fechaVencimiento);
    const hoy = new Date();
    return ncf.activo && fechaVencimiento >= hoy && ncf.cantidadDisponible > 0;
  }

  /**
   * Genera un nuevo ID para un NCF (simulado)
   */
  private generarNuevoId(): number {
    const ids = this.ncfList.map(item => item.id || 0);
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }
}