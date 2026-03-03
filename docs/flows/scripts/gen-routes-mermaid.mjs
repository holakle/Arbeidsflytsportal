import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'apps', 'web', 'app');
const OUT = path.join(ROOT, 'docs', 'flows', 'routes.generated.md');
const FRONTEND_MD = path.join(ROOT, 'docs', 'flows', 'frontend.md');
const FRONTEND_START = '<!-- AUTO_ROUTES_START -->';
const FRONTEND_END = '<!-- AUTO_ROUTES_END -->';

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

const autoSection = [
  FRONTEND_START,
  '',
  '## Auto-genererte routes',
  '',
  '```mermaid',
  'flowchart TD',
  '  A[Start] --> B[App]',
  ...routes.map((r, i) => {
    const safeLabel = r.replaceAll('"', '\\"');
    return `  B --> R${i}["${safeLabel}"];`;
  }),
  '```',
  '',
  '> Denne seksjonen er auto-generert av `docs/flows/scripts/gen-routes-mermaid.mjs`.',
  FRONTEND_END,
].join('\n');

const currentFrontend = fs.existsSync(FRONTEND_MD) ? fs.readFileSync(FRONTEND_MD, 'utf8') : '';
const startIdx = currentFrontend.indexOf(FRONTEND_START);
const endIdx = currentFrontend.indexOf(FRONTEND_END);

let nextFrontend = currentFrontend;
if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  const before = currentFrontend.slice(0, startIdx).trimEnd();
  const after = currentFrontend.slice(endIdx + FRONTEND_END.length).trimStart();
  nextFrontend = [before, autoSection, after].filter(Boolean).join('\n\n');
} else if (currentFrontend.trim().length > 0) {
  nextFrontend = `${currentFrontend.trimEnd()}\n\n${autoSection}\n`;
} else {
  nextFrontend = `${autoSection}\n`;
}

fs.writeFileSync(FRONTEND_MD, nextFrontend, 'utf8');

console.log(`Wrote ${OUT} and updated ${FRONTEND_MD} with ${routes.length} routes`);
