import { Component } from '@theme/component';

class ProductCard extends Component {
  onConnect() {
    this.variants = [];
    try {
      if (this.dataset.variants) {
        this.variants = JSON.parse(this.dataset.variants);
      }
    } catch (_) {}

    this.primaryImage = this.querySelector('.product-card__image--primary');
    this.secondaryImage = this.querySelector('.product-card__image--secondary');
    this.quickAddBtn = this.querySelector('[data-product-card-quick-add]');
    this.optionSelects = Array.from(this.querySelectorAll('[data-product-card-option]'));
    this.shopNowBtn = this.querySelector('.product-card__button');

    this.handleMouseEnter = () => {
      if (this.secondaryImage) {
        this.secondaryImage.classList.add('is-visible');
      }
    };

    this.handleMouseLeave = () => {
      if (this.secondaryImage) {
        this.secondaryImage.classList.remove('is-visible');
      }
    };

    this.handleOptionChange = () => {
      this.updateVariant();
    };

    this.handleQuickAdd = (event) => {
      event.preventDefault();
      const url = this.quickAddBtn?.dataset.productCardQuickAddUrl;
      if (!url) return;
      this.addToCart(url);
    };

    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);

    this.optionSelects.forEach((select) => {
      select.addEventListener('change', this.handleOptionChange);
    });

    if (this.quickAddBtn) {
      this.quickAddBtn.addEventListener('click', this.handleQuickAdd);
    }
  }

  onDisconnect() {
    this.removeEventListener('mouseenter', this.handleMouseEnter);
    this.removeEventListener('mouseleave', this.handleMouseLeave);

    this.optionSelects.forEach((select) => {
      select.removeEventListener('change', this.handleOptionChange);
    });

    if (this.quickAddBtn) {
      this.quickAddBtn.removeEventListener('click', this.handleQuickAdd);
    }
  }

  updateVariant() {
    if (!this.variants.length) return;

    const selectedOptions = this.optionSelects.map((select) => select.value);

    const matchedVariant = this.variants.find((variant) =>
      selectedOptions.every((opt) => variant.options.includes(opt))
    );

    const variant = matchedVariant || this.variants[0];

    if (variant) {
      if (this.shopNowBtn) {
        this.shopNowBtn.href = variant.url;
      }
      if (this.quickAddBtn) {
        this.quickAddBtn.dataset.productCardQuickAddUrl = variant.url;
      }
    }
  }

  async addToCart(variantUrl) {
    const url = new URL(variantUrl, window.location.origin);
    const variantId = url.searchParams.get('variant');

    if (!variantId) return;

    const originalText = this.quickAddBtn?.textContent;
    if (this.quickAddBtn) {
      this.quickAddBtn.disabled = true;
      this.quickAddBtn.textContent = '...';
    }

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1 }),
      });

      if (response.ok) {
        document.dispatchEvent(new CustomEvent('theme:cart:updated', { bubbles: true }));
        if (this.quickAddBtn) {
          this.quickAddBtn.textContent = '✓';
          setTimeout(() => {
            this.quickAddBtn.textContent = originalText;
            this.quickAddBtn.disabled = false;
          }, 1500);
        }
      }
    } catch (_) {
      if (this.quickAddBtn) {
        this.quickAddBtn.textContent = originalText;
        this.quickAddBtn.disabled = false;
      }
    }
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}
