import { TicTacToe, type Difficulty, type Mode, type Player, type Starter } from "./game.ts";
import { fetchOxHint } from "./hints.ts";

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
const groupNames = document.getElementById("group-names") as HTMLElement;
const nameXInput = document.getElementById("nameX") as HTMLInputElement;
const nameOInput = document.getElementById("nameO") as HTMLInputElement;

// Hint feature: a toggle in the panel shows/hides the button; the button asks
// the hints-api Worker to explain the engine's recommended move.
const hintBtn = document.getElementById("btn-hint") as HTMLButtonElement;
const hintOverlay = document.getElementById("hint-overlay") as HTMLElement;
const hintBody = document.getElementById("hint-body") as HTMLElement;
let hintsEnabled = localStorage.getItem("ox:hints") === "on";

/** Display name for a mark in 2-player mode (falls back to Player X / Player O). */
function pname(p: Player): string {
  const raw = p === "X" ? nameXInput.value : nameOInput.value;
  return raw.trim() || (p === "X" ? "Player X" : "Player O");
}

// Build the 3×3 grid of cell buttons.
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
  }, 2000); // pause so the move feels deliberate, not instant
}

function render(): void {
  for (let i = 0; i < cells.length; i++) {
    const v = game.board[i];
    const cell = cells[i];
    cell.textContent = v ?? "";
    cell.classList.toggle("x", v === "X");
    cell.classList.toggle("o", v === "O");
    cell.classList.toggle("win", game.winningLine?.includes(i) ?? false);
    cell.disabled = v !== null || game.over || (game.mode === "cpu" && game.current === game.ai);
  }
  renderStatus();
  updateHintButton();
  statusEl.classList.toggle("over", game.over);
  scoreXEl.textContent = String(game.scores.X);
  scoreOEl.textContent = String(game.scores.O);
  scoreDrawEl.textContent = String(game.scores.draws);

  // End-of-round popup: appears shortly after the round ends (so the
  // winning line stays visible for a beat), offering New Game / Reset Score.
  if (game.over) {
    if (endOverlay.hidden && endTimer === undefined) {
      endTimer = window.setTimeout(() => {
        endTimer = undefined;
        endTitle.textContent = statusInfo().text;
        endOverlay.hidden = false;
      }, 900);
    }
  } else {
    hideEndOverlay();
  }
}

const endOverlay = document.getElementById("end-overlay") as HTMLElement;
const endTitle = document.getElementById("end-title") as HTMLElement;
let endTimer: number | undefined;

function hideEndOverlay(): void {
  window.clearTimeout(endTimer);
  endTimer = undefined;
  endOverlay.hidden = true;
}

// ---- Hints -----------------------------------------------------------------

/** Show/enable the hint button per the toggle and whether a hint is available. */
function updateHintButton(): void {
  hintBtn.hidden = !hintsEnabled;
  if (!hintsEnabled) return;
  hintBtn.disabled = flipping || game.bestHint() === null;
}

function openHint(text: string, loading = false): void {
  hintBody.textContent = text;
  hintBody.classList.toggle("loading", loading);
  hintOverlay.hidden = false;
}

function closeHint(): void {
  hintOverlay.hidden = true;
}

let hintPending = false;
async function requestHint(): Promise<void> {
  if (hintPending) return;
  const h = game.bestHint();
  if (!h) return;
  hintPending = true;
  hintBtn.disabled = true;
  openHint("Thinking…", true);
  try {
    const text = await fetchOxHint({
      board: game.board,
      toMove: game.current,
      recommended: h.index,
      reason: h.reason,
    });
    openHint(text);
  } catch {
    openHint("Sorry — couldn't fetch a hint. Check the connection and try again.");
  } finally {
    hintPending = false;
    updateHintButton();
  }
}

hintBtn.addEventListener("click", () => void requestHint());
document.getElementById("hint-close")?.addEventListener("click", closeHint);
hintOverlay.addEventListener("click", (e) => {
  if (e.target === hintOverlay) closeHint(); // click the backdrop to dismiss
});

/** Status line content: text plus (for turn messages) the mover's mark. */
function statusInfo(): { text: string; mark: Player | null } {
  if (game.winner) {
    if (game.mode === "cpu") {
      return { text: game.winner === game.human ? "You win! 🎉" : "CPU wins!", mark: null };
    }
    return { text: `${pname(game.winner)} wins! 🎉`, mark: null };
  }
  if (game.draw) return { text: "It's a draw!", mark: null };
  if (game.mode === "cpu") {
    // Announce the coin-flip result until the first mark lands.
    if (game.flipWinner && game.board.every((c) => c === null)) {
      return game.flipWinner === "human"
        ? { text: "🪙 You won the flip — your move!", mark: game.human }
        : { text: "🪙 CPU won the flip…", mark: game.ai };
    }
    return game.current === game.human
      ? { text: "Your turn", mark: game.human }
      : { text: "CPU's turn", mark: game.ai };
  }
  return { text: `${pname(game.current)}'s turn`, mark: game.current };
}

/** Write the status line, appending a coloured mark icon for turn messages. */
function renderStatus(): void {
  const s = statusInfo();
  statusEl.textContent = s.text;
  if (s.mark) {
    statusEl.appendChild(document.createTextNode(" — "));
    const m = document.createElement("span");
    m.className = `status-mark ${s.mark === "X" ? "mark-x" : "mark-o"}`;
    m.textContent = s.mark;
    statusEl.appendChild(m);
  }
}

function syncLabels(): void {
  const cpu = game.mode === "cpu";
  if (cpu) {
    labelXEl.textContent = game.human === "X" ? "You (X)" : "CPU (X)";
    labelOEl.textContent = game.human === "O" ? "You (O)" : "CPU (O)";
  } else {
    labelXEl.textContent = pname("X");
    labelOEl.textContent = pname("O");
  }
  groupDiff.style.display = cpu ? "" : "none";
  groupMark.style.display = cpu ? "" : "none";
  groupStarter.style.display = cpu ? "" : "none";
  groupNames.style.display = cpu ? "none" : "";
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

wireSeg("hints", (btn) => {
  hintsEnabled = btn.dataset.hints === "on";
  localStorage.setItem("ox:hints", hintsEnabled ? "on" : "off");
  if (!hintsEnabled) closeHint();
  updateHintButton();
});

// Reflect the persisted hints toggle in its segmented control on load.
for (const child of Array.from(document.getElementById("hints")!.children)) {
  const el = child as HTMLElement;
  el.classList.toggle("active", el.dataset.hints === (hintsEnabled ? "on" : "off"));
}

// End-popup actions: both start a fresh round; Reset Score also zeroes the tallies.
document.getElementById("po-new")?.addEventListener("click", () => {
  window.clearTimeout(aiTimer);
  game.reset();
  afterRoundReset();
});

document.getElementById("po-reset")?.addEventListener("click", () => {
  window.clearTimeout(aiTimer);
  game.resetScores();
  game.reset();
  afterRoundReset();
});

// Live-update labels and status as names are typed (2-player mode).
for (const input of [nameXInput, nameOInput]) {
  input.addEventListener("input", () => {
    syncLabels();
    render();
  });
}

game.reset(); // roll the opening coin flip (default starter)
syncLabels();
afterRoundReset();
