interface StylesParams {
  duration?: number;
  style?: string;
}

interface AnimationConfig {
  duration: number;
  tick: (t: number) => void;
}

export function stylesIn(
  node: HTMLElement,
  { duration = 300, style = '' }: StylesParams
): AnimationConfig {
  const originalCss = node.style.cssText;

  node.style.cssText = `${originalCss}; ${style}`;

  // Force reflow to ensure styles are applied before removal
  void node.offsetWidth;

  requestAnimationFrame(() => {
    node.style.cssText = originalCss;
  });

  return {
    duration,
    tick: () => {}
  };
}

export function stylesOut(
  node: HTMLElement,
  { duration = 300, style = '' }: StylesParams
): AnimationConfig {
  node.style.cssText += `; ${style}`;

  return {
    duration,
    tick: () => {}
  };
}
