# Design Patterns in PitchLogic

This document shows the main design patterns used in this project.

---

## 1. Singleton Pattern

Used in `src/store/gameStore.ts` with the Zustand store. The `useGameStore` hook is created once and shared across the entire app. Every screen that needs game state accesses the same single instance, so there is never more than one source of truth for the game data.

---

## 2. Factory Pattern

Used in `src/store/gameStore.ts` with the `createDefaultStats()` function. Instead of writing out the same default team stats object every time a new team is created, this function produces a fresh copy on demand. This keeps team initialisation consistent and in one place.

---

## 3. Component Pattern

All UI elements like `TabBar` in `src/components/TabBar.tsx` are built as reusable components. The tab bar is defined once and works across all main screens without being rewritten. The same applies to every screen — each is a self-contained component that can be navigated to independently.

---

## 4. Polling Pattern

Used in `MultiplayerAuctionScreen.tsx`, `MultiplayerLeagueScreen.tsx`, `MultiplayerLobbyScreen.tsx`, and `MultiplayerPreMatchScreen.tsx`. These screens use `setInterval` to fetch live data from the server every 2–3 seconds, so players see auction bids, league invites, and match results update in real time without having to refresh manually.

---

## 5. Strategy Pattern

Used in `src/screens/SquadScreen.tsx` with the `FORMATIONS` object. Each formation (4-3-3, 4-4-2, 4-2-3-1, 3-5-2) is a separate strategy for positioning players on the pitch. The manager picks a formation and the screen applies that strategy to place players in the correct slots.
