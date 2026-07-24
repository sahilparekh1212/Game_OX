/**
 * Tic Tac Toe game logic.
 *
 * Two modes: "two" (two humans) and "cpu" (you = X, computer = O).
 * Against the computer, difficulty controls how it picks moves:
 *   easy   – random
 *   medium – takes a win, blocks a loss, otherwise random
 *   hard   – minimax (optimal, unbeatable)
 */

export type Player = "X" | "O";
export type Cell = Player | null;
export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "two" | "cpu";

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
  readonly human: Player = "X"; // in cpu mode
  readonly ai: Player = "O"; // in cpu mode
  winner: Player | null = null;
  winningLine: number[] | null = null;
  draw = false;
  scores: Scores = { X: 0, O: 0, draws: 0 };

  get over(): boolean {
    return this.winner !== null || this.draw;
  }

  reset(): void {
    this.board = Array(9).fill(null);
    this.current = "X";
    this.winner = null;
    this.winningLine = null;
    this.draw = false;
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

  /** True when it's the computer's turn to move. */
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

  /** Compute and play the computer's move. */
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
    return this.minimaxMove(empties); // hard
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
