---
name: Dark mode approach
description: How dark mode is implemented in LeadEngine — class-based activation, inline rgba glass styles over Tailwind dark: utilities.
---

## Rule
LeadEngine is dark-by-default. `class="dark"` on the `<html>` element activates CSS variable overrides defined in `index.css`, which shadcn/ui components pick up automatically.

For premium glass/glow effects, use inline `style` props with `rgba()` colors rather than Tailwind `dark:` prefix utilities. This avoids purge issues and is easier to tune visually.

## Why
Tailwind's `dark:` variant requires every component to opt-in with a `dark:` class variant. Since the app is dark-only (no light/dark toggle), a single `class="dark"` on the root is cleaner and ensures all shadcn/ui CSS variables resolve to their dark values without touching every component.

## How to apply
- `index.html`: `<html lang="en" class="dark">`
- Glass cards: `style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}`
- Hover via `onMouseEnter`/`onMouseLeave` for precise control without Tailwind dark: conflicts.
- Recharts dark charts: pass `contentStyle` to `<Tooltip>` with explicit dark bg/border/color.
