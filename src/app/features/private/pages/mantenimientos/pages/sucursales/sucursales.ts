import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface SucursalInventarioRow {
  cod_sucursal: number;
  cod_empre: string;
  nom_sucursal: string;
  dir_sucursal: string;
  tel_sucursal: string;
  totalCatalogo: number;
  totalInventario: number;
  faltantes: number;
  porcentaje: number;
}

@Component({
  selector: 'app-sucursales-page',
  templateUrl: './sucursales.html',
  styleUrls: ['./sucursales.css'],
})
export class SucursalesPageComponent implements OnInit {
  loading = false;
  filtro = '';
  sucursales: SucursalInventarioRow[] = [];
  accionPorSucursal: Record<number, boolean> = {};
  cargandoGlobal = false;

  constructor(
    private servicioSucursal: ServicioSucursal,
    private servicioInventario: ServicioInventario
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
  }

  get sucursalesFiltradas(): SucursalInventarioRow[] {
    const term = String(this.filtro || '').trim().toUpperCase();
    if (!term) return this.sucursales;
    return this.sucursales.filter((item) =>
      [
        item.cod_sucursal,
        item.cod_empre,
        item.nom_sucursal,
        item.dir_sucursal,
        item.tel_sucursal,
      ]
        .join(' ')
        .toUpperCase()
        .includes(term)
    );
  }

  cargarSucursales(): void {
    this.loading = true;
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        const ids = rows.map((row: any) => Number(row.cod_sucursal)).filter((id: number) => !!id);

        this.servicioInventario.obtenerResumenInventarioSucursales(ids).subscribe({
          next: (summaryResp: any) => {
            const summaryRows = Array.isArray(summaryResp?.data?.sucursales)
              ? summaryResp.data.sucursales
              : [];
            const totalCatalogo = Number(summaryResp?.data?.totalCatalogo || 0);
            const summaryMap = new Map<number, any>(
              summaryRows.map((item: any) => [Number(item.inv_codsucu), item])
            );

            this.sucursales = rows.map((row: any) => {
              const summary = summaryMap.get(Number(row.cod_sucursal));
              const totalInventario = Number(summary?.totalInventario || 0);
              const faltantes = Math.max(
                Number(summary?.faltantes ?? totalCatalogo - totalInventario),
                0
              );

              return {
                cod_sucursal: Number(row.cod_sucursal),
                cod_empre: String(row.cod_empre || ''),
                nom_sucursal: String(row.nom_sucursal || ''),
                dir_sucursal: String(row.dir_sucursal || ''),
                tel_sucursal: String(row.tel_sucursal || ''),
                totalCatalogo,
                totalInventario,
                faltantes,
                porcentaje: totalCatalogo
                  ? Math.round((totalInventario / totalCatalogo) * 100)
                  : 0,
              };
            });
            this.loading = false;
          },
          error: (error) => {
            this.loading = false;
            console.error(error);
            Swal.fire('Error', 'No se pudo calcular el resumen de inventario por sucursal.', 'error');
          },
        });
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
        Swal.fire('Error', 'No se pudo cargar el listado de sucursales.', 'error');
      },
    });
  }

  cargarInventarioSucursal(item: SucursalInventarioRow, sobrescribirExistentes = false): void {
    this.accionPorSucursal[item.cod_sucursal] = true;
    this.servicioInventario
      .sembrarInventarioSucursalDesdeCatalogo({
        inv_codsucu: item.cod_sucursal,
        sobrescribirExistentes,
        existenciaInicial: 0,
      })
      .subscribe({
        next: (response: any) => {
          this.accionPorSucursal[item.cod_sucursal] = false;
          const data = response?.data || {};
          Swal.fire({
            title: sobrescribirExistentes ? 'Inventario recargado' : 'Inventario cargado',
            text: `Sucursal ${item.nom_sucursal}: ${data.insertados || 0} productos procesados.`,
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
          this.cargarSucursales();
        },
        error: (error) => {
          this.accionPorSucursal[item.cod_sucursal] = false;
          console.error(error);
          Swal.fire(
            'Error',
            error?.message || 'No se pudo cargar el inventario de la sucursal.',
            'error'
          );
        },
      });
  }

  cargarInventarioFaltanteTodas(): void {
    const pendientes = this.sucursales.filter((item) => item.faltantes > 0);
    if (!pendientes.length) {
      Swal.fire('Sin pendientes', 'Todas las sucursales ya tienen su inventario base cargado.', 'info');
      return;
    }

    this.cargandoGlobal = true;
    const run = async () => {
      for (const item of pendientes) {
        await new Promise<void>((resolve, reject) => {
          this.servicioInventario
            .sembrarInventarioSucursalDesdeCatalogo({
              inv_codsucu: item.cod_sucursal,
              sobrescribirExistentes: false,
              existenciaInicial: 0,
            })
            .subscribe({
              next: () => resolve(),
              error: reject,
            });
        });
      }
    };

    run()
      .then(() => {
        this.cargandoGlobal = false;
        Swal.fire('Inventario cargado', 'Se completó la carga base para las sucursales pendientes.', 'success');
        this.cargarSucursales();
      })
      .catch((error) => {
        this.cargandoGlobal = false;
        console.error(error);
        Swal.fire('Error', error?.message || 'Falló la carga masiva de inventario.', 'error');
      });
  }

  async vaciarInventarioSucursal(item: SucursalInventarioRow): Promise<void> {
    const confirmacion = await Swal.fire({
      title: 'Vaciar inventario',
      text: `Se eliminará todo el inventario de la sucursal ${item.nom_sucursal}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });

    if (!confirmacion.isConfirmed) return;

    const segundaConfirmacion = await Swal.fire({
      title: 'Confirmación final',
      text: 'Esta acción eliminará todas las filas de inventario de esa sucursal.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Vaciar ahora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b02a37',
    });

    if (!segundaConfirmacion.isConfirmed) return;

    this.accionPorSucursal[item.cod_sucursal] = true;
    this.servicioInventario.vaciarInventarioSucursal(item.cod_sucursal).subscribe({
      next: (response: any) => {
        this.accionPorSucursal[item.cod_sucursal] = false;
        const eliminados = Number(response?.data?.eliminados || 0);
        Swal.fire({
          title: 'Inventario vaciado',
          text: `Sucursal ${item.nom_sucursal}: ${eliminados} filas eliminadas.`,
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
        });
        this.cargarSucursales();
      },
      error: (error) => {
        this.accionPorSucursal[item.cod_sucursal] = false;
        console.error(error);
        Swal.fire(
          'Error',
          error?.message || 'No se pudo vaciar el inventario de la sucursal.',
          'error'
        );
      },
    });
  }
}
