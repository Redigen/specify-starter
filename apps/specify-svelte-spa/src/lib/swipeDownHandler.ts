import { isIOS } from "./isIOS";

type TouchState = {
  startY: number;
  isSwiping: boolean;
  listenersAttached: boolean;
  currentElement: HTMLElement | null;
};

const MIN_SWIPE_DISTANCE = 60;
const SCROLL_THRESHOLD = 30;

const state: TouchState = {
  startY: 0,
  isSwiping: false,
  listenersAttached: false,
  currentElement: null,
};

function getTouchY(e: TouchEvent): number {
  return e.touches[0]?.pageY ?? e.changedTouches[0]?.pageY ?? 0;
}

function touchStartHandler(this: HTMLElement, e: TouchEvent): void {
  if (window.scrollY > SCROLL_THRESHOLD) return;

  state.startY = getTouchY(e);
  state.isSwiping = false;
}

function touchMoveHandler(this: HTMLElement, e: TouchEvent): void {
  if (state.isSwiping || window.scrollY > SCROLL_THRESHOLD) return;

  const distanceY = getTouchY(e) - state.startY;

  if (distanceY > 0) {
    e.preventDefault();
    this.style.marginTop = `${distanceY}px`;
  }

  if (distanceY >= MIN_SWIPE_DISTANCE) {
    state.isSwiping = true;

    if (isIOS()) {
      (window as any).iOSUserTapBackButton = true;
      setTimeout(function () {
        (window as any).iOSUserTapBackButton = false;
      }, 300);
    }
    document.documentElement.style.setProperty('--vt-offset', `${MIN_SWIPE_DISTANCE}px`);
    history.back();
  }
}

function touchEndHandler(this: HTMLElement): void {
  if (state.isSwiping) return;

  this.style.transition = 'margin 300ms cubic-bezier(0.165, 0.840, 0.440, 1)';
  this.style.marginTop = '0px';

  const onTransitionEnd = () => {
    this.style.transition = '';
    this.removeEventListener('transitionend', onTransitionEnd);
  };
  this.addEventListener('transitionend', onTransitionEnd);
}

function popstateHandler(): void {
  detachListeners();
}

function attachListeners(element: HTMLElement): void {
  if (state.listenersAttached) return;

  element.addEventListener('touchstart', touchStartHandler, { passive: false });
  element.addEventListener('touchmove', touchMoveHandler, { passive: false });
  element.addEventListener('touchend', touchEndHandler);
  window.addEventListener('popstate', popstateHandler, { once: true });

  state.currentElement = element;
  state.listenersAttached = true;
}

function detachListeners(): void {
  if (!state.listenersAttached || !state.currentElement) return;

  const element = state.currentElement;

  element.removeEventListener('touchstart', touchStartHandler);
  element.removeEventListener('touchmove', touchMoveHandler);
  element.removeEventListener('touchend', touchEndHandler);

  element.style.marginTop = '';
  element.style.transition = '';

  state.currentElement = null;
  state.listenersAttached = false;
  state.isSwiping = false;
}

export function swipeDownHandler(enabled: boolean, elementId: string = 'app'): void {
  const element = document.getElementById(elementId ? elementId : "app");
  if (!element) {
    throw new Error(`swipeDownHandler: element #${elementId} not found`);
  }

  if (enabled) {
    attachListeners(element);
  } else {
    detachListeners();
  }
}
