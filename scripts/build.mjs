// Static build for the prototype: bundles src/ into dist/ (plain HTML + JS + CSS).
//   node scripts/build.mjs            → production build into dist/
//   node scripts/build.mjs --serve    → dev server with rebuild on change (http://localhost:5173)
//   node scripts/build.mjs --preview  → build, then serve dist/ as a static site
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const serve = process.argv.includes('--serve');
const preview = process.argv.includes('--preview');
const PORT = Number(process.env.PORT || 5173);

const options = {
  entryPoints: ['src/app.jsx'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
  logLevel: 'info',
};

function html(js, css) {
  return readFileSync('src/index.html', 'utf8').replace('%CSS%', css).replace('%JS%', js);
}
function copyPublic() { for (const f of readdirSync('public')) copyFileSync(`public/${f}`, `dist/${f}`); }

if (serve) {
  rmSync('dist', { recursive: true, force: true }); mkdirSync('dist/assets', { recursive: true });
  copyPublic(); copyFileSync('src/styles.css', 'dist/assets/app.css');
  writeFileSync('dist/index.html', html('assets/app.js', 'assets/app.css'));
  const ctx = await esbuild.context({ ...options, outfile: 'dist/assets/app.js', sourcemap: true,
    plugins: [{ name: 'css', setup(b) { b.onEnd(() => copyFileSync('src/styles.css', 'dist/assets/app.css')); } }] });
  await ctx.watch();
  await ctx.serve({ servedir: 'dist', port: PORT });
  console.log(`\n  Prototype running at http://localhost:${PORT}\n`);
} else {
  rmSync('dist', { recursive: true, force: true }); mkdirSync('dist/assets', { recursive: true });
  const r = await esbuild.build({ ...options, minify: true, write: false, outfile: 'dist/assets/app.js' });
  const js = r.outputFiles[0].contents;
  const css = readFileSync('src/styles.css');
  const h = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);
  const jsName = `assets/app.${h(js)}.js`, cssName = `assets/app.${h(css)}.css`;
  writeFileSync(`dist/${jsName}`, js); writeFileSync(`dist/${cssName}`, css);
  writeFileSync('dist/index.html', html(jsName, cssName));
  writeFileSync('dist/404.html', html(jsName, cssName));
  writeFileSync('dist/.nojekyll', '');
  copyPublic();
  console.log(`Built dist/ · ${jsName} ${(js.length / 1024).toFixed(0)} KB · ${cssName} ${(css.length / 1024).toFixed(0)} KB`);
  if (preview) {
    const ctx = await esbuild.context({ entryPoints: [], write: false });
    await ctx.serve({ servedir: 'dist', port: PORT });
    console.log(`\n  Static preview at http://localhost:${PORT}\n`);
  }
}
