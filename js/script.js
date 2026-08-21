/**
 * TheXYZGroup — script.js
 * Vanilla JS only, no dependencies, no backend calls.
 *
 * Modules:
 *  1. Theme toggle (dark default, persisted to localStorage)
 *  2. Mobile navigation drawer
 *  3. Smooth-scroll nav close on link click
 *  4. Scroll-reveal animations (IntersectionObserver)
 *  5. Animated counters (IntersectionObserver, runs once)
 *  6. Button ripple effect
 *  7. Back-to-top button visibility + click
 *  8. Sticky navbar shadow on scroll
 */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * 1. THEME TOGGLE
   * Dark mode is the default. Preference is saved in localStorage so it
   * persists between visits. Falls back gracefully if storage is blocked.
   * ------------------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const THEME_KEY = 'thexyzgroup-theme';

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme'); // dark is the default (no attribute)
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* storage unavailable — theme just won't persist, non-fatal */
    }
  }

  const initialTheme = getStoredTheme() || 'dark';
  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const isLight = root.getAttribute('data-theme') === 'light';
      const nextTheme = isLight ? 'dark' : 'light';
      applyTheme(nextTheme);
      storeTheme(nextTheme);
    });
  }

  /* ---------------------------------------------------------------------
   * 2. MOBILE NAVIGATION DRAWER
   * ------------------------------------------------------------------- */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  function closeMenu() {
    if (!navLinks || !hamburger) return;
    navLinks.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    /* 3. Close the drawer whenever a nav link is chosen */
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    /* Close on Escape for keyboard users */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------------------------------------------------------------------
   * 4. SCROLL-REVEAL ANIMATIONS
   * Elements with the `.reveal` class fade/slide in once they enter the
   * viewport. Uses IntersectionObserver for performance (no scroll events).
   * ------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    /* No IntersectionObserver support — show content immediately */
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------------------------------------------------------------------
   * 5. ANIMATED COUNTERS
   * Counts up from 0 to the target value defined in [data-count-to] once
   * the stat card scrolls into view. Runs only once per element.
   * ------------------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count-to]');

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    const duration = 1500; /* ms */
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      /* ease-out cubic for a natural deceleration */
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString();
      }
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------------------------------------------------------------------
   * 6. BUTTON RIPPLE EFFECT
   * Lightweight click-position ripple. Purely decorative, cleans up after
   * itself so it never leaks nodes.
   * ------------------------------------------------------------------- */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);

      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

      btn.appendChild(ripple);
      window.setTimeout(function () {
        ripple.remove();
      }, 650);
    });
  });

  /* ---------------------------------------------------------------------
   * 7. BACK-TO-TOP BUTTON
   * ------------------------------------------------------------------- */
  const backToTop = document.getElementById('back-to-top');

  if (backToTop) {
    backToTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------------------
   * 8. STICKY NAVBAR SHADOW ON SCROLL
   * Adds a subtle elevation once the user scrolls past the hero fold.
   * Throttled via requestAnimationFrame to avoid layout thrashing.
   * ------------------------------------------------------------------- */
  const navbar = document.getElementById('navbar');
  let ticking = false;

  function updateNavbarState() {
    if (!navbar) return;
    navbar.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateNavbarState);
      ticking = true;
    }
  });
  updateNavbarState();

  /* ---------------------------------------------------------------------
   * Current year in footer (kept out of HTML so it never goes stale)
   * ------------------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
