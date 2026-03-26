import { DialogComponent } from '@theme/dialog';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function withImageWidth(source, width) {
  if (!source) {
    return '';
  }

  return source.includes('?')
    ? `${source}&width=${width}`
    : `${source}?width=${width}`;
}

class CartDrawer extends DialogComponent {
  onConnect() {
    super.onConnect();

    this.content = this.querySelector('[data-cart-drawer-content]');
    this.subtotal = this.querySelector('[data-cart-subtotal]');
    this.checkoutButton = this.querySelector('[data-cart-checkout-button]');
    this.currencyCode = this.dataset.currencyCode || 'USD';
    this.autoOpen = this.hasAttribute('data-auto-open');

    this.handleCartToggle = () => {
      if (this.dialog?.open) {
        this.close();
      } else {
        this.open();
      }
    };

    this.handleProductSubmit = (event) => {
      const form = event.target.closest('form[data-product-form]');
      if (!form || !form.querySelector('[data-add-to-cart]')) {
        return;
      }

      event.preventDefault();
      this.addProduct(form);
    };

    this.handleDrawerChange = (event) => {
      const input = event.target.closest('quantity-selector input[type="number"]');
      const line = input?.closest('quantity-selector')?.dataset.line;

      if (!input || !line) {
        return;
      }

      this.updateLine(Number(line), Math.max(1, Number(input.value) || 1));
    };

    this.handleDrawerClick = (event) => {
      const removeTrigger = event.target.closest('[data-cart-remove]');

      if (!removeTrigger) {
        return;
      }

      event.preventDefault();
      this.updateLine(Number(removeTrigger.dataset.line), 0);
    };

    this.handleCartUpdated = (event) => {
      const cart = event.detail?.cart;

      if (cart) {
        this.render(cart);
      }

      if (event.type === 'theme:cart:added' && this.autoOpen) {
        this.open();
      }
    };

    document.addEventListener('theme:cart:toggle', this.handleCartToggle);
    document.addEventListener('submit', this.handleProductSubmit);
    document.addEventListener('theme:cart:updated', this.handleCartUpdated);
    document.addEventListener('theme:cart:added', this.handleCartUpdated);
    this.addEventListener('change', this.handleDrawerChange);
    this.addEventListener('click', this.handleDrawerClick);
  }

  onDisconnect() {
    document.removeEventListener('theme:cart:toggle', this.handleCartToggle);
    document.removeEventListener('submit', this.handleProductSubmit);
    document.removeEventListener('theme:cart:updated', this.handleCartUpdated);
    document.removeEventListener('theme:cart:added', this.handleCartUpdated);
    this.removeEventListener('change', this.handleDrawerChange);
    this.removeEventListener('click', this.handleDrawerClick);
    super.onDisconnect();
  }

  get rootUrl() {
    return window.Shopify?.routes?.root || '/';
  }

  formatMoney(amount) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.currencyCode,
    }).format((amount || 0) / 100);
  }

  updateHeaderBadges(itemCount) {
    document.querySelectorAll('.header-cart-badge').forEach((badge) => {
      badge.textContent = String(itemCount);
      badge.classList.toggle('is-hidden', itemCount === 0);
    });
  }

  renderLineItem(item, index) {
    const imageSource = item.featured_image?.url || item.image || '';
    const imageAlt = item.featured_image?.alt || item.product_title || item.title || '';
    const variantTitle = item.variant_title && item.variant_title !== 'Default Title'
      ? `<p class="text-micro text-muted">${escapeHtml(item.variant_title)}</p>`
      : '';
    const comparePrice = item.original_line_price > item.final_line_price
      ? `<s class="price-strikethrough">${this.formatMoney(item.original_line_price)}</s>`
      : '';
    const imageMarkup = imageSource
      ? `<img src="${escapeHtml(withImageWidth(imageSource, 180))}" alt="${escapeHtml(imageAlt)}" class="cart-drawer-item__image" loading="lazy">`
      : '';

    return `
      <article class="cart-drawer-item" data-line="${index + 1}">
        <a href="${escapeHtml(item.url)}" class="cart-drawer-item__media">${imageMarkup}</a>
        <div class="cart-drawer-item__content">
          <div class="cart-drawer-item__copy">
            <a href="${escapeHtml(item.url)}" class="cart-item-title">${escapeHtml(item.product_title)}</a>
            ${variantTitle}
          </div>
          <div class="cart-drawer-item__actions">
            <quantity-selector class="quantity-selector cart-quantity" data-line="${index + 1}">
              <button type="button" class="qty-btn" data-action="decrease" aria-label="Decrease quantity">-</button>
              <input type="number" value="${item.quantity}" min="1" aria-label="Quantity for ${escapeHtml(item.product_title)}">
              <button type="button" class="qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
            </quantity-selector>
            <button type="button" class="cart-line-remove" data-cart-remove data-line="${index + 1}">Remove</button>
          </div>
        </div>
        <div class="cart-drawer-item__price">
          ${comparePrice}
          <span class="price-current">${this.formatMoney(item.final_line_price)}</span>
        </div>
      </article>
    `;
  }

  render(cart) {
    this.currencyCode = cart.currency || this.currencyCode;

    if (this.content) {
      this.content.innerHTML = cart.item_count > 0
        ? `<div class="cart-drawer-items">${cart.items.map((item, index) => this.renderLineItem(item, index)).join('')}</div>`
        : `
          <div class="cart-empty-state">
            <p class="cart-empty-message text-muted">Your bag is empty.</p>
            <a href="${this.rootUrl}collections" class="btn-outline">CONTINUE SHOPPING</a>
          </div>
        `;
    }

    if (this.subtotal) {
      this.subtotal.textContent = this.formatMoney(cart.total_price);
    }

    if (this.checkoutButton) {
      this.checkoutButton.disabled = cart.item_count === 0;
    }

    this.updateHeaderBadges(cart.item_count);
  }

  async fetchCart() {
    const response = await fetch(`${this.rootUrl}cart.js`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cart: ${response.status}`);
    }

    return response.json();
  }

  async addProduct(form) {
    const submitButton = form.querySelector('[data-add-to-cart]');
    const originalLabel = submitButton?.textContent.trim();

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'ADDING...';
      }

      const response = await fetch(`${this.rootUrl}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });

      if (!response.ok) {
        throw new Error(`Failed to add product to cart: ${response.status}`);
      }

      const item = await response.json();
      const cart = await this.fetchCart();

      this.render(cart);
      document.dispatchEvent(new CustomEvent('theme:cart:added', {
        detail: { item, cart },
      }));
      document.dispatchEvent(new CustomEvent('theme:cart:updated', {
        detail: { cart, source: 'cart-drawer' },
      }));
    } catch (_error) {
      if (submitButton && originalLabel) {
        submitButton.textContent = originalLabel;
      }
    } finally {
      if (submitButton && originalLabel) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
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
      this.render(cart);

      document.dispatchEvent(new CustomEvent('theme:cart:updated', {
        detail: { cart, source: 'cart-drawer' },
      }));
    } catch (_error) {
      // Keep the current drawer state when the cart update fails.
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
