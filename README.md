# Specify

This is a declarative specification and compiler for building web applications. It blurs the line between design and frontend. Instead of the usual JSX, HTML, or CSS, we use concise YAML. The styling syntax mirrors Figma's logic, letting designers and developers speak the same language.

You describe a screen's structure in YAML and immediately see the result in the browser. Change a margin, color, or font — and the interface updates. This isn't a static mockup, but a living application with real data, forms, and navigation. For a designer, this means the final implementation won't differ from the visual, and the handoff to development boils down to hitting the Push button in Git.

Out of the box, Specify generates a Svelte SPA with the open-source backend platform Appwrite integrated: database queries, authentication, and file handling are all described right in YAML. If your stack is different, Specify is extensible: you can write your own Vite adapter to compile to your framework of choice and extend the DSL specification for any backend.

[Read more](https://specifyui.com/)