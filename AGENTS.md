# AGENTS.md

## Project Overview
- Stack: `React 19` + `Vite` + `TypeScript` + `TailwindCSS v4` + `daisyUI`.
- Entry point: `src/main.tsx`.
- Main screen: `src/components/PokemonArena.tsx`.
- Battle/domain types: `src/types/battle.ts`.

## Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Lint + typecheck: `npm run lint`
- Typecheck only: `npm run typecheck`
- Production build: `npm run build`

Always run `npm run lint` and `npm run build` after non-trivial changes.

## Code Structure
- `src/api/*`: API mapping and fetch helpers (`poke.ts`).
- `src/utils/*`: battle math, status logic, type chart, generic helpers.
- `src/hooks/*`: reusable state/behavior hooks.
- `src/components/Battle/*`: battle UI blocks.
- `src/components/PokemonArena.tsx`: orchestration layer for fight flow.

## Development Rules
- Keep strict TypeScript types; do not reintroduce `any`.
- Reuse domain types from `src/types/battle.ts`.
- Do not duplicate item/status/type logic across files.
- Prefer extending existing utils/hooks instead of embedding large logic in JSX.
- Keep current layout/class structure stable unless explicitly requested.
- For UX updates (effects/animations/mechanics), prefer additive changes with minimal markup churn.

## Battle Logic Notes
- `types` and `abilities` are stored as string arrays in mapped `Pokemon`.
- Use helpers (`getTypes`, `hasType`, `hasAbility`) for checks.
- Battle state shape is centralized in `initBattleState()` and `BattleState` type.

## UI/Styling Notes
- Existing styles rely on Tailwind utility classes + `src/App.css`.
- Avoid global CSS resets or theme rewrites unless requested.
- Keep mobile/desktop behavior intact when editing layout classes.

## Safety Checklist Before Finish
1. `npm run lint` passes.
2. `npm run build` passes.
3. No dead imports/functions left.
4. No duplicated constants/logic introduced.
