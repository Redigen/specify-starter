export function updateTransitionStyle(frame?: string): void {
  const styleTag = document.getElementById('transitionName');

  if (!styleTag) {
    return;
  }

  const selector = frame ? `#${frame}` : ':root';

  styleTag.textContent = `
    ${selector} {
      view-transition-name: frame;
    }
  `;
}
