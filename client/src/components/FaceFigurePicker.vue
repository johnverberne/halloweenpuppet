<template>
  <section class="panel">
    <p class="kicker">Halloween figuur</p>
    <p class="muted hint">Wordt gebruikt in gezichtsmodus</p>
    <div class="figures">
      <button
        v-for="figure in figures"
        :key="figure.id"
        type="button"
        class="figure"
        :class="{ active: model === figure.id }"
        @click="select(figure.id)"
      >
        <strong>{{ figure.label }}</strong>
        <span>{{ figure.blurb }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { HALLOWEEN_FIGURES, type HalloweenFigureId } from '@halloweenpuppet/shared';

const model = defineModel<HalloweenFigureId>({ required: true });
const figures = HALLOWEEN_FIGURES;

function select(id: HalloweenFigureId): void {
  model.value = id;
}
</script>

<style scoped>
.hint {
  margin: 0 0 0.7rem;
  font-size: 0.8rem;
}

.figures {
  display: grid;
  gap: 0.45rem;
}

.figure {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  background: #2a2333;
  color: var(--text);
}

.figure span {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.figure.active {
  background: var(--accent);
  color: #102016;
}

.figure.active span {
  color: #1d3a28;
}
</style>
