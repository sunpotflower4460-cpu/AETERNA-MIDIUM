/**
 * TorusLivingField.ts
 *
 * AETERNA-TORUS-FIRST (Living Field Edition) — Phase 1 main engine.
 *
 * Model concept (no life/consciousness/alive claims):
 *   - Toroidal boundary is the unconditional default.
 *   - Continuous circulation is the natural attractor state.
 *   - Energy deficit creates "weakened" dynamics — a dissipative-structure analogy.
 *   - "This is an observation, not proof" applies to all derived values.
 *
 * Guardrails (unchanged from AETERNA-NATURAL):
 *   - No claims about life, consciousness, or aliveness.
 *   - Metrics are mathematical observables only.
 */

import type { TorusCell, TorusFieldConfig } from './FieldTypes.ts';
import {
  applyEnergyUpdate,
  updateDerivedMetrics,
} from './EnergySystem.ts';
import {
  clamp,
  createSeededRandom,
  normalizeGlobalEnergy,
} from './utils.ts';

const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCell(energy: number, phaseReal: number, phaseImag: number): TorusCell {
  return {
    phase: { real: phaseReal, imag: phaseImag },
    curvature: 0,
    vorticity: 0,
    energy: clamp(energy, 0, 1, 0.5),
    dissipationRate: 0,
    inputRate: 0,
    stability: 1,
    collapseRisk: 0,
  };
}

function cloneCell(src: TorusCell): TorusCell {
  return {
    phase: { real: src.phase.real, imag: src.phase.imag },
    curvature: src.curvature,
    vorticity: src.vorticity,
    energy: src.energy,
    dissipationRate: src.dissipationRate,
    inputRate: src.inputRate,
    stability: src.stability,
    collapseRisk: src.collapseRisk,
  };
}

// ---------------------------------------------------------------------------
// TorusLivingField
// ---------------------------------------------------------------------------

/**
 * TorusLivingField implements a 2-D cellular field on a toroidal topology.
 *
 * The torus boundary is always active (config.toroidal = true).
 * Energy is updated every step via EnergySystem; phase/curvature/vorticity
 * are updated only for cells above the survival threshold.
 */
export class TorusLivingField {
  private grid: TorusCell[][];
  private readonly config: TorusFieldConfig;

  constructor(config: TorusFieldConfig) {
    this.config = config;
    this.grid = this.initializeToroidalGrid();
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  private initializeToroidalGrid(): TorusCell[][] {
    const { width, height, seed, baseEnergyInput } = this.config;
    const random = createSeededRandom(seed);
    const grid: TorusCell[][] = [];

    for (let y = 0; y < height; y++) {
      const row: TorusCell[] = [];
      for (let x = 0; x < width; x++) {
        const angle = TWO_PI * (x / width + y / height);
        const energy = clamp(baseEnergyInput + (random() - 0.5) * 0.05, 0, 1, baseEnergyInput);
        row.push(makeCell(energy, Math.cos(angle) * 0.1, Math.sin(angle) * 0.1));
      }
      grid.push(row);
    }

    return grid;
  }

  // -------------------------------------------------------------------------
  // Step
  // -------------------------------------------------------------------------

  /**
   * Advance the field by one step.
   *
   * Order of operations:
   *   1. Clone the current grid (double-buffer).
   *   2. For each cell:
   *      a. Apply energy update (dissipation + input).
   *      b. If energy > survivalThreshold: full phase/curvature/vorticity update.
   *         Otherwise: weakened update (vorticity decay only).
   *   3. Commit new grid.
   *   4. Normalise global energy (soft conservation).
   *   5. Update derived metrics (stability, collapseRisk).
   */
  step(): void {
    const { width, height, survivalThreshold } = this.config;
    const newGrid = this.cloneGrid();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = newGrid[y][x];
        const neighbors = this.getToroidalNeighbors(x, y);

        // 2a. Energy
        applyEnergyUpdate(cell, neighbors, this.config);

        // 2b. Phase + curvature + vorticity
        if (cell.energy > survivalThreshold) {
          this.updatePhaseAndCurvature(cell, neighbors);
        } else {
          this.weakenUpdate(cell);
        }
      }
    }

    this.grid = newGrid;

    // 4. Soft energy conservation
    normalizeGlobalEnergy(this.grid, this.config.baseEnergyInput);

    // 5. Derived metrics
    this.updateDerivedMetricsAll();
  }

  // -------------------------------------------------------------------------
  // Internal update helpers
  // -------------------------------------------------------------------------

  /**
   * Returns the 4-connected toroidal neighbours of cell (x, y).
   */
  private getToroidalNeighbors(x: number, y: number): TorusCell[] {
    const { width, height } = this.config;
    return [
      this.grid[((y - 1) + height) % height][x],
      this.grid[(y + 1) % height][x],
      this.grid[y][((x - 1) + width) % width],
      this.grid[y][(x + 1) % width],
    ];
  }

  /**
   * Compute a local circulation proxy from phase differences with neighbours.
   *
   * Returns a value in [0, 1] representing how strongly the cell
   * participates in circular flow.
   */
  private calculateLocalCirculation(cell: TorusCell, neighbors: TorusCell[]): number {
    if (neighbors.length === 0) return 0;

    let circulationSum = 0;
    for (const n of neighbors) {
      // Phase angle difference projected onto imaginary axis (rotation sense)
      const dReal = n.phase.real - cell.phase.real;
      const dImag = n.phase.imag - cell.phase.imag;
      // Magnitude of phase gradient
      circulationSum += Math.hypot(dReal, dImag);
    }

    const meanGradient = circulationSum / neighbors.length;
    // Normalise: typical gradient magnitudes are in [0, 0.4]
    return clamp(meanGradient / 0.4, 0, 1, 0);
  }

  /**
   * Full update: phase, curvature, vorticity.
   * Energy-weighted so that richer cells update more vigorously.
   */
  private updatePhaseAndCurvature(cell: TorusCell, neighbors: TorusCell[]): void {
    const circulation = this.calculateLocalCirculation(cell, neighbors);
    const energyWeight = clamp(cell.energy, 0, 1, 0);

    // Vorticity: weighted blend of current value and local circulation
    cell.vorticity = clamp(
      cell.vorticity * (1 - 0.1) + circulation * 0.1 * this.config.circulationBias,
      0,
      1,
      0,
    );

    // Phase rotation proportional to vorticity and energy
    const rotationAngle = cell.vorticity * energyWeight * 0.05;
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);
    const { real, imag } = cell.phase;
    cell.phase.real = real * cosR - imag * sinR;
    cell.phase.imag = real * sinR + imag * cosR;

    // Curvature proxy: divergence of vorticity from neighbours
    let neighborVorticitySum = 0;
    for (const n of neighbors) {
      neighborVorticitySum += n.vorticity;
    }
    const meanNeighborVorticity = neighbors.length > 0
      ? neighborVorticitySum / neighbors.length
      : cell.vorticity;

    // Positive curvature where vorticity converges
    cell.curvature = clamp(
      cell.vorticity - meanNeighborVorticity,
      -1,
      1,
      0,
    );
  }

  /**
   * Weakened update for energy-starved cells.
   * Only vorticity decays; phase and curvature are left unchanged.
   */
  private weakenUpdate(cell: TorusCell): void {
    cell.vorticity *= 0.85;
  }

  // -------------------------------------------------------------------------
  // Grid utilities
  // -------------------------------------------------------------------------

  private cloneGrid(): TorusCell[][] {
    return this.grid.map(row => row.map(cloneCell));
  }

  private updateDerivedMetricsAll(): void {
    const { height, width } = this.config;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.grid[y][x];
        updateDerivedMetrics(cell, this.config, cell.collapseRisk);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Read-only accessors
  // -------------------------------------------------------------------------

  /** Return the cell at grid position (x, y). */
  getCell(x: number, y: number): Readonly<TorusCell> {
    const { width, height } = this.config;
    return this.grid[((y % height) + height) % height][((x % width) + width) % width];
  }

  /** Return a snapshot of the entire grid (shallow row copies). */
  getGrid(): ReadonlyArray<ReadonlyArray<Readonly<TorusCell>>> {
    return this.grid;
  }

  /** Compute mean energy across all cells. */
  getMeanEnergy(): number {
    const { width, height } = this.config;
    let sum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        sum += this.grid[y][x].energy;
      }
    }
    return sum / (width * height);
  }

  /** Compute mean vorticity across all cells. */
  getMeanVorticity(): number {
    const { width, height } = this.config;
    let sum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        sum += this.grid[y][x].vorticity;
      }
    }
    return sum / (width * height);
  }

  /** Fraction of cells currently below survivalThreshold. */
  getCollapseRiskFraction(): number {
    const { width, height, survivalThreshold } = this.config;
    let count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.grid[y][x].energy < survivalThreshold) count++;
      }
    }
    return count / (width * height);
  }

  /** Return a copy of the field configuration. */
  getConfig(): Readonly<TorusFieldConfig> {
    return { ...this.config };
  }
}
