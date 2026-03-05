# Pokemon Fights Arena

Interactive Pokemon battle arena built with Next.js and TypeScript.
The project focuses on timing-based combat, lore-driven abilities, and dynamic weather scenes.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- TailwindCSS v4
- daisyUI
- Bun (package manager and scripts)

## Highlights

- Real-time battle loop with a reaction window (`2500ms`) for player actions.
- Lore-style ability generation based on Pokemon types and known abilities.
- Type effectiveness system (`water > fire`, `electric > water`, etc.).
- Dynamic weather states that affect visuals and damage multipliers.
- AI opponent ability selection based on HP state, cooldowns, and type advantage.
- Battle log with pagination and compact event rendering.
- 3D hover/tilt Pokemon cards and animated battle impact effects.

## Project Structure

```text
src/
  api/
    poke.ts                 # PokeAPI mapping and fetch helpers
  app/
    layout.tsx              # App layout + global css import
    page.tsx                # App Router page entry
  components/
    Battle/
      BattleCard.tsx        # Left/right battle cards
      BattleControls.tsx    # Ability buttons and timing controls
      BattleHeader.tsx      # Top panel with HP/status/weather badge
      BattleLog.tsx         # Battle event log + pagination
      index.ts
    PokemonArena.tsx        # Main orchestration UI
    PokemonCard.tsx         # Pokemon visual card
  hooks/
    useBattleEngine.ts      # Core battle engine (turn loop, cooldowns, AI)
    useBattleLog.ts         # Log state and pagination
    usePokemon.ts           # Initial Pokemon loading and count
  types/
    battle.ts               # Domain types
  utils/
    attackUtils.ts
    battleCalc.ts
    helpers.ts
    items.ts
    loreAbilities.ts        # Lore ability generation and opponent decision logic
    statusEffects.ts
    typeChart.ts
    weatherScene.ts         # Weather presets + background image mapping
  App.css                   # Main visual system and effects
  App.tsx

public/
  weather/
    neutral.svg
    clear.svg
    sun.svg
    rain.svg
    storm.svg
    mist.svg
```

## Battle Flow

1. **Prepare**
   - Random champion and challenger are loaded from PokeAPI.
   - Random weather state is selected.

2. **Start Fight**
   - Both sides receive 4 abilities:
     - 2 damage abilities (based on primary/secondary type)
     - tactical utility (focus/shield/heal depending on lore mapping)
     - sustain/defense fallback if missing
   - Cooldowns initialize.

3. **Turn Loop**
   - Player has `2500ms` to pick an ability.
   - Better reaction timing gives a damage/heal bonus.
   - Opponent selects ability contextually (HP, readiness, effectiveness).
   - Damage calculation applies:
     - attack/defense scaling
     - STAB
     - type effectiveness
     - weather multipliers
     - shield absorb
     - crit chance

4. **Result**
   - Winner is logged.
   - Arena moves to “next opponent” state for the next fight.

## Weather System

Weather affects both visuals and combat numbers:

- `CLEAR`: neutral modifiers
- `SUN`: fire up, water down
- `RAIN`: water up, fire down
- `STORM`: more volatile visual atmosphere
- `MIST`: special atmosphere + visual fog layer

The active scene is mapped to `public/weather/*.svg` and injected via CSS variable (`--arena-bg-image`).

## Commands

```bash
bun install
bun run dev
bun run lint
bun run typecheck
bun run build
bun run start
```

## Local Development

1. Install deps: `bun install`
2. Run dev server: `bun run dev`
3. Open [http://localhost:3000](http://localhost:3000)
4. Before commit, run:
   - `bun run lint`
   - `bun run build`

## Quality Rules

- Keep strict TypeScript types (no `any`).
- Reuse domain types from `src/types/battle.ts`.
- Prefer extending utils/hooks over adding heavy logic directly in JSX.
- Keep mobile/desktop layout behavior intact.
- Preserve existing visual language unless explicitly redesigning.

## Troubleshooting

### Duplicate key warning in ability buttons

If you see a duplicate React key warning during dev:

1. Ensure latest code is running.
2. Stop dev server.
3. Clear cache and restart:

```bash
rm -rf .next
bun run dev
```

### Build fails in restricted sandbox

In some restricted environments, Next/Turbopack may fail to bind internal ports.
Run build in a normal local shell environment:

```bash
bun run build
```

## Roadmap Ideas

- Ability animations per type.
- Deeper status-effect interactions.
- Ranked mode with progression.
- Replay export/import for battle sessions.
