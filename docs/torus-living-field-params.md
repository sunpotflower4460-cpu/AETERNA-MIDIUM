# TorusLivingField — Parameter Guide

**Project:** AETERNA-TORUS-FIRST (Living Field Edition)  
**Phase:** 1 — Core Field Engine + Energy as First-Class Citizen

---

## Overview

`TorusLivingField` is a 2-D cellular field whose default topology is toroidal.
Energy is a first-class property of every cell.
Cells with insufficient energy enter a "weakened" update regime, reducing
vorticity without breaking the toroidal structure.

> **Note:** All metrics are mathematical observables.
> This model makes no claims about life, consciousness, or awareness.

---

## Recommended parameter values

| Parameter           | Recommended | Range         | Effect                                             |
|---------------------|-------------|---------------|----------------------------------------------------|
| `circulationBias`   | **0.72**    | 0.65 – 0.85   | Values > 0.65 make circulation the natural attractor |
| `survivalThreshold` | **0.18**    | 0.15 – 0.25   | Energy floor; below this, only weak decay occurs   |
| `dissipationBase`   | **0.035**   | 0.01 – 0.05   | Per-step dissipation fraction                      |
| `baseEnergyInput`   | **0.045**   | 0.02 – 0.08   | Constant per-step energy supply per cell           |

### Minimal viable example

```typescript
import { TorusLivingField } from './core/TorusLivingField.ts';
import type { TorusFieldConfig } from './core/FieldTypes.ts';

const config: TorusFieldConfig = {
  width: 32,
  height: 32,
  toroidal: true,
  circulationBias:   0.72,
  survivalThreshold: 0.18,
  dissipationBase:   0.035,
  baseEnergyInput:   0.045,
  seed: 42,
};

const field = new TorusLivingField(config);

for (let t = 0; t < 100; t++) {
  field.step();
}

console.log('Mean energy:', field.getMeanEnergy());
console.log('Mean vorticity:', field.getMeanVorticity());
console.log('Collapse-risk fraction:', field.getCollapseRiskFraction());
```

---

## Energy dynamics

Each step, per cell:

```
dissipation = energy × dissipationBase × (1 − vorticity × circulationBias × 0.5)
input       = baseEnergyInput + diffusionFromNeighbours
energy_new  = clamp(energy − dissipation + input,  0, 1)
```

After all cells are updated, a global normalisation rescales energies so the
grid average stays near `baseEnergyInput`.  This approximates a soft
energy-conservation law without hard constraints.

### Collapse pressure

Cells below `survivalThreshold` enter weakened update:

```
vorticity_new = vorticity × 0.85   (slow decay)
```

Phase and curvature are not updated for weakened cells, representing the
"dissipative thinning" of low-energy regions.

---

## Observables

| Method                     | Description                                          |
|----------------------------|------------------------------------------------------|
| `getMeanEnergy()`          | Grid-average cell energy                            |
| `getMeanVorticity()`       | Grid-average vorticity (circulation strength)       |
| `getCollapseRiskFraction()`| Fraction of cells below `survivalThreshold`         |
| `getCell(x, y)`            | Read-only access to a single cell                   |
| `getGrid()`                | Read-only snapshot of the entire grid               |
