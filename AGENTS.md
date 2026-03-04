# AGENTS.md

## Project Overview
- Stack: `Next.js 16` (App Router) + `React 19` + `TypeScript` + `TailwindCSS v4` + `daisyUI`.
- App entry: `src/app/layout.tsx` + `src/app/page.tsx`.
- Main screen: `src/components/PokemonArena.tsx`.
- Battle/domain types: `src/types/battle.ts`.

## Commands
- Install deps: `bun install`
- Dev server: `bun run dev`
- Lint + typecheck: `bun run lint`
- Typecheck only: `bun run typecheck`
- Production build: `bun run build`
- Production start: `bun run start`

Always run `bun run lint` and `bun run build` after non-trivial changes.

## Code Structure
- `src/api/*`: API mapping and fetch helpers (`poke.ts`).
- `src/utils/*`: battle math, status logic, type chart, generic helpers.
- `src/hooks/*`: reusable state/behavior hooks.
- `src/components/Battle/*`: battle UI blocks.
- `src/components/PokemonArena.tsx`: orchestration layer for fight flow.
- `src/hooks/useBattleEngine.ts`: основная боевая машина (тайминг-окно, ходы, кулдауны, AI оппонента).
- `src/utils/loreAbilities.ts`: генерация лор-способностей покемона и выбор способности оппонента.
- `src/utils/weatherScene.ts`: пресеты погоды и маппинг фоновых сцен.
- `public/weather/*`: фоновые SVG-сцены погоды (neutral/clear/sun/rain/storm/mist).

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
- Бой строится на своевременном прожатии способностей: окно реакции `2500ms`.
- У чемпиона/оппонента 4 лор-способности с кулдаунами (урон/щит/лечение/фокус).
- Результат удара зависит от тайминга, type-effectiveness, погоды, фокуса и щита.
- AI оппонента выбирает способность по контексту (HP, доступность, типовое преимущество).

## UI/Styling Notes
- Existing styles rely on Tailwind utility classes + `src/App.css`.
- Avoid global CSS resets or theme rewrites unless requested.
- Keep mobile/desktop behavior intact when editing layout classes.
- Глобальный фон управляется погодой боя через CSS variable `--arena-bg-image`.
- Иконка погоды из шапки удалена; используется сцена фона + текстовый бейдж.
- Кнопки способностей стилизованы под layered 3D button pattern (codepen-like) в `App.css`.
- Кнопки способностей рендерятся под логом боя (`BattleControls`).
- 3D-hover карточек управляется динамическими CSS-переменными `--grid-rx/--grid-ry`.

## Safety Checklist Before Finish
1. `bun run lint` passes.
2. `bun run build` passes.
3. No dead imports/functions left.
4. No duplicated constants/logic introduced.
