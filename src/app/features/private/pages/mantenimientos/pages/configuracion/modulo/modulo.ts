import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModuloModel, Modulo } from './modelo';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-config-modulo',
  templateUrl: './modulo.html',
  styleUrls: ['./modulo.css']
})
export class ModuloPage implements OnInit {
  modulos: Modulo[] = [];
  filtro = '';
  Toast = (Swal as any).mixin({
    toast: true,
    position: 'bottom-start',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true
  });

  // modelo para el formulario de nuevo módulo
  nuevo: Partial<Modulo> = {
    descmodulo: '',
    scceso: 'N',
    lectura: 'N',
    permisos: []
  };

  constructor(private moduloSrv: ServicioModulo) {}

  private obtenerMensajeError(err: any): string {
    return (
      err?.error?.message
      || err?.message
      || err?.details
      || 'Error inesperado con modulos.'
    );
  }

  private cerrarModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const bs = (window as any)?.bootstrap;
    if (!bs?.Modal) return;
    const instance = bs.Modal.getInstance(el) || new bs.Modal(el);
    instance.hide();
  }

  ngOnInit(): void {
    this.limpiarBloqueoModal();
    this.cargarModulos();
  }

  abrirNuevoModal(): void {
    this.limpiarBloqueoModal();
    const el = document.getElementById('nuevoModuloModal');
    if (!el) return;
    const bs = (window as any)?.bootstrap;
    if (!bs?.Modal) {
      return;
    }
    const instance = bs.Modal.getOrCreateInstance(el);
    instance.show();
  }

  cargarModulos(): void {
    // Intentar obtener todos; si backend devuelve { data: [] } u []
    this.moduloSrv.obtenerTodosModulo().subscribe({
      next: (resp: any) => {
        const lista = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        this.modulos = (lista || []).map((m: any) => new ModuloModel({
          idmodulo: m.idmodulo,
          descmodulo: m.descmodulo,
          scceso: m.scceso,
          lectura: m.lectura,
          permisos: m.permisos || []
        }));
      },
      error: (err) => {
        console.error('Error cargando módulos', err);
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
        this.modulos = [];
      }


    });
  }

  get listaFiltrada(): Modulo[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.modulos;
    return this.modulos.filter(m =>
      (m.idmodulo + '').includes(q) ||
      (m.descmodulo || '').toLowerCase().includes(q) ||
      (m.scceso || '').toLowerCase().includes(q) ||
      (m.lectura || '').toLowerCase().includes(q)
    );
  }

  crearModulo(form: NgForm) {
    const desc = (this.nuevo.descmodulo || '').trim();
    if (!desc || desc.length > 30) {
      this.Toast.fire({ title: 'La descripcion es requerida (maximo 30 caracteres).', icon: 'warning' as any });
      return;
    }
    const scc = (this.nuevo.scceso || 'N').toUpperCase();
    const lec = (this.nuevo.lectura || 'N').toUpperCase();
    if (!['S','N'].includes(scc) || !['S','N'].includes(lec)) {
      this.Toast.fire({ title: 'Valores de acceso/lectura invalidos.', icon: 'warning' as any });
      return;
    }

    const payload: Partial<Modulo> = {
      descmodulo: desc,
      scceso: scc,
      lectura: lec,
      permisos: []
    };

    this.moduloSrv.guardarModulo(payload).subscribe({
      next: () => {
        this.cargarModulos();
        this.nuevo = { descmodulo: '', scceso: 'N', lectura: 'N', permisos: [] };
        form.resetForm({ descmodulo: '', scceso: 'N', lectura: 'N' });
        this.cerrarModal('nuevoModuloModal');
        this.limpiarBloqueoModal();
        this.Toast.fire({ title: 'Modulo creado', icon: 'success' as any });
      },
      error: (err) => {
        console.error('Error guardando módulo', err);
        this.Toast.fire({ title: this.obtenerMensajeError(err), icon: 'error' as any });
      }
    });
  }

  private limpiarBloqueoModal(): void {
    document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
  getBadgeClass(value: string, tipo: 'acceso' | 'lectura') {
  if (tipo === 'acceso') return (value === 'S') ? 'bg-success' : 'bg-secondary';
  if (tipo === 'lectura') return (value === 'S') ? 'bg-info' : 'bg-secondary';
  return 'bg-secondary';
}
editarModulo(modulo: any) {
  console.log('Editar módulo', modulo);
  // Aquí abres modal o navegas a formulario de edición
}

eliminarModulo(modulo: any) {
  if(confirm(`¿Desea eliminar el módulo ${modulo.descmodulo}?`)) {
    console.log('Eliminar módulo', modulo);
    // Aquí llamas al servicio que elimina el módulo
  }
}
}
