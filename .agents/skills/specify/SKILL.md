---
name: specify
description: Creating or modifying screens, components, tokens, data exports, forms, navigation, or any other user interface/logic in the specified project.
---

# Specify — Declarative UI Specification

## When to use
When the user asks to create or modify screens, components, tokens, 
data fetching, forms, navigation, or any UI/logic in the Specify project.

## Golden Rules
1. NEVER edit files in `apps/specify-svelte-spa/src/generated/`
2. UI + logic + data = YAML in `specs/`. TypeScript in `logic/`/`stores/` is a LAST RESORT.
3. All colors, spacing, typography → use tokens (`t.color.*`, `t.spacing.*`, etc.)
4. Custom components are invoked as `c.component-name` inside `layers`
5. Validation schemas live in `specs/schemas/` — use them to verify your output
6. NEVER write raw JavaScript/TypeScript code inside YAML. Only link to external functions via `logic` and `stores`.

## YAML Cheat Sheet

### Screen structure (`specs/screens/*.yaml`)
```yaml
screen-id:
  path: /route-path          # Required. String or array of strings
  state:                     # Local reactive state
    counter: 0
    is_loading: true
  data:                      # Declarative data fetching
    products:
      get-data:
        source: databases
        database-id: "db_id"
        table-id: "table_id"
        query:
          rules:
            - column: status
              operator: equal
              value: "active"
          order:
            - column: created_at
              type: desc
          limit: 20
  logic:                     # Link TS functions from src/logic/
    - calculateTotal
    - formatCurrency
  stores:                     # Link TS reactive stores from src/stores/
    - user
    - cart
  layers:                    # UI tree
    - frame: { ... }
    - text: { ... }
    - c.my-component: { ... }
```

### Component structure (`specs/components/*.yaml`)
```yaml
component-id:
  props:                     # Input props (names start with lowercase or dot)
    title: "Default title"
    .value: ""               # Dot prefix = bindable two-way prop
    type: text
  state:                     # Internal state
    is_open: false
  logic:                     # Link TS functions
    - formatCurrency
  layers:
    - frame: { ... }
```

### Layer types (inside `layers` array)
| Key | Purpose | Required fields | Can contain `layers`? |
|-----|---------|-----------------|-----------------------|
| `frame` | Container / div | — | **Yes** |
| `text` | Text node | `content` | No |
| `image` | Image | `source` (assets/appwrite/web) | No |
| `field` | Input / textarea / select | `value` | No |
| `vector` | SVG icon | `file` | No |
| `iframe` | Embedded frame | `src` | No |
| `canvas` | Canvas element | — | No |
| `c.name` | Custom component | `props` (optional) | No |

### Layer Anatomy
Every item in the `layers` array is an object with a single key representing its type (e.g., `frame`, `text`). All properties of the layer must be inside this object.

```yaml
layers:
  - frame:                      # Layer type
      this: my_frame_id         # Optional identifier
      for: "item in data.items" # Optional loop
      cond-if: "{{ state.show }}" # Optional condition
      styles:                   # Styles MUST be inside the styles object
        lay: column
        lay-gap: t.spacing.md
        fill: t.color.background
      on-click:                 # Events must be inside the layer object
        set-state:
          is_active: true
      layers:                   # Only containers have `layers`
        - text:
            styles:
              txt: t.typography.h1
            content: "Hello"
```

### Style prefixes (keys inside the `styles` object)
| Prefix | Examples |
|--------|---------|
| `lay-` | `lay: row/column/grid`, `lay-gap`, `lay-padding`, `lay-width`, `lay-height`, `lay-align-h`, `lay-align-v`, `lay-wrap` |
| `pos-` | `pos: absolute/fixed/sticky`, `pos-top`, `pos-left`, `pos-elevation` |
| `vis-` | `vis: hide/show`, `vis-opacity`, `vis-radius`, `vis-blend` |
| `txt-` | `txt: t.typography.h1`, `txt-size`, `txt-weight`, `txt-align`, `txt-color` |
| `fill` | `fill: t.color.primary` or gradient object |
| `stroke` | `stroke: [{ color: t.color.border, weight: 1 }]` |
| `shadow` | `shadow: t.shadow.md` or array of shadow objects |

### Tokens reference
| Token path | Usage |
|-----------|-------|
| `t.color.*` | `fill`, `stroke`, `txt-color`, `shadow.color` |
| `t.spacing.*` | `lay-gap`, `lay-padding`, `lay-margin`, `pos-top` |
| `t.sizing.*` | `lay-width`, `lay-height`, `txt-size` |
| `t.radius.*` | `vis-radius` |
| `t.typography.*` | `txt` (shorthand for family+weight+size+line-height) |
| `t.shadow.*` | `shadow` |
| `t.opacity.*` | `vis-opacity` |
| `t.easing.*` | `transitions[].easing` |

### Events & Actions
Events: `on-click`, `on-change`, `on-submit`, `on-mount`, `on-unmount`, `on-keydown`

Actions (inside any event):
```yaml
on-click:
  set-state:                    # Update local state
    counter: "{{ state.counter + 1 }}"
  navigate-to:                  # Route navigation
    link: /dashboard
    animation: slide-in
  post-data:                    # Mutation (see below)
    source: databases
    operation: create-row
    database-id: "..."
    table-id: "..."
    columns:
      name: "{{ state.name }}"
    success:
      set-notification:
        type: success
        message: "Saved!"
      navigate-to:
        link: /success
    error:
      set-notification:
        type: error
        message: "Failed"
  set-notification:             # Show toast
    type: info
    message: "Hello"
    duration: 3000
  submit: form_name             # Submit a form by its `this` name
  reset: form_name              # Reset a form
  run: "calculateTotal(cart.items); user.login({ email: state.email })" # Call TS functions from `logic`/`stores`. Multiple calls separated by `;`
  scroll-to:
    frame-id: section_about
```

### Custom Logic & Stores (Fallback)
If YAML declarative actions (`post-data`, `set-state`) are not enough, you can link external TypeScript files.
1. **Files**: Place functions in `src/logic/` (e.g., `calculateTotal.ts`) and reactive variables in `src/stores/` (e.g., `cart.svelte.ts`).
2. **Rule**: The export name MUST match the filename. `calculateTotal.ts` -> `export function calculateTotal()`.
3. **Linking**: Add filenames (without extension) to the `logic` and `stores` arrays at the root of the Screen/Component.
4. **Usage**: Access them in templates `{{ formatCurrency(cart.total) }}` or in events via `run`.

```yaml
checkout:
  path: /checkout
  logic:
    - calculateTotal
  stores:
    - cart
  layers:
    - text:
        content: "Total: {{ calculateTotal(cart.items) }}"
    - frame:
        on-click:
          run: "calculateTotal(cart.items)"
```

### Data fetching (`get-data`)
Sources: `databases`, `user-account`, `teams`, `team-memberships`, `files`

```yaml
data:
  users:
    get-data:
      source: databases
      database-id: "main_db"
      table-id: "users"
      query:
        rules:
          - and:
              - column: role
                operator: equal
                value: "admin"
              - column: age
                operator: greaterThan
                value: 18
        order:
          - column: name
            type: asc
        limit: 50
        page: 1
      cache: localStorage
      realtime: true
```

### Mutations (`post-data`)
| Source | Operations |
|--------|-----------|
| `databases` | `create-row`, `update-row`, `upsert-row`, `delete-row`, `increment-column`, `decrement-column` |
| `user-account` | `signup-email-password`, `login-email-password`, `login-oauth`, `login-magic-link`, `logout`, `change-password`, `reset-password-request`, ... |
| `teams` | `create-team`, `change-name`, `delete-team` |
| `team-memberships` | `create-membership`, `change-roles`, `delete-membership` |
| `files` | `upload-file`, `upload-files`, `delete-file`, `change-name` |

### Loops & Conditions
```yaml
layers:
  - frame:
      for: "product in data.products"   # Loop
      key: "product.$id"                # Required with `for`
      cond-if: "{{ product.is_active }}" # Conditional rendering
      layers:
        - text:
            content: "{{ product.name }}"
```

### Form binding
```yaml
layers:
  - frame:
      this: login_form                 # Form reference name
      layers:
        - field:
            this: email_field
            value: "{{ state.email }}"
            type: email
            placeholder: "Enter email"
            on-change:
              set-state:
                email: "{{ email_field.value }}"
        - field:
            this: password_field
            value: "{{ state.password }}"
            type: password
        - frame:
            on-click:
              post-data:
                source: user-account
                operation: login-email-password
                email: "{{ state.email }}"
                password: "{{ state.password }}"
                success:
                  navigate-to:
                    link: /dashboard
```

### ❌ Anti-Patterns (NEVER DO THIS)
1. ❌ Writing raw JS inside YAML:
   `run: "const x = 10; return x;"` 
   ✅ Link an existing function instead: `run: "myFunction()"`
2. ❌ Putting `lay: row` directly on a layer:
   `- frame: { lay: row }`
   ✅ Put it inside `styles`: `- frame: { styles: { lay: row } }`
3. ❌ Giving `layers` to a text node:
   `- text: { content: "Hi", layers: [...] }`

## 🛠️ Workflows (How to execute tasks)

### Task 1: Create a new Screen
1. Create `specs/screens/screen-name.yaml`.
2. Define `path`, `state`, and `data` (using `get-data`).
3. Build the UI using `layers` (frame, text, field, c.Component).
4. Ensure all styles use tokens.

### Task 2: Create a new Component
1. Create `specs/components/component-name.yaml`.
2. Define `props` (use `.value` for two-way binding if needed).
3. Build the UI in `layers`.
4. To use it, add `- c.component-id: { props: { ... } }` in a screen's `layers`.

### Task 3: Add Business Logic / Data
1. **Check if YAML can do it:** Use `post-data` for CRUD, auth, and file uploads. Use `set-state` for UI state.
2. **If YAML is not enough:** 
   - Assume the user has a TS function in `src/logic/` (e.g., `myLogic.ts`) or a store in `src/stores/` (e.g., `user.svelte.ts`).
   - Add it to the screen/component root: `logic: [myLogic]` or `stores: [user]`.
   - Call it in an event: `run: "myLogic(state.value)"` or in a template `{{ user.name }}`.
   - DO NOT write the actual TypeScript implementation inside the YAML file.

### Task 4: Manage Design Tokens
1. Open `specs/tokens.yaml`.
2. Add/modify tokens under `themes -> light/dark -> palette/color/spacing/typography`.
3. Update YAML files to use the new `t.*` references. Never use hex/px directly in screens/components.
