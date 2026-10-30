# Spec model: app, screens, components, layers

Examples are JSON or YAML. JSON matches `specify-cli read` and `write`; YAML on
disk has the same data structure. Screen and component files are maps of ID to
definition, not bare definitions.

Sections: Application configuration · Screen · Component · Layers · Expressions
and localization · Conditions and loops · Form references.

## Application configuration

`specs/app.yaml` contains application-wide metadata, appearance, integrations,
and built-in notification text. It is not a screen definition.

```yaml
specs-version: 0.1
lang: en
meta:
  title: My App
  description: Built with Specify
app-label:
  name: My App
  short-name: My App
themes:
  light: default
  dark: dark
integrations:
  appwrite:
    endpoint: https://cloud.appwrite.io/v1
    projectId: my-project
    anonymousSession: false
  # ym: 000000000
notifications:
  update:
    en: A new version is available. Reload to update
    ru: Доступно обновление
  offline:
    en: No internet, changes will be saved later
    ru: Нет интернета, изменения сохранятся позже
```

| Field | Meaning |
|---|---|
| `specs-version` | Specification version used by the project |
| `lang` | Default ISO language used for the root HTML `lang` attribute |
| `meta` | Default browser/SEO `title` and `description` |
| `app-label` | Full and short application names for PWA/system UI |
| `themes.light`, `themes.dark` | Map system appearances to theme names declared in `specs/tokens.yaml` |
| `integrations.appwrite` | `endpoint`, `projectId`, and optional `anonymousSession`; anonymous access must also be enabled in Appwrite |
| `integrations.ym` | Optional Yandex Metrika counter for SPA page views |
| `notifications` | Global notification messages; values can be strings or localized language maps |

The starter defines notification keys such as `cookie`, `update`, `offline`,
`sync`, `server-available`, `server-unavailable`, and `too-many-requests`.
Inspect the current `app.yaml` before relying on a key. App appearance names
(`light`/`dark`) are not the same thing as token theme names (`default`/`dark`).

## Screen

Required: `path`. Optional: `meta`, `state`, `data`, `stores`, `logic`,
`on-keydown`, `theme`, `styles`, `layers`.

```json
{
  "counter": {
    "path": "/counter",
    "meta": {
      "title": "Counter",
      "description": "A declarative counter"
    },
    "state": { "count": 0 },
    "layers": [
      {
        "frame": {
          "styles": { "lay": "row", "lay-gap": "t.spacing.100" },
          "layers": [
            { "text": { "content": "{{ state.count }}" } },
            {
              "frame": {
                "on-click": {
                  "set-state": { "count": "{{ state.count + 1 }}" }
                },
                "layers": [{ "text": { "content": "+" } }]
              }
            }
          ]
        }
      }
    ]
  }
}
```

- `path` is a route string or an array of aliases. Dynamic parameters such as
  `/user/:id` and `["/blog", "/blog/:page"]` are available through
  `{{ params.id }}` or `{{ params.page ?? 1 }}`.
- `meta` overrides screen SEO title/description and supports localization.
- `state` is local to the screen. `data` contains static values and `get-data`
  queries. `stores` and `logic` explicitly register external exports.
- `theme` overrides the token theme for the screen. `styles` applies to the
  screen root and supports breakpoints. `layers` is the UI tree.
- `on-keydown` is an array of entries containing `key` plus event actions:

```yaml
on-keydown:
  - key: Escape
    set-state:
      isOpen: false
```

## Component

```json
{
  "button-md": {
    "props": {
      "label": "Button",
      ".value": "",
      "disabled": false
    },
    "state": {},
    "styles": { "lay": "row" },
    "layers": [{ "text": { "content": "{{ props.label }}" }}]
  }
}
```

Components support local `props`, `state`, `data`, `stores`, `logic`, `meta`,
`html-tag`, `contenteditable`, `tabindex`, `theme`, `styles`, `layers`,
`on-keydown`, and root `selected`/`disabled` flags. `html-tag` controls the root
element; it defaults to a generic container. Use the component schema for exact
availability rather than assuming every field applies everywhere.

Props are inputs and should otherwise be treated as read-only. A prop beginning
with `.` is bindable. Invoke the component from another layer:

```json
{
  "c.button-md": {
    "props": {
      "label": "Save",
      ".value": "{{ state.draft }}"
    },
    "on-click": {
      "set-state": { "saved": true }
    }
  }
}
```

Passing `"{{ state.field }}"` as a bindable value compiles to a two-way `bind:`
on the component: input fields update the state, and `set-state` updates the
field. Field components default their `.value` to the undefined placeholder
`"{{ variable }}"`, so always pass `.value` explicitly when invoking
`c.field-*`.

Before invoking a component, read its definition and match its actual props.
Follow the naming and sizing conventions of nearby components.

### Styles on component invocations

`styles` on a `c.*` invocation apply to the component root. They do not create a
wrapping frame and do not replace the component layout contract.

Field and slider components do not automatically fill every column form. Set
their width explicitly when required:

```yaml
- c.field-md:
    props:
      label: Name
      .value: "{{ state.name }}"
    styles:
      lay-width: fill-container
```

The same rule applies to `c.slider-md` when its track should use the available
form width.

## Layers

Every layer is normally a single-key object. Schema layer keys include:

| Key | Required content | Nested `layers` |
|---|---|---|
| `frame` | None; generic container and interaction node | Yes |
| `text` | `content` | No |
| `image` | `source`, `file` | No |
| `vector` | `file` | No |
| `field` | `value` | No |
| `iframe` | `src` | No |
| `canvas` | None | No |
| `audio`, `video` | Reserved schema layers; the current Svelte generator does not render them | No |
| `c.<component-id>` | Existing component; usually `props` | No |

Do not choose `audio` or `video` merely because schema keys exist. Verify actual
generator support before proposing them.

Common optional fields include `cond-if`, `id`, `class`, `tabindex`, `this`,
`styles`, and event handlers. Availability depends on the layer type. Put style
properties inside `styles`, not directly on the layer. `id` is rendered as the
DOM id of built-in layers and is what `scroll-to.frame-id` targets. A `c.*`
invocation does not forward `id`; place it on a frame instead.

### Frame and text

`frame` groups children and provides layout, positioning, and interactions. It
also accepts `meta` for section-level SEO overrides and `theme` for a local
theme override. Use `layers` for children.

`text.content` accepts plain text, a localized map, or an expression. Numeric
expression results are rendered as strings:

```yaml
- text:
    content:
      en: Hello, world!
      ru: Привет, мир!
- text:
    content: "Hello, {{ data.user.name }}!"
- text:
    content: "{{ state.count }}"
```

### Image and vector

Images support local assets, remote URLs, and Appwrite Storage:

```yaml
- image:
    source: assets
    file: ./assets/images/image.png
    fit: cover
    position: center
    alt: Product photo
- image:
    source: web
    file: https://example.com/image.png
- image:
    source: appwrite
    file:
      bucket-id: images
      file-id: demo
      width: 400
      height: 300
      quality: 85
```

`fit` accepts `fill`, `cover`, or `contain`; `position` controls image position.
Appwrite images also accept `format`, but it is normally better to omit it and
let device support determine the best format. Use `alt` for accessibility.

A vector references an SVG asset directly:

```yaml
- vector:
    file: ./assets/vectors/lucide/arrow-right.svg
```

### Field, iframe, and canvas

```yaml
- field:
    value: "{{ state.email }}"
    placeholder: Email
    type: email
    autocomplete: email
    required: true
```

Field `type` supports `text`, `textarea`, `email`, `search`, `tel`, `url`,
`password`, `number`, `date`, `month`, `week`, `datetime-local`, `time`,
`checkbox`, `radio`, `range`, and `file`. Important attributes include:

- `placeholder`, `name`, `autocomplete`, `inputmode`, `readonly`, `hidden`,
  `required`, and `disabled`;
- `pattern`, `mask`, `min`, `max`, `minlength`, `maxlength`, and `step` for
  input constraints and native validation;
- `rows` for textarea, `multiple`/`accept` for file inputs, and `selected` for
  checkbox/radio state.

`iframe` embeds an external page through `src`. `canvas` is the escape hatch for
custom canvas graphics; prefer declarative layers for ordinary UI.

## Expressions and localization

Expression contexts:

- `{{ state.field }}` — local state;
- `{{ props.field }}` — component props;
- `{{ data.products }}` — declared static or fetched data;
- `{{ loopVar }}` — the active loop variable;
- `{{ this }}` — the active loop item when iterating an object;
- `{{ stores.user.name }}` — an explicitly registered store;
- `{{ logic.formatCurrency(stores.cart.total) }}` — a registered logic call;
- `{{ params.id }}` — dynamic path parameters of the screen.

The compiler imports each listed store as `stores_<name>` and each logic
function as `logic_<name>`, so the `stores.` and `logic.` prefixes are required.
Plain JavaScript is allowed inside expressions where needed, for example
`{{ new Date().toISOString() }}`. Do not embed function or class
implementations. Expressions and calls to existing logic are allowed.

Localized strings use language maps where the schema supports them:

```yaml
content:
  en: Hello, {{ state.name }}
  ru: Привет, {{ state.name }}
```

## Conditions and loops

`cond-if` renders a layer only when its expression is true. `key` is required
with `for` and must be stable and unique.

```json
{
  "frame": {
    "for": "product in data.products",
    "key": "product.$id",
    "cond-if": "{{ product.is_active }}",
    "layers": [{ "text": { "content": "{{ product.name }}" }}]
  }
}
```

Object iteration example:

```json
{
  "frame": {
    "for": "key in data.translations",
    "key": "key",
    "layers": [{ "text": { "content": "{{ key }}: {{ this }}" }}]
  }
}
```

## Form references

`this` names a node for form submission, reset, or keyboard interactions.
Fields normally bind through state or a component bindable prop:

```json
{
  "field": {
    "this": "email_field",
    "value": "{{ state.email }}",
    "type": "email",
    "placeholder": "Enter email",
    "on-change": {
      "set-state": { "email": "{{ email_field.value }}" }
    }
  }
}
```

Use a nearby working form as the source of truth for more complex bindings. See
`data-and-actions.md` for complete form and mutation behavior.
