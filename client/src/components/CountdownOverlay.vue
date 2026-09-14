<template>
  <div v-if="label" class="countdown">
    <span :class="{ go: label === 'GO' }">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<style scoped>
.countdown {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgba(8, 6, 10, 0.35);
}

.countdown span {
  font-size: clamp(5rem, 18vw, 9rem);
  font-weight: 800;
  color: #f8ff6b;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.countdown span.go {
  color: #7cffb2;
}
</style>
