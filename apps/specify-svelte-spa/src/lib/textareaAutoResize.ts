export function textareaAutoResize(node: HTMLElement) {
	function resize() {
		node.style.height = 'auto';
		node.style.height = node.scrollHeight + 'px';
	}

	node.addEventListener('input', resize);
	resize();

	return {
		destroy() {
			node.removeEventListener('input', resize);
		}
	};
}
