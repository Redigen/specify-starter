# Spec model: screens, components, layers

Examples are JSON, matching `specify-cli read` and `write`. YAML on disk has the
same data structure. Screen and component files are maps of ID to definition,
not a bare definition.

## Screen

Required: `path`. Optional: `meta`, `state`, `data`, `stores`, `logic`,
`on-keydown`, `theme`, `styles`, `layers`.

```json
{
  "counter": {
    "path": "/counter",
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

`path` can also be an array. State is local to the screen or component.

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

A prop beginning with `.` is bindable. Invoke the component from another layer:

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

Before invoking a component, read its definition and match its actual props.
Follow the naming and sizing conventions of nearby components.

## Layers

Every layer is normally a single-key object. Schema layer keys include:

| Key | Required content | Nested `layers` |
|---|---|---|
| `frame` | none; generic container and interaction node | yes |
| `text` | `content` | no |
| `image` | `source` | no |
| `vector` | `file` | no |
| `field` | `value` | no |
| `iframe` | `src` | no |
| `canvas` | none | no |
| `audio`, `video` | inspect the schema/compiler before use | no |
| `c.<component-id>` | existing component; usually `props` | no |

Common optional fields include `cond-if`, `id`, `class`, `tabindex`, `this`,
`styles`, and event handlers. Availability depends on the layer type. Put style
properties inside `styles`, not directly on the layer.

## Expressions and localization

```json
{
  "text": {
    "content": {
      "en": "Hello, {{ state.name }}",
      "ru": "Привет, {{ state.name }}"
    }
  }
}
```

Expression contexts:

- `{{ state.field }}` — local state;
- `{{ props.field }}` — component props;
- `{{ data.products }}` — fetched data;
- `{{ loopVar }}` — the active loop variable;
- `{{ this }}` — the active loop item when iterating an object;
- `{{ user.name }}` — an explicitly registered store.

Do not embed function or class implementations. Expressions and calls to
existing logic are allowed.

## Conditions and loops

`key` is required with `for`.

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
Fields normally bind through state or a component's bindable prop:

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

Use a nearby working form as the source of truth for more complex bindings.
