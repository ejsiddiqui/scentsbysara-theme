import { Component } from '@theme/component';

class CartItems extends Component {
  onConnect() {
    this.handleChange = (event) => {
      const input = event.target.closest('quantity-selector input[type="number"]');
      const line = input?.closest('quantity-selector')?.dataset.line;

      if (!input || !line) {
        return;
      }

      this.updateLine(Number(line), Math.max(1, Number(input.value) || 1));
    };

    this.handleClick = (event) => {
      const removeTrigger = event.target.closest('[data-cart-remove]');

      if (!removeTrigger) {
        return;
      }

      event.preventDefault();
      this.updateLine(Number(removeTrigger.dataset.line), 0);
    };

    this.handleCartUpdated = (event) => {
      if (event.detail?.source === 'cart-page') {
        return;
      }

      this.refreshSection();
    };

    this.addEventListener('change', this.handleChange);
    this.addEventListener('click', this.handleClick);
    document.addEventListener('theme:cart:updated', this.handleCartUpdated);
  }

  onDisconnect() {
    this.removeEventListener('change', this.handleChange);
    this.removeEventListener('click', this.handleClick);
    document.removeEventListener('theme:cart:updated', this.handleCartUpdated);
  }

  get rootUrl() {
    return window.Shopify?.routes?.root || '/';
  }

  async refreshSection() {
    const response = await fetch(`${window.location.pathname}?section_id=${this.dataset.section}`, {
      headers: { Accept: 'text/html' },
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh cart section: ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nextSection = doc.querySelector('cart-items[data-cart-page]');

    if (nextSection) {
      this.replaceWith(nextSection);
    }
  }

  async updateLine(line, quantity) {
    try {
      const response = await fetch(`${this.rootUrl}cart/change.js`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line, quantity }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update cart line: ${response.status}`);
      }

      const cart = await response.json();
      document.dispatchEvent(new CustomEvent('theme:cart:updated', {
        detail: { cart, source: 'cart-page' },
      }));
      await this.refreshSection();
    } catch (_error) {
      // Preserve the current cart page state when the update fails.
    }
  }
}

if (!customElements.get('cart-items')) {
  customElements.define('cart-items', CartItems);
}
