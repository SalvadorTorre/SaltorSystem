import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { SupabaseService } from 'src/app/core/services/supabase/supabase.service';

interface ApkArchivo {
  id: number;
  nombre_archivo: string;
  ruta_storage: string;
  link_publico: string;
  tamano_bytes: number;
  content_type?: string | null;
  usuario?: string | null;
  creado_en: string;
  actualizado_en: string;
}

@Component({
  selector: 'app-cargar-apk',
  templateUrl: './cargar-apk.html',
  styleUrls: ['./cargar-apk.css'],
})
export class CargarApkPage implements OnInit {
  nombreArchivo = '';
  archivo: File | null = null;
  linkPublico = '';
  subiendo = false;
  cargandoLista = false;
  eliminandoId: number | null = null;
  archivos: ApkArchivo[] = [];

  private readonly bucket = 'apk';
  private readonly tableName = 'apk_archivos';
  private readonly maxApkBytes = 120 * 1024 * 1024;

  constructor(private readonly supabase: SupabaseService) {}

  ngOnInit(): void {
    void this.cargarLista();
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.archivo = null;

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      input.value = '';
      Swal.fire('Archivo invalido', 'Solo se permite cargar archivos APK.', 'warning');
      return;
    }

    if (file.size > this.maxApkBytes) {
      input.value = '';
      Swal.fire('Archivo muy grande', 'El APK no puede superar 120 MB.', 'warning');
      return;
    }

    this.archivo = file;
    if (!this.nombreArchivo.trim()) {
      this.nombreArchivo = file.name.replace(/\.apk$/i, '');
    }
  }

  async subirApk(): Promise<void> {
    if (this.subiendo) return;

    const client = this.supabase.client;
    if (!client) {
      Swal.fire('Supabase', 'Supabase no esta configurado.', 'error');
      return;
    }

    if (!this.archivo) {
      Swal.fire('Falta archivo', 'Seleccione el archivo APK que desea subir.', 'warning');
      return;
    }

    const nombre = this.normalizarNombre(this.nombreArchivo);
    if (!nombre) {
      Swal.fire('Falta nombre', 'Digite el nombre del archivo APK.', 'warning');
      return;
    }

    const ruta = `${nombre}.apk`;
    this.subiendo = true;
    this.linkPublico = '';

    try {
      const { error } = await client.storage
        .from(this.bucket)
        .upload(ruta, this.archivo, {
          upsert: true,
          contentType: 'application/vnd.android.package-archive',
        });

      if (error) throw error;

      const { data } = client.storage.from(this.bucket).getPublicUrl(ruta);
      this.linkPublico = data?.publicUrl || this.publicUrlManual(ruta);
      await this.registrarArchivo({
        nombre_archivo: `${nombre}.apk`,
        ruta_storage: ruta,
        link_publico: this.linkPublico,
        tamano_bytes: this.archivo.size,
        content_type:
          this.archivo.type || 'application/vnd.android.package-archive',
        usuario: String(localStorage.getItem('username') || '').trim() || null,
      });
      await this.cargarLista();

      await Swal.fire({
        icon: 'success',
        title: 'APK cargado',
        html: `Archivo subido correctamente.<br><br><b>Link publico:</b><br><a href="${this.linkPublico}" target="_blank">${this.linkPublico}</a>`,
      });
    } catch (error: any) {
      Swal.fire(
        'Error al subir APK',
        String(error?.message || error || 'No se pudo subir el archivo APK.'),
        'error',
      );
    } finally {
      this.subiendo = false;
    }
  }

  async cargarLista(): Promise<void> {
    const client = this.supabase.client as any;
    if (!client) return;

    this.cargandoLista = true;
    try {
      const { data, error } = await client
        .schema(this.supabase.schema)
        .from(this.tableName)
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      this.archivos = Array.isArray(data) ? data : [];
    } catch (error: any) {
      Swal.fire(
        'Error al cargar lista',
        String(error?.message || error || 'No se pudo cargar la lista de APK.'),
        'error',
      );
    } finally {
      this.cargandoLista = false;
    }
  }

  async eliminarArchivo(item: ApkArchivo): Promise<void> {
    const client = this.supabase.client as any;
    if (!client || !item?.id) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar APK',
      text: `Se eliminara ${item.nombre_archivo} del storage y de la lista.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });

    if (!result.isConfirmed) return;

    this.eliminandoId = item.id;
    try {
      const storageResult = await client.storage
        .from(this.bucket)
        .remove([item.ruta_storage]);
      if (storageResult.error) throw storageResult.error;

      const { error } = await client
        .schema(this.supabase.schema)
        .from(this.tableName)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      this.archivos = this.archivos.filter((row) => row.id !== item.id);
      if (this.linkPublico === item.link_publico) {
        this.linkPublico = '';
      }
      Swal.fire('Eliminado', 'El APK fue eliminado correctamente.', 'success');
    } catch (error: any) {
      Swal.fire(
        'Error al eliminar',
        String(error?.message || error || 'No se pudo eliminar el APK.'),
        'error',
      );
    } finally {
      this.eliminandoId = null;
    }
  }

  async copiarLink(): Promise<void> {
    if (!this.linkPublico) return;

    try {
      await navigator.clipboard.writeText(this.linkPublico);
      Swal.fire('Copiado', 'El link publico fue copiado.', 'success');
    } catch {
      Swal.fire('Link publico', this.linkPublico, 'info');
    }
  }

  abrirLink(): void {
    if (!this.linkPublico) return;
    window.open(this.linkPublico, '_blank');
  }

  abrirLinkItem(item: ApkArchivo): void {
    if (!item?.link_publico) return;
    window.open(item.link_publico, '_blank');
  }

  limpiar(): void {
    this.nombreArchivo = '';
    this.archivo = null;
    this.linkPublico = '';
    const input = document.getElementById('apkFile') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  formatFecha(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async registrarArchivo(payload: Omit<ApkArchivo, 'id' | 'creado_en' | 'actualizado_en'>): Promise<void> {
    const client = this.supabase.client as any;
    if (!client) return;

    const { error } = await client
      .schema(this.supabase.schema)
      .from(this.tableName)
      .upsert(payload, { onConflict: 'ruta_storage' });

    if (error) throw error;
  }

  private normalizarNombre(value: string): string {
    return String(value || '')
      .trim()
      .replace(/\.apk$/i, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '');
  }

  private publicUrlManual(ruta: string): string {
    const base = this.supabase.url.replace(/\/+$/, '');
    return `${base}/storage/v1/object/public/${this.bucket}/${encodeURIComponent(ruta)}`;
  }
}
