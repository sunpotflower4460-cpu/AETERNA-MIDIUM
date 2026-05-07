/**
 * FieldTypes.ts
 *
 * AETERNA-TORUS-FIRST (Living Field Edition) — Phase 1
 *
 * Type definitions for the TorusLivingField engine.
 * Energy is a first-class citizen: every cell carries its own
 * energy budget, and the field update law depends on it.
 *
 * Design guardrails (unchanged from AETERNA-NATURAL):
 * - No life/consciousness/alive claims.
 * - These are mathematical / observational constructs only.
 */

/**
 * Complex number used to represent the phase field ψ = real + i·imag.
 */
export interface Complex {
  real: number;
  imag: number;
}

/**
 * One cell of the toroidal 2-D grid.
 *
 * Existing observables:
 *   phase      — complex field value at this cell
 *   curvature  — local Ricci-like scalar curvature proxy
 *   vorticity  — circulation strength (how strongly this cell "circulates")
 *
 * New — Energy as First-Class Citizen:
 *   energy         — normalised energy [0, 1]
 *   dissipationRate — energy lost this step
 *   inputRate       — energy received this step (neighbour coupling + external)
 *
 * Derived (recomputed each step, never set directly):
 *   stability    — torus stability proxy [0 = near-collapse, 1 = stable]
 *   collapseRisk — cumulative collapse risk [0, 1]
 */
export interface TorusCell {
  phase: Complex;
  curvature: number;
  vorticity: number;

  energy: number;
  dissipationRate: number;
  inputRate: number;

  stability: number;
  collapseRisk: number;
}

/**
 * Configuration for a TorusLivingField instance.
 *
 * Recommended values (see docs/torus-living-field-params.md):
 *   circulationBias  0.72   — makes circulation the natural attractor
 *   survivalThreshold 0.18  — minimum viable energy
 *   dissipationBase   0.035
 *   baseEnergyInput   0.045
 */
export interface TorusFieldConfig {
  width: number;
  height: number;
  /** Always true — toroidal boundary is the default in this model. */
  toroidal: true;
  /**
   * Base energy supplied to every cell per step.
   * Recommended range: 0.02–0.08
   */
  baseEnergyInput: number;
  /**
   * Base dissipation fraction per step.
   * Recommended range: 0.01–0.05
   */
  dissipationBase: number;
  /**
   * Energy floor; cells below this level enter "weakened" update.
   * Recommended range: 0.15–0.25
   */
  survivalThreshold: number;
  /**
   * Bias toward circular flow [0, 1].
   * Values in 0.65–0.85 make circulation the natural attractor.
   */
  circulationBias: number;
  /** PRNG seed for reproducible initialisation. */
  seed: number;
}
