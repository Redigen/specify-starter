/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    _pwaUpdate?: (reloadPage?: boolean) => Promise<void>;
  }
}

export {};
