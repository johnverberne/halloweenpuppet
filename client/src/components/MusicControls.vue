<template>
  <section class="panel">
    <p class="kicker">Muziek</p>
    <p class="track">{{ title }}</p>
    <div class="stack">
      <label class="field">
        Bestand
        <input type="file" accept="audio/mpeg,audio/wav,audio/*" @change="onFile" />
      </label>
      <div class="row">
        <button type="button" class="secondary" :disabled="busy" @click="loadDefault">Demotrack</button>
        <button type="button" :disabled="busy || !canPlay" @click="togglePlay">
          {{ paused ? 'Play' : 'Pause' }}
        </button>
        <button type="button" :disabled="busy || !canPlay || counting" @click="emit('countdown')">
          3-2-1 GO
        </button>
      </div>
      <label class="field">
        Positie {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        <input
          type="range"
          min="0"
          :max="duration || 0"
          step="0.1"
          :value="currentTime"
          :disabled="!canPlay"
          @input="onScrub"
        />
      </label>
      <label class="field">
        Volume
        <input v-model.number="volume" type="range" min="0" max="1" step="0.05" />
      </label>
      <label class="check">
        <input v-model="recordOnStart" type="checkbox" />
        Opnemen na countdown
      </label>
      <label class="field">
        Lipsync
        <select v-model="settings.lipSyncSource">
          <option value="audio">Muziek (audio-visemes)</option>
          <option value="face">Gezicht</option>
          <option value="mix">Mix</option>
        </select>
      </label>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { DEFAULT_TRACK_TITLE, DEFAULT_TRACK_URL, type MusicPlayer } from '../audio/MusicPlayer';
import { useSettingsStore } from '../stores/settings';

const props = defineProps<{
  player: MusicPlayer;
  counting?: boolean;
}>();
const recordOnStart = defineModel<boolean>('recordOnStart', { default: true });
const settings = useSettingsStore();
const emit = defineEmits<{ countdown: [] }>();

const title = ref(DEFAULT_TRACK_TITLE);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.85);
const busy = ref(false);
const paused = ref(true);
const errorMessage = ref('');
const statusTick = ref(0);
let poll = 0;

const canPlay = computed(() => {
  void statusTick.value;
  return (
    props.player.status === 'ready' ||
    props.player.status === 'playing' ||
    props.player.status === 'paused'
  );
});

onMounted(() => {
  props.player.setVolume(volume.value);
  void loadDefault();
  poll = window.setInterval(() => {
    currentTime.value = props.player.currentTime;
    duration.value = props.player.duration;
    paused.value = props.player.paused;
    errorMessage.value = props.player.errorMessage;
    statusTick.value += 1;
  }, 200);
});

onUnmounted(() => {
  window.clearInterval(poll);
});

watch(volume, (value) => props.player.setVolume(value));

async function loadDefault(): Promise<void> {
  busy.value = true;
  errorMessage.value = '';
  try {
    await props.player.loadUrl(DEFAULT_TRACK_URL, DEFAULT_TRACK_TITLE);
    title.value = props.player.title;
    statusTick.value += 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Demotrack kon niet worden geladen';
  } finally {
    busy.value = false;
  }
}

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  busy.value = true;
  errorMessage.value = '';
  try {
    await props.player.loadFile(file);
    title.value = props.player.title;
    statusTick.value += 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Bestand kon niet worden geladen';
  } finally {
    busy.value = false;
  }
}

async function togglePlay(): Promise<void> {
  try {
    if (props.player.paused) {
      await props.player.play();
    } else {
      props.player.pause();
    }
    paused.value = props.player.paused;
    statusTick.value += 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Afspelen mislukt';
  }
}

function onScrub(event: Event): void {
  const input = event.target as HTMLInputElement;
  props.player.seek(Number(input.value));
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.track {
  margin: 0 0 0.7rem;
  font-weight: 700;
}

.stack {
  display: grid;
  gap: 0.7rem;
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--muted);
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.85rem;
}
</style>
