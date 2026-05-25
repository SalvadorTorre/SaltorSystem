const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const SOURCE_IMAGE = process.env.ICON_SOURCE || path.join('src', 'assets', 'logo2.png');
const OUTPUT_DIR = path.join(process.cwd(), 'build');
const OUTPUT_PNG = path.join(OUTPUT_DIR, 'icon.png');
const OUTPUT_ICO = path.join(OUTPUT_DIR, 'icon.ico');
const MASTER_SIZE = 1024;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const SAFE_AREA = Math.round(MASTER_SIZE * 0.82);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildMasterPng(sourcePath) {
  const source = sharp(sourcePath, { failOn: 'error' });
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudo leer el tamano de ${sourcePath}`);
  }

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await source
          .resize(SAFE_AREA, SAFE_AREA, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer();
}

async function buildIco(masterBuffer) {
  const { default: pngToIco } = await import('png-to-ico');

  const pngBuffers = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(masterBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    )
  );

  return pngToIco(pngBuffers);
}

async function main() {
  const sourcePath = path.resolve(process.cwd(), SOURCE_IMAGE);

  if (!(await fileExists(sourcePath))) {
    throw new Error(
      `No existe la imagen fuente: ${sourcePath}\n` +
        'Define ICON_SOURCE o coloca tu logo principal en src/assets/logo2.png'
    );
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const masterBuffer = await buildMasterPng(sourcePath);
  await fs.writeFile(OUTPUT_PNG, masterBuffer);

  const icoBuffer = await buildIco(masterBuffer);
  await fs.writeFile(OUTPUT_ICO, icoBuffer);

  const metadata = await sharp(masterBuffer).metadata();

  console.log(`Icono PNG generado: ${OUTPUT_PNG} (${metadata.width}x${metadata.height})`);
  console.log(`Icono ICO generado: ${OUTPUT_ICO} (capas: ${ICO_SIZES.join(', ')})`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
