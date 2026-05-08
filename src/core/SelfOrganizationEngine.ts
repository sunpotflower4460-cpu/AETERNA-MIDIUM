/**
 * SelfOrganizationEngine.ts
 *
 * AETERNA-TORUS-FIRST (Living Field Edition) — Phase 2
 *
 * Strengthens torus circulation as a natural attractor by reinforcing
 * energy-rich regions and weakening energy-starved ones.  Vortex-candidate
 * survival is coupled to local energy state.
 *
 * GUARDRAILS (see docs/agent-guardrails.md):
 *   "Energy dynamics, dissipationBalance, torusCoherence, globalStability,
 *    and collapsePressureMap are observational proxies for field behaviour
 *    only.  They do not imply life, consciousness, intention, or
 *    self-preservation.  All vortex candidates and plasticity traces remain
 *    phase-defect and history proxies."
 *
 * Design:
 *   - Loosely coupled to TorusLivingField via dependency injection.
 *   - Called after TorusLivingField.step() each tick.
 *   - Mutates cells in-place on the live grid returned by getGrid().
 *   - Seed-based reproducibility is preserved by not introducing new PRNG
 *     calls; stochastic updates use the cell's existing energy/vorticity
 *     values as the sole random gate.
 */

import type { TorusCell, TorusFieldConfig, FieldMetrics } from './FieldTypes.ts';
import type { TorusLivingField } from './TorusLivingField.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mutable view of the grid used internally by the engine. */
type MutableGrid = TorusCell[][];

// ---------------------------------------------------------------------------
// SelfOrganizationEngine
// ---------------------------------------------------------------------------

export class SelfOrganizationEngine {
  private readonly field: TorusLivingField;
  private readonly config: TorusFieldConfig;

  /**
   * A per-step counter used as a deterministic substitute for Math.random()
   * inside updateVortexCandidates, so that seeded reproducibility is not
   * broken.  The counter increments each organize() call and wraps at 1 000.
   */
  private tickCounter: number = 0;

  constructor(field: TorusLivingField, config: TorusFieldConfig) {
    this.field = field;
    this.config = config;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Run one self-organisation step.
   *
   * Must be called *after* TorusLivingField.step() has committed the new grid.
   */
  organize(): void {
    // The grid snapshot is read-only at the type level, but we need to mutate
    // cells.  We cast once here and keep the mutation isolated to this class.
    const grid = this.field.getGrid() as MutableGrid;
    const { height, width } = this.config;

    this.tickCounter = (this.tickCounter + 1) % 1000;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        const neighbors = this.getToroidalNeighbors(grid, x, y);

        // 1. Local coherence
        cell.localCoherence = this.calculateNeighborCoherence(cell, neighbors);

        // 2. Energy-dependent structure modulation
        if (cell.energy > this.config.survivalThreshold) {
          this.strengthenTorusStructure(cell);
        } else {
          this.weakenTorusStructure(cell);
        }

        // 3. Vortex-candidate maintenance (energy-gated)
        this.updateVortexCandidates(cell, x, y);
      }
    }

    // 4. Global coherence pass (updates globalInfluence on every cell)
    this.updateGlobalCoherence(grid);
  }

  /**
   * Compute aggregate FieldMetrics from the current grid state.
   *
   * All returned values are observational proxies (kind: 'Proxy' | 'Derived').
   */
  computeFieldMetrics(): FieldMetrics {
    const grid = this.field.getGrid();
    const { height, width } = this.config;
    const cellCount = height * width;

    let totalInput = 0;
    let totalDissipation = 0;
    let totalCoherence = 0;
    let totalStabilityWeighted = 0;
    let totalCollapseRisk = 0;
    let vortexCandidateCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        totalInput += cell.inputRate;
        totalDissipation += cell.dissipationRate;
        totalCoherence += cell.localCoherence;
        totalStabilityWeighted += cell.stability;
        totalCollapseRisk += cell.collapseRisk;

        if (cell.energy > 0.45 && cell.vorticity > 0.6) {
          vortexCandidateCount++;
        }
      }
    }

    const totalFlow = totalInput + totalDissipation;
    const dissipationBalance = totalFlow > 0
      ? clamp01(totalInput / totalFlow)
      : 0.5;

    return {
      energyThroughput: (totalInput + totalDissipation) / cellCount,
      torusCoherence: totalCoherence / cellCount,
      globalStability: totalStabilityWeighted / cellCount,
      dissipationBalance,
      collapsePressureMap: totalCollapseRisk / cellCount,
      vortexCandidateCount,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getToroidalNeighbors(grid: MutableGrid, x: number, y: number): TorusCell[] {
    const { width, height } = this.config;
    return [
      grid[((y - 1) + height) % height][x],
      grid[(y + 1) % height][x],
      grid[y][((x - 1) + width) % width],
      grid[y][(x + 1) % width],
    ];
  }

  /**
   * Coherence of circulation between this cell and its neighbours.
   *
   * High when neighbouring cells have similar vorticity values *and*
   * similar energy levels (i.e. the field is circulating uniformly).
   * Returns a value in [0, 1].
   */
  private calculateNeighborCoherence(cell: TorusCell, neighbors: TorusCell[]): number {
    if (neighbors.length === 0) return 0;
    let sum = 0;
    for (const n of neighbors) {
      const vorticityDiff = Math.abs(cell.vorticity - n.vorticity);
      const energySimilarity = 1 - Math.abs(cell.energy - n.energy);
      sum += vorticityDiff * energySimilarity;
    }
    return clamp01(1 - sum / neighbors.length);
  }

  /**
   * Energy-rich cells: reinforce vorticity and stability to deepen the
   * torus-circulation attractor.
   */
  private strengthenTorusStructure(cell: TorusCell): void {
    cell.vorticity = clamp01(cell.vorticity * 1.08);
    cell.stability = clamp01(cell.stability + 0.03);
  }

  /**
   * Energy-starved cells: reduce vorticity and stability, increasing
   * structural fragility without breaking toroidal topology.
   */
  private weakenTorusStructure(cell: TorusCell): void {
    cell.vorticity = clamp01(cell.vorticity * 0.92);
    cell.stability = clamp01(cell.stability - 0.05);
  }

  /**
   * Vortex-candidate promotion is gated by energy + vorticity.
   *
   * Uses a deterministic pseudo-random gate derived from the cell's own
   * vorticity fractional part so that seeded reproducibility is preserved.
   */
  private updateVortexCandidates(cell: TorusCell, x: number, y: number): void {
    if (cell.energy > 0.45 && cell.vorticity > 0.6) {
      // Deterministic "jitter" based on cell position and tick, no Math.random()
      const jitter = ((x * 31 + y * 17 + this.tickCounter * 7) % 100) / 100;
      if (jitter < 0.15) {
        // Candidate persists: lightly boost stability
        cell.stability = clamp01(cell.stability + 0.01);
      }
    } else if (cell.energy < this.config.survivalThreshold) {
      // Candidate decays when energy is critically low
      cell.vorticity = clamp01(cell.vorticity * 0.88);
    }
  }

  /**
   * Global coherence pass: set `globalInfluence` on every cell proportional
   * to how much its local coherence exceeds the current field average.
   */
  private updateGlobalCoherence(grid: MutableGrid): void {
    const { height, width } = this.config;
    const cellCount = height * width;

    let totalCoherence = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        totalCoherence += grid[y][x].localCoherence;
      }
    }
    const meanCoherence = totalCoherence / cellCount;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        // Cells above average coherence positively influence the global field;
        // cells below average reduce it.  Scaled to [0, 1].
        cell.globalInfluence = clamp01(
          0.5 + (cell.localCoherence - meanCoherence) * 2,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
