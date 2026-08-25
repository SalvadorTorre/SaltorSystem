create index if not exists idx_factura_cobrofact_grid_scope_fecha
  on myappdb.factura (fa_codempr, fa_codsucu, fa_fecfact desc, fa_codfact desc)
  where (
    fa_status in ('C', 'F')
    and (fa_fpago is null or btrim(fa_fpago::text) = '' or fa_fpago = 'N')
  );

create index if not exists idx_factura_cobrofact_numero_scope
  on myappdb.factura (fa_codempr, fa_codsucu, fa_codfact);

notify pgrst, 'reload schema';
