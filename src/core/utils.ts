/**
 * utils.ts  (Living Field Edition)
 *
 * Utility functions used by TorusLivingField and EnergySystem.
 * Pure functions — no side effects, no state.
 *
 * Guardrails: no life/consciousness/alive claims.
 */

import type { TorusCell } from './FieldTypes.ts';

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

/**
 * Clamp `value` to [min, max].
 * Returns `fallback` for non-finite inputs.
 */
export function clamp(value: number, min: number, max: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Linear interpolation between `a` and `b` by factor `t` ∈ [0, 1].
 */
export function lerp(a: number, b: number, t: number): number {
  const tSafe = clamp(t, 0, 1, 0);
  return a + (b - a) * tSafe;
}

/**
 * Small, fast seeded pseudo-random generator (Mulberry32).
 * Returns a factory that produces values in [0, 1).
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Grid-level energy normalisation
// ---------------------------------------------------------------------------

/**
 * Rescale all cell energies so the grid-average equals `targetMean`.
 *
 * This approximates a soft energy-conservation law:
 *   Σ energy_i  ≈  N · targetMean
 *
 * Cells are clamped to [0, 1] after rescaling to prevent runaway values.
 *
 * @param grid        Flat 2-D array of TorusCells (row-major, width × height).
 * @param targetMean  Desired mean energy (e.g. `baseEnergyInput`).
 */
export function normalizeGlobalEnergy(grid: TorusCell[][], targetMean: number): void {
  const height = grid.length;
  if (height === 0) return;
  const width = grid[0].length;
  if (width === 0) return;

  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      sum += grid[y][x].energy;
      count++;
    }
  }

  if (count === 0) return;

  const currentMean = sum / count;
  if (!Number.isFinite(currentMean) || currentMean <= 0) return;

  const scale = targetMean / currentMean;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      cell.energy = clamp(cell.energy * scale, 0, 1, 0);
    }
  }
}
