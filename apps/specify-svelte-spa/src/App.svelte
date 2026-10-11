<script lang="ts">
  import Router from './lib/Router.svelte';
  import { theme } from './stores/theme.svelte';
  import { initImageFormat } from './lib/supportedImageFormat';
  initImageFormat();

  import { networkState } from './stores/networkState.svelte';
  $effect(() => {
    networkState.init();
    return () => networkState.destroy();
  });

  import { syncQueue } from './stores/syncQueue.svelte';
  syncQueue.init();

  import { loadingState } from './stores/loadingState.svelte';
  import SpinnerLg from './generated/components/SpinnerLg.svelte';

  import { notifications } from './stores/notifications.svelte';
  import SnackbarList from './generated/components/SnackbarList.svelte';

  if (!localStorage.getItem("cookie-agreement")) {
    notifications.add({type: "cookie", message: { "ru": "На сайте используются cookie", "en": "This website uses cookies" }, duration: 0});
  }
</script>

<Router />
{#if loadingState.isLoading}
  <SpinnerLg />
{/if}
{#if notifications.items.length > 0}
  <SnackbarList notifications={notifications.items} />
{/if}
