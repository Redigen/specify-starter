import type { Action } from 'svelte/action';
import IMask from 'imask';

export const useFormat: Action<HTMLInputElement | HTMLTextAreaElement, string | RegExp | undefined> = (node, maskValue) => {
  let imaskInstance: ReturnType<typeof IMask> | null = null;
  let isDispatching = false;

  // Общая функция для синхронизации значения с Svelte
  const syncSvelte = () => {
    if (isDispatching) return;
    isDispatching = true;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    isDispatching = false;
  };

  const setup = (currentMask: string | RegExp | undefined) => {
    if (imaskInstance) {
      node.removeEventListener('input', syncSvelte);
      imaskInstance.destroy();
      imaskInstance = null;
    }

    let maskOptions: Record<string, any> | null = null;

    if (currentMask) {
      maskOptions = { mask: currentMask };

      if (typeof currentMask === 'string') {
        maskOptions.lazy = true;
      }
    }
    else {
      const inputmode = node.getAttribute('inputmode');

      if (inputmode === 'numeric') {
        maskOptions = { mask: /^\d+$/ };
      } else if (inputmode === 'decimal') {
        maskOptions = {
          mask: /^\d*[.,]?\d*$/,
          prepare: (str: string) => str.replace(/,/g, '.')
        };
      }
    }

    if (maskOptions) {
      imaskInstance = IMask(node, maskOptions);
      imaskInstance.on('accept', syncSvelte);
      node.addEventListener('input', syncSvelte);
    }
  };

  setup(maskValue);

  return {
    update(newMask) {
      setup(newMask);
    },
    destroy() {
      if (imaskInstance) {
        node.removeEventListener('input', syncSvelte);
        imaskInstance.destroy();
      }
    }
  };
};
