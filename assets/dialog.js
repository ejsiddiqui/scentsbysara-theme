import { Component } from '@theme/component';

export class DialogComponent extends Component {
  onConnect() {
    this.dialog = this.querySelector('dialog');

    if (!this.dialog) {
      return;
    }

    this.handleCancel = (event) => {
      event.preventDefault();
      this.close();
    };

    this.handleDialogClick = (event) => {
      if (event.target === this.dialog || event.target.closest('[data-dialog-close]')) {
        this.close();
      }
    };

    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('click', this.handleDialogClick);
  }

  onDisconnect() {
    if (!this.dialog) {
      return;
    }

    this.dialog.removeEventListener('cancel', this.handleCancel);
    this.dialog.removeEventListener('click', this.handleDialogClick);
  }

  open() {
    if (!this.dialog || this.dialog.open) {
      return;
    }

    this.dialog.showModal();
    document.documentElement.classList.add('dialog-open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.dialog || !this.dialog.open) {
      return;
    }

    this.dialog.close();
    document.documentElement.classList.remove('dialog-open');
    document.body.style.overflow = '';
  }
}

if (!customElements.get('dialog-component')) {
  customElements.define('dialog-component', DialogComponent);
}
