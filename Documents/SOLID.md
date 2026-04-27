# SOLID Principles in PitchLogic

---

## S Single Responsibility Principle
Every module should have one reason to change.

| File | Responsibility |
|---|---|
| `src/theme/colors.ts` | Defines the app colour palette only |
| `src/theme/typography.ts` | Defines font sizes, weights, and families only |
| `src/theme/spacing.ts` | Defines spacing, border radius, and shadow scales only |
| `src/api/config.ts` | Owns the API base URL only |
| `src/store/gameStore.ts` | Manages global game state shape and initialisation only |

Each of these files does one thing. If the colour palette changes, only `colors.ts` needs to change. If the server URL changes, only `config.ts` needs to change.

---

## O Open/Closed Principle
Open for extension, closed for modification.

| Location | How |
|---|---|
| `src/theme/` (all files) | New colours, font sizes, or spacing values can be added without touching any logic |
| `src/store/gameStore.ts` | New state fields (e.g. a new game mode) can be added without breaking existing fields |
| `src/api/client.ts` | New API endpoints can be added as new exported functions without changing existing ones |

Adding a new team, a new screen, or a new API call does not require modifying the existing theme or store logic — only extending them.

---

## L Liskov Substitution Principle
Subtypes must be substitutable for their base types.

Not directly applicable to this project. PitchLogic uses functional React components and plain TypeScript interfaces rather than class inheritance, so no substitution hierarchies exist. This is a deliberate architectural choice — composition over inheritance.

---

## I Interface Segregation Principle
Clients should not depend on interfaces they don't use.

| Location | How |
|---|---|
| `MultiplayerAuctionScreen.tsx` | Separate interfaces for `FreeAgent`, `Bid`, `Auction`, `AuctionLeaguePlayer` — each typed for its specific role |
| `src/api/client.ts` | Separate exported types: `Team`, `SquadPlayer`, `MarketPlayer`, `Offer`, `Match`, `FatigueStatus`, `MpLeague`, `Auction`, etc. |

Rather than one large `GameData` type passed everywhere, data is split into focused interfaces so each screen only depends on the shape it actually uses.

---

## D Dependency Inversion Principle
High-level modules should not depend on low-level details.

| Location | How |
|---|---|
| `src/api/config.ts` | All 15 screens import `API_BASE` from this single file instead of hardcoding the URL themselves |
| `src/api/client.ts` | Provides a typed abstraction over raw `fetch` calls — screens can call `getTeams()` instead of constructing URLs and parsing responses manually |

Before `config.ts`, every screen owned the server address as a hardcoded string. Now screens depend on the abstraction (`API_BASE`) rather than the low-level detail (the literal ngrok URL). Changing the server only requires editing one line in one file.

`client.ts` takes this further — if the data-fetching mechanism changes (e.g. switching from `fetch` to a caching library), only `client.ts` needs to change. Screens remain untouched.
