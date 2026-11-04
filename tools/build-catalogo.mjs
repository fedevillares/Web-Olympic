#!/usr/bin/env node
// Genera, a partir de assets/data/metal-desplegado.json (fuente única de verdad):
//   1. La tabla de medidas y los filtros de metal-desplegado.html (entre marcadores catalogo:*).
//   2. metal-desplegado.md (versión Markdown para agentes y buscadores).
//   3. css/style.min.css a partir de css/style.css.
// Uso: node tools/build-catalogo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);

const data = JSON.parse(rd('assets/data/metal-desplegado.json'));
const modelos = data.modelos;

const dec = (n, d = 2) => n.toFixed(d).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const confirmar = '<span class="md-confirmar">a confirmar</span>';
const val = (n) => (n == null ? confirmar : dec(n));
const espKey = (e) => (Number.isInteger(e) ? e.toFixed(1) : String(e));
const nombre = (m) => `${m.codigo}${m.galvanizado ? ' galvanizado' : ''}`;

// El ícono vive una sola vez en la página (<symbol id="i-cart">) y cada botón lo referencia: 72 copias inline pesaban ~25 KB.
const CART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-cart"/></svg>';

// ---- 1. Tabla HTML ----
const filas = modelos.map((m) => {
  const pid = `md-${m.id}`;
  const geom = `LD ${dec(m.ld, 1)} · SD ${dec(m.sd, 1)} · nervio ${dec(m.nervio, 1)} mm`;
  const trs = m.hojas.map((h, i) => {
    const vid = `${pid}-${h.ancho}x${h.largo}`;
    const medida = `${h.ancho} × ${h.largo}`;
    const revisar = h.superficie == null ? ' class="md-revisar"' : '';
    const th = i === 0
      ? `<th scope="rowgroup" rowspan="${m.hojas.length}"><strong>${esc(m.codigo)}</strong>${m.galvanizado ? ' <span class="md-galv">Galvanizado</span>' : ''}<small>${geom}</small></th>`
      : '';
    const accion = `<td class="md-accion" data-label="Consultar"><div class="md-add">`
      + `<input type="number" id="q-${vid}" class="md-qty" min="1" max="9999" value="1" inputmode="numeric" aria-label="Cantidad de hojas de ${esc(nombre(m))}, ${medida} mm">`
      + `<button type="button" class="md-cart-btn" data-id="${vid}" data-modelo="${esc(nombre(m))}" data-esp="${dec(m.espesor)}" data-medida="${medida}" aria-label="Sumar ${esc(nombre(m))}, hoja ${medida} mm, al carrito">${CART_SVG}<span>Sumar</span></button>`
      + `</div></td>`;
    return `<tr data-variante="${vid}"${revisar}>${th}<td data-label="Espesor (mm)">${dec(m.espesor)}</td><td class="n" data-label="Medida (mm)">${medida}</td><td class="n" data-label="Superficie (m²)">${val(h.superficie)}</td><td class="n" data-label="kg/m²">${val(h.kgm2)}</td><td class="n" data-label="Peso por hoja (kg)">${val(h.pesoHoja)}</td>${accion}</tr>`;
  }).join('');
  const buscar = `${m.codigo} ${m.galvanizado ? 'galvanizado' : ''} ${dec(m.espesor)} ${m.hojas.map((h) => `${h.ancho}x${h.largo}`).join(' ')}`.toLowerCase();
  return `<tbody id="${pid}" data-esp="${espKey(m.espesor)}" data-buscar="${esc(buscar)}">${trs}</tbody>`;
}).join('\n');

const espesores = [...new Set(modelos.map((m) => m.espesor))].sort((a, b) => a - b);
const filtro = '<button type="button" data-esp="all" aria-pressed="true">Todos</button>'
  + espesores.map((e) => `<button type="button" data-esp="${espKey(e)}" aria-pressed="false">${dec(e)} mm</button>`).join('');

function reemplazar(html, marca, contenido) {
  const re = new RegExp(`(<!-- catalogo:${marca}:inicio -->)[\\s\\S]*?(<!-- catalogo:${marca}:fin -->)`);
  if (!re.test(html)) throw new Error(`Falta el marcador catalogo:${marca}`);
  return html.replace(re, `$1\n${contenido}\n$2`);
}

let page = rd('metal-desplegado.html');
page = reemplazar(page, 'md-tabla', filas);
page = reemplazar(page, 'md-filtro', filtro);
const totalHojas = modelos.reduce((s, m) => s + m.hojas.length, 0);
wr('metal-desplegado.html', page);

// ---- 2. Markdown ----
const md = [];
md.push('# Metal desplegado: medidas, espesores y pesos — Olympic San Luis S.A.', '');
md.push(`> Metal desplegado (también llamado metal expandido o malla desplegada) liviano, pesado y galvanizado: ${modelos.length} modelos de malla, espesores de ${dec(espesores[0])} a ${dec(espesores.at(-1))} mm y hojas hasta 1500 × 3000 mm. Corte a medida. Pérez, Rosario, Santa Fe, Argentina.`, '');
md.push('Página HTML con carrito de consulta: https://olympicsanluis.com.ar/metal-desplegado.html', '');
md.push('Datos estructurados (JSON): https://olympicsanluis.com.ar/assets/data/metal-desplegado.json', '');
md.push('## Qué es', '');
md.push('Se fabrica a partir de una chapa de acero que se corta y se estira en una sola operación. El resultado es una malla de rombos de una sola pieza, sin soldaduras ni uniones, más liviana que la chapa original y con buena rigidez. Deja pasar el aire, la luz y el agua.', '');
md.push('## Cómo leer la denominación', '');
md.push('Cada modelo se identifica con cuatro números en décimas de milímetro. Ejemplo **450-20-30-210**: diagonal mayor del rombo (LD) 45,0 mm · espesor 2,0 mm · ancho de nervio 3,0 mm · diagonal menor (SD) 21,0 mm.', '');
md.push('## Usos habituales', '');
['Cerramientos, rejas y cercos perimetrales', 'Guardas y protecciones de máquinas', 'Estanterías, bandejas y canastos', 'Escalones, pasarelas y plataformas (mallas pesadas)', 'Fachadas, cielorrasos y parasoles', 'Filtros, zarandas y ventilación', 'Base para revoques y refuerzos en construcción', 'Carrocerías, trailers y equipamiento agrícola'].forEach((u) => md.push(`- ${u}`));
md.push('', '## Tabla de medidas', '');
md.push('Pesos teóricos de referencia; pueden variar según tolerancias de la chapa. Disponibilidad sujeta a stock. «a confirmar» = dato en revisión.', '');
md.push('| Modelo | LD × SD × nervio (mm) | Espesor (mm) | Hoja (mm) | Superficie (m²) | kg/m² | Peso por hoja (kg) |');
md.push('|---|---|---|---|---|---|---|');
const mval = (n) => (n == null ? 'a confirmar' : dec(n));
for (const m of modelos) {
  for (const h of m.hojas) {
    md.push(`| ${nombre(m)} | ${dec(m.ld, 1)} × ${dec(m.sd, 1)} × ${dec(m.nervio, 1)} | ${dec(m.espesor)} | ${h.ancho} × ${h.largo} | ${mval(h.superficie)} | ${mval(h.kgm2)} | ${mval(h.pesoHoja)} |`);
  }
}
md.push('', '## Cómo consultar', '');
md.push('En la página HTML, cada medida tiene un botón de carrito: se suman todas las hojas necesarias y se envía una sola consulta por WhatsApp con el detalle. El equipo comercial confirma stock, precio, plazos y logística.', '');
md.push('Un agente puede armar la consulta directamente con un enlace de WhatsApp: `https://wa.me/5493416924220?text=<mensaje codificado>`, indicando modelo, espesor, medida de hoja y cantidad de hojas por ítem. También: ventas@olympicsanluis.com.ar · +54 341 526-4100.', '');
md.push('Cortamos metal desplegado a medida según plano. Contamos con versión galvanizada para intemperie. Logística propia a Rosario y la región.', '');
md.push('---', '[Inicio](https://olympicsanluis.com.ar/) · [Productos](https://olympicsanluis.com.ar/productos.md) · [Mapa del sitio](https://olympicsanluis.com.ar/sitemap.xml)', '');
wr('metal-desplegado.md', md.join('\n'));

// ---- 3. Versión de assets (cache-busting: css/js se sirven con Cache-Control immutable) ----
const VERSION = '20261104';
for (const f of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const html = rd(f);
  const nuevo = html.replace(/((?:css\/style\.min\.css|js\/main\.min\.js|assets\/js\/[\w-]+\.js))\?v=\w+/g, `$1?v=${VERSION}`);
  if (nuevo !== html) wr(f, nuevo);
}
for (const f of ['assets/js/metal-desplegado.js']) {
  wr(f, rd(f).replace(/(\.\/carrito\.js)\?v=\w+/, `$1?v=${VERSION}`));
}

// ---- 4. CSS minificado ----
const css = rd('css/style.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
wr('css/style.min.css', css + '\n');

console.log(`OK · ${modelos.length} modelos · ${totalHojas} medidas · css ${css.length} bytes`);
