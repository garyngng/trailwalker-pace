# Trailwalker Pace — Agent notes

## Modern Web Guidance (required)

For **all** HTML/CSS/client-side JS work on this site, agents **must** use [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) before implementing or regenerating UI:

```sh
npx -y modern-web-guidance@latest search "<focused query>"
npx -y modern-web-guidance@latest retrieve "<id>"
```

Skill install path (project-local): `.agents/skills/modern-web-guidance/`

### Prefer these patterns on this project

- Semantic tables with sticky headers + `@container` stacked mobile layout (`responsive-table`)
- Touch targets ≥ 44px on coarse pointers; safe-area insets (`form-factor-adaptation`)
- Native `<details>` / disclosure for secondary UI (`accordion`, `content-first-noise-reduction`)
- Compact page nav with `aria-current` (`navbar`)
- `oklch()` / modern color with explicit `color-scheme` (`color`)
- Light View Transitions for result panel updates when supported (`same-document-transitions`)
- Accessible forms: label wrapping, `:user-invalid` where useful (`forms`, `accessibility`)

### Browser support

Allow Baseline Widely available features. For Newly available features, use feature detection and graceful degradation (no heavy polyfills).
