let count = $state(0);

export const loadingState = {
  get isLoading(): boolean { return count > 0; },

  start(): void { count++; },

  stop(): void { count = Math.max(0, count - 1); }
};
