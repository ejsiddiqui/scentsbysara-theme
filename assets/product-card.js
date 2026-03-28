import { Component } from '@theme/component';
import {
  getVariantOptionMap,
  getVariantOptionValue,
  resolveVariantForSelectionChange,
} from './product-card-state.mjs';

class ProductCard extends Component {
  onConnect() {
    this.swatchButtons = Array.from(this.querySelectorAll('[data-product-card-swatch]'));
    this.optionSelects = Array.from(this.querySelectorAll('[data-product-card-option]'));
    this.hasHoverImage = this.querySelector('.product-card__image--secondary') !== null;
    this.primaryImage = this.querySelector('.product-card__image--primary');
    this.links = Array.from(this.querySelectorAll('a[href]'));
    this.priceContainer = this.querySelector('[data-price]');
    this.priceCurrent = this.querySelector('.price__current');
    this.priceCompare = this.querySelector('.price__compare');
    this.quickAddButton = this.querySelector('[data-product-card-quick-add]');
    this.currentUrl = this.dataset.productUrl || this.links[0]?.getAttribute('href') || '';
    this.currentVariantId = this.dataset.currentVariantId || '';
    this.selectedOptions = {};

    this.handlePointerEnter = () => {
      if (this.hasHoverImage) {
        this.classList.add('is-hovered');
      }
    };
    this.handlePointerLeave = () => {
      this.classList.remove('is-hovered');
    };
    this.handleFocusIn = () => {
      if (this.hasHoverImage) {
        this.classList.add('is-hovered');
      }
    };
    this.handleFocusOut = (event) => {
      if (!this.contains(event.relatedTarget)) {
        this.classList.remove('is-hovered');
      }
    };
    this.handleClick = (event) => {
      const swatch = event.target.closest('[data-product-card-swatch]');
      if (swatch && this.contains(swatch)) {
        event.preventDefault();
        this.handleSwatchSelection(swatch);
        return;
      }

      if (event.target.closest('[data-product-card-quick-add]')) {
        event.preventDefault();
        const targetUrl = this.quickAddButton?.dataset.productCardQuickAddUrl || this.currentUrl;
        if (targetUrl) {
          window.location.assign(targetUrl);
        }
      }
    };

    this.addEventListener('pointerenter', this.handlePointerEnter);
    this.addEventListener('pointerleave', this.handlePointerLeave);
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    this.addEventListener('click', this.handleClick);

    // Shape / option select handler (shop layout only)
    this.variants = [];
    try {
      this.variants = JSON.parse(this.dataset.variants || '[]');
    } catch (_) {
      this.variants = [];
    }

    this.selectedVariant =
      this.variants.find((variant) => String(variant.id) === String(this.currentVariantId)) ||
      this.variants[0] ||
      null;

    if (this.selectedVariant) {
      this.selectedOptions = getVariantOptionMap(this.selectedVariant);
      this.syncControlsFromVariant(this.selectedVariant);
    }

    this.handleOptionChange = (event) => {
      const select = event.target.closest('[data-product-card-option]');
      if (!select || !this.contains(select)) return;

      const match = resolveVariantForSelectionChange({
        variants: this.variants,
        selectedOptions: this.selectedOptions,
        changedOptionName: select.dataset.productCardOption,
        changedOptionValue: select.value,
      });

      if (match) {
        this.syncVariant(match);
      }
    };

    this.addEventListener('change', this.handleOptionChange);
  }

  onDisconnect() {
    this.removeEventListener('pointerenter', this.handlePointerEnter);
    this.removeEventListener('pointerleave', this.handlePointerLeave);
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('change', this.handleOptionChange);
  }

  handleSwatchSelection(activeSwatch) {
    if (this.variants.length > 0) {
      const match = resolveVariantForSelectionChange({
        variants: this.variants,
        selectedOptions: this.selectedOptions,
        changedOptionName: activeSwatch.dataset.swatchOptionName || 'colour',
        changedOptionValue: activeSwatch.dataset.swatchValue,
      });

      if (match) {
        this.syncVariant(match);
        return;
      }
    }

    this.setActiveSwatch(activeSwatch);
  }

  syncVariant(variant) {
    this.selectedVariant = variant;
    this.currentVariantId = String(variant.id ?? '');
    this.selectedOptions = getVariantOptionMap(variant);
    this.dataset.currentVariantId = this.currentVariantId;

    const variantUrl = variant.url || this.dataset.productUrl || this.currentUrl;
    if (variantUrl) {
      this.currentUrl = variantUrl;
      this.links.forEach((link) => link.setAttribute('href', variantUrl));
    }

    if (this.quickAddButton) {
      this.quickAddButton.dataset.productCardQuickAddUrl = variantUrl || '';
    }

    if (this.primaryImage && variant.image) {
      this.primaryImage.setAttribute('src', variant.image);
      if (variant.imageSrcset) {
        this.primaryImage.setAttribute('srcset', variant.imageSrcset);
      }
    }

    if (this.priceCurrent && variant.price) {
      this.priceCurrent.textContent = variant.price;
    }

    if (this.priceCompare) {
      const compareText = variant.compareAt || '';
      this.priceCompare.textContent = compareText;
      this.priceCompare.hidden = compareText === '';
    } else if (this.priceContainer && variant.compareAt) {
      const compareNode = document.createElement('s');
      compareNode.className = 'price-strikethrough price__compare';
      compareNode.textContent = variant.compareAt;
      this.priceContainer.prepend(compareNode);
      this.priceCompare = compareNode;
    }

    this.syncControlsFromVariant(variant);
  }

  syncControlsFromVariant(variant) {
    this.optionSelects.forEach((select) => {
      const nextValue = getVariantOptionValue(variant, select.dataset.productCardOption);
      if (nextValue) {
        select.value = nextValue;
      }
    });

    this.swatchButtons.forEach((button) => {
      const swatchOptionName = button.dataset.swatchOptionName || 'colour';
      const selectedValue = this.selectedOptions[swatchOptionName.trim().toLowerCase()];
      const isActive = selectedValue === (button.dataset.swatchValue || '').trim().toLowerCase();
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  setActiveSwatch(activeSwatch) {
    this.swatchButtons.forEach((button) => {
      const isActive = button === activeSwatch;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    this.dispatchEvent(
      new CustomEvent('theme:product-card:swatch-change', {
        bubbles: true,
        detail: {
          variantId: activeSwatch.dataset.variantId || null,
          value: activeSwatch.dataset.swatchValue || null,
        },
      }),
    );

    const variantUrl = activeSwatch.dataset.variantUrl || this.dataset.productUrl || this.currentUrl;
    if (variantUrl) {
      this.currentUrl = variantUrl;
      this.links.forEach((link) => link.setAttribute('href', variantUrl));
    }

    if (this.quickAddButton) {
      this.quickAddButton.dataset.productCardQuickAddUrl = variantUrl || '';
    }

    if (this.primaryImage && activeSwatch.dataset.variantImage) {
      this.primaryImage.setAttribute('src', activeSwatch.dataset.variantImage);
      if (activeSwatch.dataset.variantImageSrcset) {
        this.primaryImage.setAttribute('srcset', activeSwatch.dataset.variantImageSrcset);
      }
    }

    if (this.priceCurrent && activeSwatch.dataset.variantPrice) {
      this.priceCurrent.textContent = activeSwatch.dataset.variantPrice;
    }

    if (this.priceCompare) {
      const compareText = activeSwatch.dataset.variantCompare || '';
      this.priceCompare.textContent = compareText;
      this.priceCompare.hidden = compareText === '';
    } else if (this.priceContainer && activeSwatch.dataset.variantCompare) {
      const compareNode = document.createElement('s');
      compareNode.className = 'price-strikethrough price__compare';
      compareNode.textContent = activeSwatch.dataset.variantCompare;
      this.priceContainer.prepend(compareNode);
      this.priceCompare = compareNode;
    }
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}
