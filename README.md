# OX aka Tic Tac Toe (TypeScript)

A clean, responsive Tic Tac Toe built with **TypeScript** + **Vite** — play a friend or the computer.

**▶ Play online:** https://game-ox.sahilparekh1212.com

## Run it

```bash
cd Game_OX
npm install     # first time only
npm run dev     # starts the dev server
```

Then open the URL it prints (usually **http://localhost:5173**).

## How to play

- **Mode** — **vs Computer** or **2 Players** on the same device. In 2‑player, enter **player names** and the scoreboard/status use them.
- **Play as** (vs Computer) — choose **X** or **O**.
- **First move** (vs Computer) — choose who opens: **You**, **CPU**, or **🪙 Flip** for a coin toss decided fresh each game (the status line announces who won the flip).
- **Difficulty** (vs Computer):
  - **Easy** — plays random moves.
  - **Medium** — takes a winning move, blocks yours, otherwise random.
  - **Hard** — perfect **minimax** play (unbeatable — the best you can do is draw).
- Tap / click a square to place your mark. First to line up three wins; fill the board with no line for a draw.
- The scoreboard tracks wins and draws across rounds. When a round ends, a **popup** offers **New Game** (keeps scores) or **Reset Score** (zeroes the tallies).

Works on phones and laptops — the board scales to the screen and squares are tap‑friendly.

## Build for production

```bash
npm run build     # type-checks and outputs to dist/
npm run preview   # serves the built version
```

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds with Vite and publishes `dist/` to **GitHub Pages**. The custom domain
(`game-ox.sahilparekh1212.com`) is set via a DNS `CNAME` pointing at `sahilparekh1212.github.io`.

## Project structure

```
Game_OX/
├── index.html      # page shell + styling
├── src/
│   ├── main.ts     # DOM wiring + rendering
│   └── game.ts     # game logic + AI (TicTacToe class)
├── package.json
├── tsconfig.json
└── LICENSE
```

## License

Released under the [MIT License](LICENSE).
