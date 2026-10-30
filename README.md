# Specify

**Declarative UI specification and compiler — design and frontend in one language.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Redigen/specify-starter/pulls)
[![Spec](https://img.shields.io/badge/spec-YAML-blueviolet.svg)](https://specifyui.com)

[Website](https://specifyui.com/) · [Habr article (RU)](https://habr.com/ru/articles/1094938/) · [Docs](https://specifyui.com/)

---

Specify is a declarative UI specification language and compiler for building web applications. It blurs the line between design and frontend: instead of JSX, HTML, or CSS, you write concise YAML that mirrors Figma's auto-layout mental model — letting designers and developers speak the same language.

You describe a screen's structure in YAML and immediately see the result in the browser. Change a margin, color, or font — and the interface updates. This isn't a static mockup, but a living application with real data, forms, and navigation. For a designer, this means the final implementation won't differ from the visual, and the handoff to development boils down to hitting the Push button in Git.

Out of the box, Specify generates a Svelte SPA with the open-source backend platform Appwrite integrated: database queries, authentication, and file handling are all described right in YAML. If your stack is different, Specify is extensible — you can write your own Vite adapter to compile to your framework of choice and extend the DSL specification for any backend.

## ✨ Features

- **Declarative YAML syntax** that mirrors Figma's auto-layout (Flow: Vertical / Horizontal, gap, padding, alignment)
- **Live preview** — change a value, see the result instantly in the browser
- **Svelte SPA output** via a Vite plugin, no manual component code
- **Appwrite integration** out of the box: databases, auth, file uploads, teams — all from YAML
- **Design tokens** with light/dark themes and reusable visual values
- **Declarative data layer** — `get-data` for fetching, `post-data` for mutations, no API boilerplate
- **Component composition** — define reusable components with `props` (including two-way bindable `.value`)
- **AI-friendly workflow** — strict spec validation plus optional YAML↔JSON conversion for structured edits
- **Extensible** — write your own Vite adapter to target a different framework

## 🚀 Quick start

```bash
git clone https://github.com/Redigen/specify-starter
cd specify-starter
npm install
npm run dev
```

Open http://localhost:5173 — edit anything in `specs/` and the browser updates live.

## 📝 A first spec

```yaml
# specs/screens/counter.yaml
counter:
  path: /counter
  state:
    count: 0
    min: -10
    max: 10
  layers:
    - text:
        styles:
          txt: t.typography.display-sm
        content: "{{ state.count }}"
    - frame:
        styles:
          lay: row
          lay-gap: t.spacing.100
        layers:
          - c.button-md:
              cond-if: "{{ state.count > state.min }}"
              props:
                label: "-"
              on-click:
                set-state:
                  count: "{{ state.count - 1 }}"
          - c.button-md:
              cond-if: "{{ state.count < state.max }}"
              props:
                label: "+"
              on-click:
                set-state:
                  count: "{{ state.count + 1 }}"
```

The compiler turns this into a Svelte component with reactive state, route `/counter`, conditional rendering, and click handlers — no `.svelte` file written by hand.

Text expressions may evaluate to strings or numbers. Numeric values are rendered
as text, so counters and other numeric state can be used directly in `content`.

## 🤖 AI-friendly

`specify-cli` validates existing YAML against the JSON Schemas selected by
`.vscode/settings.json`. It also offers an optional YAML↔JSON bridge for
full-file generation and structured transformations. Localized edits can stay
in YAML, preserving comments and minimizing diffs.

```bash
# Validate all mapped specs without converting them
npm run spec:validate

# Read a spec as JSON
npx --no-install specify-cli read specs/screens/counter.yaml

# Validate JSON and write it as YAML
echo '{"counter":{"path":"/x","layers":[]}}' \
  | npx --no-install specify-cli write specs/screens/counter.yaml
```

Writes require a matching, successfully compiled schema; on validation failure,
the CLI prints structured errors with JSON Pointer paths and exits 1. JSON
writes rewrite the entire file and do not preserve comments.

AI agents should read [`AGENTS.md`](./AGENTS.md) for the required workflow,
verification levels, and editing boundaries, then load only the task-specific
references linked from
[`.agents/skills/specify/SKILL.md`](./.agents/skills/specify/SKILL.md).

## 🔁 Build & discovery

Two independent generators assemble the app; neither needs manual registration:

| Generator | When it runs | What it produces |
|---|---|---|
| `vite-plugin-specify-svelte-spa` | Vite dev server or `npm run build -w specify-svelte-spa` | `src/generated/screens/*.svelte`, `src/generated/components/*.svelte`, routing in `src/generated/screens/index.ts`, `appConfig.ts`, tokens CSS, compiler-managed fields in `index.html` and `app.webmanifest` |
| `packages/specify-sync` (`npm run dev:sync`) | watcher over `assets/`, `specs/tokens.yaml`, `specs/components/` | refreshed asset/token enums in `specs/schemas/base.schema.json` and `.vscode/components.code-snippets` |

Consequences worth knowing:

- **Screens and routes are auto-discovered.** Every `specs/screens/*.yaml` file
  is compiled into a Svelte screen and registered in
  `src/generated/screens/index.ts` during dev/build. Creating a new screen file
  requires no registration.
- `specify-sync` does **not** compile screens or components; it only refreshes
  schema enums and editor snippets.
- `specify-cli` validates and converts YAML/JSON; it never generates
  application code.
- Screen generation re-runs on `npm run dev` and
  `npm run build -w specify-svelte-spa`, so editing a spec is enough to see
  the result in the app. `npm run check -w specify-svelte-spa` only type-checks
  the generated code and does not regenerate it.

## 📂 Project structure

```
specify-starter/
├── specs/                       # Source of truth — your UI as YAML
│   ├── app.yaml                 # Global config, themes, integrations
│   ├── tokens.yaml              # Design tokens (color, spacing, typography)
│   ├── screens/                 # Screen definitions
│   ├── components/              # Reusable components
│   └── schemas/                 # JSON Schemas for validation
├── apps/
│   └── specify-svelte-spa/      # Svelte SPA + Vite plugin that compiles specs
│       └── src/
│           ├── generated/       # ⚠️ Auto-generated — do not edit
│           ├── logic/           # TS functions (fallback for complex logic)
│           └── stores/          # TS reactive stores (fallback)
├── packages/
│   ├── specify-cli/             # Spec validation + optional YAML↔JSON bridge
│   └── specify-sync/            # Spec-to-code synchronizer
├── .agents/skills/specify/      # AI skill + task-specific references
├── .vscode/settings.json        # yaml.schemas mapping (used by CLI + IDE)
├── AGENTS.md                    # Project guidelines for AI agents
└── README.md
```

## 🧩 Extending

Specify compiles to Svelte via `vite-plugin-specify-svelte-spa`. To target a different framework (React, Vue, Solid, etc.), write your own Vite adapter that consumes the same YAML specs and emits your framework's components.

To extend the DSL for a different backend (Supabase, Firebase, custom REST), implement the data and mutation sources referenced in `get-data` and `post-data`.

## 📚 Documentation

- [specifyui.com/docs](https://specifyui.com/docs) — main documentation
- [Habr article (RU)](https://habr.com/ru/articles/1094938/) — design philosophy and walkthrough
- [`AGENTS.md`](./AGENTS.md) — project guidelines for AI agents
- [`.agents/skills/specify/SKILL.md`](./.agents/skills/specify/SKILL.md) — AI workflow and task-specific spec references

## 🤝 Contributing

PRs welcome. For feature discussions or major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](./LICENSE)
