// Tabla de metal desplegado: filtro por espesor, búsqueda, botones "Sumar al carrito" y corte a medida.
// La URL (con ?v=) debe ser idéntica a la del <script>/modulepreload: si difiere, el navegador
// evalúa el módulo dos veces y aparecen dos carritos. tools/build-catalogo.mjs la mantiene en sync.
import { carrito, avisar } from './carrito.js?v=20261104';

const tabla = document.querySelector('.md-table');
if (tabla) {
  const grupos = [...tabla.tBodies];
  const estado = document.querySelector('.md-filter-estado');
  const filtro = document.querySelector('.md-filter');
  const caja = document.querySelector('.md-buscar');
  const input = document.getElementById('md-buscar-input');
  let esp = 'all';
  let q = '';

  const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s*[×x*]\s*/g, 'x').trim();

  function aplicar() {
    const terminos = normal(q).split(/\s+/).filter(Boolean);
    let visibles = 0;
    for (const tb of grupos) {
      const okEsp = esp === 'all' || tb.dataset.esp === esp;
      const texto = tb.dataset.buscar || '';
      const okQ = terminos.every((t) => texto.includes(t));
      tb.hidden = !(okEsp && okQ);
      if (!tb.hidden) visibles++;
    }
    estado.textContent = esp === 'all' && !terminos.length
      ? ''
      : visibles
        ? `Mostrando ${visibles} de ${grupos.length} modelos.`
        : 'No hay modelos con ese criterio. Probá otro espesor o sumá un corte a medida más abajo.';
  }

  if (filtro) {
    filtro.hidden = false;
    filtro.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-esp]');
      if (!b) return;
      esp = b.dataset.esp;
      filtro.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      aplicar();
    });
  }
  if (caja && input) {
    caja.hidden = false;
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { q = input.value; aplicar(); }, 120); });
  }

  // Un único listener para los 72 botones (delegación).
  tabla.addEventListener('click', (e) => {
    const b = e.target.closest('.md-cart-btn');
    if (!b) return;
    const qty = document.getElementById(`q-${b.dataset.id}`);
    const cantidad = Math.max(1, Math.round(Number(qty?.value)) || 1);
    carrito.agregar({
      id: b.dataset.id,
      titulo: `Metal desplegado ${b.dataset.modelo}`,
      detalle: `esp. ${b.dataset.esp} mm · hoja ${b.dataset.medida} mm`,
      cantidad,
      unidad: 'hojas',
    });
    if (qty) qty.value = '1';
    b.classList.add('ok');
    setTimeout(() => b.classList.remove('ok'), 1400);
    avisar(`Sumaste ${cantidad} ${cantidad === 1 ? 'hoja' : 'hojas'} de ${b.dataset.modelo} (${b.dataset.medida} mm).`);
  });
  // Enter en la cantidad suma la fila.
  tabla.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('.md-qty')) return;
    e.preventDefault();
    e.target.closest('tr').querySelector('.md-cart-btn').click();
  });

  // Marca las filas que ya están en el carrito.
  carrito.onChange((items) => {
    const ids = new Set(items.map((i) => i.id));
    tabla.querySelectorAll('tr[data-variante]').forEach((tr) => tr.classList.toggle('en-carrito', ids.has(tr.dataset.variante)));
  });
}

const medida = document.getElementById('md-medida');
if (medida) {
  const err = medida.querySelector('.md-medida-error');
  medida.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = medida.elements;
    const modelo = f.modelo.value.trim();
    const ancho = Math.round(Number(f.ancho.value));
    const largo = Math.round(Number(f.largo.value));
    const cantidad = Math.round(Number(f.cantidad.value));
    const malo = [
      [!modelo, f.modelo],
      [!(ancho > 0 && ancho <= 3000), f.ancho],
      [!(largo > 0 && largo <= 12000), f.largo],
      [!(cantidad > 0), f.cantidad],
    ];
    malo.forEach(([m, el]) => el.setAttribute('aria-invalid', String(m)));
    const primero = malo.find(([m]) => m);
    if (primero) {
      err.textContent = 'Completá el modelo, el ancho, el largo y la cantidad.';
      primero[1].focus();
      return;
    }
    err.textContent = '';
    const notas = f.notas.value.trim();
    carrito.agregar({
      id: `medida-${normalId(modelo)}-${ancho}x${largo}-${normalId(notas)}`,
      titulo: `Corte a medida: ${modelo}`,
      detalle: `${ancho} × ${largo} mm${notas ? ` · ${notas}` : ''}`,
      cantidad,
      unidad: 'piezas',
    });
    avisar(`Sumaste ${cantidad} ${cantidad === 1 ? 'pieza' : 'piezas'} a medida de ${ancho} × ${largo} mm.`);
    medida.reset();
  });
}

function normalId(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40); }
