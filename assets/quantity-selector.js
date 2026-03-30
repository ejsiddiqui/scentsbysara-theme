import { Component } from '@theme/component';

class QuantitySelector extends Component {
  onConnect() {
    this.input = this.querySelector('input[type="number"]');
    this.decreaseBtn = this.querySelector('[data-action="decrease"]');
    this.increaseBtn = this.querySelector('[data-action="increase"]');

    if (!this.input) return;

    this.handleDecrease = () => {
      const current = parseInt(this.input.value, 10) || 1;
      const min = parseInt(this.input.min, 10) || 1;
      const next = Math.max(min, current - 1);
      if (next !== current) {
        this.input.value = next;
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    this.handleIncrease = () => {
      const current = parseInt(this.input.value, 10) || 1;
      this.input.value = current + 1;
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (this.decreaseBtn) {
      this.decreaseBtn.addEventListener('click', this.handleDecrease);
    }

    if (this.increaseBtn) {
      this.increaseBtn.addEventListener('click', this.handleIncrease);
    }
  }

  onDisconnect() {
    if (this.decreaseBtn) {
      this.decreaseBtn.removeEventListener('click', this.handleDecrease);
    }

    if (this.increaseBtn) {
      this.increaseBtn.removeEventListener('click', this.handleIncrease);
    }
  }
}

if (!customElements.get('quantity-selector')) {
  customElements.define('quantity-selector', QuantitySelector);
}
