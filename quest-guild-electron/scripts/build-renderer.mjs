import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    if (entry.name === 'quest-guild.db') continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

const viteResult = spawnSync(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'build',
    '--outDir',
    'quest-guild-electron/renderer/app',
    '--emptyOutDir',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

if (viteResult.status !== 0) {
  process.exit(viteResult.status || 1);
}

const htmlFile = path.join(repoRoot, 'quest-guild-electron/renderer/app/index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const closeScript = LT + '/script' + GT;
const dropKeywords = [
  'KSlardarWeb',
  'slardarScript',
  'teaScript',
  'collectEvent',
  'apaas_miaoda',
  'miaoda-sdk',
  'bytescm',
  'feishucdn',
  'bytedapm',
  'performance.iife.js',
  'window.appId',
];

let out = '';
let i = 0;
while (true) {
  const start = html.indexOf(LT + 'script', i);
  if (start === -1) {
    out += html.slice(i);
    break;
  }
  const openEnd = html.indexOf(GT, start);
  if (openEnd === -1) {
    out += html.slice(i);
    break;
  }
  const end = html.indexOf(closeScript, openEnd + 1);
  if (end === -1) {
    out += html.slice(i);
    break;
  }
  const block = html.slice(start, end + closeScript.length);
  const shouldDrop =
    block.includes('http://') ||
    block.includes('https://') ||
    dropKeywords.some((k) => block.includes(k));
  out += html.slice(i, start);
  if (!shouldDrop) out += block;
  i = end + closeScript.length;
}

html = out;
out = '';
i = 0;
while (true) {
  const start = html.indexOf(LT + 'link', i);
  if (start === -1) {
    out += html.slice(i);
    break;
  }
  const end = html.indexOf(GT, start);
  if (end === -1) {
    out += html.slice(i);
    break;
  }
  const tag = html.slice(start, end + 1);
  const shouldDrop = tag.includes('http://') || tag.includes('https://');
  out += html.slice(i, start);
  if (!shouldDrop) out += tag;
  i = end + 1;
}

html = out;
const appName = '\u60ac\u8d4f\u4efb\u52a1\u516c\u4f1a';
const appDesc = appName + ' - RPG\u6e38\u620f\u98ce\u683c\u7684\u76ee\u6807\u7ba1\u7406\u5de5\u5177';
html = html
  .replace(/\{\{\{appAvatar\}\}\}/g, './favicon.svg')
  .replace(/\{\{appAvatar\}\}/g, './favicon.svg')
  .replace(/\{\{appName\}\}/g, appName)
  .replace(/\{\{appDescription\}\}/g, appDesc);
html = html.replace(/\{\{[^}]+\}\}/g, '');
fs.writeFileSync(htmlFile, html);

const serverSrc = path.join(repoRoot, 'server');
const serverDest = path.join(repoRoot, 'quest-guild-electron', 'server');
fs.rmSync(serverDest, { recursive: true, force: true });
copyDir(serverSrc, serverDest);
