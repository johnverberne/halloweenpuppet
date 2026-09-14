<template>
  <section class="panel">
    <p class="kicker">Overdrijving</p>
    <p class="muted hint">Armen, hoofd en mond worden geschaald. Uitvoer blijft geklemd.</p>
    <div class="presets">
      <button
        v-for="preset in presets"
        :key="preset.id"
        type="button"
        class="preset"
        :class="{ active: model === preset.id }"
        @click="model = preset.id"
      >
        <strong>{{ preset.label }}</strong>
        <span>{{ preset.blurb }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { EXAGGERATION_PRESETS, type ExaggerationPresetId } from '@halloweenpuppet/shared';

const model = defineModel<ExaggerationPresetId>({ required: true });
const presets = EXAGGERATION_PRESETS;
</script>

<style scoped>
.hint {
  margin: 0 0 0.7rem;
  font-size: 0.8rem;
}

.presets {
  display: grid;
  gap: 0.4rem;
}

.preset {
  display: grid;
  gap: 0.12rem;
  text-align: left;
  background: #2a2333;
  color: var(--text);
  min-height: 2.75rem;
}

.preset span {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 500;
}

.preset.active {
  background: var(--accent);
  color: #102016;
}

.preset.active span {
  color: #1d3a28;
}
</style>
