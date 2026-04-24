import { Injectable } from '@angular/core';
import { ModeloRnc, ModeloRncData } from '.';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';
import { unzipSync } from 'fflate';

type ImportPhase =
  | 'descargando'
  | 'descomprimiendo'
  | 'parseando'
  | 'limpiando'
  | 'insertando'
  | 'completado';

export interface ImportProgress {
  phase: ImportPhase;
  processed: number;
  total: number;
  inserted: number;
  errors: number;
}

export interface ImportTaskState extends ImportProgress {
  running: boolean;
  success: boolean | null;
  startedAt: number | null;
  finishedAt: number | null;
  message: string;
}

interface ServerImportJob {
  id: string;
  status: 'pending' | 'running' | 'success' | 'error';
  phase: ImportPhase;
  processed: number;
  total: number;
  inserted: number;
  errors: number;
  message: string;
  startedAt: string | null;
  finishedAt: string | null;
  running: boolean;
  success: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class ServicioRnc {
  constructor(private supabase: SupabaseService) {}
  private readonly dgiiZipUrl =
    'https://dgii.gov.do/app/WebApps/Consultas/RNC/RNC_CONTRIBUYENTES.zip';
  private readonly edgeProxyFunctionName = 'proxy-rnc-dgii';
  private readonly importJobFunctionName = 'rnc-import-job';
  private readonly importPollMs = 2000;
  private readonly importStateSubject = new BehaviorSubject<ImportTaskState>({
    running: false,
    success: null,
    startedAt: null,
    finishedAt: null,
    message: '',
    phase: 'descargando',
    processed: 0,
    total: 0,
    inserted: 0,
    errors: 0,
  });
  private importPromise: Promise<any> | null = null;
  private currentJobId: string | null = null;

  readonly importState$ = this.importStateSubject.asObservable();

  private get db(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error('Supabase no está configurado');
    }
    const anyClient = client as any;
    if (typeof anyClient?.schema === 'function') {
      try {
        return anyClient.schema(this.supabase.schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private mapRow(row: any): ModeloRncData {
    return {
      id: Number(row?.id ?? 0),
      rnc: String(row?.rnc ?? '').trim(),
      rason: String(row?.rason ?? '').trim(),
      status: row?.status ?? null,
    };
  }

  private buildPagination(pageIndex: number, limit: number, total: number) {
    return {
      total,
      page: pageIndex,
      limit,
      pageSize: limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  private normalizeText(input: string): string {
    return String(input || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizeRncCodigo(input: unknown): string {
    return String(input ?? '')
      .trim()
      .replace(/[^\d]/g, '');
  }

  private detectDelimiter(sampleLine: string): string {
    const candidates = [',', ';', '|', '\t'];
    let best = ',';
    let maxCount = -1;

    for (const c of candidates) {
      const count = sampleLine.split(c).length - 1;
      if (count > maxCount) {
        maxCount = count;
        best = c;
      }
    }
    return best;
  }

  private parseDelimitedLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    out.push(current.trim());
    return out;
  }

  private pickColumn(
    headers: string[],
    candidates: string[],
    fallback: number
  ): number {
    const normalized = headers.map((h) => this.normalizeText(h));
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (candidates.some((c) => h.includes(c))) return i;
    }
    return fallback;
  }

  private decodeBytes(bytes: Uint8Array): string {
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (utf8.includes('\uFFFD')) {
      return new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
    }
    return utf8;
  }

  private extractRncTextFromZip(zipBytes: Uint8Array): string {
    const entries = unzipSync(zipBytes);
    const fileNames = Object.keys(entries);
    if (!fileNames.length) {
      throw new Error('El ZIP de DGII está vacío.');
    }

    const preferred =
      fileNames.find((name) =>
        /rnc/i.test(name) && /\.(csv|txt)$/i.test(name)
      ) ||
      fileNames.find((name) => /\.(csv|txt)$/i.test(name)) ||
      fileNames[0];

    const bytes = entries[preferred];
    if (!bytes || !bytes.length) {
      throw new Error('No se pudo leer el archivo de RNC dentro del ZIP.');
    }

    return this.decodeBytes(bytes);
  }

  private parseRncRows(rawText: string): Array<{
    rnc: string;
    rason: string;
    status: string;
  }> {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => !!l);

    if (!lines.length) return [];

    const delimiter = this.detectDelimiter(lines[0]);
    const firstRow = this.parseDelimitedLine(lines[0], delimiter);
    const firstNorm = firstRow.map((f) => this.normalizeText(f));
    const hasHeader =
      firstNorm.some((f) => f.includes('rnc') || f.includes('cedula')) &&
      firstNorm.some(
        (f) =>
          f.includes('razon') ||
          f.includes('nombre') ||
          f.includes('social')
      );

    const headerRow = hasHeader ? firstRow : [];
    const startIndex = hasHeader ? 1 : 0;

    const rncIdx = hasHeader
      ? this.pickColumn(headerRow, ['rnc', 'cedula', 'documento'], 0)
      : 0;
    const razonIdx = hasHeader
      ? this.pickColumn(
          headerRow,
          ['razon social', 'razon', 'nombre', 'social'],
          1
        )
      : 1;
    const statusIdx = hasHeader
      ? this.pickColumn(headerRow, ['status', 'estado', 'situacion'], 2)
      : 2;

    const seen = new Set<string>();
    const rows: Array<{ rnc: string; rason: string; status: string }> = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = this.parseDelimitedLine(lines[i], delimiter);
      if (!cols.length) continue;

      const rawRnc = String(cols[rncIdx] ?? cols[0] ?? '').trim();
      const cleanRnc = rawRnc.replace(/[^\d]/g, '');
      if (!cleanRnc || cleanRnc.length < 8) continue;

      const rason = String(cols[razonIdx] ?? cols[1] ?? '').trim();
      if (!rason) continue;

      if (seen.has(cleanRnc)) continue;
      seen.add(cleanRnc);

      const statusRaw = String(cols[statusIdx] ?? '').trim();
      const status = statusRaw ? statusRaw.toUpperCase() : 'ACTIVO';

      rows.push({
        rnc: cleanRnc,
        rason,
        status,
      });
    }

    return rows;
  }

  private async clearRncTable(): Promise<void> {
    const { error } = await this.db.from('rnc').delete().neq('id', 0);
    if (error) throw error;
  }

  private async importFromZipBytes(
    zipBytes: Uint8Array,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<any> {
    const report = (progress: ImportProgress) => {
      if (typeof onProgress === 'function') onProgress(progress);
    };

    report({
      phase: 'descomprimiendo',
      processed: 0,
      total: 0,
      inserted: 0,
      errors: 0,
    });

    const rawText = this.extractRncTextFromZip(zipBytes);

    report({
      phase: 'parseando',
      processed: 0,
      total: 0,
      inserted: 0,
      errors: 0,
    });

    const rows = this.parseRncRows(rawText);
    const total = rows.length;
    if (!total) {
      throw new Error('No se encontraron registros válidos en el archivo de DGII.');
    }

    report({
      phase: 'limpiando',
      processed: 0,
      total,
      inserted: 0,
      errors: 0,
    });
    await this.clearRncTable();

    let inserted = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { error } = await this.db.from('rnc').upsert(
        {
          rnc: row.rnc,
          rason: row.rason,
          status: row.status,
        },
        { onConflict: 'rnc' }
      );
      if (error) {
        errors++;
      } else {
        inserted++;
      }

      if ((i + 1) % 100 === 0 || i === rows.length - 1) {
        report({
          phase: 'insertando',
          processed: i + 1,
          total,
          inserted,
          errors,
        });
      }
    }

    report({
      phase: 'completado',
      processed: total,
      total,
      inserted,
      errors,
    });

    return {
      status: 'success',
      code: 200,
      message: 'Importación completada',
      data: {
        totalFuente: total,
        insertados: inserted,
        errores: errors,
      },
    };
  }

  private async descargarZipViaEdgeProxy(): Promise<Uint8Array> {
    const baseUrl = String(this.supabase.url || '').trim().replace(/\/$/, '');
    if (!baseUrl) {
      throw new Error('URL de Supabase no configurada.');
    }

    const proxyUrl = `${baseUrl}/functions/v1/${this.edgeProxyFunctionName}`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: this.dgiiZipUrl,
      }),
    });

    if (!response.ok) {
      let details = '';
      try {
        details = await response.text();
      } catch {
        details = '';
      }
      throw new Error(
        `Proxy DGII respondió HTTP ${response.status}${details ? `: ${details}` : ''}`
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  private updateImportState(patch: Partial<ImportTaskState>): void {
    this.importStateSubject.next({
      ...this.importStateSubject.value,
      ...patch,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async invokeImportJob(body: Record<string, any>): Promise<any> {
    const client: any = this.supabase.client;
    if (!client?.functions?.invoke) {
      throw new Error('No se pudo invocar la función rnc-import-job.');
    }

    const { data, error } = await client.functions.invoke(
      this.importJobFunctionName,
      { body }
    );

    if (error) {
      const e: any = error;
      let details =
        e?.context?.statusText || e?.message || 'Error en job de importación RNC';
      const ctx = e?.context;
      if (ctx && typeof ctx?.json === 'function') {
        try {
          const bodyJson = await ctx.json();
          const bodyMessage = String(bodyJson?.message || '').trim();
          const bodyDetails = String(
            bodyJson?.details || bodyJson?.error?.message || ''
          ).trim();

          if (bodyMessage && bodyDetails) {
            details =
              bodyMessage === bodyDetails
                ? bodyMessage
                : `${bodyMessage} ${bodyDetails}`;
          } else if (bodyMessage) {
            details = bodyMessage;
          } else if (bodyDetails) {
            details = bodyDetails;
          }
        } catch {
          // Ignorar parse del body y usar details por defecto.
        }
      }
      throw new Error(String(details));
    }

    if (!data?.ok) {
      throw new Error(
        String(data?.message || 'No se pudo ejecutar el job de importación RNC.')
      );
    }

    return data?.data || {};
  }

  private mapServerJobToState(job: ServerImportJob, fallbackStartedAt: number): ImportTaskState {
    const startedAtCandidate = job?.startedAt
      ? new Date(job.startedAt).getTime()
      : fallbackStartedAt;
    const startedAtMs = Number.isFinite(startedAtCandidate)
      ? startedAtCandidate
      : fallbackStartedAt;

    const finishedAtCandidate = job?.finishedAt
      ? new Date(job.finishedAt).getTime()
      : NaN;
    const finishedAtMs = Number.isFinite(finishedAtCandidate)
      ? finishedAtCandidate
      : null;
    return {
      running: Boolean(job?.running || job?.success === null),
      success:
        job?.success === true
          ? true
          : job?.success === false
          ? false
          : null,
      startedAt: startedAtMs,
      finishedAt: finishedAtMs,
      message: String(job?.message || 'Importando datos de DGII...'),
      phase: (job?.phase || 'descargando') as ImportPhase,
      processed: Number(job?.processed || 0),
      total: Number(job?.total || 0),
      inserted: Number(job?.inserted || 0),
      errors: Number(job?.errors || 0),
    };
  }

  private startServerJobTracking(jobId: string, startedAt: number): void {
    this.importPromise = (async () => {
      try {
        while (true) {
          const statusData = await this.invokeImportJob({
            action: 'status',
            schema: this.supabase.schema,
            jobId,
          });

          const job = (statusData?.job || null) as ServerImportJob | null;
          if (!job) {
            await this.sleep(this.importPollMs);
            continue;
          }

          this.updateImportState(this.mapServerJobToState(job, startedAt));

          if (job.success === true || job.status === 'success') {
            this.notifyCompletion(true, {
              inserted: Number(job.inserted || 0),
              errors: Number(job.errors || 0),
            });
            break;
          }

          if (job.success === false || job.status === 'error') {
            throw new Error(
              String(job.message || 'No se pudo completar la importación de RNC.')
            );
          }

          await this.sleep(this.importPollMs);
        }
      } catch (error: any) {
        const finishedAt = Date.now();
        const message =
          String(error?.message || '').trim() ||
          'No se pudo completar la importación de RNC.';

        this.updateImportState({
          running: false,
          success: false,
          finishedAt,
          message,
          phase: 'completado',
        });

        this.notifyCompletion(false, {
          inserted: this.importStateSubject.value.inserted,
          errors: this.importStateSubject.value.errors,
          message,
        });
      } finally {
        this.importPromise = null;
        this.currentJobId = null;
      }
    })();
  }

  async sincronizarImportacionServidorActiva(): Promise<void> {
    if (this.importPromise) return;

    try {
      const statusData = await this.invokeImportJob({
        action: 'status',
        schema: this.supabase.schema,
      });
      const job = (statusData?.job || null) as ServerImportJob | null;
      if (!job) return;
      if (!(job.running || job.success === null)) return;
      if (!job.id) return;

      const startedAt = job.startedAt
        ? new Date(job.startedAt).getTime()
        : Date.now();
      this.currentJobId = job.id;
      this.updateImportState(this.mapServerJobToState(job, startedAt));
      this.startServerJobTracking(job.id, startedAt);
    } catch {
      // Si no se puede sincronizar, no bloqueamos la pantalla.
    }
  }

  private notifyCompletion(
    success: boolean,
    summary: { inserted: number; errors: number; message?: string }
  ): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const title = success
      ? 'Importación de RNC completada'
      : 'Importación de RNC con errores';
    const body = success
      ? `Insertados: ${summary.inserted.toLocaleString()} | Errores: ${summary.errors.toLocaleString()}`
      : summary.message || 'Revisa el resultado en la pantalla de RNC.';

    try {
      new Notification(title, { body });
    } catch {
      // Ignorar fallos del navegador al crear notificación.
    }
  }

  solicitarPermisoNotificaciones(): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }

  async iniciarImportacionDgiiEnSegundoPlano(): Promise<boolean> {
    if (this.importPromise) {
      return false;
    }

    const startedAt = Date.now();
    this.updateImportState({
      running: true,
      success: null,
      startedAt,
      finishedAt: null,
      message: 'Importación iniciada en segundo plano.',
      phase: 'descargando',
      processed: 0,
      total: 0,
      inserted: 0,
      errors: 0,
    });

    try {
      const requestedBy = String(
        localStorage.getItem('username') ||
          localStorage.getItem('usuario') ||
          'sistema'
      ).trim() || 'sistema';

      const startData = await this.invokeImportJob({
        action: 'start',
        schema: this.supabase.schema,
        requestedBy,
      });

      const started = Boolean(startData?.started);
      const job = (startData?.job || null) as ServerImportJob | null;
      const jobId = String(startData?.jobId || job?.id || '').trim();

      if (!jobId) {
        throw new Error('No se recibió jobId del servidor para importar RNC.');
      }

      this.currentJobId = jobId;

      if (job) {
        this.updateImportState(this.mapServerJobToState(job, startedAt));
      }

      if (!started) {
        this.updateImportState({
          running: true,
          success: null,
          startedAt,
          finishedAt: null,
          message:
            'Ya había una importación ejecutándose en servidor. Conectando al seguimiento...',
        });
      }

      this.startServerJobTracking(jobId, startedAt);
      return started;
    } catch (error: any) {
      const finishedAt = Date.now();
      const message =
        String(error?.message || '').trim() ||
        'No se pudo iniciar la importación de RNC en servidor.';

      this.updateImportState({
        running: false,
        success: false,
        finishedAt,
        phase: 'completado',
        message,
      });

      this.notifyCompletion(false, {
        inserted: this.importStateSubject.value.inserted,
        errors: this.importStateSubject.value.errors,
        message,
      });

      throw new Error(message);
    }
  }

  buscarTodosRnc(
    pageIndex: number,
    pageSize: number,
    search?: string
  ): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from('rnc')
        .select('*', { count: 'exact' })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (search) {
        const term = String(search).trim();
        query = query.or(`rnc.ilike.%${term}%,rason.ilike.%${term}%,status.ilike.%${term}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const rows = (data || []).map((row: any) => this.mapRow(row));
      return {
        status: 'success',
        code: 200,
        message: '',
        data: {
          data: rows,
          pagination: this.buildPagination(pageIndex, pageSize, Number(count ?? 0)),
        },
      };
    })());
  }

  guardaRnc(rnc: ModeloRncData): Observable<any> {
    const payload = {
      rnc: String((rnc as any)?.rnc ?? '').trim(),
      rason: String((rnc as any)?.rason ?? '').trim(),
      status: (rnc as any)?.status ?? null,
    };
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: ModeloRncData) => ({ status: 'success', code: 200, data: row }))
    );
  }

  editarRnc(id: number, rnc: any): Observable<any> {
    const payload: any = {
      rnc: rnc?.rnc !== undefined ? String(rnc.rnc).trim() : undefined,
      rason: rnc?.rason !== undefined ? String(rnc.rason).trim() : undefined,
      status: rnc?.status !== undefined ? rnc.status : undefined,
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .update(payload)
        .eq('id', Number(id))
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  eliminarRnc(rnc: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from('rnc')
        .delete()
        .eq('id', Number(rnc));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: 'success', code: 200 }))
    );
  }

  buscarrnc(rnc: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('id', Number(rnc))
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  buscartodoRnc(rnc: number): Observable<ModeloRnc> {
    return this.buscarrnc(rnc) as Observable<ModeloRnc>;
  }

  buscarRncPorId(rnc: string): Observable<any> {
    const codigo = this.normalizeRncCodigo(rnc);
    return from((async () => {
      if (!codigo) return [];
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('rnc', codigo)
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloRncData[]) => ({ status: 'success', code: 200, data: rows }))
    );
  }
  buscarRncPorrncId(rnc: string): Observable<any> {
    const codigo = this.normalizeRncCodigo(rnc);
    return from((async () => {
      if (!codigo) return null;
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('rnc', codigo)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  importarDgii(onProgress?: (progress: ImportProgress) => void): Observable<any> {
    return from((async () => {
      const report = (progress: ImportProgress) => {
        if (typeof onProgress === 'function') onProgress(progress);
      };

      report({
        phase: 'descargando',
        processed: 0,
        total: 0,
        inserted: 0,
        errors: 0,
      });

      let zipBytes: Uint8Array;
      try {
        zipBytes = await this.descargarZipViaEdgeProxy();
      } catch (proxyError: any) {
        console.warn(
          'No fue posible descargar ZIP usando proxy Edge. Se intentará descarga directa.',
          proxyError
        );
        try {
          const response = await fetch(this.dgiiZipUrl, {
            method: 'GET',
            cache: 'no-store',
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          zipBytes = new Uint8Array(await response.arrayBuffer());
        } catch (error: any) {
          const msg = String(error?.message || '').toLowerCase();
          if (msg.includes('failed to fetch') || msg.includes('network')) {
            throw new Error(
              'No se pudo descargar el archivo de DGII. Verifica conexión o CORS del navegador.'
            );
          }
          throw new Error(`Error descargando archivo DGII: ${error?.message || error}`);
        }
      }
      return this.importFromZipBytes(zipBytes, onProgress);
    })());
  }

  importarDgiiDesdeArchivo(
    file: File,
    onProgress?: (progress: ImportProgress) => void
  ): Observable<any> {
    return from((async () => {
      if (!file) {
        throw new Error('No se seleccionó archivo ZIP.');
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!bytes.length) {
        throw new Error('El archivo ZIP está vacío.');
      }
      return this.importFromZipBytes(bytes, onProgress);
    })());
  }
}
