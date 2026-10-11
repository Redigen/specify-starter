<script lang="ts">
  import { tick } from 'svelte';
  import { findBestMatch, type RouteMatch } from './routeMatcher';
  import { screens } from '../generated/screens/index';
  import { isIOS } from './isIOS';
  import { swipeDownHandler } from './swipeDownHandler';
  import { updateTransitionStyle } from './updateTransitionStyle';
  import NotFound from '../generated/screens/NotFound.svelte';

  let currentPath: string = $state(window.location.pathname);
  let match: RouteMatch | null = $derived(findBestMatch(currentPath, screens as any));

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  if (!window.history.state || !window.history.state?.date) {
    const currentLink =
      window.location.pathname +
      (window.location.search || "") +
      (window.location.hash || "");

    window.history.replaceState(
      { ...window.history.state, date: window.history.state?.date || new Date().toISOString(), link: window.history.state?.link || currentLink, frame: window.history.state?.frame || "", animation: window.history.state?.animation || "instant", direction: window.history.state?.direction || "left", easing: window.history.state?.easing || "ease-out", duration: window.history.state?.duration || 300, },
      "",
      window.history.state?.link || currentLink,
    );

    sessionStorage.setItem("navigation", JSON.stringify(window.history.state));
  }

  interface Navigation {
    date: string;
    link: string;
    frame?: string;
    animation: string;
    direction: string;
    easing: string;
    duration: number;
    scrollY?: number;
    scrollX?: number;
  }

  function safeParse<T>(json: string | null): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  $effect(() => {
    let isAnimating = false;
    let pendingEvent: PopStateEvent | null = null;

    const onPopState = async (event: PopStateEvent) => {
      if (isAnimating) {
        pendingEvent = event;
        return;
      }

      isAnimating = true;
      try {
        const html = document.documentElement;
        const currentPage = safeParse<Navigation>(sessionStorage.getItem("navigation"));

        if (!event.state || !document.startViewTransition || (isIOS() && !(window as any).iOSUserTapBackButton)) {
          currentPath = window.location.pathname;
          await tick();
          if (event.state) {
            window.scroll({ top: event.state?.scrollY || -1, left: event.state?.scrollX || 0 });
            sessionStorage.setItem("navigation", JSON.stringify(event.state));
            if (event.state?.direction === "up" && (event.state?.animation === "move-in" || event.state?.animation === "slide-in") ) {
              swipeDownHandler(true, event.state?.frame);
            }
          }
          return;
        }

        if (!currentPage) {
          currentPath = window.location.pathname;
          await tick();
          window.scroll({ top: event.state?.scrollY || -1, left: event.state?.scrollX || 0 });
          sessionStorage.setItem("navigation", JSON.stringify(event.state));
          return;
        }

        if (currentPage.date > event.state.date) {
          // back
          let revertAnimation: string = "instant";
          let revertDirection: string = "right";

          switch(currentPage?.animation) {
            case "slide-in": revertAnimation = "slide-out"; break;
            case "slide-out": revertAnimation = "slide-in"; break;
            case "move-in": revertAnimation = "move-out"; break;
            case "move-out": revertAnimation = "move-in"; break;
            case "push": revertAnimation = "push"; break;
            case "dissolve": revertAnimation = "dissolve"; break;
            default: revertAnimation = "instant"; break;
          }

          switch(currentPage?.direction) {
            case "left": revertDirection = "right"; break;
            case "right": revertDirection = "left"; break;
            case "up": revertDirection = "down"; break;
            case "down": revertDirection = "up"; break;
            default: revertDirection = "right"; break;
          }

          updateTransitionStyle(currentPage?.frame);

          html.style.setProperty('--vt-duration', `${currentPage?.duration}ms`);
          html.style.setProperty('--vt-easing', currentPage?.easing);
          html.dataset.vtAnimation = revertAnimation;
          html.dataset.vtDirection = revertDirection;
        } else if (currentPage.date < event.state.date) {
          // next
          updateTransitionStyle(event.state?.frame);

          html.style.setProperty('--vt-duration', `${event.state?.duration}ms`);
          html.style.setProperty('--vt-easing', event.state?.easing);
          html.dataset.vtAnimation = event.state?.animation;
          html.dataset.vtDirection = event.state?.direction;
        } else {
          currentPath = window.location.pathname;
          await tick();
          window.scroll({ top: event.state?.scrollY || -1, left: event.state?.scrollX || 0 });
          sessionStorage.setItem("navigation", JSON.stringify(event.state));
          if (event.state?.direction === "up" && (event.state?.animation === "move-in" || event.state?.animation === "slide-in")) {
            swipeDownHandler(true, event.state?.frame);
          }
          return;
        }

        const transition = document.startViewTransition(async () => {
          currentPath = window.location.pathname;
          await tick();
          window.scroll({ top: event.state?.scrollY || -1, left: event.state?.scrollX || 0 });
          sessionStorage.setItem("navigation", JSON.stringify(event.state));
        });

        await transition.ready;
        await transition.finished;

        html.style.removeProperty('--vt-duration');
        html.style.removeProperty('--vt-easing');
        html.style.removeProperty('--vt-offset');
        delete html.dataset.vtAnimation;
        delete html.dataset.vtDirection;

        if (event.state?.direction === "up" && (event.state?.animation === "move-in" || event.state?.animation === "slide-in")) {
          swipeDownHandler(true, event.state?.frame);
        }
      } catch (error) {
        console.error("Popstate error:", error);
        currentPath = window.location.pathname;
        await tick();
      } finally {
        isAnimating = false;

        if (pendingEvent) {
          const nextEvent = pendingEvent;
          pendingEvent = null;
          onPopState(nextEvent);
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  // Перехват кликов по ссылкам
  $effect(() => {
    const onClick = (e: MouseEvent): void => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor) e.preventDefault();
    };

    document.body.addEventListener('click', onClick);
    return () => document.body.removeEventListener('click', onClick);
  });
</script>

{#if match}
  <!-- {#key `${match.screen.id}-${JSON.stringify(match.params)}`} -->
    <match.screen.component params={match.params} path={match.matchedUrl} />
  <!-- {/key} -->
{:else}
  <NotFound params='' path='/404' />
{/if}
