import { Component } from '@theme/component';

class MobileMenu extends Component {
  onConnect() {
    this.dialog = this.refs.dialog || this.querySelector('dialog');
    this.closeButtons = Array.from(this.querySelectorAll('[data-menu-close], [data-dialog-close]'));
    this.track = this.querySelector('.mobile-panels-track');
    this.activeSubPanel = null;

    if (!this.dialog) return;

    this.handleCancel = (event) => {
      event.preventDefault();
      this.close();
    };

    this.handleDialogClick = (event) => {
      if (event.target === this.dialog) {
        this.close();
      }
    };

    this.handleCloseClick = () => {
      this.close();
    };

    this.handlePanelClick = (event) => {
      const trigger = event.target.closest('[data-mobile-submenu-trigger]');
      if (trigger) {
        const handle = trigger.dataset.mobileSubmenuTrigger;
        this.openSubPanel(handle);
        return;
      }

      const backBtn = event.target.closest('[data-mobile-back]');
      if (backBtn) {
        this.closeSubPanel();
      }
    };

    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('click', this.handleDialogClick);
    this.addEventListener('click', this.handlePanelClick);

    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', this.handleCloseClick);
    });
  }

  onDisconnect() {
    if (!this.dialog) return;

    this.dialog.removeEventListener('cancel', this.handleCancel);
    this.dialog.removeEventListener('click', this.handleDialogClick);
    this.removeEventListener('click', this.handlePanelClick);

    this.closeButtons?.forEach((btn) => {
      btn.removeEventListener('click', this.handleCloseClick);
    });
  }

  openSubPanel(handle) {
    if (!this.track) return;

    const subPanel = this.querySelector(`[data-mobile-panel="${handle}"]`);
    if (!subPanel) return;

    if (this.activeSubPanel && this.activeSubPanel !== subPanel) {
      this.activeSubPanel.setAttribute('aria-hidden', 'true');
    }

    this.activeSubPanel = subPanel;
    subPanel.setAttribute('aria-hidden', 'false');
    this.track.classList.add('submenu-active');

    const trigger = this.querySelector(`[data-mobile-submenu-trigger="${handle}"]`);
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  closeSubPanel() {
    if (!this.track) return;

    this.track.classList.remove('submenu-active');

    if (this.activeSubPanel) {
      this.activeSubPanel.setAttribute('aria-hidden', 'true');

      const panelHandle = this.activeSubPanel.dataset.mobilePanel;
      const trigger = this.querySelector(`[data-mobile-submenu-trigger="${panelHandle}"]`);
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      this.activeSubPanel = null;
    }
  }

  open() {
    if (!this.dialog || this.dialog.open) return;

    this.dialog.showModal();
    document.documentElement.classList.add('dialog-open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.dialog || !this.dialog.open) return;

    this.closeSubPanel();
    this.dialog.close();
    document.documentElement.classList.remove('dialog-open');
    document.body.style.overflow = '';
  }
}

if (!customElements.get('mobile-menu')) {
  customElements.define('mobile-menu', MobileMenu);
}
