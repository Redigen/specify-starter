import { isIOS } from "./isIOS";
import { swipeDownHandler } from "./swipeDownHandler";
import { updateTransitionStyle } from "./updateTransitionStyle";

export function navigateBack(fallbackLink: string) {
  if (window.history.length > 1) {
    if (isIOS()) {
      (window as any).iOSUserTapBackButton = true;
      setTimeout(function () {
        (window as any).iOSUserTapBackButton = false;
      }, 300);
    }
    window.history.back();
    return;
  }

  window.history.replaceState(
    { date: new Date().toISOString(), link: fallbackLink, frame: "", animation: "instant", direction: "left", easing: "ease-out", duration: 300, scrollY: -1, scrollX: 0 },
    null as any,
    fallbackLink,
  );
  sessionStorage.setItem("navigation", JSON.stringify(window.history.state));
  window.scroll({ top: 0, left: 0 });
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export async function navigateTo(link: string, frame: string = "", animation: "instant" | "slide-in" | "slide-out" | "move-in" | "move-out" | "push" | "dissolve" = "instant", direction: "left" | "right" | "up" | "down" = "left", easing: string = "ease-out", duration: number = 300, target: "_self" | "_blank" = "_self") {
  if (link.startsWith("http") || target === '_blank') {
    window.open(link, target);
    return;
  } else if (link.startsWith("tel:") || link.startsWith("mailto:")) {
    window.location.href = link;
    return;
  }

  updateTransitionStyle(frame);

  const html = document.documentElement;
  const currentScrollY = window.scrollY;
  const currentScrollX = window.scrollX;
  const currentLink =
    window.location.pathname +
    (window.location.search || "") +
    (window.location.hash || "");

  window.history.replaceState(
    { ...window.history.state, date: window.history.state?.date || new Date().toISOString(), link: window.history.state?.link || currentLink, frame: window.history.state?.frame || "", animation: window.history.state?.animation || "instant", direction: window.history.state?.direction || "left", easing: window.history.state?.easing || "ease-out", duration: window.history.state?.duration || 300, scrollY: currentScrollY, scrollX: currentScrollX },
    null as any,
    window.history.state?.link || currentLink,
  );

  if (!document.startViewTransition || animation === "instant") {
    window.history.pushState(
      { date: new Date().toISOString(), link, frame, animation, direction, easing, duration },
      "",
      link
    );
    sessionStorage.setItem("navigation", JSON.stringify(window.history.state));
    window.scroll({ top: -1, left: 0 });
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  // Устанавливаем CSS-переменные ДО вызова startViewTransition
  html.style.setProperty('--vt-duration', `${duration}ms`);
  html.style.setProperty('--vt-easing', easing);

  // Тип анимации как data-атрибут для селекторов
  html.dataset.vtAnimation = animation;
  html.dataset.vtDirection = direction;

  const transition = document.startViewTransition(() => {
    window.history.pushState(
      { date: new Date().toISOString(), link: link, frame: frame, animation: animation, direction: direction, easing: easing, duration: duration },
      "",
      link,
    );
    sessionStorage.setItem("navigation", JSON.stringify(window.history.state));
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scroll({ top: -1, left: 0 });
  });

  await transition.ready;

  // Очистка после завершения
  await transition.finished;
  html.style.removeProperty('--vt-duration');
  html.style.removeProperty('--vt-easing');
  html.style.removeProperty('--vt-offset');
  delete html.dataset.vtAnimation;
  delete html.dataset.vtDirection;

  if (direction === "up" && (animation === "move-in" || animation === "slide-in") ) {
    swipeDownHandler(true, frame);
  }
}

export function scrollToElement(id: string, animation: "instant" | "smooth" = "smooth") {
  if (typeof document === 'undefined') return;

  const behavior = animation === 'instant' ? 'instant' : 'smooth';

  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}
