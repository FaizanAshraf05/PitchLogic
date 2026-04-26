#  PitchLogic — Be the Boss. Build the Dynasty.

PitchLogic is a full-featured **football (soccer) management simulation game** built as a cross-platform mobile and web application. You step into the boots of a football club manager — negotiating transfers, setting tactics, running training sessions, managing facilities, and watching your decisions play out on match day.

Whether you're grinding through a single-player career season, or going head-to-head against friends in a competitive multiplayer league with live player auctions, PitchLogic puts the beautiful game's most stressful job in your hands.

---

## What Can You Actually Do?

- **Manage a Squad** — Scout free agents, make transfer bids, receive incoming offers, and build your dream 11.
- **Set Tactics & Formations** — Pick your formation and style of play before every match.
- **Run Training Sessions** — Assign position-specific training programs to boost player ratings over a 3-match cycle.
- **Manage Facilities** — Upgrade your youth academy and training grounds to develop better players over time.
- **Track Your Season** — Follow the full league table, fixture schedule, and your manager stats as the season progresses.
- **Inbox System** — Receive messages from your board, injury reports, incoming transfer offers, and more.
- **Multiplayer Mode** — Create or join a private league with a 6-character code, participate in live player auctions against real opponents, and compete for the top of the table.

---

## Tech Stack

### Frontend — React Native + Expo

The app is built with **React Native** and **Expo**, meaning it compiles to iOS, Android, and Web from a single TypeScript codebase. React handles the component tree and UI rendering, while Expo provides the build toolchain and native module access.

### Backend — Node.js + Express

The backend is a **Node.js REST API** built with **Express 5**, handling all game logic that needs to be authoritative, shared, or persisted server-side. This is especially critical for multiplayer — auction bids, league standings, and match results all run through the API.
- **ngrok Tunnel** — During development, the local Express server is exposed via an ngrok tunnel so the mobile app can reach it from any device.

### Database — Microsoft SQL Server
Player data, team information, league fixtures, and manager records are stored in a **Microsoft SQL Server** database (`Pitch_Logic` DB). The backend connects via the `mssql` Node.js driver.


## Multiplayer

Multiplayer is where things get interesting (and competitive). Players can:

1. Create a private league and share the 6-character join code with friends.
2. Compete for players in a **live auction** — bid in real time, outmanoeuvre opponents, build the squad you want.
3. Play out fixtures against human-managed teams tracked on a shared league table.

All multiplayer state is synchronized through the Express backend, ensuring fair, authoritative results.

---

## Running the Project

### Frontend

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `w` for the web version.

### Backend

```bash
cd backend
npm install
node server.js
```

The API runs on `localhost:3000` by default. Update the base URL in the frontend to point to your server (or your ngrok tunnel URL for device testing).

### Database

You will need a running Microsoft SQL Server instance with the `Pitch_Logic` database. Update `backend/dbConfig.js` with your connection details.

*Built with React Native, Express, and an unhealthy obsession with football.*
