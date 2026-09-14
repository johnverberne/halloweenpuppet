<template>
  <main class="home">
    <div class="stack">
      <section class="panel hero">
        <p class="kicker">Phases 7–8</p>
        <h1>Halloween Puppet</h1>
        <p class="muted">
          Realtime motion capture in de browser. De sensor detecteert je lichaam lokaal met MediaPipe
          en stuurt alleen landmarks naar de stage. UI, API en Socket.IO draaien op deze server.
          Scan de QR om je telefoon te koppelen.
        </p>
        <div class="row">
          <label class="field">
            Sessie
            <input v-model="sessionInput" maxlength="24" />
          </label>
          <button type="button" @click="createSession">Nieuwe sessie</button>
        </div>
        <div class="row">
          <RouterLink class="cta" :to="`/sensor/${sessionId}`">Open sensor</RouterLink>
          <RouterLink class="cta secondary" :to="`/stage/${sessionId}`">Open stage</RouterLink>
          <RouterLink class="cta secondary" :to="`/music/${sessionId}`">Open muziek</RouterLink>
          <RouterLink class="cta secondary" :to="`/dance/${sessionId}`">Open dance</RouterLink>
          <RouterLink class="cta secondary" :to="`/halloween/${sessionId}`">Open halloween</RouterLink>
        </div>
        <PhoneConnect :path="`/sensor/${sessionId}`" />
      </section>
      <HowItWorksSchema />
    </div>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { createSessionId } from '@halloweenpuppet/shared';
import HowItWorksSchema from '../components/HowItWorksSchema.vue';
import PhoneConnect from '../components/PhoneConnect.vue';
import { useSessionStore } from '../stores/session';

const sessionStore = useSessionStore();
const { sessionId } = storeToRefs(sessionStore);

const sessionInput = computed({
  get: () => sessionId.value,
  set: (value: string) => sessionStore.setSessionId(value),
});

function createSession(): void {
  sessionStore.setSessionId(createSessionId());
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(1.5rem + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 20% 10%, #2d2238, transparent 35%),
    radial-gradient(circle at 80% 90%, #173423, transparent 30%),
    #100d12;
}

.stack {
  width: min(68rem, 100%);
  display: grid;
  gap: 1rem;
}

.hero {
  display: grid;
  gap: 1rem;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3.4rem);
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.6rem;
  padding: 0.65rem 0.95rem;
  border-radius: 10px;
  background: var(--accent);
  color: #102016;
  font-weight: 700;
  text-decoration: none;
}

.cta.secondary {
  background: #2a2333;
  color: var(--text);
}
</style>
