<template>
  <section class="loops" aria-label="Loop-animaties">
    <p class="kicker">Loop-animaties</p>
    <p class="muted hint">Maximaal één tegelijk. Nog eens tikken stopt de loop.</p>
    <div class="buttons">
      <button
        v-for="animation in animations"
        :key="animation.id"
        type="button"
        class="loop"
        :class="{ active: model === animation.id }"
        @click="toggle(animation.id)"
      >
        <strong>{{ animation.label }}</strong>
        <span>{{ animation.blurb }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { LOOP_ANIMATIONS, type LoopAnimationId } from '@halloweenpuppet/shared';

const model = defineModel<LoopAnimationId | null>({ required: true });
const animations = LOOP_ANIMATIONS;

function toggle(id: LoopAnimationId): void {
  model.value = model.value === id ? null : id;
}
</script>

<style scoped>
.loops {
  display: grid;
  gap: 0.45rem;
}

.hint {
  margin: 0;
  font-size: 0.78rem;
}

.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.loop {
  display: grid;
  gap: 0.12rem;
  text-align: left;
  min-height: 3.1rem;
  background: #2a2333;
  color: var(--text);
}

.loop span {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 500;
}

.loop.active {
  background: var(--accent);
  color: #102016;
}

.loop.active span {
  color: #1d3a28;
}
</style>
