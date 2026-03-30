import { Component } from '@theme/component';

class MobileMenu extends Component {
  onConnect() {
    this.dialog = this.refs.dialog || this.querySelector('dialog');
    this.closeButtons = Array.from(this.querySelectorAll('[data-menu-close], [data-dialog-close]'));

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

    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('click', this.handleDialogClick);

    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', this.handleCloseClick);
    });
  }

  onDisconnect() {
    if (!this.dialog) return;

    this.dialog.removeEventListener('cancel', this.handleCancel);
    this.dialog.removeEventListener('click', this.handleDialogClick);

    this.closeButtons?.forEach((btn) => {
      btn.removeEventListener('click', this.handleCloseClick);
    });
  }

  open() {
    if (!this.dialog || this.dialog.open) return;

    this.dialog.showModal();
    document.documentElement.classList.add('dialog-open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.dialog || !this.dialog.open) return;

    this.dialog.close();
    document.documentElement.classList.remove('dialog-open');
    document.body.style.overflow = '';
  }
}

if (!customElements.get('mobile-menu')) {
  customElements.define('mobile-menu', MobileMenu);
}
