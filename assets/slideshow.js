import { Component } from '@theme/component';

class SlideshowComponent extends Component {
  onConnect() {
    this.slides = Array.from(this.querySelectorAll('[data-slide]'));
    this.dots = Array.from(this.querySelectorAll('[data-slide-index]'));
    this.prevButtons = Array.from(this.querySelectorAll('[data-slideshow-prev]'));
    this.nextButtons = Array.from(this.querySelectorAll('[data-slideshow-next]'));
    this.autoplayEnabled = this.dataset.autoplay === 'true';
    this.interval = Math.max(3, Number.parseInt(this.dataset.interval || '5', 10) || 5) * 1000;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.activeIndex = 0;
    this.timer = null;
    this.isPaused = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchTracking = false;

    if (!this.slides.length) {
      return;
    }

    this.handleDotClick = (event) => {
      const dot = event.target.closest('[data-slide-index]');
      if (!dot) return;
      event.preventDefault();
      this.goTo(Number.parseInt(dot.dataset.slideIndex, 10));
    };

    this.handlePrev = (event) => {
      if (!event.target.closest('[data-slideshow-prev]')) return;
      event.preventDefault();
      this.prev();
    };

    this.handleNext = (event) => {
      if (!event.target.closest('[data-slideshow-next]')) return;
      event.preventDefault();
      this.next();
    };

    this.handlePointerDown = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return;
      if (this.slides.length < 2) return;

      this.touchTracking = true;
      this.touchStartX = event.clientX;
      this.touchStartY = event.clientY;
      try { this.setPointerCapture(event.pointerId); } catch (_) {}
    };

    this.handlePointerUp = (event) => {
      if (!this.touchTracking) return;

      const deltaX = event.clientX - this.touchStartX;
      const deltaY = event.clientY - this.touchStartY;
      this.touchTracking = false;

      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        this.next();
      } else {
        this.prev();
      }
    };

    this.handlePointerCancel = () => {
      this.touchTracking = false;
    };

    this.handlePause = () => this.pause();
    this.handleResume = () => this.resume();

    this.addEventListener('click', this.handleDotClick);
    this.addEventListener('click', this.handlePrev);
    this.addEventListener('click', this.handleNext);
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.addEventListener('pointerup', this.handlePointerUp);
    this.addEventListener('pointercancel', this.handlePointerCancel);
    this.addEventListener('pointerleave', this.handlePointerCancel);
    this.addEventListener('mouseenter', this.handlePause);
    this.addEventListener('mouseleave', this.handleResume);
    this.addEventListener('focusin', this.handlePause);
    this.addEventListener('focusout', this.handleFocusOut = (event) => {
      if (this.contains(event.relatedTarget)) return;
      this.resume();
    });

    this.setActive(0, false);

    if (this.autoplayEnabled && !this.reducedMotion && this.slides.length > 1) {
      this.play();
    }
  }

  onDisconnect() {
    this.stop();
    this.removeEventListener('click', this.handleDotClick);
    this.removeEventListener('click', this.handlePrev);
    this.removeEventListener('click', this.handleNext);
    this.removeEventListener('pointerdown', this.handlePointerDown);
    this.removeEventListener('pointerup', this.handlePointerUp);
    this.removeEventListener('pointercancel', this.handlePointerCancel);
    this.removeEventListener('pointerleave', this.handlePointerCancel);
    this.removeEventListener('mouseenter', this.handlePause);
    this.removeEventListener('mouseleave', this.handleResume);
    this.removeEventListener('focusin', this.handlePause);
    this.removeEventListener('focusout', this.handleFocusOut);
  }

  play() {
    this.stop();

    if (!this.autoplayEnabled || this.reducedMotion || this.slides.length < 2 || this.isPaused) {
      return;
    }

    this.timer = window.setInterval(() => {
      if (!this.isPaused) {
        this.next();
      }
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  pause() {
    this.isPaused = true;
    this.stop();
  }

  resume() {
    this.isPaused = false;

    if (this.autoplayEnabled && !this.reducedMotion && this.slides.length > 1) {
      this.play();
    }
  }

  next() {
    this.goTo((this.activeIndex + 1) % this.slides.length);
  }

  prev() {
    this.goTo((this.activeIndex - 1 + this.slides.length) % this.slides.length);
  }

  goTo(index) {
    const nextIndex = Number.isFinite(index) ? index : 0;
    const clampedIndex = ((nextIndex % this.slides.length) + this.slides.length) % this.slides.length;
    this.setActive(clampedIndex, true);
  }

  setActive(index, userInitiated) {
    this.activeIndex = index;

    this.slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.tabIndex = isActive ? 0 : -1;
      this.syncInteractiveState(slide, isActive);
    });

    this.dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', String(isActive));
      dot.tabIndex = isActive ? 0 : -1;
    });

    if (userInitiated && this.autoplayEnabled && !this.reducedMotion && !this.isPaused) {
      this.play();
    }
  }

  syncInteractiveState(slide, isActive) {
    slide.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((element) => {
      if (element === slide) return;

      if (isActive) {
        if (element.hasAttribute('data-tabindex-restore')) {
          const original = element.getAttribute('data-tabindex-restore');
          if (original === '') {
            element.removeAttribute('tabindex');
          } else {
            element.setAttribute('tabindex', original);
          }
          element.removeAttribute('data-tabindex-restore');
        } else if (element.getAttribute('tabindex') === '-1') {
          element.removeAttribute('tabindex');
        }
        return;
      }

      if (!element.hasAttribute('data-tabindex-restore')) {
        element.setAttribute('data-tabindex-restore', element.getAttribute('tabindex') || '');
      }

      element.setAttribute('tabindex', '-1');
    });
  }
}

if (!customElements.get('slideshow-component')) {
  customElements.define('slideshow-component', SlideshowComponent);
}
