declare module '*.svg' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}
