import { Component } from '@theme/component';

class FacetFilters extends Component {
  onConnect() {
    this.form = this.querySelector('[data-facets-form]');
    this.panel = this.querySelector('[data-facets-panel]');
    this.toggle = this.querySelector('[data-facets-toggle]');
    this.requestController = null;

    this.handleChange = (event) => {
      if (event.target.matches('input[type="checkbox"], select[name="sort_by"]')) {
        this.renderSection(this.buildCollectionUrl());
      }
    };

    this.handleSubmit = (event) => {
      if (event.target !== this.form) {
        return;
      }

      event.preventDefault();
      this.renderSection(this.buildCollectionUrl());
    };

    this.handleClick = (event) => {
      const toggle = event.target.closest('[data-facets-toggle]');
      const close = event.target.closest('[data-facets-close]');
      const clear = event.target.closest('[data-clear-filters]');
      const apply = event.target.closest('.collection-filters__apply');
      const paginationLink = event.target.closest('[data-pagination-link]');

      if (toggle) {
        event.preventDefault();
        this.togglePanel();
        return;
      }

      if (close) {
        event.preventDefault();
        this.closePanel();
        return;
      }

      if (clear) {
        event.preventDefault();
        this.renderSection(clear.href);
        return;
      }

      if (apply) {
        event.preventDefault();
        this.closePanel();
        this.renderSection(this.buildCollectionUrl());
        return;
      }

      if (paginationLink) {
        event.preventDefault();
        this.renderSection(paginationLink.href);
      }
    };

    this.handleKeydown = (event) => {
      if (event.key === 'Escape') {
        this.closePanel();
      }
    };

    this.handlePopState = () => {
      this.renderSection(window.location.href, { updateHistory: false });
    };

    this.addEventListener('change', this.handleChange);
    this.addEventListener('submit', this.handleSubmit);
    this.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('popstate', this.handlePopState);
  }

  onDisconnect() {
    this.requestController?.abort();
    this.removeEventListener('change', this.handleChange);
    this.removeEventListener('submit', this.handleSubmit);
    this.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('popstate', this.handlePopState);
  }

  buildCollectionUrl() {
    const url = new URL(this.dataset.collectionUrl || window.location.pathname, window.location.origin);

    url.search = '';

    // Collect form inputs (sort_by)
    if (this.form) {
      const formData = new FormData(this.form);
      for (const [key, value] of formData.entries()) {
        if (value !== '') {
          url.searchParams.append(key, value);
        }
      }
    }

    // Collect filter panel inputs (checkboxes outside the main form)
    if (this.panel) {
      this.panel.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
        if (input.name && input.value) {
          url.searchParams.append(input.name, input.value);
        }
      });

      this.panel.querySelectorAll('input[type="number"]').forEach((input) => {
        if (input.name && input.value !== '') {
          url.searchParams.append(input.name, input.value);
        }
      });
    }

    return url.toString();
  }

  togglePanel(forceOpen) {
    if (!this.panel) {
      return;
    }

    const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : this.panel.hidden;
    this.panel.hidden = !nextOpen;

    if (this.toggle) {
      this.toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    }
  }

  closePanel() {
    this.togglePanel(false);
  }

  async renderSection(nextUrl, options = {}) {
    const updateHistory = options.updateHistory !== false;
    const pageUrl = new URL(nextUrl, window.location.origin);
    const sectionUrl = new URL(pageUrl.toString());

    sectionUrl.searchParams.set('section_id', this.dataset.section);

    this.requestController?.abort();
    this.requestController = new AbortController();
    this.classList.add('is-loading');

    try {
      const response = await fetch(sectionUrl, {
        headers: { Accept: 'text/html' },
        signal: this.requestController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to render collection section: ${response.status}`);
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const nextSection = doc.querySelector('facet-filters[data-collection-section]');

      if (!nextSection) {
        return;
      }

      this.replaceWith(nextSection);

      if (updateHistory) {
        window.history.replaceState({}, '', `${pageUrl.pathname}${pageUrl.search}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.classList.remove('is-loading');
      }
    }
  }
}

if (!customElements.get('facet-filters')) {
  customElements.define('facet-filters', FacetFilters);
}
