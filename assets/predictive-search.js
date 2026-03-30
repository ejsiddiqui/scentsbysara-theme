import { Component } from '@theme/component';

class PredictiveSearch extends Component {
  onConnect() {
    this.dialog = this.refs.dialog || this.querySelector('dialog');
    this.input = this.refs.input || this.querySelector('input[type="search"]');
    this.results = this.refs.results || this.querySelector('[ref="results"]');
    this.closeBtn = this.refs.close || this.querySelector('[data-dialog-close]');
    this.searchController = null;
    this.debounceTimer = null;

    this.collectionsHeading = this.dataset.collectionsHeading || 'Collections';
    this.pagesHeading = this.dataset.pagesHeading || 'Pages';
    this.noResults = this.dataset.noResults || 'No results found.';

    if (!this.dialog) return;

    this.handleCancel = (event) => {
      event.preventDefault();
      this.close();
    };

    this.handleDialogClick = (event) => {
      if (event.target === this.dialog || event.target.closest('[data-dialog-close]')) {
        this.close();
      }
    };

    this.handleInput = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.fetchResults(this.input.value.trim());
      }, 300);
    };

    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('click', this.handleDialogClick);

    if (this.input) {
      this.input.addEventListener('input', this.handleInput);
    }
  }

  onDisconnect() {
    this.searchController?.abort();
    clearTimeout(this.debounceTimer);

    if (!this.dialog) return;

    this.dialog.removeEventListener('cancel', this.handleCancel);
    this.dialog.removeEventListener('click', this.handleDialogClick);

    if (this.input) {
      this.input.removeEventListener('input', this.handleInput);
    }
  }

  open() {
    if (!this.dialog || this.dialog.open) return;

    this.dialog.showModal();
    document.documentElement.classList.add('dialog-open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (this.input) this.input.focus();
    }, 50);
  }

  close() {
    if (!this.dialog || !this.dialog.open) return;

    this.dialog.close();
    document.documentElement.classList.remove('dialog-open');
    document.body.style.overflow = '';

    if (this.input) this.input.value = '';
    if (this.results) {
      this.results.hidden = true;
      this.results.innerHTML = '';
    }
  }

  async fetchResults(query) {
    if (!this.results) return;

    if (!query || query.length < 2) {
      this.results.hidden = true;
      this.results.innerHTML = '';
      return;
    }

    this.searchController?.abort();
    this.searchController = new AbortController();

    try {
      const url = new URL('/search/suggest.json', window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('resources[type]', 'product,page,collection');
      url.searchParams.set('resources[limit]', '4');

      const response = await fetch(url, { signal: this.searchController.signal });

      if (!response.ok) return;

      const data = await response.json();
      this.renderResults(data.resources?.results || {});
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.results.hidden = true;
      }
    }
  }

  renderResults(results) {
    if (!this.results) return;

    const products = results.products || [];
    const collections = results.collections || [];
    const pages = results.pages || [];

    if (!products.length && !collections.length && !pages.length) {
      this.results.hidden = false;
      this.results.innerHTML = `<p class="search-no-results">${this.noResults}</p>`;
      return;
    }

    let html = '';

    if (products.length) {
      html += '<div class="search-results-group">';
      products.forEach((product) => {
        const image = product.featured_image?.url
          ? `<img src="${product.featured_image.url}&width=80" alt="${product.title}" width="40" height="40" loading="lazy">`
          : '<div class="search-result-placeholder"></div>';
        html += `
          <a href="${product.url}" class="search-result-item">
            <div class="search-result-media">${image}</div>
            <div class="search-result-info">
              <span class="search-result-title">${product.title}</span>
              ${product.price ? `<span class="search-result-price">${this.formatMoney(product.price)}</span>` : ''}
            </div>
          </a>`;
      });
      html += '</div>';
    }

    if (collections.length) {
      html += `<div class="search-results-group"><p class="search-results-label">${this.collectionsHeading}</p>`;
      collections.forEach((item) => {
        html += `<a href="${item.url}" class="search-result-item search-result-item--compact"><span>${item.title}</span></a>`;
      });
      html += '</div>';
    }

    if (pages.length) {
      html += `<div class="search-results-group"><p class="search-results-label">${this.pagesHeading}</p>`;
      pages.forEach((item) => {
        html += `<a href="${item.url}" class="search-result-item search-result-item--compact"><span>${item.title}</span></a>`;
      });
      html += '</div>';
    }

    this.results.hidden = false;
    this.results.innerHTML = html;
  }

  formatMoney(cents) {
    const amount = (cents / 100).toFixed(2);
    return `£${amount}`;
  }
}

if (!customElements.get('predictive-search')) {
  customElements.define('predictive-search', PredictiveSearch);
}
