export function pressEffect(node: HTMLElement) {
  const onDown = () => node.classList.add("pressed");
  const onUp = () => node.classList.remove("pressed");

  node.addEventListener("pointerdown", onDown);
  node.addEventListener("pointerup", onUp);
  node.addEventListener("pointerleave", onUp);

  return {
    destroy() {
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointerleave", onUp);
    },
  };
}
