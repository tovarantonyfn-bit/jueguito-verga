// Arma las versiones descargables del juego en dist/:
//   dist/QueNoMeFumen.html             un solo archivo, se juega sin internet (doble clic)
//   dist/QueNoMeFumen-web.zip          los archivos del juego (para itch.io u hosting)
//   dist/QueNoMeFumen-Windows.zip      app de Windows (.exe) hecha con Electron
//
// Uso: npm run build            (todo)
//      npm run build:web        (solo el HTML y el zip web)
//      npm run build:windows    (solo Windows)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ELECTRON_VERSION = '44.7.2';
const GAME_FILES = ['index.html', 'style.css', 'js', 'fonts'];
const what = process.argv[2] || 'all';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function zip(dir, out) {
  fs.rmSync(out, { force: true });
  execFileSync('zip', ['-qr', '-X', out, '.'], { cwd: dir });
}

function copyGame(to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of GAME_FILES) fs.cpSync(path.join(ROOT, f), path.join(to, f), { recursive: true });
}

// Un solo HTML con el CSS, las fuentes y el JS adentro.
function buildSingleFile() {
  let css = read('style.css').replace(/url\('fonts\/([^']+)'\)/g, (_, f) => {
    const b64 = fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
    return `url(data:font/woff2;base64,${b64})`;
  });
  let html = read('index.html');
  html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
  html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) =>
    `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);
  const out = path.join(DIST, 'QueNoMeFumen.html');
  fs.writeFileSync(out, html);
  console.log('✔', path.relative(ROOT, out));
}

function buildWebZip() {
  const tmp = path.join(DIST, 'web');
  fs.rmSync(tmp, { recursive: true, force: true });
  copyGame(tmp);
  zip(tmp, path.join(DIST, 'QueNoMeFumen-web.zip'));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('✔ dist/QueNoMeFumen-web.zip');
}

function buildWindows() {
  const app = path.join(DIST, 'app');
  fs.rmSync(app, { recursive: true, force: true });
  copyGame(path.join(app, 'game'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'main.js'), path.join(app, 'main.js'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'icon.png'), path.join(app, 'icon.png'));
  const pkg = JSON.parse(read('package.json'));
  fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({
    name: pkg.name, productName: 'Que No Me Fumen', version: pkg.version,
    description: pkg.description, main: 'main.js',
  }, null, 2));

  const outName = 'Que No Me Fumen-win32-x64';
  fs.rmSync(path.join(DIST, outName), { recursive: true, force: true });
  execFileSync('npx', [
    '--no-install', 'electron-packager', app, 'Que No Me Fumen',
    '--platform=win32', '--arch=x64', `--electron-version=${ELECTRON_VERSION}`,
    `--out=${DIST}`, '--overwrite', '--asar',
  ], { cwd: ROOT, stdio: 'inherit' });
  fs.writeFileSync(path.join(DIST, outName, 'LEEME.txt'),
    'QUE NO ME FUMEN\r\n\r\nPara jugar: abre "Que No Me Fumen.exe".\r\n' +
    'F11 = pantalla completa.\r\n\r\n' +
    'Si Windows dice "Windows protegió su PC", dale a "Más información" y luego "Ejecutar de todas formas".\r\n' +
    'Sale porque el juego no está firmado, no porque tenga virus.\r\n');
  zip(path.join(DIST, outName), path.join(DIST, 'QueNoMeFumen-Windows.zip'));
  fs.rmSync(app, { recursive: true, force: true });
  console.log('✔ dist/QueNoMeFumen-Windows.zip');
}

fs.mkdirSync(DIST, { recursive: true });
if (what === 'all' || what === 'web') { buildSingleFile(); buildWebZip(); }
if (what === 'all' || what === 'windows') buildWindows();
