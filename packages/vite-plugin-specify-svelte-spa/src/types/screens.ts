import type { Layers, OnKeydown, MetaData } from "./layers.ts";
import type { Styles } from "./styles.ts";
import type { GetData } from "./getdata.ts";

export interface Screen {
  [screenId: string]: {
    path: string | string[];
    meta?: MetaData;
    state?: Record<string, any>;
    data?: GetData | Record<string, any>;
    stores?: string[];
    logic?: string[];
    "on-keydown"?: OnKeydown[];
    theme?: string;
    styles?: Styles;
    layers?: Layers[];
  };
}
