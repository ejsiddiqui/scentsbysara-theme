import { Component } from '@theme/component';

class HeaderComponent extends Component {
  onConnect() {
    this.stickyMode = this.dataset.stickyMode || 'none';
    this.lastScrollY = window.scrollY;
    this.ticking = false;
    this.siteHeader = this.querySelector('.site-header');

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
    const SCROLL_THRESHOLD = 8;
    const scrollY = window.scrollY;
    const delta = scrollY - this.lastScrollY;

    if (scrollY <= 0) {
      this.classList.remove('is-sticky', 'is-hidden');
      if (this.siteHeader) this.siteHeader.classList.remove('header-scrolled');
    } else if (delta > SCROLL_THRESHOLD) {
      this.classList.add('is-hidden');
      this.classList.remove('is-sticky');
      if (this.siteHeader) this.siteHeader.classList.remove('header-scrolled');
    } else if (delta < -SCROLL_THRESHOLD) {
      this.classList.remove('is-hidden');
      this.classList.add('is-sticky');
      if (this.siteHeader) this.siteHeader.classList.add('header-scrolled');
    }

    this.lastScrollY = scrollY;
  }
}

if (!customElements.get('header-component')) {
  customElements.define('header-component', HeaderComponent);
}
