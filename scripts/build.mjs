import { spawn } from 'node:child_process';
import { mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const CLIENT_DIR = path.join(DIST_DIR, 'client');
const OUTPUT_DIR = path.join(DIST_DIR, 'output');
const OUTPUT_RESOURCE_DIR = path.join(DIST_DIR, 'output_resource');
const OUTPUT_STATIC_DIR = path.join(DIST_DIR, 'output_static');
const OUTPUT_CAPABILITIES_DIR = path.join(DIST_DIR, 'output_capabilities');
const SHARED_STATIC_DIR = path.join(ROOT, 'shared', 'static');
const SHARED_CAPABILITIES_DIR = path.join(ROOT, 'shared', 'capabilities');

process.env.CLIENT_BASE_PATH = process.env.MIAODA_APP_ID ? `/app/${process.env.MIAODA_APP_ID}` : '';
process.env.ASSETS_CDN_PATH = process.env.MIAODA_RESOURCE_CDN_PREFIX || '/';
process.env.STATIC_ASSETS_BASE_URL = process.env.MIAODA_STATIC_CDN_PREFIX || '';
process.env.VITE_APP_NAME = process.env.VITE_APP_NAME || 'Quest-Guide';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function run(command, args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function copyTopLevelFiles(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.html') || entry.name === 'routes.json') {
      await cp(path.join(srcDir, entry.name), path.join(destDir, entry.name), { force: true });
    }
  }
}

async function copyDirIfExists(srcDir, destDir, filter) {
  try {
    await stat(srcDir);
  } catch {
    return;
  }
  await mkdir(destDir, { recursive: true });
  await cp(srcDir, destDir, {
    recursive: true,
    force: true,
    filter,
  });
}

async function main() {
  await rm(DIST_DIR, { recursive: true, force: true });

  await run('npx', ['vite', 'build', '--outDir', CLIENT_DIR, '--emptyOutDir']);

  await copyTopLevelFiles(CLIENT_DIR, OUTPUT_DIR);

  await copyDirIfExists(path.join(CLIENT_DIR, 'assets'), path.join(OUTPUT_RESOURCE_DIR, 'assets'));

  await copyDirIfExists(SHARED_STATIC_DIR, OUTPUT_STATIC_DIR, (src) => {
    const ext = path.extname(src).toLowerCase();
    return !['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  });

  await copyDirIfExists(SHARED_CAPABILITIES_DIR, OUTPUT_CAPABILITIES_DIR);

  await rm(CLIENT_DIR, { recursive: true, force: true });

  console.log('Build complete');
  console.log('  HTML         -> dist/output/');
  try {
    await stat(OUTPUT_RESOURCE_DIR);
    console.log('  Resource     -> dist/output_resource/');
  } catch {}
  try {
    await stat(OUTPUT_STATIC_DIR);
    console.log('  Static       -> dist/output_static/');
  } catch {}
  try {
    await stat(OUTPUT_CAPABILITIES_DIR);
    console.log('  Capabilities -> dist/output_capabilities/');
  } catch {}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
