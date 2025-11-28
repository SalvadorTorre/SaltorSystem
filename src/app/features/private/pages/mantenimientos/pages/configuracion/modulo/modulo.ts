import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModuloModel, Modulo } from './modelo';
import { ServicioModulo } from 'src/app/core/services/mantenimientos/modulo/modulo.service';

@Component({
  selector: 'app-config-modulo',
  templateUrl: './modulo.html',
  styleUrls: ['./modulo.css']
})
export class ModuloPage implements OnInit {
  modulos: Modulo[] = [];
  filtro = '';

  // modelo para el formulario de nuevo módulo
  nuevo: Partial<Modulo> = {
    descmodulo: '',
    scceso: 'N',
    lectura: 'N',
    permisos: []
  };

  constructor(private moduloSrv: ServicioModulo) {}

  ngOnInit(): void {
    this.cargarModulos();
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
        // Fallback opcional si falla: mantener lista vacía
         alert(err.error.message); // “El módulo 'Contabilidad' ya existe.”
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
    if (!form.valid) return;

    const desc = (this.nuevo.descmodulo || '').trim();
    if (!desc || desc.length > 30) return;
    const scc = (this.nuevo.scceso || 'N').toUpperCase();
    const lec = (this.nuevo.lectura || 'N').toUpperCase();
    if (!['S','N'].includes(scc) || !['S','N'].includes(lec)) return;

    const payload: Partial<Modulo> = {
      descmodulo: desc,
      scceso: scc,
      lectura: lec,
      permisos: []
    };

    this.moduloSrv.guardarModulo(payload).subscribe({
      next: () => {
        // tras guardar, recargar lista desde backend
        this.cargarModulos();
        // reset form
        this.nuevo = { descmodulo: '', scceso: 'N', lectura: 'N', permisos: [] };
        form.resetForm({ descmodulo: '', scceso: 'N', lectura: 'N' });
      },
      error: (err) => {
        console.error('Error guardando módulo', err);
      }
    });
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