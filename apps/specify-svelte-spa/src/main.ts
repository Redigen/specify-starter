import { mount } from "svelte";
import "generated/tokens.css";
import "./app.css";
import App from "./App.svelte";
import { registerSW } from 'virtual:pwa-register';
import { notifications } from "./stores/notifications.svelte";

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('SW waiting');

    window._pwaUpdate = updateSW;
    notifications.add({type: "update", message: { "ru": "Доступно обновление, необходимо перезагрузить страницу для установки", "en": "A new version is available. Reload to update" }, duration: 0});
  },

  onOfflineReady() {
    console.log('SW activated');
  },

  onRegistered(registration) {
    // registration здесь имеет тип ServiceWorkerRegistration | undefined
    if (registration) {
      console.log('SW registered with scope:', registration.scope);

      // Ваша проверка обновлений каждые 60 минут
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    }
  },

  onRegisterError(error) {
    console.error('SW registration failed:', error);
  }
});

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
