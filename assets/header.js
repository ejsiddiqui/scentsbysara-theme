import { Component } from '@theme/component';

class HeaderComponent extends Component {
  onConnect() {
    this.stickyMode = this.dataset.stickyMode || 'always';
    this.cartType = this.dataset.cartType || 'page';
    this.lastScrollY = window.scrollY;
    this.menuItems = Array.from(this.querySelectorAll('[data-nav-item-has-children]'));

    this.handleResize = () => this.updateHeaderHeight();
    this.handleScroll = () => this.updateStickyState();
    this.handleSearchClick = (event) => {
      if (!event.target.closest('[data-open-search]')) {
        return;
      }

      event.preventDefault();
      document.dispatchEvent(new CustomEvent('theme:search:open'));
    };
    this.handleCartClick = (event) => {
      if (!event.target.closest('[data-open-cart]') || this.cartType !== 'drawer') {
        return;
      }

      event.preventDefault();
      document.dispatchEvent(new CustomEvent('theme:cart:toggle'));
    };
    this.handleKeydown = (event) => {
      if (event.key === 'Escape') {
        this.menuItems.forEach((item) => item.classList.remove('is-menu-open'));
      }
    };
    this.handleFocusIn = (event) => {
      const activeItem = event.target.closest('[data-nav-item-has-children]');
      this.menuItems.forEach((item) => item.classList.toggle('is-menu-open', item === activeItem));
    };
    this.handlePointerLeave = (event) => event.currentTarget.classList.remove('is-menu-open');
    this.handleMobileMenuClick = (event) => {
      if (!event.target.closest('[data-open-mobile-menu]')) {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.addEventListener('click', this.handleSearchClick);
    this.addEventListener('click', this.handleCartClick);
    this.addEventListener('click', this.handleMobileMenuClick);
    this.addEventListener('keydown', this.handleKeydown);
    this.addEventListener('focusin', this.handleFocusIn);
    this.menuItems.forEach((item) => item.addEventListener('pointerleave', this.handlePointerLeave));

    this.resizeObserver = new ResizeObserver(() => this.updateHeaderHeight());
    this.resizeObserver.observe(this);
    this.updateHeaderHeight();
    this.updateStickyState();
  }

  onDisconnect() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);
    this.removeEventListener('click', this.handleSearchClick);
    this.removeEventListener('click', this.handleCartClick);
    this.removeEventListener('click', this.handleMobileMenuClick);
    this.removeEventListener('keydown', this.handleKeydown);
    this.removeEventListener('focusin', this.handleFocusIn);
    this.menuItems.forEach((item) => item.removeEventListener('pointerleave', this.handlePointerLeave));
    this.resizeObserver?.disconnect();
  }

  updateHeaderHeight() {
    document.documentElement.style.setProperty('--header-height', `${Math.round(this.offsetHeight)}px`);
  }

  updateStickyState() {
    if (this.stickyMode === 'none') {
      this.classList.remove('is-sticky', 'is-hidden');
      return;
    }

    this.classList.add('is-sticky');

    if (this.stickyMode !== 'scroll-up') {
      this.classList.remove('is-hidden');
      return;
    }

    const currentScrollY = window.scrollY;
    const shouldHide = currentScrollY > this.lastScrollY && currentScrollY > this.offsetHeight;

    this.classList.toggle('is-hidden', shouldHide);
    this.lastScrollY = currentScrollY;
  }
}

if (!customElements.get('header-component')) {
  customElements.define('header-component', HeaderComponent);
}
