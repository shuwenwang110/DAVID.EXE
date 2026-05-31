/* DAVID.EXE shared eye transition
   How to use:
   1. Add <link rel="stylesheet" href="./eye-transition.css" /> in <head>.
   2. Add <script src="./eye-transition.js"></script> before your page script.
   3. Add data-eye-link to links that should close the eye before changing page.
   4. For the opening page only, add data-eye-mode="close-only" to <body>.
*/

(function () {
  const TRANSITION_TIME = 850;
  const OPEN_DELAY = 80;

  let transitionEl = null;
  let isChangingPage = false;

  function createEyeTransition() {
    if (transitionEl) return transitionEl;

    transitionEl = document.createElement('div');
    transitionEl.id = 'eyeTransition';
    transitionEl.innerHTML = `
      <div class="eye-lid top"></div>
      <div class="eye-lid bottom"></div>
    `;

    document.body.appendChild(transitionEl);
    document.documentElement.classList.add('eye-transition-ready');

    const mode = document.body.dataset.eyeMode || 'both';

    // The start/opening page should not play the opening-eye animation.
    // It starts with the eyelids already open and only closes when leaving.
    if (mode === 'close-only') {
      transitionEl.classList.add('open');
      return transitionEl;
    }

    // Other pages start closed, then open after loading.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        transitionEl.classList.add('open');
      }, OPEN_DELAY);
    });

    return transitionEl;
  }

  function goWithEyeTransition(url) {
    if (!url || isChangingPage) return;

    isChangingPage = true;
    if (window.DAVIDVoice) window.DAVIDVoice.cancel();
    const eye = createEyeTransition();

    eye.classList.remove('open');
    eye.classList.add('closing');

    window.setTimeout(() => {
      window.location.href = url;
    }, TRANSITION_TIME);
  }

  function shouldIgnoreLink(link) {
    const href = link.getAttribute('href');
    if (!href) return true;
    if (href.startsWith('#')) return true;
    if (href.startsWith('mailto:')) return true;
    if (href.startsWith('tel:')) return true;
    if (link.target && link.target !== '_self') return true;
    return false;
  }

  // Make this function available to your own page scripts.
  window.goWithEyeTransition = goWithEyeTransition;

  function setup() {
    createEyeTransition();

    // Capture phase: this runs before other click listeners.
    // It prevents older direct window.location jumps from feeling abrupt.
    document.addEventListener('click', function (event) {
      const link = event.target.closest('a[data-eye-link]');
      if (!link || shouldIgnoreLink(link)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      goWithEyeTransition(link.href);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
