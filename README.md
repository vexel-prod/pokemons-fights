# Pokemon Fights Arena

Battle arena on `Next.js 16` + `React 19` + `TypeScript` with:
- timing-based combat system,
- lore-driven Pokemon abilities with cooldowns,
- type chart effectiveness (`water > fire`, etc.),
- dynamic weather scenes and 3D battle cards.

## Commands

- `bun install`
- `bun run dev`
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bun run start`

## Key Paths

- `src/components/PokemonArena.tsx` - UI orchestration.
- `src/hooks/useBattleEngine.ts` - combat flow and turn resolution.
- `src/utils/loreAbilities.ts` - lore abilities generation + AI pick logic.
- `src/utils/weatherScene.ts` - weather presets and background mapping.
- `public/weather/*` - weather scene assets.
