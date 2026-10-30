# Data, actions, and fallback logic

Sections: Event handlers · Data declarations · Fetching with `get-data` ·
Mutations with `post-data` · Forms · TypeScript fallback.

## Event handlers

Events include `on-click`, `on-change`, `on-mount`, `on-unmount`, `on-submit`,
and `on-keydown`. An event value is an action object.

| Action | Purpose / main fields |
|---|---|
| `set-state` | Update one or more local state fields |
| `set-props` | Update bindable props such as `.value` |
| `navigate-to` | `link`; optional `target` (`_self`/`_blank`), `animation` (`instant`, `slide-in`, `slide-out`, `move-in`, `move-out`, `push`, `dissolve`), `direction` (`left`/`right`/`up`/`down`), `duration`, `easing`, `frame-id` |
| `navigate-back` | Browser back; `link` is the fallback when history is empty |
| `scroll-to` | `frame-id`, optional `animation` |
| `set-notification` | `type`, `message`, optional `duration` |
| `post-data` | Mutation plus optional `success`/`error` actions |
| `submit`, `reset` | Act on a named form/frame |
| `run` | Call existing registered logic/stores |

`on-change` applies to `field` and `text` layers. `on-mount` and `on-unmount`
follow the layer lifecycle. Screen/component `on-keydown` entries additionally
contain a `key`; see `spec-model.md`.

### State, props, and navigation examples

```yaml
on-click:
  set-state:
    counter: "{{ state.counter + 1 }}"
    isActive: false
```

Only bindable props may be changed with `set-props`. Keep the leading dot in the
key; inside a component expression, `.value` refers to that bindable prop:

```yaml
on-click:
  set-props:
    .value: "{{ .value + (props.step || 1) }}"
```

```yaml
on-click:
  navigate-to:
    link: /dashboard
    animation: slide-in
    direction: left
    duration: 400
    easing: ease-out
```

`navigate-to.link` accepts a screen path or external URL. `target: _blank` opens
a new tab. Dynamic values can be interpolated, for example
`link: "/product/{{ product.$id }}"`. `frame-id` optionally limits the
transition animation to a frame.

```yaml
on-click:
  navigate-back:
    link: /home
```

Multiple actions may be placed in one event object. `post-data.success` and
`post-data.error` accept nested action objects.

Do not rely on YAML key order for action sequencing. The current compiler emits
actions in its fixed action-handler order, so `set-state` may run before
`set-notification` even if the notification appears first in YAML. Avoid
state-dependent messages whose values are cleared by another action in the same
event. Use separate events or `post-data.success`/`post-data.error` when an
explicit sequence is required.

Action semantics worth knowing:

- `scroll-to.frame-id` must match the `id` of a target built-in layer
  (`frame`, `text`, `image`, `vector`, `field`, `iframe`, `canvas`). A `c.*`
  invocation does not forward `id`, so put it on a frame instead. The default
  animation is `smooth`; use `instant` to jump without easing.
- `set-notification.type` accepts `info`, `success`, or `error`; `message`
  accepts a plain string or a `{ ru, en }` map; `duration` is in milliseconds.
  Omit `duration` or pass `0` and the notification does not auto-dismiss —
  the snackbar then shows a close button. Notifications render in the app global
  snackbar list, so no extra setup is required.
- Expressions may use plain JavaScript where needed, for example a `post-data`
  column `"{{ new Date().toISOString() }}"`.

## Data declarations

Declare `data` at the screen or component root. Each key becomes available to
descendant layers as `data.<key>`. Values may be static arrays/objects or a
`get-data` request:

```yaml
data:
  pricing:
    - id: 1
      name: Free
      price: $0
    - id: 2
      name: Pro
      price: $5
  blog:
    get-data:
      source: databases
      database-id: main_db
      table-id: blog
```

Render arrays with `for` plus a stable `key`, for example
`for: post in data.blog` and `key: post.$id`.

## Fetching with `get-data`

```json
{
  "products": {
    "get-data": {
      "source": "databases",
      "database-id": "db_id",
      "table-id": "products",
      "query": {
        "rules": [
          { "column": "status", "operator": "equal", "value": "active" }
        ],
        "order": [{ "column": "title", "type": "asc" }],
        "limit": 50
      },
      "realtime": true
    }
  }
}
```

General parameters:

| Field | Meaning |
|---|---|
| `source` | `databases`, `user-account`, `teams`, `team-memberships`, or `files` |
| `realtime` | Subscribe to backend changes and update the UI live |
| `cache` | `localStorage` (default, persistent/offline-capable) or `sessionStorage` (current browser session/tab) |
| `infinite-scroll` | Load subsequent pages while scrolling |
| `query` | Projection, filtering, sorting, and pagination where supported |

Source-specific identifiers:

| Source | Parameters |
|---|---|
| `databases` | Required `database-id`, `table-id`; optional `row-id` for one row |
| `user-account` | Current account; no database identifiers |
| `teams` | Optional `team-id` for one team |
| `team-memberships` | Required `team-id`; optional `membership-id` for one membership |
| `files` | Required `bucket-id`; optional `file-id` for one file |

### Queries, filtering, and pagination

- `columns` projects only the required columns.
- `limit` sets page size; `page` sets the page number. Dynamic routes can provide
  the page: `page: "{{ params.page ?? 1 }}"`.
- `order` is an array of `{ column, type }`, where `type` is `asc`, `desc`, or
  `random`.
- `rules` contains filters and nested `and`/`or` groups. Operators are `isNull`,
  `isNotNull`, `search`, `equal`, `notEqual`, `lessThan`, `lessThanEqual`,
  `greaterThan`, `greaterThanEqual`, and `between`.
- `between` expects a string containing exactly two comma-separated numeric or
  date bounds, for example `"5, 10"`. Quote it so the data type is explicit.

```yaml
query:
  columns:
    - title
    - description
    - price
  order:
    - column: $createdAt
      type: desc
  limit: 10
  page: "{{ params.page ?? 1 }}"
  rules:
    - and:
        - column: price
          operator: between
          value: "5, 10"
        - or:
            - column: availability
              operator: equal
              value: true
            - column: category
              operator: equal
              value: Sale
```

Exact conditional field shapes live under `$defs/get-data*` in
`specs/schemas/base.template.json`; use them for unfamiliar source/operation
combinations instead of reading the compiler.

## Mutations with `post-data`

```yaml
on-click:
  post-data:
    source: databases
    operation: create-row
    database-id: main_db
    table-id: posts
    columns:
      title: "{{ state.title }}"
      likesCount: 0
    success:
      set-notification:
        type: success
        message: Post created
    error:
      set-notification:
        type: error
        message: Could not create the post
```

`success` runs after a successful mutation; `error` runs after failure.
`cache` can select `localStorage` or `sessionStorage` where supported. Use the
nested actions for sequencing rather than relying on adjacent YAML keys.

Available operations by source:

| Source | Operations |
|---|---|
| `databases` | `create-row`, `update-row`, `upsert-row`, `delete-row`, `increment-column`, `decrement-column` |
| `user-account` | `signup-email-password`, `login-email-password`, `login-oauth`, `login-magic-link`, `login-email-otp-request`, `login-email-otp-confirm`, `login-phone-otp-request`, `login-phone-otp-confirm`, `logout`, `logout-all`, `block-account`, `change-email`, `change-name`, `change-password`, `change-phone`, `update-preferences`, `reset-password-request`, `reset-password-confirm`, `verify-email-request`, `verify-phone-request`, `verify-phone-confirm` |
| `teams` | `create-team`, `change-name`, `update-preferences`, `delete-team` |
| `team-memberships` | `create-membership`, `change-roles`, `delete-membership` |
| `files` | `upload-file`, `upload-files`, `change-name`, `change-permissions`, `delete-file` |

Database mutation fields:

- `create-row`: required `database-id` and `table-id`; `columns` contains the
  new values and `permissions` is optional.
- `update-row` and `upsert-row`: additionally require `row-id`.
- `delete-row`: requires `database-id`, `table-id`, and `row-id`.
- `increment-column`: requires `database-id`, `table-id`, `row-id`, and
  `column`; optional `value` and `max` control the step and upper bound.
- `decrement-column`: has the same required fields; optional `value` and `min`.

For example, increment a counter without replacing the whole row:

```yaml
on-click:
  post-data:
    source: databases
    operation: increment-column
    database-id: main_db
    table-id: posts
    row-id: "{{ post.$id }}"
    column: likesCount
    value: 1
    max: 1000
```

Account, team, membership, and file operations have operation-specific fields
such as `email`, `password`, `provider`, `success-url`, `failure-url`,
`team-id`, `membership-id`, `roles`, `bucket-id`, `file-id`, `file`, or
`files`. Inspect the matching conditional branch of `$defs/post-data` in
`base.template.json` or a nearby working action for exact required fields.

Login form mutation example:

```yaml
on-submit:
  post-data:
    source: user-account
    operation: login-email-password
    email: "{{ state.email }}"
    password: "{{ state.password }}"
    success:
      navigate-to:
        link: /dashboard
    error:
      set-notification:
        type: error
        message: Invalid email or password
```

### Permissions

Create/update/upload operations that accept `permissions` support `read`,
`update`, and `delete` arrays. Roles are:

- `any`, `guests`, `verified-users`, `unverified-users`;
- `{ user-id: ... }`, `{ team-id: ... }`, `{ team-membership-id: ... }`, or
  `{ label-id: ... }` for a specific principal.

```yaml
post-data:
  source: databases
  operation: create-row
  database-id: main_db
  table-id: notes
  columns:
    title: Draft
  permissions:
    read:
      - any
    update:
      - user-id: "{{ data.account.$id }}"
    delete:
      - user-id: "{{ data.account.$id }}"
```

Do not invent permission roles or omit the object wrapper around ID-based
roles. Appwrite project and row-level security settings still apply.

## Forms

Use a frame with `html-tag: form`. Name it with `this`, not `id`: `submit` and
`reset` resolve the `this` reference. A complete pattern:

```json
{
  "frame": {
    "html-tag": "form",
    "this": "orderForm",
    "on-submit": {
      "post-data": {
        "source": "databases",
        "operation": "create-row",
        "database-id": "db",
        "table-id": "orders",
        "columns": { "name": "{{ state.name }}" },
        "success": {
          "set-state": { "name": "" },
          "reset": "orderForm",
          "set-notification": { "type": "success", "message": "Sent", "duration": 3000 }
        },
        "error": {
          "set-notification": { "type": "error", "message": "Submit failed", "duration": 5000 }
        }
      }
    },
    "styles": {
      "lay": "column",
      "lay-gap": "t.spacing.300",
      "lay-width": "fill-container"
    },
    "layers": [
      {
        "c.field-md": {
          "props": { "label": "Name", ".value": "{{ state.name }}", "required": true },
          "styles": { "lay-width": "fill-container" }
        }
      },
      {
        "c.button-md": {
          "props": { "label": "Send", "theme": "uv-primary" },
          "on-click": { "submit": "orderForm" }
        }
      }
    ]
  }
}
```

Notes:

- Frames rendered with `html-tag: button` always get `type="button"`, so a
  `c.button-md` never submits implicitly. Trigger submission with the `submit`
  action or let the user press Enter inside a field.
- Validation is native HTML5: `required`, `minlength`, `maxlength`, `pattern`
  on `field` layers and on the `c.field-*` props that forward them.
- `valid`/`invalid` state styles compile to `:user-valid`/`:user-invalid`
  selectors, including `:has(...)` variants for wrappers (see "Interactive
  states" in `styles-and-tokens.md`). This is what reveals the built-in error
  blocks inside `c.field-md` after the user interacts with an invalid input.
- `reset` restores the DOM inputs; pair it with `set-state` when bound state
  fields must be cleared as well, as in the example above.
- Palette names passed to `theme` props and fields come from the live
  `$defs/themes` enum in `specs/schemas/base.schema.json`; never hardcode or
  trust static palette lists.

## TypeScript fallback

Follow the decision order in `AGENTS.md`: built-in actions first, then reuse an
existing export in `apps/specify-svelte-spa/src/logic/` or `stores/`, and only
if none fits add the smallest new one and explain the DSL limitation. Never
assume an export exists and never put its implementation inside a spec.

Register the export on the screen/component root and call it. Two non-obvious
rules:

- The compiler imports each listed export as `logic_<name>` / `stores_<name>`,
  so expressions must use the `logic.` and `stores.` prefixes:
  `{{ logic.getPagination(state.page) }}`, `{{ stores.user.name }}`. A `run`
  value must be wrapped in `{{ }}` — a plain string compiles to a string
  literal, not a call. Separate multiple calls with `;`, for example
  `"{{ logic.save(); stores.user.login({ email: state.email }) }}"`.
- The export name must match the file name: `calculateTotal.ts` exports
  `calculateTotal`, and `user.svelte.ts` exports `user`. For example, declare
  `export function calculateTotal() { return 0; }` in `calculateTotal.ts`.

```json
{
  "dashboard": {
    "path": "/dashboard",
    "logic": ["getPagination"],
    "stores": ["theme"],
    "layers": [
      {
        "frame": {
          "on-click": { "run": "{{ logic.getPagination(state.page) }}" },
          "layers": []
        }
      }
    ]
  }
}
```

Keep local UI state in specs. Use a global store only when unrelated screens
must share state and props cannot carry it.

Fallback modules are not an alternative UI layer: do not construct screen markup,
inject styles, or replace declarative data/actions that already support the task.
Follow nearby module/export conventions and register new exports in the consuming
spec. Existing stores that other code depends on are not refactoring targets;
change only what the task requires and preserve their contracts.

Do not move runtime, compiler, schema, or dependency changes into `logic/` or
`stores/` to bypass the editing boundaries in `AGENTS.md`; report the blocker
and ask for approval.
