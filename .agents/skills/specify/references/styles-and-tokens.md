# Styles and tokens

Sections: Style namespaces · Layout reference · Position, appearance, and
typography · Fill, stroke, shadow, and blur · Interactive states · Transitions
and entry/exit animations · Responsive layout · Custom CSS properties · Token
structure and group reference · Themes and inheritance · Token editing workflow.

## Style namespaces

Styles belong under a node `styles` object. They compile to CSS, not to a
JavaScript runtime: `{{ ... }}` expressions are not evaluated inside `styles`.
Use static numbers/strings, `t.*` tokens, and CSS syntax such as `calc()`,
`min()`, `max()`, `clamp()`, and `var()`.

```yaml
# Incorrect: JavaScript cannot run in generated CSS.
styles:
  pos-rotation: "{{ state.opened ? 180 : 0 }}"
  lay-width: "{{ state.columns * 240 }}"

# Correct: static CSS and token calculations.
styles:
  lay-pad-h: calc(t.spacing.200 + t.spacing.depend-radius)
  lay-max-width: min(880px, 100%)
```

For state-dependent presentation, use separate layers with `cond-if`, component
props, or the supported interaction states. Do not put JavaScript expressions
in style values.

| Prefix | Concern | Examples |
|---|---|---|
| `lay` | Layout and dimensions | `lay`, `lay-gap`, `lay-width`, `lay-padding` |
| `pos` | Position and transform | `pos`, `pos-top`, `pos-rotation` |
| `vis` | Visibility and radius | `vis-opacity`, `vis-radius` |
| `txt` | Typography | `txt`, `txt-size`, `txt-align`, `txt-wrap` |
| `fill` | Solid, gradient, or image fill | `fill` |
| `stroke` | Stroke | `stroke` or `{ color, weight, position }` |
| `blur-*`, `shadow` | Effects | `blur-layer`, `shadow` |
| `transitions` | Animated property changes | Transition arrays |
| `cursor-*` | Cursor | `cursor-type`, `cursor-file`, `cursor-offset` |
| `css` | Raw CSS escape hatch; token references are allowed | Use sparingly |

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

Numeric dimensional values (width, height, padding, gap, offsets) are pixels
converted to `rem` (`240` compiles to `15rem`). Unit-specific properties keep
their own meaning: transition `duration`/`delay` are milliseconds,
`vis-opacity` is 0–100, and `pos-rotation` is degrees. CSS strings such as
`min(340px, 100%)` remain CSS values rather than pixel numbers.

## Layout reference

| Property | Values / purpose |
|---|---|
| `lay` | `row`, `column`, `grid`, `block`, or `inline` |
| `lay-wrap` | Wrap children in row/column layouts |
| `lay-reverse` | Reverse child order in row/column layouts |
| `lay-align-h`, `lay-align-v` | Align children on the horizontal/vertical axis: start/left/top, center, end/right/bottom, or stretch as applicable |
| `lay-gap` | Numeric/token gap, or `auto`, `around`, `evenly` for free-space distribution |
| `lay-gap-col`, `lay-gap-row` | Axis-specific gap/distribution |
| `lay-width`, `lay-height` | Number/token/CSS size, `hug-contents`, or `fill-container` |
| `lay-min-width`, `lay-max-width`, `lay-min-height`, `lay-max-height` | Dimension constraints |
| `lay-aspect-ratio` | String such as `"16 / 9"` or `"1 / 1"` |
| `lay-padding`, `lay-pad-h`, `lay-pad-v` | Shared, horizontal, or vertical padding |
| `lay-pad-top/right/bottom/left` | Per-side padding |
| `lay-margin`, `lay-mar-h`, `lay-mar-v` | Shared, horizontal, or vertical margin |
| `lay-mar-top/right/bottom/left` | Per-side margin |
| `lay-clip`, `lay-clip-h`, `lay-clip-v` | `unclip` (default), `clip`, `scroll`, or `auto-scroll` |
| `lay-grid-cols`, `lay-grid-rows` | Arrays of grid track objects |
| `lay-grid-flow` | `row`, `column`, `dense`, `row-dense`, or `column-dense` |
| `lay-grid-column-span`, `lay-grid-row-span` | Child track spans |

`lay-gap: auto` compiles to space-between behavior, `around` to space-around,
and `evenly` to space-evenly. Distribution needs free space: a content-width row
has none, so use `lay-width: fill-container` when children should reach opposite
edges. `lay: grid` enables the grid-specific properties.

Checklist before choosing layout styles on a layer:

- `text`, `image`, `vector`, `field`, `iframe`, and `canvas` layers do not
  declare layout styles; wrap them in a `frame` and put `lay-*` there. Check
  the DSL surface matrix in `runtime-contracts.md` before choosing fields.
- `lay-wrap` does not size the container: a wrapped row that should span its
  parent still needs `lay-width: fill-container`.
- Fixed-width cards overflow narrow screens: use wrapping and responsive
  dimensions from the start, not a fixed `lay-width` number.
- `{{ ... }}` expressions are not evaluated inside `styles` (they compile to
  CSS); use static values, tokens, and CSS `calc()`/`min()`/`clamp()`.

Allowed values for alignment, gap, position, overflow, and similar properties
are static enums. Grep the relevant `$defs` key in
`specs/schemas/base.template.json` instead of guessing or reading the compiler.

## Position, appearance, and typography

| Property | Values / purpose |
|---|---|
| `pos` | `normal`, `offset`, `absolute`, `fixed`, or `sticky` |
| `pos-top/right/bottom/left` | Numeric/token/CSS offsets |
| `pos-rotation` | Rotation in degrees |
| `pos-elevation` | Integer `z-index` |
| `pos-align-h`, `pos-align-v` | Self-alignment within the parent layout |
| `vis-opacity` | Opacity from 0 to 100 |
| `vis-radius` | Uniform corner radius |
| `vis-radius-top-left/top-right/bottom-left/bottom-right` | Per-corner radius |
| `txt` | Reusable typography token |
| `txt-family`, `txt-weight`, `txt-size`, `txt-line-height`, `txt-letter-spacing` | Individual typography overrides |
| `txt-align` | `start` (default), `left`, `center`, `right`, `end`, or `justify` |
| `txt-wrap` | `wrap`, `no-wrap`, `balance`, `pretty`, or `hyphens` |
| `txt-truncate` + `txt-lines` | Line clamping; when truncation is enabled, declare `txt-lines` (use `1` for a single line) |
| `cursor-type` | Standard CSS cursor enum from the schema |
| `cursor-file`, `cursor-offset` | Custom cursor asset and horizontal/vertical hotspot |

Checklist before writing `txt-*`/`vis-*`/`pos-*` values:

- These fields do **not** exist: `txt-font`, `txt-break`, `txt-stroke`, and
  `stroke.dash`. Use `txt-family`; see the stroke contract below.
- `txt-wrap` takes schema strings (`wrap`, `no-wrap`, `balance`, `pretty`,
  `hyphens`), never `true`/`false`.
- `lay-aspect-ratio` takes a quoted ratio string such as `"1 / 1"`, not a
  number.

## Fill, stroke, shadow, and blur

A solid fill is a color string or token:

```yaml
styles:
  fill: "#FF5733"
```

Gradients and images use object forms. Multiple backgrounds use an array:

```yaml
styles:
  fill:
    type: linear
    deg: 90
    stops:
      - color: t.color.primary
        offset: "0%"
      - color: "#FF0000"
        offset: "100%"
```

```yaml
styles:
  fill:
    - "#FFFFFF20"
    - type: linear
      deg: 90
      stops:
        - color: "#00000000"
          offset: "0%"
        - color: "#00000080"
          offset: "100%"
```

Gradient `type` is `linear`, `radial`, or `angular`. `deg` applies to linear and
angular gradients; radial gradients use `width`/`height`; radial and angular
gradients can use `position`. Stops have `color` and `offset` (relative or
absolute CSS units). Image fills use an object with `image`, plus optional `fit`
and `position`. Vector layers do not support image fills.

A stroke can be a color string/token or an array of stroke objects. A single
stroke object belongs in a one-item array:

```yaml
styles:
  stroke:
    - color: t.color.primary
      weight: 2
      position: inside
```

Stroke objects support required `color`, optional `weight`, `position`
(`inside`, `center`, `outside`), and per-side `weight-top`, `weight-right`,
`weight-bottom`, `weight-left`. There is no `dash` field. A color string
produces a 1px inside stroke. Vector layers use a separate shape: a color
string or an object with `color`, `weight`, and `linejoin` (`miter`, `round`,
or `bevel`); they do not support stroke arrays.

Shadows accept a `t.shadow.*` token or an array of shadow objects. Put a single
shadow object in a one-item array:

```yaml
styles:
  shadow:
    - x: 0
      y: 9
      blur: 6
      spread: 0
      position: outside
      color: "#0000000A"
```

`position` is `outside` (default) or `inside`; `spread` is optional. Raw CSS
shadow shorthand strings and a bare shadow object do not validate. Use
`blur-layer` to blur the layer itself and `blur-background` to blur content
behind it.

## Interactive states

`styles` accepts state sub-objects: `hover`, `focus`, `pressed`, `disabled`,
`selected`, `valid`, and `invalid`. They compile to:

| State key | Compiled CSS |
|---|---|
| `hover` | `:hover`, emitted inside `@media (hover: hover) and (pointer: fine)` |
| `focus` | `:focus-visible` |
| `pressed` | `:active` plus a `.pressed` class managed by a press effect |
| `disabled` | `.disabled` class; a layer-level `disabled` field also renders the native attribute on `html-tag: button` |
| `selected` | `.selected` class driven by the layer-level `selected` field |
| `valid` | `:user-valid` (plus `:has(:user-valid)`) |
| `invalid` | `:user-invalid` (plus `:has(:user-invalid)`) |

`valid` and `invalid` accept state sub-objects nested inside them (`hover`,
`focus`, `pressed`, `disabled`, `selected`) for combined selectors such as
`invalid.focus`. Other nested states are available where the schema allows them.

When a node with state styles contains interactive descendants — for example a
component root wrapping a `field` — descendant state selectors are generated
against that wrapper: `.wrapper:user-invalid .descendant` and
`.wrapper:has(:user-invalid) .descendant`. This mechanism reveals the built-in
error blocks inside `c.field-*`: the component root carries `invalid` styles, so
its error frames unhide once the inner input becomes `:user-invalid` after user
interaction. Do not add raw CSS for states the DSL already covers.

The `field` layer also accepts two style sub-objects for its inner text:
`value` styles the entered text and `placeholder` styles the empty-state hint.
See the current `c.field-md` spec for a complete working invocation. Placeholder
styles apply only while the field is empty and showing its placeholder.

## Transitions and entry/exit animations

`transitions` animates property changes. Each item contains `property`,
`duration` in milliseconds, `easing`, and optional `delay` in milliseconds.
Use `property: all` deliberately; a specific property is easier to predict.

`in` and `out` inside `styles` define entry and exit styles when `cond-if`
changes. They can contain their own `transitions` overrides:

```yaml
cond-if: "{{ state.isOpen }}"
styles:
  vis-opacity: 100
  pos-top: 0
  transitions:
    - property: vis-opacity
      duration: 300
      easing: linear
    - property: pos-top
      duration: 200
      easing: ease-out
  in:
    vis-opacity: 0
    pos-top: 20
  out:
    vis-opacity: 0
    pos-top: -20
```

## Responsive layout

Start with layout behavior rather than decorative content:

- Prefer `lay-wrap` plus bounded/flexible dimensions over fixed desktop-only
  rows. Check the narrowest supported viewport. `lay-wrap` controls children,
  not the container's own width: a row that should span its parent also needs
  `lay-width: fill-container`.
- Use `hug-contents` for intrinsic content and `fill-container` for elements
  that should occupy available space.
- `txt-wrap: no-wrap` keeps text on a single line; `txt-wrap: wrap` allows
  normal wrapping. Other schema values provide balancing, pretty wrapping, or
  hyphenation. Choose deliberately instead of compensating with fixed widths.
- Give page sections `lay-width: fill-container` and a suitable `lay-max-width`.
- Avoid fixed child widths that exceed the narrowest supported viewport.
- CSS dimension strings such as `min(340px, 100%)` can cap desktop cards while
  allowing them to shrink. They are raw CSS values, not tokens; inspect the
  generated CSS when using them.
- In this starter, the application background is `surface-lowest-bg`. Cards with
  the same fill may disappear; normally use `surface-low-bg` with a border or
  shadow and verify both themes.

Example card grid and card width:

```yaml
styles:
  lay: row
  lay-wrap: true
  lay-width: fill-container
  lay-max-width: 1120
  lay-gap: t.spacing.600
  lay-align-h: center
```

```yaml
styles:
  lay-width: min(340px, 100%)
```

For layout changes at specific viewport conditions, put a `breakpoints` array
inside `styles`. Each entry has `width`, `height`, and/or `orientation`, plus a
nested `styles` override:

```yaml
styles:
  lay: column
  lay-gap: 16
  breakpoints:
    - width: 768
      styles:
        lay: grid
        lay-gap: 24
        lay-grid-cols:
          - width: 1fr
          - width: 1fr
    - width: 1024
      styles:
        lay: grid
        lay-gap: 32
        lay-grid-cols:
          - width: 1fr
          - width: 1fr
          - width: 1fr
```

### Breakpoint rules

All statements below were verified on generated CSS with a temporary probe
screen; exact schema shapes are the `*BreakpointsProps` definitions in
`base.template.json`.

**Where `breakpoints` is accepted.** The screen root, every built-in layer
(`frame`, `text`, `image`, `vector`, `field`, `iframe`/`canvas`), `c.*`
invocations, and the component root. The nested `styles` accept only the style
groups of that node's own type: `screenBreakpointsProps`,
`frameBreakpointsProps`, `textBreakpointsProps`, `imageBreakpointsProps`,
`vectorBreakpointsProps`, `fieldBreakpointsProps`, and
`otherFrameBreakpointsProps`; `c.*` invocations and the component root use the
frame shape.

**Conditions.** Each entry has `width`, `height`, and/or `orientation`
(`landscape` or `portrait`). At least one is required — an entry with none is
silently dropped and compiles to no media query. Numbers are pixels converted
to `rem` (`768` → `48rem`); plain `px`/`rem`/`em` strings pass through
unchanged. Use plain dimensions only: `min()`, `max()`, `%`, and viewport
units are not parsed as dimensions by the sort/bounds logic and can break the
ranges. `t.sizing.*` tokens are resolved at build time through the app light
theme, but only tokens with plain numeric values — a token defined through
`calc(...)`, such as `t.sizing.icon-lg`, emits an unresolved `t.*` reference
inside the media condition, which browsers discard together with the whole
block.

**Nested `styles`.** The same groups as the node's base `styles`, but no
interaction states (`hover`, `focus`, `pressed`, `disabled`, `selected`,
`valid`, `invalid`), no `in`/`out`, and no nested `breakpoints`: those keys
still validate (the object is not closed) but are silently dropped at
generation. Keep state styling at the node level, not inside breakpoint
entries.

**Ranges.** Entries are sorted by ascending condition value and compile
mobile-first. Each entry becomes `@media (min-width: X)` (or `min-height`);
the upper bound comes from the next entry **on the same axis** — `width: 768`
followed by `width: 1024` produces `(min-width: 48rem) and (max-width: 64rem)`
and then `(min-width: 64rem)`, not two overlapping queries. The last entry on
an axis has no upper bound. At the exact boundary both blocks match; blocks
are emitted in ascending order, so the wider range wins. Bounds are computed
per axis: a `height` entry between two `width` entries does not close the
width range. Mixing axes or `orientation` in one list is fragile — each entry
fires whenever its own conditions match, regardless of the others — so keep
one axis (usually `width`) per list and use separate nodes for orientation or
height overrides.

**Overrides merge with the base `styles`, not with other entries.** Every
entry compiles against the node's base styles: a property missing from an
entry falls back to the **base** value, never to the previous (narrower)
entry. Therefore a property that varies across ranges must be set explicitly
in **every** entry that needs a non-base value: either keep the mobile
default in the base `styles` and repeat the property in each entry, or remove
it from the base and declare it in every entry. The silent failure mode:

```yaml
# Anti-example: `lay` is overridden at 768 but omitted at 1024 —
# at >= 1024 the layout silently reverts to the base `column`.
styles:
  lay: column # base; also the layout below the first breakpoint
  breakpoints:
    - width: 768
      styles:
        lay: grid
        lay-grid-cols:
          - width: 1fr
          - width: 1fr
    - width: 1024
      styles:
        # `lay` omitted: the three columns below are emitted but inert,
        # because the container is back to a plain column.
        lay-grid-cols:
          - width: 1fr
          - width: 1fr
          - width: 1fr
```

When an entry changes `lay`, the alignment rules of its descendants are
re-emitted inside the same media query for the new layout, so children keep
correct per-layout alignment.

Prefer wrapping and `min()` dimensions for simple cases; use `breakpoints`
only when the layout genuinely changes.

## Custom CSS properties

For properties the DSL cannot express, use `styles.css` sparingly and explain
why. Keys are raw CSS properties; values may reference tokens:

```yaml
styles:
  css:
    pointer-events: none
    scroll-padding-left: 100px
    min-block-size: t.sizing.icon-xs
```

Do not use this escape hatch to replace layout, states, or effects already
covered by the DSL.

## Token structure and group reference

`specs/tokens.yaml` contains a `themes` map. Reference tokens as
`t.<group>.<name>` in specs. The starter includes `default`, `dark`, and
component themes such as `uv-primary`; it does not require token themes named
`light` and `dark`.

```yaml
themes:
  default:
    palette:
      n-l-02: "#F7F7F8"
    color:
      surface-lowest-bg: t.palette.n-l-02
    typography:
      body-md:
        family: "Inter, sans-serif"
        weight: 400
        size: 16
        line-height: 24
        letter-spacing: 0
    sizing:
      icon-md: 24
    spacing:
      200: 16
    radius:
      md: 8
    opacity:
      muted: 40
    easing:
      snap: [0.25, 0.1, 0.25, 1]
  dark:
    color:
      surface-lowest-bg: "#121212"
```

| Group | Value shape / purpose |
|---|---|
| `palette` | Raw CSS color values; names are project-defined |
| `color` | Semantic CSS colors or references to palette tokens |
| `gradient` | Gradient objects with type, geometry, position, and stops |
| `typography` | Required `family`, `weight`, `size`, `line-height`; optional `letter-spacing` |
| `sizing` | Reusable width, height, and other dimensions |
| `spacing` | Reusable padding, margin, and gap dimensions |
| `radius` | Corner dimensions |
| `opacity` | Numbers from 0 to 100 |
| `shadow` | The same object/array shapes as style shadows |
| `blur` | Reusable blur dimensions |
| `easing` | Four-number cubic Bézier array or comma-separated string |

Numeric dimensional token values follow the same pixel-to-rem behavior as
numeric style dimensions. Typography `weight` accepts a number from 100 to 900
or a string such as `normal`/`bold`. Use the schema for exact token-reference
combinations.

### Palette and semantic color conventions

Palette names are not mandated by the DSL. The starter palette generator uses
`<tone>-<lightness>-<step>`: tone examples include `p`, `pv`, `s`, `n`, `nv`,
`r`, `o`, and `y`; `l` and `d` form mirrored light/dark scales; steps run from
`01` to `15`. This is a starter convention, not a reason to rename an existing
project palette.

Semantic `color` tokens should describe use rather than appearance:

- `surface-<elevation>-<property>` for backgrounds/surfaces;
- `primary-<emphasis>-<property>`, `secondary-...`, and `error-...` for intent;
- `on-surface`, `on-primary`, and similar foreground pairings.

Define semantic tokens in `default` using palette references, then override the
semantic values in alternate themes. For page-level styling prefer semantic
groups (`surface-*`, `primary-*`, `secondary-*`, `error-*`) over raw palette
entries or component `uv-*` variables.

## Themes and inheritance

`specs/app.yaml` maps application appearance names to token themes:

```yaml
themes:
  light: default
  dark: dark
```

Do not confuse these app appearance keys with the keys in `tokens.yaml`.

`default` is emitted under `:root` (plus `[data-theme="default"]`); every other
theme is emitted only under `[data-theme="<name>"]`. A theme overrides only the
groups it declares — all other CSS variables keep cascading from `default`.
Inspect the current token file to determine which groups an alternate theme
overrides instead of assuming that every theme is complete.

`uv-*` themes are component palettes: each remaps only the `uv-bg-*`,
`uv-str-*`, and `uv-fg-*` variables. Components such as `button-md` and
`field-md` select a palette through their `theme` prop (or a `theme` field on a
frame):

```yaml
- c.button-md:
    props:
      label: Click me
      theme: uv-primary
```

Theme names change together with `specs/tokens.yaml`. The current list is the
generated `$defs/themes` enum in `specs/schemas/base.schema.json`, refreshed by
`specify-sync` on token changes. Query that enum instead of memorizing or
copying the list into specs, docs, or agent replies. Reach for `uv-*` through
component theme props rather than as page-level semantic colors.

## Token editing workflow

1. Read existing tokens and find the closest token in the same theme/group.
2. For a localized addition, patch YAML and preserve the file organization.
3. For a structured full-file transformation, use the JSON workflow:

   ```bash
   npx --no-install specify-cli read specs/tokens.yaml > /tmp/tokens.json
   npx --no-install specify-cli write specs/tokens.yaml < /tmp/tokens.json
   ```

   JSON write reformats the whole file and removes comments.
4. Reference the token as `t.<group>.<name>` in specs.
5. Validate the changed file while editing, then verify both default and
   relevant alternate themes using the rendered-verification workflow in the
   root `AGENTS.md`:

   ```bash
   npx --no-install specify-cli validate specs/tokens.yaml
   ```

   Return to that workflow for the final aggregate check after all edits and
   review fixes. Do not substitute `check` alone: it does not regenerate the
   application after token changes.

`base.schema.json` is generated from `base.template.json` by `specify-sync`,
which also injects current name enums: themes (`$defs/themes`) and valid token
names for every group (`t.color.*`, `t.palette.*`, `t.spacing.*`, `t.radius.*`,
`t.sizing.*`, `t.typography.*`, `t.shadow.*`, `t.blur.*`, `t.easing.*`,
`t.gradient.*`). Prefer these enums for name lookups; read a `tokens.yaml`
group only when you need the value behind a name. Do not edit the generated
file manually.
