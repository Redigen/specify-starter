# Data, actions, and fallback logic

## Event handlers

Events include `on-click`, `on-change`, `on-mount`, `on-unmount`, `on-submit`,
and `on-keydown`. An event value is an action object.

| Action | Purpose / main fields |
|---|---|
| `set-state` | update one or more local state fields |
| `set-props` | update bindable props such as `.value` |
| `navigate-to` | `link`; optional `target`, animation fields |
| `navigate-back` | `link` fallback |
| `scroll-to` | `frame-id`, optional `animation` |
| `set-notification` | `type`, `message`, optional `duration` |
| `post-data` | mutation plus optional `success`/`error` actions |
| `submit`, `reset` | act on a named form/frame |
| `run` | call existing registered logic |

Multiple actions may be placed in one event object. `post-data.success` and
`post-data.error` accept nested action objects.

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

Render with `data.products`, and use `for` plus `key` for arrays. Available
sources include `databases`, `files`, `user-account`, `teams`, and `variables`.
Required fields depend on the source and operation; inspect the corresponding
schema definition before composing an unfamiliar request.

## Mutations with `post-data`

```json
{
  "frame": {
    "on-click": {
      "post-data": {
        "source": "databases",
        "operation": "create-row",
        "database-id": "db_id",
        "table-id": "products",
        "columns": {
          "name": "{{ state.name }}",
          "price": "{{ state.price }}"
        },
        "success": {
          "navigate-to": { "link": "/dashboard" }
        },
        "error": {
          "set-notification": {
            "type": "error",
            "message": "Could not save the product"
          }
        }
      }
    },
    "layers": [{ "text": { "content": "Save" }}]
  }
}
```

Common operation groups:

- `databases`: row CRUD, upsert, increment/decrement;
- `user-account`: account, sessions, email/OAuth authentication, verification;
- `teams`: team and membership operations;
- `files`: upload, delete, rename.

These groups are navigation, not a substitute for operation-specific required
fields. Use the schema or an existing working action for the exact shape.

## TypeScript fallback

Use this decision order:

1. Try built-in state, data, and event actions.
2. If they cannot express the behavior, inspect existing files and exports in
   `apps/specify-svelte-spa/src/logic/` or `stores/`.
3. Only then add or reuse an external function/store. Never assume an export
   exists and never put its implementation inside a spec.
4. Register it on the screen/component root and call it:

```json
{
  "dashboard": {
    "path": "/dashboard",
    "logic": ["getPagination"],
    "stores": ["theme"],
    "layers": [
      {
        "frame": {
          "on-click": { "run": "getPagination(state.page)" },
          "layers": []
        }
      }
    ]
  }
}
```

Keep local UI state in specs. Use a global store only when unrelated screens
must share state and props cannot carry it.
