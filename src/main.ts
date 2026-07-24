import { TicTacToe, type Difficulty, type Mode, type Starter } from "./game.ts";

const game = new TicTacToe();
// Expose a handle for debugging in the console (harmless in production).
(window as unknown as { game: TicTacToe }).game = game;

const boardEl = document.getElementById("board") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const scoreXEl = document.getElementById("scoreX") as HTMLElement;
const scoreOEl = document.getElementById("scoreO") as HTMLElement;
const scoreDrawEl = document.getElementById("scoreDraw") as HTMLElement;
const labelXEl = document.getElementById("labelX") as HTMLElement;
const labelOEl = document.getElementById("labelO") as HTMLElement;
const groupDiff = document.getElementById("group-diff") as HTMLElement;
const groupMark = document.getElementById("group-mark") as HTMLElement;
const groupStarter = document.getElementById("group-starter") as HTMLElement;

// Build the 3x3 grid of cell buttons.
const cells: HTMLButtonElement[] = [];
for (let i = 0; i < 9; i++) {
  const btn = document.createElement("button");
  btn.className = "cell";
  btn.type = "button";
  btn.setAttribute("aria-label", `Square ${i + 1}`);
  btn.addEventListener("click", () => onCell(i));
  boardEl.appendChild(btn);
  cells.push(btn);
}

let aiTimer: number | undefined;

// ---- Coin flip animation ----------------------------------------------------

const coinOverlay = document.getElementById("coin-overlay") as HTMLElement;
const coinEl = document.getElementById("coin") as HTMLElement;
let flipping = false;
let flipToken = 0; // invalidates an in-flight flip when settings change mid-spin

/** Spin the coin to the winning face; resolves true unless superseded. */
function coinFlip(winner: "human" | "ai"): Promise<boolean> {
  const token = ++flipToken;
  flipping = true;
  coinOverlay.hidden = false;
  coinEl.style.transition = "none";
  coinEl.style.transform = "rotateY(0deg)";
  void coinEl.offsetWidth; // flush styles so the spin animates from 0
  coinEl.style.transition = "";
  const angle = 5 * 360 + (winner === "ai" ? 180 : 0); // land on YOU or CPU
  coinEl.style.transform = `rotateY(${angle}deg)`;
  statusEl.textContent = "🪙 Flipping…";
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const valid = token === flipToken;
      if (valid) {
        flipping = false;
        coinOverlay.hidden = true;
      }
      resolve(valid);
    }, 1750); // 1.15s spin + a short hold on the result
  });
}

/** Reset follow-up shared by New Game / mode / mark / starter changes. */
function afterRoundReset(): void {
  flipToken++; // cancel any in-flight flip
  flipping = false;
  coinOverlay.hidden = true;
  render();
  if (game.mode === "cpu" && game.flipWinner && !game.over) {
    void coinFlip(game.flipWinner).then((ok) => {
      if (ok) {
        render();
        scheduleAi();
      }
    });
  } else {
    scheduleAi();
  }
}

function onCell(i: number): void {
  if (flipping || game.over) return;
  if (game.mode === "cpu" && game.current === game.ai) return; // wait for the computer
  if (!game.play(i)) return;
  render();
  scheduleAi();
}

function scheduleAi(): void {
  if (!game.aiToMove()) return;
  window.clearTimeout(aiTimer);
  aiTimer = window.setTimeout(() => {
    game.playAI();
    render();
  }, 350); // brief pause so the move feels deliberate
}

function render(): void {
  for (let i = 0; i < 9; i++) {
    const v = game.board[i];
    const cell = cells[i];
    cell.textContent = v ?? "";
    cell.classList.toggle("x", v === "X");
    cell.classList.toggle("o", v === "O");
    cell.classList.toggle("win", game.winningLine?.includes(i) ?? false);
    cell.disabled = v !== null || game.over || (game.mode === "cpu" && game.current === game.ai);
  }
  statusEl.textContent = statusText();
  statusEl.classList.toggle("over", game.over);
  scoreXEl.textContent = String(game.scores.X);
  scoreOEl.textContent = String(game.scores.O);
  scoreDrawEl.textContent = String(game.scores.draws);
}

function statusText(): string {
  if (game.winner) {
    if (game.mode === "cpu") return game.winner === game.human ? "You win! 🎉" : "Computer wins!";
    return `${game.winner} wins! 🎉`;
  }
  if (game.draw) return "It's a draw!";
  if (game.mode === "cpu") {
    // Announce the coin-flip result until the first mark lands.
    if (game.flipWinner && game.board.every((c) => c === null)) {
      return game.flipWinner === "human" ? "🪙 You won the flip — your move!" : "🪙 CPU won the flip…";
    }
    return game.current === game.human ? "Your turn" : "Computer thinking…";
  }
  return `${game.current}'s turn`;
}

function syncLabels(): void {
  const cpu = game.mode === "cpu";
  if (cpu) {
    labelXEl.textContent = game.human === "X" ? "You (X)" : "CPU (X)";
    labelOEl.textContent = game.human === "O" ? "You (O)" : "CPU (O)";
  } else {
    labelXEl.textContent = "Player X";
    labelOEl.textContent = "Player O";
  }
  groupDiff.style.display = cpu ? "" : "none";
  groupMark.style.display = cpu ? "" : "none";
  groupStarter.style.display = cpu ? "" : "none";
}

// ---- Menu wiring -----------------------------------------------------------

function wireSeg(id: string, onPick: (btn: HTMLElement) => void): void {
  const seg = document.getElementById(id);
  seg?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn || !seg.contains(btn)) return;
    for (const child of Array.from(seg.children)) child.classList.toggle("active", child === btn);
    onPick(btn);
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

wireSeg("mode", (btn) => {
  window.clearTimeout(aiTimer);
  game.setMode(btn.dataset.mode as Mode);
  syncLabels();
  afterRoundReset();
});

wireSeg("difficulty", (btn) => {
  game.setDifficulty(btn.dataset.diff as Difficulty);
});

wireSeg("mark", (btn) => {
  window.clearTimeout(aiTimer);
  game.setHumanMark(btn.dataset.mark as "X" | "O");
  syncLabels();
  afterRoundReset();
});

wireSeg("starter", (btn) => {
  window.clearTimeout(aiTimer);
  game.setStarter(btn.dataset.starter as Starter);
  afterRoundReset();
});

document.getElementById("btn-new")?.addEventListener("click", () => {
  window.clearTimeout(aiTimer);
  game.reset();
  afterRoundReset();
});

document.getElementById("btn-reset")?.addEventListener("click", () => {
  game.resetScores();
  render();
});

syncLabels();
render();
