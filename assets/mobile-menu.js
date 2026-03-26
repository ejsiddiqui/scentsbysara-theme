import { DialogComponent } from '@theme/dialog';

class MobileMenu extends DialogComponent {
  onConnect() {
    super.onConnect();
    this.panels = Array.from(this.querySelectorAll('[data-mobile-panel]'));
    this.mainPanel = this.querySelector('[data-mobile-panel="main"]');
    this.submenuTriggers = Array.from(this.querySelectorAll('[data-mobile-submenu-trigger]'));
    this.activeTrigger = null;

    this.handleDocumentClick = (event) => {
      const openTrigger = event.target.closest(`[data-open-mobile-menu][aria-controls="${this.id}"]`);

      if (openTrigger) {
        event.preventDefault();
        this.open();
        this.openTrigger = openTrigger;
        this.openTrigger.setAttribute('aria-expanded', 'true');
      }

      const subTrigger = event.target.closest('[data-mobile-submenu-trigger]');
      if (subTrigger && this.contains(subTrigger)) {
        const target = subTrigger.getAttribute('data-mobile-submenu-trigger');
        this.activeTrigger = subTrigger;
        this.showPanel(target, subTrigger);
      }

      if (event.target.closest('[data-mobile-back]') && this.contains(event.target)) {
        this.showPanel('main');
      }

      if (event.target.closest('[data-open-search]') && this.contains(event.target)) {
        this.close();
      }
    };

    document.addEventListener('click', this.handleDocumentClick);
  }

  onDisconnect() {
    document.removeEventListener('click', this.handleDocumentClick);
    super.onDisconnect();
  }

  open() {
    super.open();
    this.showPanel('main');
  }

  close() {
    super.close();
    if (this.openTrigger) {
      this.openTrigger.setAttribute('aria-expanded', 'false');
    }
    this.setTriggerState(null);
    this.showPanel('main');
  }

  showPanel(name, trigger = null) {
    this.panels.forEach((panel) => {
      const isActive = panel.getAttribute('data-mobile-panel') === name;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    this.setTriggerState(name === 'main' ? null : trigger || this.activeTrigger);

    if (name === 'main') {
      this.activeTrigger = null;
      this.mainPanel?.querySelector('a,button')?.focus();
      return;
    }

    this.activeTrigger = trigger || this.activeTrigger;
    this.querySelector(`[data-mobile-panel="${name}"] a, [data-mobile-panel="${name}"] button`)?.focus();
  }

  setTriggerState(activeTrigger) {
    this.submenuTriggers.forEach((trigger) => {
      trigger.setAttribute('aria-expanded', trigger === activeTrigger ? 'true' : 'false');
    });
  }
}

if (!customElements.get('mobile-menu')) {
  customElements.define('mobile-menu', MobileMenu);
}
