/**
 * Tic Tac Toe game logic.
 *
 * Two modes: "two" (two humans) and "cpu" (you vs the CPU).
 * Against the CPU, difficulty controls how it picks moves:
 *   easy   – random
 *   medium – takes a win, blocks a loss, otherwise random
 *   hard   – minimax, but with an occasional random slip so it stays
 *            strong without being literally unbeatable
 */

export type Player = "X" | "O";
export type Cell = Player | null;
export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "two" | "cpu";
export type Starter = "human" | "ai" | "flip";

/** Chance that hard mode plays a random move instead of the optimal one. */
const HARD_SLIP_CHANCE = 0.2;

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface Scores {
  X: number;
  O: number;
  draws: number;
}

export class TicTacToe {
  board: Cell[] = Array(9).fill(null);
  current: Player = "X";
  mode: Mode = "cpu";
  difficulty: Difficulty = "medium";
  human: Player = "X"; // in cpu mode
  ai: Player = "O"; // in cpu mode
  starter: Starter = "flip"; // who opens each game in cpu mode
  flipWinner: "human" | "ai" | null = null; // outcome of the last coin flip
  winner: Player | null = null;
  winningLine: number[] | null = null;
  draw = false;
  scores: Scores = { X: 0, O: 0, draws: 0 };

  get over(): boolean {
    return this.winner !== null || this.draw;
  }

  reset(): void {
    this.board = Array(9).fill(null);
    this.winner = null;
    this.winningLine = null;
    this.draw = false;
    this.flipWinner = null;
    if (this.mode === "cpu") {
      // Who opens: the chosen side, or a coin flip decided fresh each game.
      const opener =
        this.starter === "flip" ? (Math.random() < 0.5 ? "human" : "ai") : this.starter;
      if (this.starter === "flip") this.flipWinner = opener;
      this.current = opener === "human" ? this.human : this.ai;
    } else {
      this.current = "X";
    }
  }

  resetScores(): void {
    this.scores = { X: 0, O: 0, draws: 0 };
  }

  setMode(m: Mode): void {
    this.mode = m;
    this.reset();
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty = d;
  }

  /** Choose which mark the human plays in cpu mode. */
  setHumanMark(p: Player): void {
    this.human = p;
    this.ai = p === "X" ? "O" : "X";
    this.reset();
  }

  /** Choose who opens each game in cpu mode: you, the CPU, or a coin flip. */
  setStarter(s: Starter): void {
    this.starter = s;
    this.reset();
  }

  /** True when it's the CPU's turn to move. */
  aiToMove(): boolean {
    return this.mode === "cpu" && !this.over && this.current === this.ai;
  }

  /** Place the current player's mark at i (if legal). Returns whether it changed. */
  play(i: number): boolean {
    if (this.over || i < 0 || i > 8 || this.board[i] !== null) return false;
    this.board[i] = this.current;
    this.evaluate();
    if (!this.over) this.current = this.current === "X" ? "O" : "X";
    return true;
  }

  /** Compute and play the CPU's move. */
  playAI(): void {
    if (!this.aiToMove()) return;
    const i = this.chooseAiMove();
    if (i >= 0) this.play(i);
  }

  private evaluate(): void {
    for (const line of LINES) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winningLine = line;
        this.scores[this.winner] += 1;
        return;
      }
    }
    if (this.board.every((c) => c !== null)) {
      this.draw = true;
      this.scores.draws += 1;
    }
  }

  // ---- AI ------------------------------------------------------------------

  private chooseAiMove(): number {
    const empties = this.emptyIndices();
    if (empties.length === 0) return -1;
    if (this.difficulty === "easy") return this.randomMove(empties);
    if (this.difficulty === "medium") return this.mediumMove(empties);
    return this.hardMove(empties);
  }

  private emptyIndices(): number[] {
    const r: number[] = [];
    for (let i = 0; i < 9; i++) if (this.board[i] === null) r.push(i);
    return r;
  }

  private randomMove(empties: number[]): number {
    return empties[Math.floor(Math.random() * empties.length)];
  }

  private mediumMove(empties: number[]): number {
    const win = this.findWinning(this.ai);
    if (win !== -1) return win;
    const block = this.findWinning(this.human);
    if (block !== -1) return block;
    return this.randomMove(empties);
  }

  /**
   * Hard: always takes an immediate win, but otherwise occasionally slips
   * into a random move — strong play that a sharp opponent can still beat.
   */
  private hardMove(empties: number[]): number {
    const win = this.findWinning(this.ai);
    if (win !== -1) return win;
    if (Math.random() < HARD_SLIP_CHANCE) return this.randomMove(empties);
    return this.minimaxMove(empties);
  }

  /** Index that immediately completes a line for player p, or -1. */
  private findWinning(p: Player): number {
    for (const i of this.emptyIndices()) {
      this.board[i] = p;
      const won = LINES.some(([a, b, c]) => this.board[a] === p && this.board[b] === p && this.board[c] === p);
      this.board[i] = null;
      if (won) return i;
    }
    return -1;
  }

  private minimaxMove(empties: number[]): number {
    let bestScore = -Infinity;
    let bestIdx = empties[0];
    for (const i of empties) {
      this.board[i] = this.ai;
      const score = this.minimax(false, 1);
      this.board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private minimax(isMax: boolean, depth: number): number {
    const w = this.winnerOf();
    if (w === this.ai) return 10 - depth;
    if (w === this.human) return depth - 10;
    const empties = this.emptyIndices();
    if (empties.length === 0) return 0;

    if (isMax) {
      let best = -Infinity;
      for (const i of empties) {
        this.board[i] = this.ai;
        best = Math.max(best, this.minimax(false, depth + 1));
        this.board[i] = null;
      }
      return best;
    }
    let best = Infinity;
    for (const i of empties) {
      this.board[i] = this.human;
      best = Math.min(best, this.minimax(true, depth + 1));
      this.board[i] = null;
    }
    return best;
  }

  private winnerOf(): Player | null {
    for (const [a, b, c] of LINES) {
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }
    return null;
  }
}
