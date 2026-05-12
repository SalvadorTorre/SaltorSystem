import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { detEntradamercModel, detEntradamercModelData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
    providedIn: "root"
})
export class ServiciodetEntradamerc {
    constructor(
        private http: HttpInvokeService,
        private supabase: SupabaseService,
    ) { }

    private get useSupabase(): boolean {
        return Boolean(this.supabase?.enabled && this.supabase?.client);
    }

    private get db(): any {
        const client = this.supabase.client;
        if (!client) {
            throw new Error("Supabase no está configurado");
        }
        const anyClient = client as any;
        if (typeof anyClient?.schema === "function") {
            try {
                return anyClient.schema(this.supabase.schema);
            } catch {
                return anyClient;
            }
        }
        return anyClient;
    }

    private toStringOrNull(value: any): string | null {
        if (value === null || value === undefined) return null;
        const s = String(value).trim();
        return s ? s : null;
    }

    private toStringMax(value: any, maxLen: number): string | null {
        const s = this.toStringOrNull(value);
        if (s === null) return null;
        if (!Number.isFinite(maxLen) || maxLen <= 0) return s;
        return s.length > maxLen ? s.slice(0, maxLen) : s;
    }

    private formatDbError(error: any): string {
        if (!error) return "Error desconocido";
        if (typeof error === "string") return error;
        const parts: string[] = [];
        if (error?.message) parts.push(String(error.message));
        if (error?.details) parts.push(String(error.details));
        if (error?.hint) parts.push(String(error.hint));
        if (error?.code) parts.push(`code=${String(error.code)}`);
        if (parts.length > 0) return parts.join(" | ");
        try {
            return JSON.stringify(error);
        } catch {
            return "Error desconocido";
        }
    }

    private throwStep(step: string, error: any): never {
        const msg = this.formatDbError(error);
        throw new Error(`[Detentradamerc/Supabase] ${step}: ${msg}`);
    }

    guardardetEntradamerc(detentradamerc: any): Observable<any> {
        if (!this.useSupabase) {
            return this.http.PostRequest<any, any>("/detentradamerc", detentradamerc);
        }

        const rows = Array.isArray(detentradamerc) ? detentradamerc : [detentradamerc];
        const payload = rows.map((it: any) => ({
            de_codentr: this.toStringMax(it?.de_codEntr ?? it?.de_codentr, 12) ?? "",
            de_codmerc: this.toStringMax(it?.de_codMerc ?? it?.de_codmerc, 15) ?? "",
            de_desmerc: this.toStringMax(it?.de_desMerc ?? it?.de_desmerc, 30),
            de_canentr: it?.de_canEntr ?? it?.de_canentr ?? it?.cantidad ?? 0,
            de_premerc: it?.de_preMerc ?? it?.de_premerc ?? it?.precio ?? 0,
            de_valentr: it?.de_valEntr ?? it?.de_valentr ?? it?.total ?? 0,
            de_unidad: this.toStringMax(it?.de_unidad ?? it?.unidad, 10),
            de_cosmerc: it?.de_cosMerc ?? it?.de_cosmerc ?? it?.costo ?? null,
            de_codsupl: it?.de_codSupl ?? it?.de_codsupl ?? null,
            de_fecentr: it?.de_fecEntr ?? it?.de_fecentr ?? null,
            de_codempr: this.toStringMax(it?.de_codEmpr ?? it?.de_codempr, 6),
            de_codsucu: it?.de_codSucu ?? it?.de_codsucu ?? null,
            de_tipo: this.toStringMax(it?.de_tipo, 10),
        }));

        return from((async () => {
            const { error } = await this.db.from("detentradamerc").insert(payload);
            if (error) this.throwStep("Insertar detentradamerc", error);
            return { status: "success", code: 200, data: true };
        })());
    }

    editardetEntradamerc(de_codentra: string, detentradamerc: detEntradamercModel): Observable<any> {
        if (!this.useSupabase) {
            return this.http.PutRequest<any, any>(`/detentradamerc/${de_codentra}`, detentradamerc);
        }
        const codigo = String(de_codentra || "").trim();
        const payload: any = {
            de_desmerc: this.toStringMax((detentradamerc as any)?.de_desMerc ?? (detentradamerc as any)?.de_desmerc, 30),
            de_canentr: (detentradamerc as any)?.de_canEntr ?? (detentradamerc as any)?.de_canentr ?? null,
            de_premerc: (detentradamerc as any)?.de_preMerc ?? (detentradamerc as any)?.de_premerc ?? null,
            de_valentr: (detentradamerc as any)?.de_valEntr ?? (detentradamerc as any)?.de_valentr ?? null,
            de_unidad: this.toStringMax((detentradamerc as any)?.de_unidad ?? (detentradamerc as any)?.unidad, 10),
            de_codempr: this.toStringMax((detentradamerc as any)?.de_codEmpr ?? (detentradamerc as any)?.de_codempr, 6),
            de_codsucu: (detentradamerc as any)?.de_codSucu ?? (detentradamerc as any)?.de_codsucu ?? null,
            de_tipo: this.toStringMax((detentradamerc as any)?.de_tipo, 10),
        };
        Object.keys(payload).forEach((k) => {
            if (payload[k] === null || payload[k] === undefined || payload[k] === "") delete payload[k];
        });

        return from((async () => {
            const { error } = await this.db
                .from("detentradamerc")
                .update(payload)
                .eq("de_codentr", codigo);
            if (error) this.throwStep("Editar detentradamerc", error);
            return { status: "success", code: 200, data: true };
        })());
    }

    buscarTodasdetEntradamerc(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
        let url = `/detentradamerc?page=${pageIndex}&limit=${pageSize}`;
        if (descripcion) url += `&descripcion=${descripcion}`;
        console.log(url);

        if (!this.useSupabase) {
            return this.http.GetRequest<any>(url);
        }

        const offset = Math.max(pageIndex - 1, 0) * pageSize;
        const desc = String(descripcion || "").trim();
        return from((async () => {
            let query = this.db
                .from("detentradamerc")
                .select("*", { count: "exact" })
                .order("de_codentr", { ascending: false })
                .range(offset, offset + pageSize - 1);
            if (desc) query = query.ilike("de_desmerc", `%${desc}%`);

            const { data, error, count } = await query;
            if (error) this.throwStep("Listar detentradamerc", error);
            return {
                status: "success",
                code: 200,
                data: data || [],
                pagination: { total: Number(count ?? 0), page: pageIndex, pageSize },
            };
        })());
    }

    eliminardetEntradamerc(de_codentra: string): Observable<any> {
        if (!this.useSupabase) {
            return this.http.DeleteRequest(`/detentradamerc/${de_codentra}`, "");
        }
        const codigo = String(de_codentra || "").trim();
        return from((async () => {
            const { error } = await this.db
                .from("detentradamerc")
                .delete()
                .eq("de_codentr", codigo);
            if (error) this.throwStep("Eliminar detentradamerc", error);
            return { status: "success", code: 200, data: true };
        })());
    }

    buscardetEmtradamerc(de_codentra: string): Observable<any> {
        if (!this.useSupabase) {
            return this.http.GetRequest<any>(`/detentradamerc/${de_codentra}`);
        }
        const codigo = String(de_codentra || "").trim();
        return from((async () => {
            const { data, error } = await this.db
                .from("detentradamerc")
                .select("*")
                .eq("de_codentr", codigo)
                .order("de_codmerc", { ascending: true });
            if (error) this.throwStep("Consultar detentradamerc", error);
            return { status: "success", code: 200, data: data || [] };
        })());
    }



}
