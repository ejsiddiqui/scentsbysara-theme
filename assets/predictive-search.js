import { DialogComponent } from '@theme/dialog';

class PredictiveSearch extends DialogComponent {
  onConnect() {
    super.onConnect();
    this.results = this.refs.results;
    this.input = this.refs.input;
    this.abortController = null;

    this.handleDocumentEvent = () => this.open();
    this.handleInput = this.debounce(() => this.fetchResults(), 300);
    this.handleSubmit = () => {
      if (this.input?.value) {
        this.close();
      }
    };

    document.addEventListener('theme:search:open', this.handleDocumentEvent);
    this.input?.addEventListener('input', this.handleInput);
    this.querySelector('form')?.addEventListener('submit', this.handleSubmit);
  }

  onDisconnect() {
    document.removeEventListener('theme:search:open', this.handleDocumentEvent);
    this.input?.removeEventListener('input', this.handleInput);
    this.querySelector('form')?.removeEventListener('submit', this.handleSubmit);
    this.abortController?.abort();
    super.onDisconnect();
  }

  open() {
    super.open();
    queueMicrotask(() => this.input?.focus());
  }

  close() {
    super.close();
    if (this.results) {
      this.results.hidden = true;
      this.results.innerHTML = '';
    }
    this.abortController?.abort();
  }

  async fetchResults() {
    const query = this.input?.value?.trim();

    if (!query) {
      if (this.results) {
        this.results.hidden = true;
        this.results.innerHTML = '';
      }
      return;
    }

    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const url = `${window.Shopify?.routes?.root || '/'}search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product,collection,page&resources[limit]=4&section_id=predictive-search`;
      const response = await fetch(url, {
        signal: this.abortController.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Predictive search failed: ${response.status}`);
      }

      const data = await response.json();
      this.renderResults(query, data.resources?.results || {});
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      if (this.results) {
        this.results.hidden = false;
        this.results.innerHTML = `<p class="search-results-empty">${error.message}</p>`;
      }
    }
  }

  renderResults(query, results) {
    const products = results.products || [];
    const collections = results.collections || [];
    const pages = results.pages || [];
    const hasResults = products.length || collections.length || pages.length;

    if (!this.results) {
      return;
    }

    if (!hasResults) {
      this.results.hidden = false;
      this.results.innerHTML = `<p class="search-results-empty">${this.escapeHtml(this.dataset.noResults || 'No results found for')} ${this.escapeHtml(query)}.</p>`;
      return;
    }

    const productMarkup = products.map((product) => {
      const image = product.featured_image?.url
        ? `<img src="${product.featured_image.url}" alt="${this.escapeHtml(product.title)}" loading="lazy">`
        : '';

      return `
        <a href="${product.url}" class="search-result-card">
          ${image}
          <span>${this.escapeHtml(product.title)}</span>
        </a>
      `;
    }).join('');

    const linkMarkup = (items) => items.map((item) => (
      `<li><a href="${item.url}">${this.escapeHtml(item.title)}</a></li>`
    )).join('');

    this.results.hidden = false;
    this.results.innerHTML = `
      ${products.length ? `<div class="search-results-products">${productMarkup}</div>` : ''}
      ${collections.length ? `<div class="search-results-links"><p class="eyebrow">${this.escapeHtml(this.dataset.collectionsHeading || 'Collections')}</p><ul>${linkMarkup(collections)}</ul></div>` : ''}
      ${pages.length ? `<div class="search-results-links"><p class="eyebrow">${this.escapeHtml(this.dataset.pagesHeading || 'Pages')}</p><ul>${linkMarkup(pages)}</ul></div>` : ''}
    `;
  }

  debounce(callback, wait) {
    let timeout = null;
    return (...args) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => callback.apply(this, args), wait);
    };
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

if (!customElements.get('predictive-search')) {
  customElements.define('predictive-search', PredictiveSearch);
}
