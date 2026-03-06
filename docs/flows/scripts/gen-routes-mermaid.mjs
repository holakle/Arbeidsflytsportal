import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'apps', 'web', 'app');
const OUT = path.join(ROOT, 'docs', 'flows', 'routes.generated.md');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function toRoute(file) {
  // finner .../src/app/<route>/page.tsx
  const rel = path.relative(APP_DIR, file).replaceAll('\\', '/');
  if (
    !rel.endsWith('/page.tsx') &&
    !rel.endsWith('/page.jsx') &&
    !rel.endsWith('/page.ts') &&
    !rel.endsWith('/page.js')
  )
    return null;

  const parts = rel.split('/');
  parts.pop(); // page.tsx
  // filtrer ut Next spesialmapper
  const routeParts = parts.filter((p) => !p.startsWith('(') && !p.startsWith('@'));
  const route = '/' + routeParts.join('/');

  return route === '/' ? '/' : route.replaceAll('//', '/');
}

const files = walk(APP_DIR);
const routes = files.map(toRoute).filter(Boolean).sort();

const mermaidLines = [];
mermaidLines.push('# Genererte routes (auto)\n');
mermaidLines.push('```mermaid');
mermaidLines.push('flowchart TD');
mermaidLines.push('  A[Start] --> B[App]');
routes.forEach((r, i) => {
  const id = `R${i}`;
  const safeLabel = r.replaceAll('"', '\\"');
  mermaidLines.push(`  B --> ${id}["${safeLabel}"];`);
});
mermaidLines.push('```');
mermaidLines.push('\n> Denne fila er auto-generert. Ikke rediger manuelt.');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, mermaidLines.join('\n'), 'utf8');
console.log(`Wrote ${OUT} with ${routes.length} routes`);
