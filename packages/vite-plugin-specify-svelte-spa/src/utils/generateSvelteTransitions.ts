import type { Lay, Styles } from "../types/styles.ts";
import type { LayerTypes } from "../types/layers.ts";
import { generateCssFromYaml } from "../generator/css.ts";

export function generateSvelteTransitions(styles: Styles | undefined, layerType: LayerTypes, parentLay: Lay = "block", script: Set<string>): string {
  if (styles === undefined) return "";

  let durationStyles: number = 0;
  let stylesIn: string = "";
  let durationStylesIn: number = 0;
  let stylesOut: string = "";
  let durationStylesOut: number = 0;
  if (styles?.in) {
    if (styles.in?.transitions && styles.in.transitions.length > 0) {
      durationStylesIn = styles.in.transitions.reduce((maxTime, t) => {
        const duration = t.duration || 0;
        const delay = t.delay || 0;
        const totalTime = duration + delay;

        return Math.max(maxTime, totalTime);
      }, 0);
    }

    stylesIn = generateCssFromYaml(layerType, styles ?? {}, styles.in, parentLay, true);
  }
  if (styles?.out) {
    if (styles.out?.transitions && styles.out.transitions.length > 0) {
      durationStylesOut = styles.out.transitions.reduce((maxTime, t) => {
        const duration = t.duration || 0;
        const delay = t.delay || 0;
        const totalTime = duration + delay;

        return Math.max(maxTime, totalTime);
      }, 0);
    }

    stylesOut = generateCssFromYaml(layerType, styles ?? {}, styles.out, parentLay, true);
  }
  if (styles?.in || styles?.out) {
    if (styles?.transitions && styles.transitions.length > 0) {
      durationStyles = styles.transitions.reduce((maxTime, t) => {
        const duration = t.duration || 0;
        const delay = t.delay || 0;
        const totalTime = duration + delay;

        return Math.max(maxTime, totalTime);
      }, 0);
    }

    let transitions: string[] = [];

    const inKey = layerType === 'component' ? 'transitionIn' : 'in:stylesIn';
    const outKey = layerType === 'component' ? 'transitionOut' : 'out:stylesOut';

    if (styles?.in) transitions.push(` ${inKey}={{ duration: ${durationStylesIn || durationStyles}, style: "${stylesIn}" }}`);
    if (styles?.out) transitions.push(` ${outKey}={{ duration: ${durationStylesOut || durationStyles}, style: "${stylesOut}" }}`);

    if (transitions.length > 0) {
      script.add(`import { stylesIn, stylesOut } from '../../lib/transitions';`);
      return transitions.join("");
    }
  }
  return "";
}
