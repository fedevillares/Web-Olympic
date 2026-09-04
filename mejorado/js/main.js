const toggle = document.getElementById('navToggle');
const nav = document.getElementById('primaryNav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? '✕' : '☰';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
    toggle.textContent = '☰';
  }));
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const siteNav = document.querySelector('.site-nav');
let lastScrollY = window.scrollY;
function onScrollDirection(y, velocity) {
  if (!siteNav || (nav && nav.classList.contains('open'))) return;
  const goingDown = y > lastScrollY;
  const fastEnough = velocity === undefined || Math.abs(velocity) > 0.15;
  if (y > 120 && goingDown && fastEnough) siteNav.classList.add('nav-hidden');
  else if (!goingDown || y < 120) siteNav.classList.remove('nav-hidden');
  lastScrollY = y;
}

const scrollProgress = document.querySelector('.scroll-progress');
function updateScrollProgress(y) {
  if (!scrollProgress) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  scrollProgress.style.transform = `scaleX(${pct})`;
}

const parallaxTargets = document.querySelectorAll('.hero, .page-header');
function updateParallax() {
  parallaxTargets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--parallax-shift', `${(rect.top * -0.06).toFixed(2)}px`);
  });
}

if (window.Lenis && !prefersReducedMotion) {
  const lenis = new Lenis({
    lerp: 0.1,
    duration: 1.2,
    easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    wheelMultiplier: 1,
    touchMultiplier: 1.15,
    smoothWheel: true,
  });
  window.lenis = lenis;

  lenis.on('scroll', ({ scroll, velocity }) => {
    onScrollDirection(scroll, velocity);
    updateScrollProgress(scroll);
    updateParallax();
  });

  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -88, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (nav.classList.contains('open')) lenis.stop();
      else lenis.start();
    });
  }
} else {
  window.addEventListener('scroll', () => {
    onScrollDirection(window.scrollY);
    updateScrollProgress(window.scrollY);
    updateParallax();
  }, { passive: true });
}

updateParallax();
updateScrollProgress(window.scrollY);

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0, rootMargin: '0px 0px -32% 0px' });
document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => io.observe(el));

const quickForm = document.getElementById('quickQuoteForm');
if (quickForm) {
  const fields = [quickForm.nombre, quickForm.mensaje];

  function fieldError(field) {
    return field.closest('label').querySelector('.field-error');
  }

  function validateField(field, message) {
    const errorEl = fieldError(field);
    const invalid = !field.value.trim();
    field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    if (errorEl) errorEl.textContent = invalid ? message : '';
    return !invalid;
  }

  fields.forEach((field) => {
    field.addEventListener('blur', () => {
      validateField(field, field === quickForm.nombre ? 'Ingresá tu nombre.' : 'Contanos qué necesitás.');
    });
  });

  quickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombreOk = validateField(quickForm.nombre, 'Ingresá tu nombre.');
    const mensajeOk = validateField(quickForm.mensaje, 'Contanos qué necesitás.');
    if (!nombreOk || !mensajeOk) {
      (quickForm.nombre.value.trim() ? quickForm.mensaje : quickForm.nombre).focus();
      return;
    }
    const nombre = quickForm.nombre.value.trim();
    const empresa = quickForm.empresa.value.trim();
    const mensaje = quickForm.mensaje.value.trim();
    const partes = [`Hola, soy ${nombre}${empresa ? ' de ' + empresa : ''}.`, mensaje];
    const texto = encodeURIComponent(partes.join(' '));
    window.open(`https://wa.me/5493416924220?text=${texto}`, '_blank', 'noopener');
  });
}
