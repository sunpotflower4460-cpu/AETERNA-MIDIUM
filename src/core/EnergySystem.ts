/**
 * EnergySystem.ts
 *
 * AETERNA-TORUS-FIRST (Living Field Edition) — Phase 1
 *
 * Per-cell energy update logic.
 *
 * Conceptual model (no life/consciousness claims):
 *   "Continuous dissipation requires continuous input.
 *    Cells without sufficient input weaken. Cells with surplus strengthen."
 *
 * All functions are pure (no side effects).
 */

import type { TorusCell, TorusFieldConfig } from './FieldTypes.ts';
import { clamp, lerp } from './utils.ts';

// ---------------------------------------------------------------------------
// Step 1: energy dissipation
// ---------------------------------------------------------------------------

/**
 * Returns the energy lost from `cell` this step.
 *
 * Base dissipation is scaled by vorticity: circulating cells
 * "earn back" some energy, making circulation the natural attractor.
 *
 * @param cell   Current cell state.
 * @param config Field configuration.
 */
export function computeDissipation(cell: TorusCell, config: TorusFieldConfig): number {
  // High circulation reduces effective dissipation
  const circulationBonus = clamp(cell.vorticity, 0, 1, 0) * config.circulationBias;
  const effectiveRate = config.dissipationBase * (1 - circulationBonus * 0.5);
  return clamp(cell.energy * effectiveRate, 0, cell.energy, 0);
}

// ---------------------------------------------------------------------------
// Step 2: energy input
// ---------------------------------------------------------------------------

/**
 * Returns the energy received by `cell` this step from:
 *   1. A constant base supply (`config.baseEnergyInput`).
 *   2. Diffusion from neighbours (mean neighbour energy > own energy → inflow).
 *
 * @param cell      Current cell state.
 * @param neighbors 4- or 8-connected neighbour cells.
 * @param config    Field configuration.
 */
export function computeInput(
  cell: TorusCell,
  neighbors: TorusCell[],
  config: TorusFieldConfig,
): number {
  let input = config.baseEnergyInput;

  if (neighbors.length > 0) {
    let neighborEnergySum = 0;
    for (const n of neighbors) {
      neighborEnergySum += n.energy;
    }
    const meanNeighborEnergy = neighborEnergySum / neighbors.length;
    // Diffusion: inflow proportional to how much richer neighbours are
    const diffusion = clamp(meanNeighborEnergy - cell.energy, 0, 1, 0) * 0.15;
    input += diffusion;
  }

  return clamp(input, 0, 1, 0);
}

// ---------------------------------------------------------------------------
// Step 3: apply energy update to a cell
// ---------------------------------------------------------------------------

/**
 * Mutates `cell` with updated energy, dissipationRate, and inputRate.
 *
 * @param cell      Cell to update (mutated in place).
 * @param neighbors Neighbour cells for diffusion.
 * @param config    Field configuration.
 */
export function applyEnergyUpdate(
  cell: TorusCell,
  neighbors: TorusCell[],
  config: TorusFieldConfig,
): void {
  const dissipation = computeDissipation(cell, config);
  const input = computeInput(cell, neighbors, config);

  cell.dissipationRate = dissipation;
  cell.inputRate = input;
  cell.energy = clamp(cell.energy - dissipation + input, 0, 1, 0);
}

// ---------------------------------------------------------------------------
// Step 4: derived metrics
// ---------------------------------------------------------------------------

/**
 * Update `stability` and `collapseRisk` on `cell`.
 *
 * stability    — how far the cell is above the survival threshold (0 = at/below threshold)
 * collapseRisk — smoothed accumulation of near-collapse events
 *
 * @param cell      Cell to update (mutated in place).
 * @param config    Field configuration.
 * @param prevCollapseRisk  Previous collapseRisk for exponential smoothing.
 */
export function updateDerivedMetrics(
  cell: TorusCell,
  config: TorusFieldConfig,
  prevCollapseRisk: number,
): void {
  const margin = cell.energy - config.survivalThreshold;
  cell.stability = clamp(margin / (1 - config.survivalThreshold), 0, 1, 0);

  // Collapse risk: high when energy is below threshold, smoothed over time
  const instantRisk = cell.energy < config.survivalThreshold ? 1 : 0;
  cell.collapseRisk = clamp(lerp(prevCollapseRisk, instantRisk, 0.05), 0, 1, 0);
}
