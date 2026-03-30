import { Component } from '@theme/component';

class HeaderComponent extends Component {
  onConnect() {
    this.stickyMode = this.dataset.stickyMode || 'none';
    this.lastScrollY = window.scrollY;
    this.ticking = false;

    this.handleClick = (event) => {
      if (event.target.closest('[data-open-mobile-menu]')) {
        event.preventDefault();
        const mobileMenu = document.getElementById(`MobileMenu-${this.dataset.sectionId}`);
        if (mobileMenu) {
          mobileMenu.open();
        }
        return;
      }

      if (event.target.closest('[data-open-search]')) {
        event.preventDefault();
        const searchModal = document.querySelector('predictive-search');
        if (searchModal) {
          searchModal.open();
        }
        return;
      }

      if (event.target.closest('[data-open-cart]')) {
        event.preventDefault();
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) {
          cartDrawer.open();
        }
        return;
      }
    };

    this.handleScroll = () => {
      if (this.ticking) return;

      window.requestAnimationFrame(() => {
        this.updateStickyState();
        this.ticking = false;
      });

      this.ticking = true;
    };

    this.addEventListener('click', this.handleClick);

    if (this.stickyMode !== 'none') {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  onDisconnect() {
    this.removeEventListener('click', this.handleClick);
    window.removeEventListener('scroll', this.handleScroll);
  }

  updateStickyState() {
    const scrollY = window.scrollY;

    if (this.stickyMode === 'always') {
      this.classList.toggle('is-sticky', scrollY > 0);
    } else if (this.stickyMode === 'scroll-up') {
      if (scrollY < this.lastScrollY || scrollY < 50) {
        this.classList.add('is-sticky');
      } else {
        this.classList.remove('is-sticky');
      }
    }

    this.lastScrollY = scrollY;
  }
}

if (!customElements.get('header-component')) {
  customElements.define('header-component', HeaderComponent);
}
