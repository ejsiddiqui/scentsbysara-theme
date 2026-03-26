import { Component } from '@theme/component';

class VariantPicker extends Component {
  onConnect() {
    this.variantData = JSON.parse(this.querySelector('[data-product-variants]')?.textContent || '[]');
    this.optionInputs = Array.from(this.querySelectorAll('input[type="radio"][data-option-position]'));
    this.form = this.closest('form');
    this.section = document.getElementById(`ProductSection-${this.dataset.section}`);
    this.variantIdInput = this.form?.querySelector('[data-variant-id-input]');
    this.addToCartButton = this.form?.querySelector('[data-add-to-cart]');
    this.priceRoot = this.section?.querySelector('.product-details__meta [data-price]');
    this.priceCurrent = this.priceRoot?.querySelector('.price__current');
    this.priceCompare = this.priceRoot?.querySelector('.price__compare');
    this.mobileHeader = this.section?.querySelector('.product-mobile-header');
    this.syncRequestId = 0;
    this.syncController = null;

    this.handleChange = (event) => {
      if (!event.target.matches('input[type="radio"][data-option-position]')) {
        return;
      }

      this.updateSelectedValueLabels();

      const variant = this.resolveVariant();
      if (!variant) {
        this.setUnavailableState();
        return;
      }

      this.applyVariant(variant);
    };

    this.addEventListener('change', this.handleChange);
    this.updateSelectedValueLabels();
  }

  onDisconnect() {
    this.syncController?.abort();
    this.removeEventListener('change', this.handleChange);
  }

  updateSelectedValueLabels() {
    this.querySelectorAll('.variant-option').forEach((fieldset) => {
      const checkedInput = fieldset.querySelector('input[type="radio"]:checked');
      const target = fieldset.querySelector('[data-selected-value]');

      if (checkedInput && target) {
        target.textContent = checkedInput.value;
      }
    });
  }

  setUnavailableState() {
    if (this.variantIdInput) {
      this.variantIdInput.value = '';
    }

    if (this.addToCartButton) {
      this.addToCartButton.disabled = true;
      this.addToCartButton.textContent = 'UNAVAILABLE';
    }
  }

  resolveVariant() {
    const selectedOptions = [];

    this.querySelectorAll('.variant-option').forEach((fieldset) => {
      const checkedInput = fieldset.querySelector('input[type="radio"]:checked');
      if (checkedInput) {
        selectedOptions.push(checkedInput.value);
      }
    });

    return this.variantData.find((variant) => (
      Array.isArray(variant.options)
      && variant.options.length === selectedOptions.length
      && variant.options.every((value, index) => value === selectedOptions[index])
    ));
  }

  applyVariant(variant) {
    if (this.variantIdInput) {
      this.variantIdInput.value = variant.id;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url.toString());

    this.updatePrice(variant);
    this.updateAddToCart(variant);
    this.updateGallery(variant.featured_media_id);
    this.syncServerState(variant);

    this.dispatchEvent(new CustomEvent('theme:variant:change', {
      bubbles: true,
      detail: { variant },
    }));
  }

  updatePrice(variant) {
    if (this.priceCurrent) {
      this.priceCurrent.textContent = variant.price_money;
    }

    const hasCompare = variant.compare_at_price && variant.compare_at_price > variant.price;

    if (!hasCompare) {
      if (this.priceCompare) {
        this.priceCompare.remove();
        this.priceCompare = null;
      }
      return;
    }

    if (!this.priceCompare && this.priceRoot) {
      this.priceCompare = document.createElement('s');
      this.priceCompare.className = 'price-strikethrough price__compare';
      this.priceRoot.prepend(this.priceCompare);
    }

    if (this.priceCompare) {
      this.priceCompare.textContent = variant.compare_at_price_money;
    }
  }

  updateAddToCart(variant) {
    if (!this.addToCartButton) {
      return;
    }

    this.addToCartButton.disabled = !variant.available;
    this.addToCartButton.textContent = variant.available
      ? `ADD TO BAG - ${variant.price_money}`
      : 'SOLD OUT';
  }

  updateGallery(mediaId) {
    if (!this.section || !mediaId) {
      return;
    }

    const slides = Array.from(this.section.querySelectorAll('[data-product-gallery-slide]'));
    const thumbs = Array.from(this.section.querySelectorAll('[data-product-gallery-thumb]'));
    const targetIndex = slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));

    if (targetIndex < 0) {
      return;
    }

    this.section.dispatchEvent(new CustomEvent('theme:gallery:activate', {
      bubbles: true,
      detail: { index: targetIndex, mediaId },
    }));
  }

  async syncServerState(variant) {
    if (!this.dataset.productUrl || !this.dataset.section) {
      return;
    }

    this.syncController?.abort();
    this.syncController = new AbortController();
    const requestId = this.syncRequestId + 1;
    this.syncRequestId = requestId;

    try {
      const response = await fetch(`${this.dataset.productUrl}?section_id=${this.dataset.section}&variant=${variant.id}`, {
        headers: { Accept: 'text/html' },
        signal: this.syncController.signal,
      });

      if (!response.ok || requestId !== this.syncRequestId) {
        return;
      }

      const html = await response.text();

      if (requestId !== this.syncRequestId) {
        return;
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const nextSection = doc.getElementById(`ProductSection-${this.dataset.section}`);

      if (!nextSection) {
        return;
      }

      const nextMeta = nextSection.querySelector('.product-details__meta');
      const nextMobileHeader = nextSection.querySelector('.product-mobile-header');
      const nextAddToCart = nextSection.querySelector('[data-add-to-cart]');
      const nextGallery = nextSection.querySelector('.product-gallery');

      if (nextMeta) {
        const currentMeta = this.section?.querySelector('.product-details__meta');
        currentMeta?.replaceWith(nextMeta);
        this.priceRoot = this.section?.querySelector('.product-details__meta [data-price]');
        this.priceCurrent = this.priceRoot?.querySelector('.price__current');
        this.priceCompare = this.priceRoot?.querySelector('.price__compare');
      }

      if (nextMobileHeader) {
        this.mobileHeader?.replaceWith(nextMobileHeader);
        this.mobileHeader = this.section?.querySelector('.product-mobile-header');
      }

      if (nextGallery) {
        const currentGallery = this.section?.querySelector('.product-gallery');
        currentGallery?.replaceWith(nextGallery);
        this.section?.productGalleryController?.refresh();
      }

      if (nextAddToCart && this.addToCartButton) {
        this.addToCartButton.disabled = nextAddToCart.disabled;
        this.addToCartButton.textContent = nextAddToCart.textContent.trim();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      // Preserve the locally updated state if the server-render sync fails.
    } finally {
      if (requestId === this.syncRequestId) {
        this.syncController = null;
      }
    }
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
