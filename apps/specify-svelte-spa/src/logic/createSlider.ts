export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number, percent: number) => void;
}

export interface SliderRefs {
  track: HTMLElement;
  progress: HTMLElement;
  handle: HTMLElement;
}

const cache = new WeakMap<HTMLElement, any>();

export function createSlider(refs: SliderRefs, props: SliderProps) {
  const { track, progress, handle } = refs;

  let state = cache.get(track);

  if (state) {
    state.props = props;
    if (state.value !== props.value && !state.dragging) {
      state.value = props.value;
      state.render();
    }
    return state.api;
  }

  state = {
    props,
    min: props.min ?? 0,
    max: props.max ?? 100,
    step: props.step ?? 1,
    value: props.value ?? props.min ?? 0,
    dragging: false,
    api: {} as any
  };
  cache.set(track, state);

  const getConfig = () => ({
    min: state.props.min ?? 0,
    max: state.props.max ?? 100,
    step: state.props.step ?? 1
  });

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));

  const valueToPercent = (v: number): number => {
    const { min, max } = getConfig();
    return max === min ? 0 : ((v - min) / (max - min)) * 100;
  };

  const percentToValue = (p: number): number => {
    const { min, max } = getConfig();
    return min + (clamp(p, 0, 100) / 100) * (max - min);
  };

  function render() {
    const percent = valueToPercent(state.value);
    progress.style.width = `${percent}%`;

    const { min, max } = getConfig();
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-valuemin', String(min));
    handle.setAttribute('aria-valuemax', String(max));
    handle.setAttribute('aria-valuenow', String(Math.round(state.value)));
  }
  state.render = render;

  function setValue(newValue: number, fromExternal = false): number {
    const { min, max, step } = getConfig();
    let clamped = clamp(newValue, min, max);

    if (step > 0) {
      const steps = Math.round((clamped - min) / step);
      clamped = min + steps * step;
    }
    clamped = clamp(clamped, min, max);

    if (clamped === state.value) return state.value;

    state.value = clamped;
    render();

    if (!fromExternal) {
      state.props.onChange?.(state.value, valueToPercent(state.value));
    }
    return state.value;
  }

  function updateFromClientX(clientX: number) {
    const rect = track.getBoundingClientRect();
    let percent;

    if (getComputedStyle(track).direction === 'rtl') {
      percent = ((rect.right - clientX) / rect.width) * 100;
    } else {
      percent = ((clientX - rect.left) / rect.width) * 100;
    }

    setValue(percentToValue(percent));
  }

  function onPointerDown(e: PointerEvent) {
    state.dragging = true;
    handle.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!state.dragging) return;
    updateFromClientX(e.clientX);
  }

  function onPointerUp(e: PointerEvent) {
    if (!state.dragging) return;
    state.dragging = false;
    if (handle.hasPointerCapture(e.pointerId)) {
      handle.releasePointerCapture(e.pointerId);
    }

    state.props.onChange?.(state.value, valueToPercent(state.value));
  }

  function onTrackPointerDown(e: PointerEvent) {
    if (e.target === handle) return;
    state.dragging = true;
    track.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent) {
    const { min, max, step } = getConfig();
    let handled = true;
    const bigStep = Math.max(step, (max - min) / 10);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        setValue(state.value + step); break;
      case 'ArrowLeft':
      case 'ArrowDown':
        setValue(state.value - step); break;
      case 'PageUp':
        setValue(state.value + bigStep); break;
      case 'PageDown':
        setValue(state.value - bigStep); break;
      case 'Home':
        setValue(min); break;
      case 'End':
        setValue(max); break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  // Навешиваем слушатели (только при первом создании)
  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);
  handle.addEventListener('keydown', onKeyDown);
  handle.tabIndex = 0;

  track.addEventListener('pointerdown', onTrackPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', onPointerUp);

  render();

  state.api = {
    setValue,
    getValue: () => state.value,
    updateConfig(newProps: Partial<Pick<SliderProps, 'min' | 'max' | 'step'>>) {
      state.props = { ...state.props, ...newProps };
      return setValue(state.value, true);
    },
    destroy() {
      if (state.dragging) return;

      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
      handle.removeEventListener('keydown', onKeyDown);

      track.removeEventListener('pointerdown', onTrackPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);

      cache.delete(track);
    }
  };

  return state.api;
}
