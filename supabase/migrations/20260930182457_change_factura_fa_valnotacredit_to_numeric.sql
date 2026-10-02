alter table myappdb.factura
  alter column fa_valnotacredit type numeric(18,2)
  using coalesce(fa_valnotacredit, 0)::numeric(18,2);
