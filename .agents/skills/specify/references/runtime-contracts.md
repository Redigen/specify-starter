# Runtime contracts: what the generator actually emits

Sections: When to use · Why this file exists · DSL surface matrix · Frame ·
Text · Field · Vector and image · Component invocation · Events · Identity
fields · Interaction-state selectors · Layout context · Checklist.

## When to use

Read this file before building any stateful or composite UI: accordions,
segmented switches, toolbars with a filter, empty states that depend on data,
lists with per-item conditions. It answers "will this field reach the DOM?"
without reading `packages/vite-plugin-specify-svelte-spa/src/generator/*.ts`.

Schema validation only proves the document is well-formed. Several valid
declarations are silently dropped at generation time; the tables below mark
those cases explicitly.

## Why this file exists

The spec model describes a declarative surface. The generator emits Svelte from
it, and only part of that surface is wired through. Without the tables below,
the only way to learn that `on-change` on `c.*` is ignored is by reading the
compiler — which `AGENTS.md` forbids as a first step.

Evidence for every row comes from the generator source and from rendered
output. Rows that cannot be re-checked from the schema alone are marked
**generator-only**.

## DSL surface matrix

Use these tables before writing a layer. They describe the declared DSL
surface, not an invitation to read the generator. A field omitted from a row is
not part of that layer's contract even when an open schema happens to accept
it.

### Layer fields

Common identity fields in this table are `cond-if`, `this`, `id`, and `class`.
Loops use `for` + required `key`. All built-in layers below forward `on-mount`
and `on-unmount`. `audio` and `video` have no Svelte rendering implementation.
`canvas` has `cond-if`, `id`, and `class`, but no declared `this` handle.

| Layer | Fields beyond the common identity fields | Additional events | Children |
|---|---|---|---|
| `frame` | `for` + `key`, `html-tag`, `contenteditable`, `tabindex`, `theme`, `selected`, `disabled`, `meta`, `styles` | `on-click`, `on-submit`, `on-change`, `on-keydown` | Yes |
| `text` | required `content`, `for` + `key`, `html-tag`, `contenteditable`, `tabindex`, `styles` | `on-click`, `on-change` | No |
| `image` | required `source` and `file` (shape depends on source), `fit`, `position`, `alt`, `for` + `key`, `styles` | `on-click` | No |
| `vector` | required `file`, `for` + `key`, `styles` | `on-click` | No |
| `field` | `value` plus input attributes, `for` + `key`, `tabindex`, `styles` | `on-click`, `on-change` | No |
| `iframe` | required `src`, `tabindex`, `styles` | `on-click`, `on-keydown` | No |
| `canvas` | `tabindex`, `styles` | `on-click`, `on-keydown` | No |
| `c.*` | `props`, `for` + `key`, `this`, `styles` | `on-click` only; no `id`, `class`, or other built-in-layer fields | No |

`iframe` and `canvas` do not support `for`/`key` or nested `layers` in the spec
schema. Screen root
supports `path`, `meta`, `state`, `data`, `stores`, `logic`, `on-keydown`,
`theme`, `styles`, and `layers`; component root supports `props`, `state`,
`data`, `stores`, `logic`, `meta`, `html-tag`, `contenteditable`, `on-keydown`,
`selected`, `disabled`, `tabindex`, `theme`, `styles`, and `layers`. When
`meta` is present, both `title` and `description` are required.

### Style groups by layer

The group names below expand to these exact fields:

- **layout**: `lay`, `lay-wrap`, `lay-reverse`, `lay-align-h/v`, `lay-gap`,
  `lay-gap-col/row`, grid tracks/alignment/flow/spans;
- **sizing**: `lay-width`, `lay-height`, min/max dimensions,
  `lay-aspect-ratio`;
- **spacing**: `lay-padding`, `lay-pad-h/v/top/right/bottom/left`, `lay-margin`,
  `lay-mar-h/v/top/right/bottom/left`;
- **position**: `pos`, `pos-top/right/bottom/left`, `pos-rotation`,
  `pos-elevation`, `pos-align-h/v`;
- **appearance**: `vis`, `vis-blend`, `vis-opacity`, `vis-radius` and its four
  corner variants;
- **typography**: `txt`, `txt-family`, `txt-weight`, `txt-size`,
  `txt-line-height`, `txt-letter-spacing`, `txt-align`, `txt-position`,
  `txt-indent`, `txt-wrap`, `txt-truncate`, `txt-lines`, all `txt-deco-*`,
  `txt-case`, `txt-list-style`, `txt-list-style-pos`, `txt-vertical-trim`;
- **fill/stroke/effects/cursor/css**: use the shapes and per-layer restrictions
  in `styles-and-tokens.md`.

| Layer | Style groups declared by its schema |
|---|---|
| screen root | layout, padding (not margin), clipping, appearance, typography, fill, stroke, effects, transitions, cursor, `css`, breakpoints |
| `frame` | position, layout, sizing, margin and padding, clipping, appearance, typography, fill, stroke, effects, transitions, cursor, `css`, states, `in`/`out`, breakpoints |
| `text` | position, sizing, margin and padding (no layout), appearance, typography, fill, stroke, effects, transitions, cursor, `css`, states, `in`/`out`, breakpoints |
| `image` | position, sizing (no margin/padding/layout), appearance, fill, stroke, effects, transitions, cursor, `css`, states, `in`/`out`, breakpoints |
| `vector` | position, sizing, margin (no padding/layout), appearance, effects, transitions, cursor, `css`, states, `in`/`out`, breakpoints; vector-specific `fill` and `stroke` |
| `field` | position, sizing, margin and padding (no layout/clipping), appearance, typography, fill, stroke, effects, cursor, `css`, `value`, `placeholder`, states, `in`/`out`, breakpoints; no `transitions` |
| `iframe`, `canvas` | position, sizing, clipping, appearance, fill, stroke, effects, transitions, cursor, `css`, states, `in`/`out`, breakpoints; no margin/padding/layout/typography |
| `c.*` invocation | The same schema surface as a frame, emitted as `inheritedClass` on the component root; it does not create a wrapper |

There is intentionally no `lay`/`lay-gap` on `text`, `image`, `vector`,
`field`, `iframe`, or `canvas` in the schema. Use a `frame` for flex/grid
composition. There is no `transitions` on built-in `field`; use interaction
states or a frame wrapper. Unknown keys inside individual layer objects can
validate because those objects are not closed, so never use successful
validation as proof that an undeclared property reaches the DOM.

## Frame

| Field | Emitted | Notes |
|---|---|---|
| `html-tag` | element name | Default `div`. With `on-click` and no `html-tag`, the tag becomes `button`. With `on-submit` and no `html-tag`, it becomes `form`. |
| `class` | extra class names | Static string only. **There is no `classname` field** — unknown keys are dropped silently (see Checklist). |
| `this` | `bind:this` | Typed as `HTMLElement`, `HTMLButtonElement`, or `HTMLFormElement` depending on the tag. |
| `id` | `id={...}` | Expansion supported (`id: "x-{{ item.id }}"`). Interpolation adds whitespace in expressions, so it is fine for anchors and DOM queries but not as a JS handle. |
| `theme` | `data-theme={...}` | Expression allowed. Switches the component palette for descendants of that node. |
| `selected` / `disabled` | `class:selected` / `class:disabled` | See Interaction-state selectors; the class alone does nothing unless the same node declares matching state styles. |
| `tabindex` | `tabindex={...}` | Implied when `on-click` or `on-keydown` is present. |
| `on-click` | `onclick` | Without `html-tag`, always `button`, including `navigate-to`/`navigate-back`. Only `text` and `vector` automatically become `a` with `href`/`target` for navigation. To make a frame a link, declare `html-tag: a` explicitly. |
| `on-submit` | `onsubmit` with `preventDefault()` | Forces `<form>` when `html-tag` is absent. Layout styles still compile to a class selector and apply to the form; the generated CSS is not restricted to `div`, `a`, or `button` roots. |
| `on-change` | `onblur` | **Generator-only.** Fires on blur, not on each edit. Honoured only when the node is `contenteditable`; otherwise the handler is dropped. |
| `on-keydown` | `onkeydown` | Requires `tabindex` (implied). Screen-level `on-keydown` is the variant documented in `spec-model.md`. |

## Text

- `content` localizes the rendered value: a string is shown as-is, a
  `{ <lang>: ... }` map is resolved in this order — exact locale match → base
  language code (`ru-RU` → `ru`) → another language of the same script → any
  `en*` entry → the first available key. There is no screen-wide language
  setting to wire; the map is resolved from the browser locale at render time.
  This also applies to maps returned by expressions (`content: "{{ item.title }}"`)
  and to `placeholder`, `alt`, and `set-notification.message`.
- A text node without `lay` and without `lay-width` is emitted as `display:

- A text node without `lay` and without `lay-width` is emitted as `display:
  inline`. Alignment of an inline element follows its own declared `text-align`,
  and inherited `text-align` of the nearest block/flex ancestor applies when the
  node does not declare one.
- Consequence inside inline containers: the container's inherited `text-align`
  wins for text nodes, so a row that renders its children inline can show
  centred labels. Declare `txt-align: left` explicitly on question and label
  text that must stay left-aligned inside a row.
- `html-tag` accepts heading and paragraph tags; use it instead of relying on
  typography alone when the heading level matters.

## Field

- `value: "{{ state.x }}"` becomes `bind:value` (two-way). The state field is
  updated on every keystroke; there is nothing to wire manually.
- `value` with a static value becomes a plain attribute.
- `this` gives a typed element handle (`HTMLInputElement` or
  `HTMLTextAreaElement`).
- `on-change` on a `field` becomes `onchange` and fires when the input commits
  (blur or Enter), not on every keystroke. For live filtering bind `value` to
  state instead.
- Built-in `field` supports `styles.value.fill` for entered text and
  `styles.placeholder.fill` for the placeholder, in addition to box styles.
  They compile to `color` and `::placeholder`; they are not exclusive to
  `c.field-*`.

## Vector and image

- `file` is a **static literal path**. A computed `{{ ... }}` value validates
  but breaks the build with an unimported component tag; the fix is one
  static-file layer per case with `cond-if`, not a different expression shape.
- `c.*` icon props (`leftIcon`, `rightIcon`) receive an **imported component**,
  not a path. A path stored in `data` (`leftIcon: "{{ field.icon }}"`) throws
  `TypeError: props_leftIcon is not a function` at runtime.
- `lay-width`/`lay-height` on a `vector` are also emitted as raw SVG `width` /
  `height` attributes. Token references such as `t.sizing.icon-sm` are **not**
  resolved there and produce an invalid attribute; use numeric pixel values.
- Per-item icon pattern (wrong/correct): `spec-model.md`, "Image and vector".

## Component invocation

A `c.name` node forwards a **narrow** set of keys. Everything else is ignored
without an error.

| Forwarded | Not forwarded |
|---|---|
| `props` (including `.bindable` keys, which become `bind:`), `cond-if`, `for` + `key`, `styles` (as `inheritedClass`), `this`, `on-click`, `on-mount`, `on-unmount` | `on-change`, `on-submit`, `on-keydown`, `id`, `class`, `tabindex`, `selected`, `disabled`, `theme`, `html-tag` |

Practical rules:

- If a component must react to typed input, either bind its value into screen
  state (`props: { .value: "{{ state.query }}" }`) and let the screen's state be
  the single source of truth, or handle the input **inside** the component with
  its own `field` layer and emit the result through a bindable prop.
- `on-click` is attached to the component's root element. Ordinary DOM event
  bubbling applies: clicking a descendant also invokes the handler unless an
  internal handler stops propagation. It does not observe non-click changes or
  expose which internal control handled the interaction; use bindable props for
  component output.

## Events and state writes

- `set-state` assigns screen/component state. `set-props` writes bindable props
  and must keep the leading dot (`.openId`).
- Not every declaration is reactive: `state` from `props`/`params` is derived,
  `state` from another `state` key and any expression in `data` are one-time
  snapshots, and `get-data` queries re-run when their `state` inputs change. The
  full matrix, plus a verified worked example, lives in
  `data-and-actions.md`, "Reactivity: what re-evaluates and what does not".
- A parent binding (`bind:prop={state.x}`) is two-way: a child `set-props` on the
  same prop updates the parent state. Reading it back through a second event does
  not work — there is no component-instance expression such as
  `{{ someComponent.value }}`.
- Handler expressions are template JavaScript. Callbacks with untyped parameters
  (`items.some(item => ...)`) fail `svelte-check` with an implicit `any` error,
  even though validation and `build` pass. Derive filtered data from state and
  small named helpers instead of inline array callbacks.
- Handler order inside one event object is fixed by the compiler, not by YAML
  key order. Do not build a handler whose second action depends on a state value
  cleared by the first one.

## Identity fields

- The screen root is always `<div id="screen">`; component roots carry no
  automatic id. Use `#screen` as the stable outer selector in `preview`
  assertions, and your own `id` on inner layers for anything more specific.
- `id` is fine for anchors and for `preview check --assert` selectors. Do not use
  it as a JavaScript handle.
- `this` is the supported handle. Referencing a name that was never declared as
  `this` produces an undefined variable in the generated module.
- `for` + `key` must be stable per item; the key expression is emitted verbatim.
  The `for` source is a value path such as `data.items` or `state.users.list`,
  not an arbitrary expression or function call. Prepare `Object.entries(...)`,
  filtering, and mapping as an array in `data` or a named logic helper first.
  `{{ this }}` is not an alias for the current loop item.

## Interaction-state selectors

State styles compile into selectors scoped to the **nearest ancestor that
declares state styles**:

| Declaration | Selector shape |
|---|---|
| `styles.hover` on a node with no state-declaring ancestor | `.self:hover` |
| `styles.hover` on a descendant of such a node | `.ancestor:hover .self` |
| `styles.selected` | `.ancestor.selected .self` (or `.self.selected`) |

Consequences:

1. `selected: "{{ ... }}"` puts the class on that node only. For child styling,
   the **same node** must declare `styles.selected`.
2. A child's `hover`/`focus` styles inside a node that declares state styles are
   rewritten to depend on the ancestor state, so a hover on the child alone may
   not apply. Prefer declaring hover on the interactive node itself.
3. `focus` compiles to `:focus-visible`. On `html-tag: button` this follows the
   browser default, so keyboard focus shows the ring and mouse clicks do not.
4. No `aria-*` attributes are generated. For an expand/collapse (disclosure)
   region, add explicit `aria-expanded` only if the section markup is authored
   outside the DSL; the DSL itself cannot emit it.

## Layout context

- A container is treated as inline when `lay: inline` or `css.display` contains
  `inline`, or when **all** its children are text, vector, image, or inline
  frames. Inside an inline container, children are joined without separators and
  text inherits the container's `text-align`.
- Inline containers are the usual cause of "my row suddenly centres its text".
  Give the row children real frames with `lay: row|column`, or set
  `txt-align: left` on each text child.
- `lay-wrap: true` wraps children but does not size the container; add
  `lay-width: fill-container` when the row should span its parent.
- Numeric dimensions are pixels converted to `rem` (`16` → `1rem`). CSS strings
  such as `min(320px, 100%)` are passed through unchanged.

## Checklist before asking "why does it not work?"

1. Is the field in the Frame/Field/Component table, and forwarded for that node
   type? Most reported "dead" handlers are `on-change` or `on-keydown` on `c.*`.
2. Does a spelling error fit? Unknown keys inside a layer are **allowed** by the
   schema (`additionalProperties` is not closed for layer nodes), so `classname`
   validates and does nothing. Confirm against the Frame table.
3. Did `svelte-check` run? `check` is the only step that reports TypeScript
   errors in generated templates; `validate` and `build` do not.
4. Build fails on `import Vector{{ ... }}` / `Unexpected token`, or the page
   throws `props_leftIcon is not a function`? That is a computed asset path;
   the fix is static paths plus `cond-if` — see "Vector and image".
5. Reproduce in the rendered app with `specify-cli preview run` before blaming
   the spec: a state toggle is proven by a `click` step followed by
   `assert-text`/`assert`. Use an existing dev server instead of starting a
   second one, and remember that a server started before the last `build` may
   serve stale modules.
6. Only when a reproducible symptom remains, read the generator — and say which
   symptom you are explaining.
