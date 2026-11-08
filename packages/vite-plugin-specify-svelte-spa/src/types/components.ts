import type { Layers, OnKeydown, MetaData } from "./layers.ts";
import type { Styles } from "./styles.ts";
import type { GetData } from "./getdata.ts";

export interface Component {
  [componentId: string]: {
    props?: Record<string, any>;
    state?: Record<string, any>;
    data?: GetData | Record<string, any>;
    stores?: string[];
    logic?: string[];
    meta: MetaData;
    "html-tag"?: string;
    contenteditable?: boolean | "plaintext-only";
    "on-keydown"?: OnKeydown[];
    selected?: boolean;
    disabled?: boolean;
    tabindex?: number | string;
    theme?: string;
    styles?: Styles;
    layers?: Layers[];
  };
}
