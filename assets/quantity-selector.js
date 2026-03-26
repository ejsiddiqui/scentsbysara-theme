import { Component } from '@theme/component';

class QuantitySelector extends Component {
  onConnect() {
    this.input = this.querySelector('input[type="number"]');

    this.handleClick = (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger || !this.contains(trigger) || !this.input) {
        return;
      }

      const currentValue = Number.parseInt(this.input.value || '1', 10) || 1;
      const action = trigger.dataset.action;
      const nextValue = action === 'decrease'
        ? Math.max(1, currentValue - 1)
        : currentValue + 1;

      this.input.value = String(nextValue);
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    this.addEventListener('click', this.handleClick);
  }

  onDisconnect() {
    this.removeEventListener('click', this.handleClick);
  }
}

if (!customElements.get('quantity-selector')) {
  customElements.define('quantity-selector', QuantitySelector);
}
