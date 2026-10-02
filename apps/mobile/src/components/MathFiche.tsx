// MathFiche — un niveau du Moteur D « RPVD Visuel v2 » rendu dans UNE WebView : Identification (CONNU /
// CHERCHE), schéma ASCII, démarche ligne par ligne, réponse, principe. KaTeX est embarqué (hors ligne,
// sortie MathML : ni polices ni CSS à charger). Les textes sont posés via textContent et KaTeX tourne
// avec trust:false → rien d'exécutable ne peut venir de la sortie du modèle.
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import type { VisualLevel } from '../lib/types'
import { KATEX_JS } from '../lib/katexSource'
import { colors } from '../theme'

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:transparent;color:${colors.text};font:16px/1.45 -apple-system,Roboto,sans-serif;-webkit-text-size-adjust:100%}
body{padding:2px 0 6px}
.row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;margin-bottom:6px;font-family:Courier,monospace;font-size:13px}
.lbl{font-weight:700;letter-spacing:.04em}
.chip{border:1px solid rgba(203,213,225,.18);background:rgba(15,23,42,.6);border-radius:8px;padding:2px 8px;font-size:15px;font-family:-apple-system,Roboto,sans-serif}
.chip.e{border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.12);color:#6ee7b7}
pre{margin:10px 0;padding:10px;border-radius:12px;border:1px solid rgba(203,213,225,.14);background:rgba(2,6,23,.7);color:#fde68a;font:12px/1.3 Courier,monospace;overflow-x:auto;white-space:pre}
.line{background:rgba(23,23,26,.9);border-radius:12px;padding:10px 12px;margin:8px 0}
.expr{font-size:19px;overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
.expl{color:${colors.textMuted};font-size:14px;margin-top:2px}
.ans-l{color:${colors.textMuted};font-size:14px;margin-top:14px}
.ans{display:inline-block;max-width:100%;margin-top:4px;border:2px solid rgba(52,211,153,.6);background:rgba(52,211,153,.12);color:#a7f3d0;border-radius:16px;padding:6px 14px;font-size:19px;font-weight:700;overflow-x:auto}
.pri{margin-top:14px;border:1px solid rgba(52,211,153,.22);background:rgba(52,211,153,.06);color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:15px;line-height:1.5}
math{font-size:1.08em}
`

// Corps de la page : DATA est injecté en JSON ; le script construit le DOM (textContent uniquement).
const PAGE_JS = `
(function(){
  var D = window.__DATA__;
  function auto(s, always){ s = String(s||'').trim(); if(!s || s.indexOf('$')>=0) return s; return (always || /[\\\\=^_]/.test(s)) ? '$'+s+'$' : s; }
  function tex(t, d){ try { return katex.renderToString(t, {displayMode:d, throwOnError:false, strict:'ignore', trust:false, output:'mathml'}); } catch(e){ return null; } }
  function fill(el, text, always){
    var parts = auto(text, always).split(/(\\$\\$[^$]+\\$\\$|\\$[^$]+\\$)/g);
    parts.forEach(function(p){
      var html = null;
      if (p.indexOf('$$')===0 && p.length>4) html = tex(p.slice(2,-2), true);
      else if (p.charAt(0)==='$' && p.length>2) html = tex(p.slice(1,-1), false);
      if (html) { var s = document.createElement('span'); s.innerHTML = html; el.appendChild(s); }
      else el.appendChild(document.createTextNode(p));
    });
  }
  function splitOut(t){ var out=[],cur='',m=false; String(t||'').split('').forEach(function(c){ if(c==='$') m=!m; if(c===',' && !m){ if(cur.trim()) out.push(cur.trim()); cur=''; } else cur+=c; }); if(cur.trim()) out.push(cur.trim()); return out; }
  function el(tag, cls, parent){ var e=document.createElement(tag); if(cls) e.className=cls; if(parent) parent.appendChild(e); return e; }
  var root = document.getElementById('root'), L = D.level;
  var connu = splitOut(L.connu);
  if (connu.length) { var r1 = el('div','row',root); var l1 = el('span','lbl',r1); l1.style.color='${colors.amber}'; l1.textContent=D.labels.connu+' :'; connu.forEach(function(c){ fill(el('span','chip',r1), c); }); }
  if (L.cherche) { var r2 = el('div','row',root); var l2 = el('span','lbl',r2); l2.style.color='${colors.emerald}'; l2.textContent=D.labels.cherche+' :'; fill(el('span','chip e',r2), L.cherche); }
  if (L.schema_ascii) { el('pre','',root).textContent = L.schema_ascii; }
  (L.demarche||[]).forEach(function(line){
    var box = el('div','line',root);
    fill(el('div','expr',box), line.expression, true);
    if (line.explication) { var ex = el('div','expl',box); ex.appendChild(document.createTextNode('(')); fill(ex, line.explication); ex.appendChild(document.createTextNode(')')); }
  });
  if (L.reponse) { el('div','ans-l',root).textContent = D.labels.answer; fill(el('div','ans',root), L.reponse); }
  if (L.principe) { fill(el('div','pri',root), L.principe); }
  function report(){ window.ReactNativeWebView.postMessage(String(Math.ceil(document.body.getBoundingClientRect().height))); }
  report(); setTimeout(report, 120);
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
})();
`

function buildHtml(level: VisualLevel, labels: { connu: string; cherche: string; answer: string }): string {
  // « < » échappé : impossible de refermer la balise <script> depuis les données.
  const data = JSON.stringify({ level, labels }).replace(/</g, '\\u003c')
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">' +
    `<style>${CSS}</style></head><body><div id="root"></div>` +
    `<script>${KATEX_JS}</script>` +
    `<script>window.__DATA__=${data}</script>` +
    `<script>${PAGE_JS}</script></body></html>`
  )
}

type Props = { level: VisualLevel; labels: { connu: string; cherche: string; answer: string } }

export function MathFiche({ level, labels }: Props) {
  const [height, setHeight] = useState(160)
  const html = useMemo(() => buildHtml(level, labels), [level, labels])

  function onMessage(e: WebViewMessageEvent) {
    const h = Number(e.nativeEvent.data)
    if (Number.isFinite(h) && h > 0) setHeight(Math.min(h + 4, 4000))
  }

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={['about:*']}
        source={{ html }}
        style={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(req) => req.url === 'about:blank' || req.url.startsWith('data:') || req.url.startsWith('about:')}
        accessibilityLabel={labels.answer}
      />
    </View>
  )
}
