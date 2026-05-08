# Phase 2: Self-Organization Engine + Stability Metrics

**Project:** AETERNA-TORUS-FIRST (Living Field Edition)  
**Status:** Phase 1 complete → Phase 2 implemented

---

## 目的

- トーラス巡りをより強い自然な吸引子にする（自己組織化の強化）。
- エネルギー状態と強く連動した新しい観察メトリクスを追加。
- Vortex candidateの生成・維持・消滅が「エネルギー安定性」に依存するように変更。
- 「巡り続けること」と「構造の持続可能性」を場の内在的な振る舞いとして深める。
- Guardrailsは厳守（「これは観察用プロキシであり、生命・意識の証明ではない」ことを明記）。

---

## 2.1 新規・改修ファイル

| ファイル | 変更種別 |
|---|---|
| `src/core/SelfOrganizationEngine.ts` | 新設 |
| `src/core/FieldTypes.ts` | メトリクス追加のため拡張 |
| `src/core/TorusLivingField.ts` | Phase 1の `step()` に統合 |
| `docs/torus-first-living-field-phase2.md` | この仕様書 |

---

## 2.2 FieldTypes.ts の拡張（Phase 1からの追加分）

```typescript
export interface TorusCell {
  // Phase 1の項目は省略（そのまま使用）

  // === Phase 2で追加 ===
  localCoherence: number;     // 近傍との循環の一貫性（0.0〜1.0）
  globalInfluence: number;    // グローバルトーラス場への寄与度
}

export interface FieldMetrics {
  // Phase 1のメトリクスに加えて追加
  energyThroughput: number;     // 全フィールドのエネルギー循環量           kind: 'Proxy'
  torusCoherence: number;       // 全体のトーラス巡りの一貫性（0.0〜1.0）  kind: 'Derived'
  globalStability: number;      // トーラス構造の全体的持続可能性           kind: 'Derived'
  dissipationBalance: number;   // 散逸 vs 入力の均衡（0.0=散逸過多, 1.0=入力過多）  kind: 'Proxy'
  collapsePressureMap: number;  // フィールド全体の崩壊圧力平均             kind: 'Proxy'
  vortexCandidateCount: number; // 有効な渦候補数（エネルギー依存）         kind: 'Proxy'
}
```

---

## 2.3 SelfOrganizationEngine.ts（新設・核心）

```typescript
export class SelfOrganizationEngine {
  constructor(field: TorusLivingField, config: TorusFieldConfig) { … }

  /** Phase 1のstep()の後で呼び出される */
  organize(): void {
    // 1. localCoherenceを計算
    // 2. energy > survivalThreshold → strengthenTorusStructure
    //    それ以外                   → weakenTorusStructure
    // 3. updateVortexCandidates（エネルギー依存）
    // 4. updateGlobalCoherence（globalInfluenceを全セルに設定）
  }

  computeFieldMetrics(): FieldMetrics { … }
}
```

### organize() の詳細

```
for each cell (y, x):
  neighbors = getToroidalNeighbors(x, y)
  cell.localCoherence = calculateNeighborCoherence(cell, neighbors)
  if cell.energy > survivalThreshold:
    cell.vorticity = min(1.0, cell.vorticity × 1.08)
    cell.stability = min(1.0, cell.stability + 0.03)
  else:
    cell.vorticity = cell.vorticity × 0.92
    cell.stability = max(0.0, cell.stability − 0.05)
  updateVortexCandidates(cell, x, y)
updateGlobalCoherence(grid)
```

### calculateNeighborCoherence

```
sum = 0
for each neighbor n:
  sum += |cell.vorticity − n.vorticity| × (1 − |cell.energy − n.energy|)
return clamp(1 − sum / neighbors.length, 0, 1)
```

### updateVortexCandidates

候補の生成・持続はエネルギー状態に強く依存する。
再現性のため `Math.random()` の代わりに `(x×31 + y×17 + tick×7) % 100` を使用。

```
if cell.energy > 0.45 and cell.vorticity > 0.6:
  jitter = (x×31 + y×17 + tick×7) % 100 / 100
  if jitter < 0.15:
    cell.stability += 0.01  // 候補を安定化
elif cell.energy < survivalThreshold:
  cell.vorticity × 0.88    // エネルギー枯渇で候補崩壊
```

### updateGlobalCoherence

```
meanCoherence = sum(cell.localCoherence) / cellCount
for each cell:
  cell.globalInfluence = clamp(0.5 + (cell.localCoherence − meanCoherence) × 2, 0, 1)
```

---

## 2.4 TorusLivingField.ts への統合

`step()` の末尾にフェーズ6として追加：

```
// 6. Phase 2 self-organisation
this.selfOrganization.organize();
```

新しい公開メソッド：

```typescript
/** Guardrails: all values are observational proxies only. */
getFieldMetrics(): FieldMetrics
```

---

## Guardrails

> **"Energy dynamics, dissipationBalance, torusCoherence, globalStability,
> and collapsePressureMap are observational proxies for field behaviour only.
> They do not imply life, consciousness, intention, or self-preservation.
> All vortex candidates and plasticity traces remain phase-defect and history
> proxies."**

---

## 実装の注意点（エージェント向け）

- Phase 1が完全に動作している状態でPhase 2を実装すること。
- `SelfOrganizationEngine` は `TorusLivingField` と疎結合に保つ（依存注入形式）。
- すべての新メトリクスには `kind: 'Proxy' | 'Derived'` のラベルを付け、Guardrailsを厳守。
- 再現性（seedベース）は既存の仕組みを維持。`Math.random()` を新たに導入しない。

---

## 推奨パラメータ（Phase 1から変更なし）

| Parameter           | Recommended | Range         |
|---------------------|-------------|---------------|
| `circulationBias`   | **0.72**    | 0.65 – 0.85   |
| `survivalThreshold` | **0.18**    | 0.15 – 0.25   |
| `dissipationBase`   | **0.035**   | 0.01 – 0.05   |
| `baseEnergyInput`   | **0.045**   | 0.02 – 0.08   |

---

## 使用例

```typescript
import { TorusLivingField } from './core/TorusLivingField.ts';
import type { TorusFieldConfig } from './core/FieldTypes.ts';

const config: TorusFieldConfig = {
  width: 32, height: 32, toroidal: true,
  circulationBias: 0.72, survivalThreshold: 0.18,
  dissipationBase: 0.035, baseEnergyInput: 0.045, seed: 42,
};

const field = new TorusLivingField(config);

for (let t = 0; t < 100; t++) {
  field.step(); // Phase 2 organize() is called automatically
}

const metrics = field.getFieldMetrics();
console.log('torusCoherence (Derived proxy):', metrics.torusCoherence);
console.log('globalStability (Derived proxy):', metrics.globalStability);
console.log('dissipationBalance (Proxy):', metrics.dissipationBalance);
console.log('vortexCandidateCount (Proxy):', metrics.vortexCandidateCount);
```
