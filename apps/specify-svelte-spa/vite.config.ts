import { defineConfig } from "vite";
import svg from '@poppanator/sveltekit-svg';
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from 'vite-plugin-pwa';
import specifyPlugin from "../../packages/vite-plugin-specify-svelte-spa/src/index.ts";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      '$assets': path.resolve(__dirname, '../../assets'),
    },
  },
  plugins: [
    specifyPlugin({
      specsDir: path.resolve(__dirname, "../../specs"),
      appDir: path.resolve(__dirname, "./"),
      generatedDir: path.resolve(__dirname, "./src/generated"),
    }),
    svg(),
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5242880
      }
    }),
  ]
});
