BEGIN;

INSERT INTO myappdb.empresas (
  cod_empre,
  nom_empre,
  dir_empre,
  tel_empre,
  rnc_empre,
  letra_empre
)
VALUES
  ('GH003', 'GIGANTE HIERRO', 'SAN CRISTABAL', '', '130160767', 'G'),
  ('H0001', 'TODO HIERRO Y FERRETERIA, SRL', 'Km 27 Aust. Las  America Brisa Caucedo Boca Chica', '809-549-2100   ', '1-01-78863-1 ', 'THB'),
  ('H0002', 'CENTRAL HIERRO, SRL', 'Barney Morgan (Central) #172 Ens. Luperon ', '809-384-2000 ', '1-30-29922-6', 'CHT'),
  ('H0004', 'MAX HIERRO, SRL', 'C/Duarte #96 Carretera Yamasa Villa Mella', '809-568-9782', '1-25-00110-5', 'MHV'),
  ('H0005', 'QUINTO HIERRO, SRL', 'General Lucas Mieses #60 Los Alcarrizo', '809-561-5622', '1-30-02211-9', 'QHA'),
  ('H0006', 'CANAL HIERRO, SRL', 'C/Desiderio Arias #2 Barrio Enriquillo, Herrera', '809-372-6311', '1-22-02423-9', 'CHH'),
  ('H0007', 'DON HIERRO, SRL', 'CLUB DE LEONES #312 ALMA ROSA II', '8095912254', '1-22-01869-7', 'D')
ON CONFLICT (cod_empre) DO UPDATE
SET
  nom_empre = EXCLUDED.nom_empre,
  dir_empre = EXCLUDED.dir_empre,
  tel_empre = EXCLUDED.tel_empre,
  rnc_empre = EXCLUDED.rnc_empre,
  letra_empre = EXCLUDED.letra_empre;

INSERT INTO myappdb.sucursales (
  cod_sucursal,
  nom_sucursal,
  zona,
  cod_empre,
  dir_sucursal,
  tel_sucursal
)
VALUES
  (1, 'CENTRAL HIERRO', NULL, 'H0002', 'Barney Morgan #172 Ens. Luperon Sto. Dgo.', '809-384-2000'),
  (2, 'DON HIERRO', NULL, 'H0007', 'CALLE 1RA. SAN ISIDRO', '8965656565'),
  (3, 'LOS MINA', NULL, 'H0007', 'asdfdsf', '3232323'),
  (4, 'SABANA PERDIDA', NULL, 'H0004', 'los mina', 'ewrwrwe'),
  (5, 'HACTO NUEVO', NULL, 'H0005', 'ASDLFÑDLASFÑLDSAÑLÑDS', '523223523'),
  (6, 'VILLA ALTAGRACIA', NULL, 'H0005', 'AKFLKALFKLKDFLKALKDAs', '239402390'),
  (7, 'QUINTO HIERRO', 'ALCARRIZO', 'H0005', 'DSAFDf', '342423'),
  (8, 'TODO HIERRO, SRL', NULL, 'H0001', 'ADFLKAl', 'keqwlker'),
  (9, 'MANO GUAYABO', NULL, 'H0006', 'ADSFADFDAs', '32143'),
  (10, 'CANAL HIERRO', NULL, 'H0006', 'WERQw', '2332'),
  (11, 'MAX HIERRO, SRL', NULL, 'H0004', 'SDFSD', 'SDFSD'),
  (20, ' BOCA CHICa', NULL, 'H0001', 'ANT. LAS AMERICa', '9098761234'),
  (22, 'GIGANTE HIERRO', NULL, 'GH003', 'SAN CRISTABAL', '0000000000')
ON CONFLICT (cod_sucursal) DO UPDATE
SET
  nom_sucursal = EXCLUDED.nom_sucursal,
  zona = EXCLUDED.zona,
  cod_empre = EXCLUDED.cod_empre,
  dir_sucursal = EXCLUDED.dir_sucursal,
  tel_sucursal = EXCLUDED.tel_sucursal;

SELECT setval(
  'myappdb.sucursales_cod_sucursal_seq',
  COALESCE((SELECT MAX(cod_sucursal) FROM myappdb.sucursales), 1),
  true
);

COMMIT;
