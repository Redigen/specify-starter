# Styles and tokens

## Style namespaces

Styles belong under a node's `styles` object.

| Prefix | Concern | Examples |
|---|---|---|
| `lay` | layout and dimensions | `lay`, `lay-gap`, `lay-width`, `lay-padding` |
| `pos` | position and transform | `pos`, `pos-top`, `pos-rotation` |
| `vis` | visibility and radius | `vis-opacity`, `vis-radius` |
| `txt` | typography | `txt`, `txt-size`, `txt-align`, `txt-wrap` |
| `fill` | solid/gradient fill | `fill` |
| `stroke` | stroke | `stroke` or `{ "color", "weight" }` |
| `blur-*`, `shadow` | effects | `blur-layer`, `shadow` |
| `transitions` | animated property changes | transition arrays |
| `cursor-*` | cursor | `cursor-type`, `cursor-file` |
| `css` | raw CSS escape hatch | use sparingly |

Example with interaction states:

```json
{
  "frame": {
    "styles": {
      "lay": "row",
      "lay-pad-v": "t.spacing.200",
      "lay-pad-h": "calc(t.spacing.200 + t.spacing.depend-radius)",
      "lay-gap": "t.spacing.100",
      "vis-radius": "t.radius.md",
      "fill": "t.color.uv-bg-default",
      "hover": { "fill": "t.color.uv-bg-hover" },
      "disabled": { "fill": "t.color.uv-bg-disabled" },
      "transitions": [
        { "property": "fill", "duration": 100, "easing": "ease-out" }
      ]
    },
    "layers": []
  }
}
```

Reusable color, spacing, sizing, radius, and typography values should use `t.*`
tokens. Local numeric dimensions, offsets, and durations are valid where the
existing schema and nearby specs use them. Do not replace every number with a
new token automatically.

## Actual token structure

`specs/tokens.yaml` contains a `themes` map. The starter includes `default`,
`dark`, and component themes such as `uv-primary`; it does not require token
themes named `light` and `dark`.

```json
{
  "themes": {
    "default": {
      "palette": {},
      "color": {},
      "gradient": {},
      "typography": {},
      "radius": {},
      "sizing": {},
      "spacing": {},
      "opacity": {},
      "shadow": {},
      "blur": {},
      "easing": {}
    },
    "dark": {}
  }
}
```

`specs/app.yaml` maps application appearance names to token themes:

```yaml
themes:
  light: default
  dark: dark
```

Do not confuse these app appearance keys with the keys in `tokens.yaml`.

## Token editing workflow

1. Read existing tokens and find the closest token in the same theme/group.
2. For a localized addition, patch YAML and preserve the file's organization.
3. For a structured full-file transformation, use the JSON workflow:

   ```bash
   npx --no-install specify-cli read specs/tokens.yaml > /tmp/tokens.json
   npx --no-install specify-cli write specs/tokens.yaml < /tmp/tokens.json
   ```

   JSON write reformats the whole file and removes comments.
4. Reference the token as `t.<group>.<name>` in specs.
5. Verify both default and relevant alternate themes, then run:

   ```bash
   npx --no-install specify-cli validate specs/tokens.yaml
   npm run check -w specify-svelte-spa
   ```

`base.schema.json` is generated from `base.template.json` by `specify-sync`.
Do not edit the generated file manually.
