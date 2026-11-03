# Design quality in specs

Sections: When to review · Design brief and system invariants · Hierarchy ·
Rhythm · Interaction states · Feedback and content states · Accessibility ·
Anti-slop rules for specs · Variations · Review workflow.

Schema validation proves a spec is *well-formed*; this reference makes it
*well-designed*. Apply it when creating or restructuring screens, when adding
prominent surfaces (heroes, cards, forms, navigation), and before reporting a
structural UI change as done.

## When to review

Review the screens and shared components touched by the task — not the whole
project. A localized data or logic change does not need this pass; a new
screen, a new shared component, or a layout rework does. Report concrete
findings and remaining limitations in the final summary, or state that the
review was not run.

## Design brief and system invariants

Before creating a screen or substantially reworking a layout, write a short
brief in the working plan, not as visible production UI or a new documentation
file. Cover the user goal, primary/secondary/tertiary hierarchy, primary CTA,
density, composition, surface treatment, and motion character. For a localized
change, include only the affected decisions.

Make structural decisions testable rather than purely descriptive. For a new
screen, define what should fit in the first desktop and mobile viewport, the
primary visual anchor, content measure, hero proportions, expected items per
row, and where section rhythm intentionally changes. Do not add metrics, cards,
or decorative elements merely to fill space.

Derive the direction from the current design system rather than inventing a new
one. Inspect the nearest relevant screen and identify the concrete invariants
the new work will reuse:

- semantic `surface-*` background/border and foreground roles;
- display, body, and label styles from `t.typography.*`;
- density from the existing `t.spacing.*` rhythm;
- radius and elevation conventions;
- canonical variants of existing components and their selected/active states;
- quiet, consistent state transitions.

Use semantic page-level tokens and component theme props as described in
`styles-and-tokens.md`. Do not introduce a replacement palette, font stack, or
component style merely to make a screen look novel. If the brief reveals a
genuine token, component, or asset gap, handle it within the editing scope
instead of silently bypassing the system with one-off values.

## Hierarchy

For each screen, the eye path must be answerable:

1. **Primary/secondary/tertiary.** Name what should be seen first, second,
   third. If nothing stands out, or two unrelated elements compete at the same
   size and color weight, the hierarchy is broken.
2. **Size and weight.** Headlines visibly larger than body text (`t.typography.*`
   steps, not adjacent arbitrary `txt-size` values). One clearly primary CTA;
   secondary actions use the canonical lower-emphasis component variant.
3. **Color signal.** Use the component's canonical primary variant and its
   semantic/component tokens; keep secondary actions neutral and supporting
   content muted. Flag everything at the same color weight (no signal) and
   unimportant elements in the brightest fill (wrong signal).
4. **5-second test.** On first view, a new user can tell what the screen is
   about and what the main action is. If not, promote the primary action and
   mute the noise.

Too-strong hierarchy is easier to dial back than too-weak to fix.

## Rhythm

For the screen as a whole:

1. **Spacing scale.** Shared padding and gaps normally snap to `t.spacing.*`
   steps (or the numeric scale nearby specs already use). Flag accidental drift,
   not deliberate optical alignment, icon sizing, offsets, or other justified
   local dimensions.
2. **Repetition.** Cards in a grid, list rows, and feature blocks share
   padding, gap, radius, and structure. Near-duplicates that differ by a few
   pixels are drift: either make them identical or deliberately different.
3. **Strategic variation.** A long screen may break its pattern once or twice
   (background shift, centered section, wider block). Total uniformity is
   monotonous; every-section-different is chaotic.
4. **Palette discipline.** Keep a limited semantic palette without competing
   accents. Flag several slightly different grays or blues used for the same
   role and repeated raw values that bypass the token system.
5. **Alignment.** Elements line up on the same edges and centers; flag
   few-pixel offsets between siblings that share an axis unless the offset is a
   deliberate optical correction.

## Interaction states

Every interactive layer and component invocation must either come with
complete states from its component definition (check `c.button-*`, `field-*`)
or define them locally:

- **Default:** clearly interactive at rest — a fill, border, or button token
  distinct from body text. Interactivity that appears only on hover does not
  exist for touch and keyboard users.
- **Hover/active/disabled:** via `styles.hover`, `styles.active`,
  `styles.disabled` with token colors (see `button-md.yaml` and the example
  in `styles-and-tokens.md`). Disabled suppresses hover and remains distinct
  from both default and hover.
- **Focus:** visible focus state, not outline removal without replacement.
  Prefer the component's built-in focus style.
- **Loading:** actions that trigger async work (`get-data`/`post-data` with
  `state` flags) disable the trigger and show `c.spinner-*` or a message;
  data fetched on render gets a spinner or skeleton, not a blank gap.
- **Transitions:** `transitions` durations around 100–200ms for state changes,
  longer for entry/exit; keep consistent with nearby specs.

## Feedback and content states

- Every action shows a visible result: `set-notification` for success/failure,
  inline messages for validation errors, state updates for toggles. Silent
  successes and silent failures both read as broken.
- Success feedback must describe something that actually happened. Without a
  real `post-data` mutation or other persistence, do not claim that a request
  was sent or data was saved. Mark local demo behavior explicitly or implement
  the real operation; `set-state` alone is not proof of server-side success.
- Validation errors are specific ("Email is required", not "Invalid") and tied
  to their field.
- Form fields have a `c.label-*` or equivalent text label; placeholder text
  alone is not a label.
- Current state is visible: the active page/tab, selected items, applied
  filters are visually distinct through the component's canonical active or
  selected treatment.
- Data-driven UI covers loading, empty, error, and populated states where they
  apply. An empty state explains what happened and offers a useful next step;
  an error is clear and recoverable. Do not show a blank gap or a spinner
  forever when a request fails.
- Actions describe their result ("Save changes") rather than relying on generic
  labels where the intent could be unclear. Supporting information does not
  compete with the main task.
- Check short, long, and missing content against wrapping, truncation, and
  container sizing. Invented content must be plausible but clearly identified
  as placeholder business data in the final report.

## Accessibility

Existing tokens and standard component variants are already accessibility-
checked at the design-system level. Reuse them without recomputing contrast or
repeating a component audit on every screen. Check only risks introduced by
the current change, and do not invent ARIA fields, CSS selectors, or other DSL
syntax.

1. **New color combinations only.** Check contrast when adding a raw color,
   changing token values, combining foreground/background roles in a
   nonstandard way, or placing text over imagery, gradients, or dynamically
   computed backgrounds. Otherwise trust the design system.
2. **More than color.** Do not communicate error, success, selection, or
   required status by color alone: add text, an icon, shape, underline, or
   another appropriate cue. Use existing assets; do not create an asset without
   the required approval.
3. **Semantics and headings.** Use suitable `html-tag` values for headings,
   navigation, forms, and controls. Keep heading levels tied to document
   structure, not visual size. Prefer an existing semantic component such as
   `c.button-*` over a clickable generic frame. Give meaningful images useful
   `alt` text and decorative images empty alt text where the layer supports it.
4. **New or custom interactions.** For interactions not already covered by a
   standard component, check `tabindex`, visible focus, logical reading order,
   and supported `on-keydown` behavior. Dismissible overlays should support
   Escape where the DSL can express it. Nothing essential may be available only
   on hover or pointer input.
5. **Forms and touch.** Preserve native field types, labels, required state,
   autocomplete, and specific errors. For new custom controls, verify touch
   targets in the rendered UI; small visual icons may need a larger hit area.
6. **New noticeable motion.** Avoid flashing and unnecessary motion that blocks
   the task. Respect reduced-motion preferences through documented DSL/runtime
   support. If that support is absent, report the limitation instead of adding
   raw CSS or changing runtime code outside the approved scope.

Treat accessibility failures introduced by the change as blockers, not optional
polish.

## Anti-slop rules for specs

The DSL already prevents most template rot (tokens, components, themes).
Remaining rules:

1. **No decorative emoji** in `text`, labels, or button content unless it is a
   functional marker (status, category) or the user asked.
2. **Colors trace to tokens.** Justify any raw color; repeated or role-based
   values belong in `t.color.*` rather than inline. Prefer flat token fills and
   use gradients only when they serve the existing visual direction.
3. **Content earns its place.** No filler cards, placeholder stat rows, or
   sections whose only role is to fill a grid. If content is invented, mark it
   as placeholder per the Definition of done.
4. **Honest placeholders.** Missing imagery is a labeled placeholder, not fake
   final art. Reuse existing icons and illustrations rather than generating
   substitute artwork.
5. **No fashion checklist.** Do not ban a font, radius, shadow, pure neutral,
   or other choice merely because it appears in a generic design trope list.
   Judge it against the current brand, tokens, nearby screens, and user goal.

## Variations

When the user asks for alternatives, normally explore 2–3 substantively
different directions, for example conservative, refined, and exploratory. Vary
composition, hierarchy, density, or interaction model — not only accent color,
radius, or shadow. Keep every option within existing tokens and component
contracts unless the user explicitly requests a design-system change.

Annotate each option with a one-sentence tradeoff and recommend one. Implement
the selected direction; do not leave temporary `v1`/`v2` screens in
`specs/screens/`. Do not create multiple variations automatically for a clear,
localized task.

## Review workflow

1. Read the changed spec(s), the Design Brief, and the nearest existing
   screen/component of the same kind. At the rendered-verification stage of the
   root `AGENTS.md` workflow, review the screen on desktop and mobile (and dark
   theme when relevant). `specify-cli preview shot` can provide the screenshots;
   see `cli.md` for syntax. Reading YAML alone is not a visual design review.
2. Review the risks relevant to the change before fixing; skip categories it
   cannot affect. For structural work this normally means hierarchy, rhythm,
   states, content, and anti-slop, plus any accessibility risks introduced by
   new custom behavior or styling. Check the first viewport and the measurable
   decisions from the brief. Include affected screens and only those shared
   components changed by the task.
3. Record a short list of concrete findings tied to sections and viewports,
   then aggregate and deduplicate them. Fix accessibility blockers and concrete
   quality issues within scope; separate optional aesthetic recommendations.
   For judgment calls, pick a defensible default and note it for the user. A
   statement that review was performed is not a substitute for its findings.
   A visual complaint is first checked against the design tokens and existing
   screens. If the value comes from the shared system and matches other
   artifacts, it is a system decision, not a finding. A finding is stated as a
   measured discrepancy (for example, a contrast ratio against its requirement),
   never as a claim about how the implementation produces the value.
4. Re-check high-risk interactions after fixes: contrast versus emphasis,
   focus indicators versus adjacent content, and spacing changes versus narrow
   layouts. Do not introduce a second problem while fixing the first.
5. Return to the root `AGENTS.md` workflow for the final aggregate check. This
   review does not replace schema validation, automated rendered checks, or
   interaction testing, and vice versa.