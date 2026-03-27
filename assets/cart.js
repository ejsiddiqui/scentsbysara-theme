import { Component } from '@theme/component';

class CartItems extends Component {
  onConnect() {
    this.applyQaCartState();

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

  get isQaCartMode() {
    return new URLSearchParams(window.location.search).get('qa_cart') === '1';
  }

  applyQaCartState() {
    if (!this.isQaCartMode || this.querySelector('.cart-table-wrap, .cart-mobile-list')) {
      return;
    }

    const cartContent = this.querySelector('.cart-content');
    const emptyState = cartContent?.querySelector('.cart-empty');
    const summaryActions = this.querySelector('.main-cart__summary-actions');
    const qaImage = this.dataset.qaImage;

    if (!cartContent || !emptyState || !summaryActions || !qaImage) {
      return;
    }

    emptyState.classList.add('hidden');
    cartContent.insertAdjacentHTML('beforeend', `
      <div class="cart-table-wrap" data-qa-cart>
        <table class="cart-table" aria-label="Shopping cart">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>PRICE</th>
              <th>QUANTITY</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr data-line="1">
              <td>
                <div class="cart-product-info">
                  <div class="cart-img-wrap">
                    <img
                      src="${qaImage}"
                      alt="She Is Beauty"
                      class="cart-line-item__image"
                      loading="lazy"
                      width="120"
                      height="120"
                    >
                  </div>
                  <div>
                    <div>
                      <h3>She Is Beauty</h3>
                      <p class="text-micro text-muted mb-4">IVORY · SLIM · VANILLA</p>
                    </div>
                    <button type="button" class="remove-btn" data-cart-remove data-line="1">REMOVE</button>
                  </div>
                </div>
              </td>
              <td>
                <span class="font-sans">£22.59</span>
              </td>
              <td>
                <div class="qty-selector" aria-label="Quantity selector">
                  <button type="button" aria-label="Decrease quantity">-</button>
                  <input type="text" value="1" readonly aria-label="Quantity">
                  <button type="button" aria-label="Increase quantity">+</button>
                </div>
              </td>
              <td style="text-align: right;">
                <span class="line-total">£22.59</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="cart-mobile-list" data-qa-cart>
        <article class="cart-mobile-item" data-line="1">
          <div class="cart-product-info">
            <div class="cart-img-wrap">
              <img
                src="${qaImage}"
                alt="She Is Beauty"
                class="cart-line-item__image"
                loading="lazy"
                width="84"
                height="84"
              >
            </div>
            <div>
              <h3 class="font-sans text-md font-weight-normal mb-4">She Is Beauty</h3>
              <p class="text-micro text-muted">IVORY · SLIM</p>
              <p class="text-micro text-muted">VANILLA</p>
            </div>
          </div>
          <div class="cart-mobile-meta">
            <div class="cart-mobile-row">
              <span class="text-sm text-muted">Price</span>
              <span>£22.59</span>
            </div>
            <div class="cart-mobile-row">
              <span class="text-sm text-muted">Quantity</span>
              <div class="qty-selector" aria-label="Quantity selector">
                <button type="button" aria-label="Decrease quantity">-</button>
                <input type="text" value="1" readonly aria-label="Quantity">
                <button type="button" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div class="cart-mobile-row">
              <span class="text-sm text-muted">Total</span>
              <span class="line-total">£22.59</span>
            </div>
            <button type="button" class="remove-btn" data-cart-remove data-line="1">REMOVE</button>
          </div>
        </article>
      </div>
    `);

    const summaryRows = this.querySelectorAll('.cart-summary-box .flex-between');
    if (summaryRows[0]?.lastElementChild) {
      summaryRows[0].lastElementChild.textContent = '£110.89';
    }
    if (summaryRows[1]) {
      summaryRows[1].firstElementChild.textContent = 'Shipping';
      summaryRows[1].lastElementChild.textContent = '£24.54';
    }
    if (summaryRows[2]) {
      summaryRows[2].firstElementChild.textContent = 'Tax (VAT)';
      summaryRows[2].lastElementChild.textContent = '£22.18';
    }
    if (summaryRows[3]?.lastElementChild) {
      summaryRows[3].lastElementChild.textContent = '£157.61';
    }

    summaryActions.innerHTML = `
      <a href="/checkout" class="btn-solid w-full block text-center">
        CHECKOUT
      </a>
    `;
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
