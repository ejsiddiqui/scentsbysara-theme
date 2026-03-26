/**
 * Base class for theme custom elements.
 * Collects child refs and provides lifecycle hooks.
 */
export class Component extends HTMLElement {
  constructor() {
    super();
    this._refs = {};
  }

  connectedCallback() {
    this._collectRefs();

    if (typeof this.onConnect === 'function') {
      this.onConnect();
    }
  }

  disconnectedCallback() {
    if (typeof this.onDisconnect === 'function') {
      this.onDisconnect();
    }
  }

  refreshRefs() {
    this._refs = {};
    this._collectRefs();
    return this._refs;
  }

  _collectRefs() {
    this.querySelectorAll('[ref]').forEach((element) => {
      const name = element.getAttribute('ref');

      if (!name) return;

      if (name.endsWith('[]')) {
        const key = name.slice(0, -2);
        this._refs[key] = this._refs[key] || [];
        this._refs[key].push(element);
        return;
      }

      this._refs[name] = element;
    });
  }

  get refs() {
    return this._refs;
  }

  ref(name) {
    return this._refs[name];
  }
}
