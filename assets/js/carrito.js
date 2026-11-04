// Carrito de consulta: acumula productos y los envía juntos en un único mensaje de WhatsApp.
// No hay pago: el destino es la consulta comercial (wa.me). Se guarda en localStorage
// para sobrevivir entre páginas y pestañas; si el navegador no lo permite, funciona en memoria.
const WA_NUMERO = '5493416924220';
const CLAVE = 'osl-carrito-v1';
const CLAVE_DATOS = 'osl-carrito-datos-v1';
const MAX_CANT = 9999;

let items = leer(CLAVE, []);
const listeners = new Set();

function leer(clave, porDefecto) {
  try {
    const v = JSON.parse(localStorage.getItem(clave));
    return v ?? porDefecto;
  } catch { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* modo privado o storage bloqueado */ }
}
const limpiarCant = (n) => Math.min(MAX_CANT, Math.max(1, Math.round(Number(n)) || 1));

function emitir() {
  guardar(CLAVE, items);
  listeners.forEach((fn) => fn(items));
}

export const carrito = {
  get items() { return items; },
  get total() { return items.reduce((s, i) => s + i.cantidad, 0); },
  onChange(fn) { listeners.add(fn); fn(items); return () => listeners.delete(fn); },
  /** item: { id, titulo, detalle, cantidad, unidad } — si el id ya existe, suma la cantidad. */
  agregar(item) {
    const cant = limpiarCant(item.cantidad);
    const ex = items.find((i) => i.id === item.id);
    if (ex) ex.cantidad = limpiarCant(ex.cantidad + cant);
    else items.push({ id: item.id, titulo: item.titulo, detalle: item.detalle || '', unidad: item.unidad || 'hojas', cantidad: cant });
    emitir();
  },
  cambiar(id, cantidad) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    it.cantidad = limpiarCant(cantidad);
    emitir();
  },
  quitar(id) { items = items.filter((i) => i.id !== id); emitir(); },
  vaciar() { items = []; emitir(); },
  abrir() { ui().abrir(); },
};

// Sincroniza entre pestañas abiertas del sitio.
window.addEventListener('storage', (e) => {
  if (e.key !== CLAVE) return;
  items = leer(CLAVE, []);
  listeners.forEach((fn) => fn(items));
});

export function armarMensaje(lista, datos = {}) {
  const lineas = ['Hola Olympic San Luis, quiero consultar precio y disponibilidad de:', ''];
  lista.forEach((i, n) => {
    lineas.push(`${n + 1}) *${i.titulo}*${i.detalle ? ` · ${i.detalle}` : ''} → ${i.cantidad} ${i.cantidad === 1 ? i.unidad.replace(/s$/, '') : i.unidad}`);
  });
  const extra = [
    ['Nombre', datos.nombre], ['Empresa', datos.empresa], ['Localidad', datos.localidad], ['Comentarios', datos.comentario],
  ].filter(([, v]) => v && v.trim());
  if (extra.length) {
    lineas.push('');
    extra.forEach(([k, v]) => lineas.push(`${k}: ${v.trim()}`));
  }
  lineas.push('', 'Consulta armada desde olympicsanluis.com.ar');
  return lineas.join('\n');
}
export const urlWhatsApp = (texto) => `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(texto)}`;

// ---------- Interfaz (se crea una sola vez, bajo demanda) ----------
const ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L21 8H6.3"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>';

let _ui;
function ui() {
  if (_ui) return _ui;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cart-fab';
  boton.hidden = true;
  boton.innerHTML = `${ICONO}<span class="cart-fab-txt">Consulta</span><span class="cart-badge" aria-hidden="true">0</span>`;
  boton.setAttribute('aria-haspopup', 'dialog');

  const dlg = document.createElement('dialog');
  dlg.className = 'cart';
  dlg.setAttribute('aria-labelledby', 'cart-tit');
  dlg.innerHTML = `
    <div class="cart-head">
      <h2 id="cart-tit">Tu consulta</h2>
      <button type="button" class="cart-x" aria-label="Cerrar carrito">✕</button>
    </div>
    <p class="cart-vacio">Todavía no sumaste productos. Elegí medidas desde la <a class="link" href="metal-desplegado.html#medidas">tabla de metal desplegado</a>.</p>
    <ul class="cart-lista" aria-label="Productos en la consulta"></ul>
    <form class="cart-form" novalidate>
      <fieldset>
        <legend>Tus datos (opcional, agilizan la respuesta)</legend>
        <label>Nombre<input name="nombre" autocomplete="name" maxlength="60"></label>
        <label>Empresa<input name="empresa" autocomplete="organization" maxlength="60"></label>
        <label>Localidad<input name="localidad" autocomplete="address-level2" maxlength="60"></label>
        <label class="full">Comentarios<textarea name="comentario" rows="2" maxlength="300" placeholder="Plazo, entrega, forma de pago…"></textarea></label>
      </fieldset>
      <details class="cart-preview"><summary>Ver el mensaje que se envía</summary><pre></pre></details>
      <div class="cart-acciones">
        <button type="submit" class="btn btn-wa">Consultar por WhatsApp</button>
        <button type="button" class="cart-vaciar">Vaciar</button>
      </div>
      <p class="cart-nota">Se abre WhatsApp con el detalle listo para enviar. No es una compra: nuestro equipo confirma stock, precio y plazos.</p>
    </form>`;

  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  document.body.append(boton, dlg, toast);

  const lista = dlg.querySelector('.cart-lista');
  const form = dlg.querySelector('.cart-form');
  const vacio = dlg.querySelector('.cart-vacio');
  const pre = dlg.querySelector('.cart-preview pre');
  const badge = boton.querySelector('.cart-badge');

  const datos = leer(CLAVE_DATOS, {});
  for (const [k, v] of Object.entries(datos)) if (form.elements[k]) form.elements[k].value = v;
  const leerDatos = () => Object.fromEntries(['nombre', 'empresa', 'localidad', 'comentario'].map((k) => [k, form.elements[k].value]));

  function pintar() {
    const n = items.length;
    boton.hidden = n === 0 && !document.querySelector('[data-carrito-fijo]');
    badge.textContent = String(n);
    boton.setAttribute('aria-label', n ? `Abrir consulta: ${n} ${n === 1 ? 'producto' : 'productos'}` : 'Abrir consulta (vacía)');
    vacio.hidden = n > 0;
    form.hidden = n === 0;
    lista.replaceChildren(...items.map((i) => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.dataset.id = i.id;
      const info = document.createElement('div');
      const t = document.createElement('strong'); t.textContent = i.titulo;
      const d = document.createElement('small'); d.textContent = i.detalle;
      info.append(t, d);
      const q = document.createElement('input');
      q.type = 'number'; q.min = '1'; q.max = String(MAX_CANT); q.value = String(i.cantidad);
      q.inputMode = 'numeric'; q.className = 'cart-qty';
      q.setAttribute('aria-label', `Cantidad de ${i.unidad}: ${i.titulo} ${i.detalle}`);
      const u = document.createElement('span'); u.className = 'cart-unidad'; u.textContent = i.unidad;
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'cart-quitar'; x.textContent = 'Quitar';
      x.setAttribute('aria-label', `Quitar ${i.titulo} ${i.detalle}`);
      li.append(info, q, u, x);
      return li;
    }));
    pre.textContent = armarMensaje(items, leerDatos());
  }

  lista.addEventListener('change', (e) => {
    if (!e.target.matches('.cart-qty')) return;
    carrito.cambiar(e.target.closest('li').dataset.id, e.target.value);
  });
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('.cart-quitar');
    if (!b) return;
    const li = b.closest('li');
    const sig = li.nextElementSibling || li.previousElementSibling;
    carrito.quitar(li.dataset.id);
    // Mantener el foco dentro del diálogo tras quitar un ítem.
    const destino = sig && lista.querySelector(`[data-id="${CSS.escape(sig.dataset.id)}"] .cart-quitar`);
    (destino || dlg.querySelector('.cart-x')).focus();
  });
  form.addEventListener('input', () => {
    guardar(CLAVE_DATOS, leerDatos());
    pre.textContent = armarMensaje(items, leerDatos());
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!items.length) return;
    const url = urlWhatsApp(armarMensaje(items, leerDatos()));
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  });
  dlg.querySelector('.cart-vaciar').addEventListener('click', () => {
    if (confirm('¿Vaciar la consulta?')) carrito.vaciar();
    dlg.querySelector('.cart-x').focus();
  });
  dlg.querySelector('.cart-x').addEventListener('click', () => dlg.close());
  // Cerrar al tocar fuera del panel.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('cart-abierto'); boton.focus(); });
  boton.addEventListener('click', () => _ui.abrir());

  let tt;
  _ui = {
    abrir() {
      pintar();
      if (!dlg.open) dlg.showModal();
      document.documentElement.classList.add('cart-abierto');
    },
    avisar(texto) {
      toast.replaceChildren();
      const p = document.createElement('span'); p.textContent = texto;
      const ver = document.createElement('button');
      ver.type = 'button'; ver.textContent = 'Ver consulta';
      ver.addEventListener('click', () => { toast.classList.remove('on'); _ui.abrir(); });
      toast.append(p, ver);
      toast.classList.add('on');
      clearTimeout(tt);
      tt = setTimeout(() => toast.classList.remove('on'), 4200);
      boton.classList.remove('bump'); void boton.offsetWidth; boton.classList.add('bump');
    },
  };
  carrito.onChange(pintar);
  return _ui;
}

export function avisar(texto) { ui().avisar(texto); }

// Montaje: si hay algo en el carrito (o la página lo pide), mostrar el botón flotante.
function montar() { if (items.length || document.querySelector('[data-carrito-fijo]')) ui(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
else montar();
// Asegura la UI apenas se agrega el primer producto aunque la página arrancara vacía.
listeners.add(() => { if (!_ui && items.length) ui(); });

// Enlaces "#carrito" en cualquier página abren el panel.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#carrito"]');
  if (!a) return;
  e.preventDefault();
  ui().abrir();
});
