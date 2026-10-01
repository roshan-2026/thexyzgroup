// Main UI interaction and animation controller
(function () {
  'use strict';

  // Elements
  const header = document.querySelector('.site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const voidElements = document.querySelectorAll('.from-void');
  const copyButtons = document.querySelectorAll('.btn-copy');
  const heroLogo = document.querySelector('.hero-logo-3d');
  const heroStage = document.querySelector('.hero-logo-stage');

  // Header scroll state
  function handleHeaderScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  // Void emergence scroll observer
  function initVoidEmergence() {
    if (!('IntersectionObserver' in window)) {
      voidElements.forEach(el => el.classList.add('in-void'));
      return;
    }

    const voidObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-void');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });

    voidElements.forEach(el => voidObserver.observe(el));

    // Stagger hero elements immediately on load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const heroVoidItems = document.querySelectorAll('#home .from-void, .coming-soon-wrapper .from-void');
        heroVoidItems.forEach((item, index) => {
          setTimeout(() => item.classList.add('in-void'), index * 80);
        });
      }, 80);
    });
  }

  // Active navigation tracking
  function initActiveNavTracker() {
    if (!('IntersectionObserver' in window) || !sections.length) return;

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${currentId}`);
          });
        }
      });
    }, {
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(section => sectionObserver.observe(section));
  }

  // Mobile menu toggle
  function initMobileMenu() {
    if (!mobileToggle || !navMenu) return;

    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileToggle.classList.toggle('is-open');
      navMenu.classList.toggle('is-active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileToggle.classList.contains('is-open')) {
          mobileToggle.classList.remove('is-open');
          navMenu.classList.remove('is-active');
          document.body.style.overflow = '';
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // Interactive email copy
  function initEmailCopy() {
    copyButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = button.getAttribute('data-email');
        if (!email) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(email);
          } else {
            const temp = document.createElement('input');
            temp.value = email;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
          }

          const originalText = button.textContent;
          button.textContent = '✓ Copied';
          button.classList.add('copied');

          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      });
    });
  }

  // Interactive 3D hero logo (clean orbital presentation without cursor tracing)
  function initHeroLogo3D() {
    if (!heroLogo || !heroStage) return;

    let isHovering = false;

    heroStage.addEventListener('mouseenter', () => {
      isHovering = true;
    });

    heroStage.addEventListener('mouseleave', () => {
      isHovering = false;
    });

    // Interactive pulse on click
    heroLogo.addEventListener('click', () => {
      heroLogo.style.transform = `perspective(1000px) scale3d(0.94, 0.94, 0.94)`;
      setTimeout(() => {
        heroLogo.style.transform = `perspective(1000px) scale3d(1.10, 1.10, 1.10)`;
      }, 150);
    });

    // Mobile / desktop scale controller
    const isMobileDevice = window.matchMedia('(hover: none), (max-width: 960px)').matches;

    function updateLogo() {
      const scale = (isHovering || isMobileDevice) ? 1.06 : 1.0;
      heroLogo.style.transform = `perspective(1000px) scale3d(${scale}, ${scale}, ${scale})`;

      requestAnimationFrame(updateLogo);
    }

    requestAnimationFrame(updateLogo);
  }

  // Initialize
  function init() {
    initVoidEmergence();
    initActiveNavTracker();
    initMobileMenu();
    initEmailCopy();
    initHeroLogo3D();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
