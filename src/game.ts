/**
 * Tic Tac Toe game logic, generic over board size (3×3 or 4×4 — win by
 * filling a full row, column, or diagonal).
 *
 * Two modes: "two" (two humans) and "cpu" (you vs the computer).
 * Against the computer, difficulty controls how it picks moves:
 *   easy   – random
 *   medium – takes a win, blocks a loss, otherwise random
 *   hard   – minimax; exact on 3×3 (unbeatable), depth-limited with
 *            alpha–beta pruning and a line heuristic on 4×4
 */

export type Player = "X" | "O";
export type Cell = Player | null;
export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "two" | "cpu";
export type Starter = "human" | "ai" | "flip";
export type Size = 3 | 4;

const WIN_SCORE = 100000; // terminal score, far above any heuristic value

export interface Scores {
  X: number;
  O: number;
  draws: number;
}

/** All win lines (rows, columns, diagonals) for an n×n board. */
function buildLines(n: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return lines;
}

export class TicTacToe {
  size: Size = 3;
  private lines: number[][] = buildLines(3);
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
    this.board = Array(this.size * this.size).fill(null);
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

  /** Switch between the 3×3 and 4×4 board. */
  setSize(n: Size): void {
    this.size = n;
    this.lines = buildLines(n);
    this.reset();
  }

  /** Choose which mark the human plays in cpu mode. */
  setHumanMark(p: Player): void {
    this.human = p;
    this.ai = p === "X" ? "O" : "X";
    this.reset();
  }

  /** Choose who opens each game in cpu mode: you, the computer, or a coin flip. */
  setStarter(s: Starter): void {
    this.starter = s;
    this.reset();
  }

  /** True when it's the computer's turn to move. */
  aiToMove(): boolean {
    return this.mode === "cpu" && !this.over && this.current === this.ai;
  }

  /** Place the current player's mark at i (if legal). Returns whether it changed. */
  play(i: number): boolean {
    if (this.over || i < 0 || i >= this.board.length || this.board[i] !== null) return false;
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
    for (const line of this.lines) {
      const first = this.board[line[0]];
      if (first && line.every((i) => this.board[i] === first)) {
        this.winner = first;
        this.winningLine = line;
        this.scores[first] += 1;
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
    for (let i = 0; i < this.board.length; i++) if (this.board[i] === null) r.push(i);
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
      const won = this.lines.some((line) => line.every((j) => this.board[j] === p));
      this.board[i] = null;
      if (won) return i;
    }
    return -1;
  }

  /** Search depth: exhaustive on 3×3, capped on 4×4 (with heuristic cutoff). */
  private maxDepth(): number {
    return this.size === 3 ? Infinity : 5;
  }

  private minimaxMove(empties: number[]): number {
    let bestScore = -Infinity;
    let bestIdx = empties[0];
    for (const i of empties) {
      this.board[i] = this.ai;
      const score = this.minimax(false, 1, -Infinity, Infinity);
      this.board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private minimax(isMax: boolean, depth: number, alpha: number, beta: number): number {
    const w = this.winnerOf();
    if (w === this.ai) return WIN_SCORE - depth;
    if (w === this.human) return depth - WIN_SCORE;
    const empties = this.emptyIndices();
    if (empties.length === 0) return 0;
    if (depth >= this.maxDepth()) return this.heuristic();

    if (isMax) {
      let best = -Infinity;
      for (const i of empties) {
        this.board[i] = this.ai;
        best = Math.max(best, this.minimax(false, depth + 1, alpha, beta));
        this.board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // prune
      }
      return best;
    }
    let best = Infinity;
    for (const i of empties) {
      this.board[i] = this.human;
      best = Math.min(best, this.minimax(true, depth + 1, alpha, beta));
      this.board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break; // prune
    }
    return best;
  }

  /** Line-potential evaluation used at the 4×4 depth cutoff. */
  private heuristic(): number {
    let score = 0;
    for (const line of this.lines) {
      let mine = 0;
      let theirs = 0;
      for (const i of line) {
        if (this.board[i] === this.ai) mine++;
        else if (this.board[i] === this.human) theirs++;
      }
      if (mine > 0 && theirs > 0) continue; // dead line
      if (mine > 0) score += Math.pow(10, mine);
      else if (theirs > 0) score -= Math.pow(10, theirs);
    }
    return score;
  }

  private winnerOf(): Player | null {
    for (const line of this.lines) {
      const first = this.board[line[0]];
      if (first && line.every((i) => this.board[i] === first)) return first;
    }
    return null;
  }
}
