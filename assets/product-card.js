import { Component } from '@theme/component';

class ProductCard extends Component {
  onConnect() {
    this.swatchButtons = Array.from(this.querySelectorAll('[data-product-card-swatch]'));
    this.hasHoverImage = this.querySelector('.product-card__image--secondary') !== null;
    this.primaryImage = this.querySelector('.product-card__image--primary');
    this.links = Array.from(this.querySelectorAll('a[href]'));
    this.priceContainer = this.querySelector('[data-price]');
    this.priceCurrent = this.querySelector('.price__current');
    this.priceCompare = this.querySelector('.price__compare');
    this.quickAddButton = this.querySelector('[data-product-card-quick-add]');
    this.currentUrl = this.dataset.productUrl || this.links[0]?.getAttribute('href') || '';

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
        this.setActiveSwatch(swatch);
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
  }

  onDisconnect() {
    this.removeEventListener('pointerenter', this.handlePointerEnter);
    this.removeEventListener('pointerleave', this.handlePointerLeave);
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
    this.removeEventListener('click', this.handleClick);
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
