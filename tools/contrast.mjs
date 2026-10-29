#!/usr/bin/env node
/**
 * tools/contrast.mjs
 *
 *   node tools/contrast.mjs      # or: pnpm tools:contrast
 *   node tools/contrast.mjs --tokens apps/web/src/styles/tokens.css   # or: pnpm contrast
 *
 * Computes WCAG contrast ratios directly from the Concept 04b tokens as they
 * ship in styles.css - no browser, no dependencies. Reads the LAST definition
 * of each token so it reflects the real cascade (the 04b block overrides a
 * large shared layer above it).
 *
 * Exits non-zero if a TEXT pair falls below 4.5:1. The hairline rules are
 * reported but never fail the run: they are decorative dividers and hover
 * cues, not the sole means of identifying a control, so WCAG 1.4.11 does not
 * apply - see docs/planning/ux/DESIGN.md.
 *
 * This caught --ink-faint shipping at 4.05:1 while the docs claimed AA.
 *
 * With --tokens it reads that stylesheet instead and fails closed (T-010):
 * an unreadable file, a missing light or dark block, or any pair skipped for
 * a missing token exits non-zero, so a wrong path cannot print OK.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// STORY-NFR-AA-HOVER-001: static base-state contrast guard (complementary to
// tools/hover-probe.mjs which exercises the live :hover state in a browser).
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const flagAt = process.argv.indexOf('--tokens');
const tokensPath = flagAt === -1 ? null : process.argv[flagAt + 1];
if (flagAt !== -1 && !tokensPath) { console.error('FAIL: --tokens needs a stylesheet path.'); process.exit(1); }
let css;
try {
  css = tokensPath === null
    ? readFileSync(join(REPO, 'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css'), 'utf8')
    : readFileSync(resolve(tokensPath), 'utf8');
} catch (err) {
  if (tokensPath === null) throw err;
  console.error(`FAIL: cannot read --tokens ${tokensPath}: ${err.message}`);
  process.exit(1);
}

// take the LAST definition of each token inside a given block range (cascade)
function blockAt(startIdx){ const s=css.indexOf('{',startIdx); let d=0,i=s;
  for(;i<css.length;i++){ if(css[i]==='{')d++; else if(css[i]==='}'){d--; if(!d)break;} }
  return css.slice(s+1,i); }
function tokens(block){ const m={}; for(const r of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) m[r[1]]=r[2].trim(); return m; }

// 04b light block = second bare ":root {"; dark = ':root[data-theme="dark"]' (last one)
const bare=[...css.matchAll(/^:root \{/gm)].map(m=>m.index);
// Merge every bare :root in document order - the 04b identity block and the
// semantic-hook block are separate rules, and the cascade merges them.
const light = bare.reduce((acc,i)=>({...acc,...tokens(blockAt(i))}),{});
const darkIdxs=[...css.matchAll(/^:root\[data-theme="dark"\] \{/gm)].map(m=>m.index);
if (tokensPath !== null && (!bare.length || !darkIdxs.length)) {
  console.error(`FAIL: ${tokensPath} has no ${bare.length ? 'dark ":root[data-theme=\"dark\"] {"' : 'bare ":root {"'} block.`);
  process.exit(1);
}
const dark = { ...light, ...tokens(blockAt(darkIdxs[darkIdxs.length-1])) };

function parseHsl(v, map, seen=0){
  // A missing token is a skip in --tokens mode; without the flag it still throws, as before.
  if(v===undefined && tokensPath!==null) return null;
  v=v.trim();
  const varm=v.match(/^var\((--[\w-]+)\)$/); if(varm && seen<5) return parseHsl(map[varm[1]],map,seen+1);
  const m=v.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+))?\s*\)/);
  if(!m) return null;
  const [h,s,l]=[+m[1],+m[2]/100,+m[3]/100]; const a=m[4]===undefined?1:+m[4];
  const k=n=>(n+h/30)%12, A=s*Math.min(l,1-l);
  const f=n=>l-A*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  return {r:f(0),g:f(8),b:f(4),a};
}
const lin=c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
const L=c=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
const over=(fg,bg)=>fg.a>=1?fg:{r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1};
const ratio=(f,b)=>{const F=L(over(f,b)),B=L(b);const[a,c]=F>B?[F,B]:[B,F];return (a+0.05)/(c+0.05);};

const PAIRS=[
 ['--ink','--bg','body text',4.5],['--ink-soft','--bg','secondary text',4.5],
 ['--ink-faint','--bg','faint meta text',4.5],['--accent','--bg','links / accent text',4.5],
 ['--accent-ink','--accent','button label on accent',4.5],['--ink','--glass','text on panel',4.5],
 ['--ink-soft','--glass-2','muted text on inset',4.5],
 ['--positive','--bg','positive label',4.5],['--mixed','--bg','mixed label',4.5],['--negative','--bg','negative label',4.5],
 ['--warn-ink','--warn-bg','warning callout',4.5],['--danger-ink','--danger-bg','danger callout',4.5],
 // hierarchy - the thing 'everything looks the same' was measuring. hard=true -> fails the run
 ['--glass','--bg','surface step: panel vs page',1.10],['--glass','--glass-2','surface step: panel vs inset',1.18],
 ['--rule','--glass','divider on a panel (visible band 1.5-2.1)',1.5],['--rule-hard','--glass','hover edge on a panel',2.0],
 ['--rule-strong','--glass','1.4.11 boundary on a panel',3,true],['--input-border','--glass','1.4.11 input border',3,true],
 ['--accent','--bg','focus ring vs page',3,true],
 // role / region hooks - what a colour scheme is allowed to change
 ['--eyebrow','--bg','eyebrow on page',4.5],['--eyebrow','--glass','eyebrow on panel',4.5],
 ['--byline-accent','--glass','author name on panel',4.5],['--byline-accent','--bg','author name on page',4.5],
 ['--ink','--aside-bg','text on aside',4.5],['--ink-faint','--aside-bg','faint text on aside',4.5],
 ['--ink','--masthead-bg','text on masthead',4.5],['--ink-soft','--masthead-bg','soft text on masthead',4.5],
 ['--ink','--callout-bg','text on callout',4.5],['--warn-ink','--callout-bg','warn text on callout',4.5],
 ['--rule','--aside-bg','divider on aside',1.5],
];
let failures = 0;
const skipped = [];
// every light-mode scheme is evaluated as its overrides merged over the light base
const schemeBlocks=[...css.matchAll(/^:root\[data-scheme="([a-z]+)"\]\s*\{/gm)];
const variants=[['LIGHT',light],['DARK',dark]];
for(const m of schemeBlocks){ const t=tokens(blockAt(m.index)); if(Object.keys(t).length) variants.push(['LIGHT scheme '+m[1].toUpperCase(),{...light,...t}]); }
for(const [name,map] of variants){
  console.log('\n=== '+name+' ===');
  let fails=0;
  for(const [f,b,label,min,hard] of PAIRS){
    const F=parseHsl(map[f],map),B=parseHsl(map[b],map);
    if(!F||!B){ console.log(`  SKIP ${label} (${f}/${b})`); skipped.push(`${name}: ${label} - missing ${[!F&&f,!B&&b].filter(Boolean).join(', ')}`); continue; }
    const r=ratio(F,B); const ok=r>=min; if(!ok){fails++; if(min>=4.5||hard) failures++;}
    console.log(`  ${ok?'PASS':'FAIL'} ${r.toFixed(2)}:1 (need ${min}) ${label}  [${f} on ${b}]`);
  }
  console.log('  -> '+(fails?fails+' below threshold':'all pass'));
}

if (tokensPath !== null && skipped.length) {
  console.log('');
  console.log('FAIL: ' + skipped.length + ' pair(s) skipped, so ' + tokensPath + ' was not checked in full:');
  for (const line of skipped) console.log('  ' + line);
  process.exit(1);
}
if (failures) {
  console.log('');
  console.log('FAIL: ' + failures + ' pair(s) below threshold (text AA, or a 1.4.11 boundary).');
  process.exit(1);
}
console.log('');
console.log('OK - every text pair clears AA and every 1.4.11 boundary clears 3:1, both modes.');
