// Arma las versiones descargables del juego en dist/:
//   dist/QueNoMeFumen.html             un solo archivo, se juega sin internet (doble clic)
//   dist/QueNoMeFumen-web.zip          los archivos del juego (para itch.io u hosting)
//   dist/QueNoMeFumen-Windows.zip      app de Windows (.exe) hecha con Electron
//   dist/QueNoMeFumen.apk              app de Android con el juego adentro (sin internet)
//
// Uso: npm run build            (todo)
//      npm run build:web        (solo el HTML y el zip web)
//      npm run build:windows    (solo Windows)
//      npm run build:android    (solo Android; necesita Java)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ELECTRON_VERSION = '44.7.2';
const GAME_FILES = ['index.html', 'style.css', 'js', 'fonts', 'icons', 'manifest.webmanifest', 'sw.js'];
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

// El CSS con las fuentes metidas adentro (data URI), para cuando no se pueden cargar como archivo.
const cssWithFonts = () => read('style.css').replace(/url\('fonts\/([^']+)'\)/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});

// Un solo HTML con el CSS, las fuentes y el JS adentro.
function buildSingleFile() {
  const css = cssWithFonts();
  let html = read('index.html');
  // un archivo suelto no puede instalarse como app: quitamos el manifiesto y los iconos externos
  html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/g, '');
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
    `--out=${DIST}`, '--overwrite', '--asar', `--icon=${path.join(ROOT, 'desktop', 'icon.ico')}`,
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

// Android: Apktool arma el APK desde android/ (manifiesto, iconos y la pantalla en smali)
// y uber-apk-signer lo alinea y firma con su llave de depuración.
const ANDROID_TOOLS = {
  'apktool.jar': 'https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar',
  'uber-apk-signer.jar': 'https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar',
};

function androidTool(name) {
  const dir = path.join(ROOT, '.cache', 'android-tools');
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Descargando ${name}...`);
    execFileSync('curl', ['-fsSL', '-o', file, ANDROID_TOOLS[name]], { stdio: 'inherit' });
  }
  return file;
}

function buildAndroid() {
  const work = path.join(DIST, 'android-build');
  const src = path.join(work, 'src');
  fs.rmSync(work, { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'android'), src, { recursive: true });
  copyGame(path.join(src, 'assets', 'game'));
  // dentro del APK no hay service worker ni instalación web
  for (const f of ['sw.js', 'manifest.webmanifest']) fs.rmSync(path.join(src, 'assets', 'game', f), { force: true });
  // el WebView puede bloquear fuentes cargadas desde file://, así que van dentro del CSS
  fs.writeFileSync(path.join(src, 'assets', 'game', 'style.css'), cssWithFonts());

  const pkg = JSON.parse(read('package.json'));
  const yml = path.join(src, 'apktool.yml');
  const [maj, min, pat] = pkg.version.split('.').map(Number);
  fs.writeFileSync(yml, fs.readFileSync(yml, 'utf8')
    .replace(/versionCode: .*/, `versionCode: ${maj * 10000 + min * 100 + pat}`)
    .replace(/versionName: .*/, `versionName: ${pkg.version}`));

  const unsigned = path.join(work, 'QueNoMeFumen-unsigned.apk');
  execFileSync('java', ['-jar', androidTool('apktool.jar'), 'b', src, '-o', unsigned], { stdio: 'inherit' });
  execFileSync('java', ['-jar', androidTool('uber-apk-signer.jar'), '-a', unsigned, '-o', path.join(work, 'signed')], { stdio: 'inherit' });
  const signed = fs.readdirSync(path.join(work, 'signed')).find(f => f.endsWith('.apk'));
  fs.copyFileSync(path.join(work, 'signed', signed), path.join(DIST, 'QueNoMeFumen.apk'));
  fs.rmSync(work, { recursive: true, force: true });
  console.log('✔ dist/QueNoMeFumen.apk');
}

fs.mkdirSync(DIST, { recursive: true });
if (what === 'all' || what === 'web') { buildSingleFile(); buildWebZip(); }
if (what === 'all' || what === 'windows') buildWindows();
if (what === 'all' || what === 'android') buildAndroid();
