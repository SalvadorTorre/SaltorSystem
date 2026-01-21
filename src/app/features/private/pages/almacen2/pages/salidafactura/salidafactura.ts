import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import Swal from 'sweetalert2';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
declare var bootstrap: any;

interface DetalleSalida {
  codFact: string;
  nomClie: string;
  fecFact: string;
  valFact: number;
  codfpago: string;
  fpago: string;
}

@Component({
  selector: 'app-salidafactura',
  templateUrl: './salidafactura.html',
  styleUrls: ['./salidafactura.css']
})
export class SalidafacturaComponent implements OnInit {

  codChofer: string = '';
  nomChofer: string = '';
  cedChofer: string = '';
  bloquearChofer: boolean = false;
  codSalida: string = '';
  contFacturaActual: any;
  
  txtcodFact: string = '';
  detallesSalida: DetalleSalida[] = [];
  mapaFpagos: Map<string, string> = new Map();
  
  // Variables para el modal de búsqueda
  mostrarModalChofer: boolean = false;
  listaChoferesEncontrados: any[] = [];
  indiceChoferSeleccionado: number = 0;
  
  // Variables para control de impresión
  mostrarBotonImprimir: boolean = false;
  datosUltimaSalida: any = null;
  nombreSucursalActual: string = '';
  zonaSucursalActual: string = '';
  esEdicion: boolean = false;

  private searchTerms = new Subject<string>();

  @ViewChild('inputFactura') inputFacturaElement!: ElementRef;

  constructor(
    private servicioChofer: ServicioChofer,
    private servicioFacturacion: ServicioFacturacion,
    private servicioSalida: ServicioSalidafactura,
    private servicioFpago: ServicioFpago,
    private servicioContFactura: ServicioContFactura,
    private servicioSucursal: ServicioSucursal
  ) { }

  ngOnInit(): void {
    this.obtenerNombreSucursal();
    this.generarCodSalida();
    this.cargarFpagos();
    // Event listener para navegación en el modal
    window.addEventListener('keydown', this.manejarTecladoModal.bind(this));

    // Configurar búsqueda en tiempo real
    this.searchTerms.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(termino => {
      if (termino.trim()) {
        this.ejecutarBusquedaChofer(termino);
      } else {
        this.listaChoferesEncontrados = [];
        this.mostrarModalChofer = false;
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.manejarTecladoModal.bind(this));
  }

  obtenerNombreSucursal() {
    const idSucursal = localStorage.getItem('idSucursal');
    if (idSucursal) {
      this.servicioSucursal.buscarsucursal(idSucursal).subscribe({
        next: (resp: any) => {
           // La respuesta puede variar en estructura, intentamos extraer el nombre
           const data = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data || resp);
           if (data) {
             this.nombreSucursalActual = data.nom_sucursal || 'SUCURSAL PRINCIPAL';
             this.zonaSucursalActual = data.zona || ''; // Asumimos que el campo se llama 'zona' en la respuesta
           } else {
             this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
             this.zonaSucursalActual = '';
           }
        },
        error: () => {
          this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
          this.zonaSucursalActual = '';
        }
      });
    } else {
      this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
      this.zonaSucursalActual = '';
    }
  }

  generarCodSalida() {
    const idSucursal = localStorage.getItem('idSucursal');
    if (!idSucursal) {
      console.warn('No se encontró idSucursal en localStorage');
      return;
    }

    this.servicioContFactura.buscarPorSucursal(Number(idSucursal)).subscribe({
      next: (resp: any) => {
        let data: any[] = [];
        // La respuesta del backend devuelve los datos en la propiedad 'data'
        console.log('Respuesta backend:', resp);
        if (Array.isArray(resp?.data)) {
           data = resp.data;
        } else if (Array.isArray(resp)) {
           data = resp;
        }
        
        const item = data[0];
        
        if (item) {
          this.contFacturaActual = item;
          const ano = item.ano;
          // Usar estrictamente contsalida. Si es nulo, asumir 0.
          // Se suma 1 para obtener el siguiente número disponible.
          const ultimoContador = item.contsalida !== undefined && item.contsalida !== null ? Number(item.contsalida) : 0;
          const proximoContador = ultimoContador + 1;
          
          if (ano) {
             // Formato: Ano (4) + Contador (6) = 10 chars
             // Ejemplo: 2026 + 000001
             const contadorStr = String(proximoContador).padStart(6, '0');
             this.codSalida = `${ano}${contadorStr}`;
          }
        }
      },
      error: (err: any) => {
        console.error('Error al obtener contador de factura', err);
      }
    });
  }

  manejarTecladoModal(e: KeyboardEvent) {
    if (!this.mostrarModalChofer) return;

    // Si el foco está en el input y presionan flechas, prevenir scroll default
    if (document.activeElement?.tagName === 'INPUT' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
    }

    if (e.key === 'ArrowDown') {
      this.indiceChoferSeleccionado = (this.indiceChoferSeleccionado + 1) % this.listaChoferesEncontrados.length;
    } else if (e.key === 'ArrowUp') {
      this.indiceChoferSeleccionado = (this.indiceChoferSeleccionado - 1 + this.listaChoferesEncontrados.length) % this.listaChoferesEncontrados.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Evitar otros handlers de Enter
      if (this.listaChoferesEncontrados.length > 0) {
        this.seleccionarChofer(this.listaChoferesEncontrados[this.indiceChoferSeleccionado]);
      }
    } else if (e.key === 'Escape') {
      this.cerrarModalChofer();
    }
  }

  cargarFpagos() {
    this.servicioFpago.buscarTodosFpago(1, 100).subscribe({
      next: (resp: any) => {
        if (resp.data) {
          resp.data.forEach((fp: any) => {
            this.mapaFpagos.set(String(fp.fp_codfpago).trim(), fp.fp_descfpago);
          });
        }
      },
      error: (err) => console.error('Error cargando formas de pago', err)
    });
  }

  buscarChofer() {
    if (!this.codChofer.trim()) return;
    const termino = this.codChofer.trim();

    this.servicioChofer.buscarchoferporCodigo(parseInt(termino)).subscribe({
      next: (resp: any) => this.procesarChoferEncontrado(resp.data),
      error: (err) => this.manejarErrorChofer(err)
    });
  }

  buscarChoferPorNombre(termino: string = this.nomChofer) {
    this.searchTerms.next(termino);
  }

  ejecutarBusquedaChofer(termino: string) {
    this.servicioChofer.buscarTodosChofer(1, 20, termino).subscribe({
      next: (resp: any) => {
        if (resp.data && resp.data.length > 0) {
          // Ordenar por nombre alfabéticamente
          this.listaChoferesEncontrados = resp.data.sort((a: any, b: any) => {
            const nombreA = (a.nomChofer || '').toLowerCase();
            const nombreB = (b.nomChofer || '').toLowerCase();
            return nombreA.localeCompare(nombreB);
          });
          
          this.indiceChoferSeleccionado = 0;
          this.mostrarModalChofer = true;
        } else {
          // No hay resultados: limpiar y cerrar modal
          this.listaChoferesEncontrados = [];
          this.mostrarModalChofer = false;
        }
      },
      error: (err) => console.error(err)
    });
  }

  cerrarModalChofer() {
    this.mostrarModalChofer = false;
    this.listaChoferesEncontrados = [];
  }

  seleccionarChofer(chofer: any) {
    this.procesarChoferEncontrado(chofer);
    this.cerrarModalChofer();
  }

  procesarChoferEncontrado(data: any) {
    if (data) {
      // Intentar obtener propiedades con varios nombres posibles
      const nombre = data.nomChofer || data.nombre || data.ch_nombre || '';
      const apellido = data.apellido || data.ch_apellido || '';
      const id = data.codChofer || data.id || data.ch_codChofer;

      // Construir nombre completo si hay apellido, sino solo nombre
      this.nomChofer = apellido ? `${nombre} ${apellido}`.trim() : nombre;
      this.codChofer = String(id);
      this.cedChofer = data.cedChofer || data.cedula || data.ch_cedula || '';
      this.bloquearChofer = true;
      
      // Consultar si hay salida pendiente (status = ' ')
      this.servicioSalida.obtenerPorChoferYStatus(this.codChofer).subscribe({
        next: (resp: any) => {
           const salidas = Array.isArray(resp) ? resp : (resp.data || []);
           if (salidas && salidas.length > 0) {
              const salida = salidas[0]; // Tomamos la primera pendiente
              this.cargarSalidaPendiente(salida);
           }
        },
        error: (err) => console.error('Error buscando salida pendiente', err)
      });
      
      setTimeout(() => {
        const input = document.getElementById('inputFactura');
        if (input) input.focus();
      }, 100);
    } else {
      this.mostrarError('Chofer no encontrado');
      this.nomChofer = '';
    }
  }

  cargarSalidaPendiente(salida: any) {
      this.esEdicion = true;
      this.codSalida = salida.codSalida;
      this.detallesSalida = [];
      this.datosUltimaSalida = null;
      this.mostrarBotonImprimir = false;
      
      if (salida.detsalida && salida.detsalida.length > 0) {
          // Necesitamos obtener los detalles completos de las facturas
          const observables = salida.detsalida.map((d: any) => this.servicioFacturacion.getByNumero(d.codFact));
          
          forkJoin(observables).subscribe({
               next: (respuestas: any) => {
                   const listaRespuestas = respuestas as any[];
                   listaRespuestas.forEach((resp: any) => {
                       const f = resp.data;
                       if (f && !this.detallesSalida.some(x => x.codFact === f.fa_codFact)) {
                           this.detallesSalida.push({
                               codFact: f.fa_codFact,
                               nomClie: f.fa_nomClie,
                               fecFact: f.fa_fecFact,
                               valFact: Number(f.fa_valFact),
                               codfpago: String(f.fa_codfpago || '').trim(),
                               fpago: f.fa_fpago
                           });
                       }
                   });
                   Swal.fire('Información', `Se encontró una salida pendiente. Se cargaron ${this.detallesSalida.length} facturas.`, 'info');
               },
               error: (err: any) => console.error('Error cargando detalles de facturas', err)
           });
      } else {
           Swal.fire('Información', `Se encontró una salida pendiente (${this.codSalida}) sin facturas.`, 'info');
      }
  }

  manejarErrorChofer(err: any) {
    console.error(err);
    this.mostrarError('Error al buscar chofer');
  }

  cambiarChofer() {
    this.bloquearChofer = false;
    this.nomChofer = '';
    this.cedChofer = '';
    this.detallesSalida = [];
    this.codChofer = '';
    this.esEdicion = false;
    setTimeout(() => document.querySelector('input')?.focus(), 100);
  }

  agregarFactura() {
    const codFact = this.txtcodFact.trim();
    if (!codFact) return;

    // Verificar si ya está en la lista
    if (this.detallesSalida.some(d => d.codFact === codFact)) {
      this.mostrarError('Esta factura ya está en la lista');
      this.txtcodFact = '';
      return;
    }

    // Buscar factura y validar condiciones
    this.servicioFacturacion.getByNumero(codFact).subscribe({
      next: (resp: any) => {
        const factura = resp.data;
        if (!factura) {
          this.mostrarError('Factura no encontrada');
          return;
        }

        // Validar condiciones: fa_envio=2, fa_impresa='S', fa_salida=' '
        if (factura.fa_envio != 2) {
          this.mostrarError(`La factura ${codFact} no está marcada para envío (fa_envio != 2)`);
          return;
        }
        if (factura.fa_impresa !== 'S') {
          this.mostrarError(`La factura ${codFact} no ha sido impresa (fa_impresa != S)`);
          return;
        }
        if (factura.fa_salida && factura.fa_salida.trim() !== '') {
          this.mostrarError(`La factura ${codFact} ya tiene salida registrada`);
          return;
        }

        // Agregar a la lista
        this.detallesSalida.push({
          codFact: factura.fa_codFact,
          nomClie: factura.fa_nomClie,
          fecFact: factura.fa_fecFact,
          valFact: Number(factura.fa_valFact),
          codfpago: String(factura.fa_codfpago || '').trim(),
          fpago: factura.fa_fpago
        });

        this.txtcodFact = ''; // Limpiar input
      },
      error: (err) => {
        console.error(err);
        this.mostrarError('Error al buscar la factura');
      }
    });
  }

  getDescripcionFpago(codigo: string): string {
    return this.mapaFpagos.get(codigo) || codigo; // Si no encuentra, muestra el código
  }


  eliminarDetalle(index: number) {
    this.detallesSalida.splice(index, 1);
  }

  guardarSalida() {
    if (!this.bloquearChofer || this.detallesSalida.length === 0) return;

    Swal.fire({
      title: '¿Procesar Salida?',
      text: `Se registrarán ${this.detallesSalida.length} facturas para el chofer ${this.nomChofer}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarGuardado();
      }
    });
  }

  procesarGuardado() {
    if (!this.codSalida) {
      this.mostrarError('No se pudo generar el código de salida. Verifique la configuración de contfactura.');
      return;
    }

    const idSucursal = localStorage.getItem('idSucursal');
    if (!idSucursal) {
      this.mostrarError('No se encontró idSucursal en localStorage');
      return;
    }

    const idUsuarioStr = localStorage.getItem('codigousuario');
    const idUsuario = idUsuarioStr ? Number(idUsuarioStr) : null;

    const now = new Date();
     const fechasalida = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    // const horaSalida = now.toTimeString().split(' ')[0];
    const horaSalida = new Date(`1970-01-01T${now.toTimeString().split(' ')[0]}`);
    // Calcular totales
    const canFactura = this.detallesSalida.length;
    const valFactura = this.detallesSalida.reduce((sum, item) => sum + (Number(item.valFact) || 0), 0);
    
    // Calcular valPagado: sumar solo si fpago es 'P'
    const valPagado = this.detallesSalida.reduce((sum, item) => {
         const esPagada = String(item.fpago || '').trim() === 'P';
         return sum + (esPagada ? (Number(item.valFact) || 0) : 0);
     }, 0);

    const payload = {
      codSalida: this.codSalida,
      idsucursal: Number(idSucursal),
      idusuario: idUsuario,
      fecSalida: fechasalida,
      horaSalida: horaSalida,
      canFact: canFactura,
      valFact: valFactura,
      valPagado: valPagado,
      codChofer: Number(this.codChofer),
      // codChofer: this.codChofer,
      nomChofer: this.nomChofer,
      cedChofer: this.cedChofer,
      detalles: this.detallesSalida.map(d => ({
        codSalida: this.codSalida,
        idsucursal: Number(idSucursal),
        codChofer: Number(this.codChofer),
        fpago: d.fpago,
        codFact: d.codFact,
        valFact: d.valFact
      }))
    };

    const peticion = this.esEdicion 
      ? this.servicioSalida.editarSalida(Number(this.codSalida), payload)
      : this.servicioSalida.guardarSalida(payload);

    peticion.subscribe({
      next: (resp: any) => {
        // Actualizar facturas con fa_salida='S' y idsalida=codSalida
        const actualizaciones = this.detallesSalida.map(detalle => {
            const updatePayload = {
                fa_salida: 'S',
                idsalida: Number(this.codSalida)
            };
            return this.servicioFacturacion.actualizarSalidaFactura(detalle.codFact, updatePayload);
        });

        if (actualizaciones.length > 0) {
            forkJoin(actualizaciones).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Salida registrada y facturas actualizadas correctamente', 'success');
                    
                    // Guardar datos para impresión y habilitar botón
                    this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
                    this.mostrarBotonImprimir = true;
                    
                    this.limpiarTodo(false); // No limpiar completamente para permitir imprimir
                },
                error: (err) => {
                    console.error('Error al actualizar estados de facturas', err);
                    Swal.fire('Atención', 'Salida registrada pero hubo error actualizando algunas facturas', 'warning');
                    
                    // Aún si hubo error en actualizar facturas, permitimos imprimir lo que se intentó guardar
                    this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
                    this.mostrarBotonImprimir = true;
                    
                    this.limpiarTodo(false);
                }
            });
        } else {
             Swal.fire('Éxito', 'Salida registrada correctamente', 'success');
             this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
             this.mostrarBotonImprimir = true;
             this.limpiarTodo(false);
        }
      },
      error: (err) => {
        console.error(err);
        if (!this.esEdicion && err.status === 409) {
           Swal.fire({
             title: 'Código duplicado',
             text: 'El código de salida ya existe. Actualizando contador... Intente guardar de nuevo.',
             icon: 'warning',
             timer: 3000,
             showConfirmButton: false
           });
           // Si hay conflicto, actualizamos el contador para saltar el número usado
           this.actualizarContadorSalida(() => {
               this.generarCodSalida();
           });
        } else {
           Swal.fire('Error', 'No se pudo guardar la salida', 'error');
        }
      }
    });
  }

  actualizarContadorSalida(callback?: () => void) {
    if (this.contFacturaActual && (this.contFacturaActual.id || this.contFacturaActual.idContFact)) {
       const id = this.contFacturaActual.id || this.contFacturaActual.idContFact;
       const ultimoContador = this.contFacturaActual.contsalida !== undefined && this.contFacturaActual.contsalida !== null ? Number(this.contFacturaActual.contsalida) : 0;
       const nuevoContador = ultimoContador + 1;

       // Clonar el objeto y actualizar contsalida
       const payload = { ...this.contFacturaActual, contsalida: nuevoContador };

       this.servicioContFactura.editarContFactura(id, payload).subscribe({
         next: () => {
            console.log('Contador de salida actualizado correctamente a', nuevoContador);
            console.log('Payload enviado:', payload);
            if (callback) callback();
         },
         error: (err) => console.error('Error al actualizar contador de salida', err)
       });
    }
  }

  limpiarTodo(borrarBotonImprimir: boolean = true) {
    this.codChofer = '';
    this.nomChofer = '';
    this.cedChofer = '';
    this.bloquearChofer = false;
    this.txtcodFact = '';
    this.detallesSalida = [];
    this.esEdicion = false;
    if (borrarBotonImprimir) {
        this.mostrarBotonImprimir = false;
        this.datosUltimaSalida = null;
    }
    this.generarCodSalida(); // Regenerar código para la siguiente transacción
  }

  imprimirControlSalida() {
    if (!this.datosUltimaSalida) {
      this.mostrarError('No hay datos para imprimir');
      return;
    }

    // Ocultar botón al imprimir
    this.mostrarBotonImprimir = false;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // Ancho 80mm (rollo térmico), Alto suficiente
    });
    
    const data = this.datosUltimaSalida;
    const nombreSucursal = this.nombreSucursalActual || 'SUCURSAL PRINCIPAL'; 
    const zonaSucursal = this.zonaSucursalActual || '';

    // Helper para formato moneda 999,999,999.99
    const fmt = (num: any) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Helper para formato fecha dd/mm/aaaa
    const fmtFecha = (fecha: string) => {
        if (!fecha) return '';
        let datePart = fecha;
        // Eliminar parte de hora si existe
        if (fecha.includes('T')) datePart = fecha.split('T')[0];
        else if (fecha.includes(' ')) datePart = fecha.split(' ')[0];
        
        const partes = datePart.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return fecha;
    };

    // Helper para formato hora
    const fmtHora = (hora: any) => {
        if (!hora) return '';
        if (hora instanceof Date) {
            return hora.toTimeString().split(' ')[0];
        }
        return String(hora);
    };

    // Márgenes y configuración
    const margenIzquierdo = 4;
    const anchoPagina = 80;
    const centroPagina = anchoPagina / 2;
    let y = 10; // Posición vertical inicial

    // Encabezado
    doc.setFontSize(10);
    doc.text(nombreSucursal, centroPagina, y, { align: 'center', maxWidth: 70 });
    y += 4;
    
    if (zonaSucursal) {
        doc.setFontSize(7);
        doc.text(zonaSucursal, centroPagina, y, { align: 'center', maxWidth: 70 });
        y += 4;
    } else {
        y += 2;
    }
    
    doc.setFontSize(7);
    doc.text('REPORTE DE CONTROL DE SALIDA', centroPagina, y, { align: 'center' });
    y += 6;

    // Datos Generales
    doc.setFontSize(8);
    doc.text(`Código Salida: ${data.codSalida}`, margenIzquierdo, y);
    y += 3.5;
    doc.text(`Fecha: ${fmtFecha(data.fecSalida)} ${fmtHora(data.horaSalida)}`, margenIzquierdo, y);
    y += 3.5;
    doc.text(`Chofer: ${data.nomChofer}`, margenIzquierdo, y);
    y += 4.5;

    // Totales cabecera
    doc.text(`Cant. Facturas: ${data.canFact || data.CanFact}`, margenIzquierdo, y);
    y += 3.5;
    doc.text(`Valor Total: $${fmt(data.valFact || data.ValFact)}`, margenIzquierdo, y);
    y += 3.5;
    doc.text(`Valor Pagado: $${fmt(data.valPagado || 0)}`, margenIzquierdo, y);
    y += 5;

    // Tabla de Detalles
    // Para 80mm, ajustamos columnas para incluir cliente y fecha
    const columnas = ['Fact.', 'Fecha', 'Cliente', 'Est.', 'Valor'];
    const filas = data.detalles.map((d: any) => [
      d.codFact,
      fmtFecha(d.fecFact), // Usar formato completo dd/mm/aaaa
      (d.nomClie || '').substring(0, 15), // Truncar nombre cliente para no romper formato
      d.fpago === 'P' ? 'PAG' : (d.fpago || '').substring(0, 3), // Abreviar más F.Pago
      `$${fmt(d.valFact)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [columnas],
      body: filas,
      theme: 'plain', // Tema simple para impresoras térmicas
      styles: { 
        fontSize: 5, // Reducir un poco más la fuente para que quepa todo
        cellPadding: 0.5, 
        overflow: 'linebreak' 
      },
      headStyles: { 
        fontStyle: 'bold',
        fillColor: [220, 220, 220],
        textColor: 0,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 13 }, // Factura
        1: { cellWidth: 15 }, // Fecha - un poco más ancho para dd/mm/aaaa
        2: { cellWidth: 18 }, // Cliente - reducido ligeramente
        3: { cellWidth: 8 },  // Estado
        4: { cellWidth: 18, halign: 'right' } // Valor
      },
      margin: { left: margenIzquierdo, right: 2 },
      tableWidth: 72 // Ajustar al ancho disponible (80 - margenes)
    });

    // Obtener la posición final de la tabla para el pie
    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // Total final
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${fmt(data.valFact || data.ValFact)}`, 70, finalY, { align: 'right' });
    
    let currentY = finalY + 6;

    // Declaración de Responsabilidad
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN DE RESPONSABILIDAD', centroPagina, currentY, { align: 'center' });
    currentY += 3;

    doc.setFontSize(6); // Fuente pequeña para el texto legal
    doc.setFont('helvetica', 'normal');
    
    // Línea 1: Yo, [Nombre], (subrayado)
    const textoYo = 'Yo, ';
    const textoNombre = data.nomChofer || '';
    const textoComa = ',';
    
    const anchoYo = doc.getTextWidth(textoYo);
    const anchoNombre = doc.getTextWidth(textoNombre);
    
    doc.text(textoYo, margenIzquierdo, currentY);
    doc.text(textoNombre, margenIzquierdo + anchoYo, currentY);
    doc.line(margenIzquierdo + anchoYo, currentY + 0.5, margenIzquierdo + anchoYo + anchoNombre, currentY + 0.5); // Subrayado
    doc.text(textoComa, margenIzquierdo + anchoYo + anchoNombre, currentY);
    
    currentY += 2.5;

    // Línea 2: portador(a) de la Cédula... (Cédula subrayada)
    const textoPortador = 'portador(a) de la Cédula de Identidad No. ';
    const textoCedula = data.cedChofer || '_______________';
    const textoComa2 = ' ,';

    const anchoPortador = doc.getTextWidth(textoPortador);
    const anchoCedula = doc.getTextWidth(textoCedula);

    doc.text(textoPortador, margenIzquierdo, currentY);
    doc.text(textoCedula, margenIzquierdo + anchoPortador, currentY);
    doc.line(margenIzquierdo + anchoPortador, currentY + 0.5, margenIzquierdo + anchoPortador + anchoCedula, currentY + 0.5); // Subrayado
    doc.text(textoComa2, margenIzquierdo + anchoPortador + anchoCedula, currentY);

    currentY += 2.5;

    // Resto del texto
    const textoLegal = `declaro bajo juramento que me responsabilizo plenamente por las mercancías y valores correspondientes a las facturas detalladas anteriormente en este documento. Me comprometo a entregar, dentro de un plazo máximo de veinticuatro (24) horas , el equivalente en pesos dominicanos de los valores consignados, o en su defecto, a realizar la devolución íntegra de las mercancías entregadas a la persona debidamente designada por la empresa. En caso de incumplimiento de lo aquí establecido, AUTORIZO EXPRESAMENTE a la empresa a descontar de mi salario el monto correspondiente a los valores consignados, conforme a las disposiciones legales vigentes. Para los fines legales correspondientes, firmo la presente declaración en la fecha indicada en este documento.`;

    const splitText = doc.splitTextToSize(textoLegal, anchoPagina - (margenIzquierdo * 2));
    doc.text(splitText, margenIzquierdo, currentY);
    
    const textHeight = doc.getTextDimensions(splitText).h;
    currentY += textHeight + 10;

    // Espacio para firma
    doc.setLineWidth(0.5);
    doc.line(10, currentY, 70, currentY);
    doc.setFontSize(7);
    doc.text('Firma Recibido', centroPagina, currentY + 4, { align: 'center' });
    
    // Abrir diálogo de impresión
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  get totalSalida(): number {
    return this.detallesSalida.reduce((sum, item) => sum + Number(item.valFact), 0);
  }

  mostrarError(msg: string) {
    Swal.fire({
      icon: 'error',
      title: 'Atención',
      text: msg,
      timer: 2000,
      showConfirmButton: false
    });
  }

}
