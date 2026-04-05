/**
 * splide-init.js
 * Auto-discovers all [data-splide] elements and mounts Splide instances.
 * Sections pass config via data-splide='{ JSON options }'.
 * Handles:
 *   - Auto-mount on DOMContentLoaded
 *   - Synced sliders (thumbnail galleries) via data-splide-sync
 *   - Shopify editor section reload (shopify:section:load)
 */
import Splide from '@theme/splide';

const instances = new Map();

/**
 * Mount a single Splide element.
 * If data-splide-sync="<selector>" is present, sync with that Splide instance.
 */
function mountSplide(el) {
  if (instances.has(el)) return;

  const options = JSON.parse(el.dataset.splide || '{}');
  const splide = new Splide(el, options);

  const syncSelector = el.dataset.splideSync;
  if (syncSelector) {
    const syncEl = el.closest('section, [data-product-section]')?.querySelector(syncSelector);
    if (syncEl) {
      const syncOptions = JSON.parse(syncEl.dataset.splide || '{}');
      const syncSplide = new Splide(syncEl, syncOptions);
      splide.sync(syncSplide);
      splide.mount();
      syncSplide.mount();
      instances.set(syncEl, syncSplide);
      instances.set(el, splide);
      return;
    }
  }

  splide.mount();
  instances.set(el, splide);
}

/**
 * Destroy a Splide instance bound to an element.
 */
function destroySplide(el) {
  const instance = instances.get(el);
  if (instance) {
    instance.destroy();
    instances.delete(el);
  }
}

/**
 * Discover and mount all [data-splide] elements within a root.
 * Elements with data-splide-is-sync are mounted by their sync parent — skip them.
 */
function mountAll(root = document) {
  const els = root.querySelectorAll('[data-splide]:not([data-splide-is-sync])');
  els.forEach(mountSplide);
}

/**
 * Destroy all instances within a root.
 */
function destroyAll(root = document) {
  root.querySelectorAll('[data-splide]').forEach(destroySplide);
}

// ── Initial mount ──────────────────────────────────────
mountAll();

// ── Shopify editor events ──────────────────────────────
document.addEventListener('shopify:section:load', (event) => {
  mountAll(event.target);
});

document.addEventListener('shopify:section:unload', (event) => {
  destroyAll(event.target);
});

// ── Shopify editor block selection ─────────────────────
// When a merchant clicks a block (slide) in the editor sidebar,
// jump the Splide to that slide so they see what they're editing.
document.addEventListener('shopify:block:select', (event) => {
  const splideEl = event.target.closest('[data-splide]');
  const instance = instances.get(splideEl);
  if (!instance) return;

  const slides = Array.from(splideEl.querySelectorAll('.splide__slide'));
  const index = slides.indexOf(event.target.closest('.splide__slide'));
  if (index >= 0) {
    instance.go(index);
    if (instance.Components.Autoplay) {
      instance.Components.Autoplay.pause();
    }
  }
});

document.addEventListener('shopify:block:deselect', (event) => {
  const splideEl = event.target.closest('[data-splide]');
  const instance = instances.get(splideEl);
  if (!instance) return;

  if (instance.Components.Autoplay) {
    instance.Components.Autoplay.play();
  }
});

// ── External controls API ──────────────────────────────
// Allows sections to keep their own navigation buttons (e.g. header "BACK/NEXT")
// and wire them to Splide via data-splide-control="prev|next|<index>"
// scoped to the nearest [data-splide-controls-for="<selector>"] container.
document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-splide-control]');
  if (!btn) return;

  const controlsContainer = btn.closest('[data-splide-controls-for]');
  if (!controlsContainer) return;

  const targetSelector = controlsContainer.dataset.splideControlsFor;
  const section = controlsContainer.closest('section, [data-featured-collection]');
  const splideEl = section?.querySelector(targetSelector);
  const instance = instances.get(splideEl);
  if (!instance) return;

  const action = btn.dataset.splideControl;
  if (action === 'prev') instance.go('<');
  else if (action === 'next') instance.go('>');
  else if (!isNaN(Number(action))) instance.go(Number(action));
});

// ── Variant picker gallery refresh ─────────────────────
document.addEventListener('theme:gallery:activate', (event) => {
  const section = event.target.closest('[data-product-section]');
  if (!section) return;

  goToMediaSlide(section, event.detail);
});

/**
 * Navigate a Splide gallery to a specific slide by mediaId or index.
 */
function goToMediaSlide(section, detail) {
  const splideEl = section.querySelector('[data-splide]:not([data-splide-is-sync])');
  const instance = instances.get(splideEl);
  if (!instance) return;

  const mediaId = detail?.mediaId;
  if (mediaId) {
    const slides = Array.from(splideEl.querySelectorAll('.splide__slide'));
    const index = slides.findIndex(s => s.dataset.mediaId === String(mediaId));
    if (index >= 0) instance.go(index);
  } else if (Number.isFinite(detail?.index)) {
    instance.go(detail.index);
  }
}

// ── Variant deep-link on initial load ──────────────────
function handleInitialVariantSlide() {
  document.querySelectorAll('[data-product-section]').forEach((section) => {
    const gallery = section.querySelector('[data-product-gallery]');
    if (!gallery) return;

    const initialMediaId = gallery.dataset.initialMedia;
    if (initialMediaId) {
      goToMediaSlide(section, { mediaId: initialMediaId });
    }
  });
}

handleInitialVariantSlide();

export { instances, mountAll, destroyAll, goToMediaSlide as goToMedia };
