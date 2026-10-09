import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage();
async function shot(svgFile, size, out) {
  const svg = readFileSync(join(here, svgFile), 'utf8');
  await p.setViewport({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: out, omitBackground: true });
}
mkdirSync(join(ROOT, 'public', 'icons'), { recursive: true });
await shot('icon.svg', 512, join(ROOT, 'public/icons/icon-512.png'));
await shot('icon.svg', 192, join(ROOT, 'public/icons/icon-192.png'));
await shot('icon-maskable.svg', 512, join(ROOT, 'public/icons/icon-maskable-512.png'));
await shot('icon-maskable.svg', 192, join(ROOT, 'public/icons/icon-maskable-192.png'));
await shot('icon.svg', 512, join(ROOT, 'src/assets/gradus-icon.png'));
writeFileSync(join(ROOT, 'public/icons/icon.svg'), readFileSync(join(here, 'icon.svg')));
await p.setViewport({ width: 1600, height: 500 });
await p.goto(pathToFileURL(join(here, 'logo.html')).href);
await p.screenshot({ path: join(ROOT, 'src/assets/gradus-logo.png'), omitBackground: true });
await b.close();
console.log('ok');
