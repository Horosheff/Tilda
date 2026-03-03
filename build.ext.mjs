import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const outdir = 'dist-ext';

if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

const isWatch = process.argv.includes('--watch');
const common = {
  bundle: true,
  target: ['chrome120'],
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
};

async function build() {
  await esbuild.build({
    ...common,
    entryPoints: ['src/extension/content/content.ts'],
    outfile: `${outdir}/content.js`,
    format: 'iife',
  });

  await esbuild.build({
    ...common,
    entryPoints: ['src/extension/background/background.ts'],
    outfile: `${outdir}/background.js`,
    format: 'iife',
  });

  copyFileSync('src/extension/popup/popup.js', `${outdir}/popup.js`);

  copyFileSync('manifest.json', `${outdir}/manifest.json`);
  copyFileSync('src/extension/popup/popup.html', `${outdir}/popup.html`);

  console.log('Extension built to', outdir);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
