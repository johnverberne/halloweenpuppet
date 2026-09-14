<template>
  <section class="panel">
    <p class="kicker">Telefoon</p>
    <p class="muted">
      Open dit adres op je mobiel (zelfde wifi). Accepteer de certificaatwaarschuwing. Daarna werkt de camera.
    </p>
    <ul v-if="urls.length" class="urls">
      <li v-for="url in urls" :key="url">
        <a :href="url">{{ url }}</a>
      </li>
    </ul>
    <p v-else class="muted">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
  path: string;
}>();

const urls = ref<string[]>([]);
const status = ref('LAN-adres ophalen…');

onMounted(() => {
  void load();
});

watch(
  () => props.path,
  () => {
    void load();
  },
);

async function load(): Promise<void> {
  try {
    const response = await fetch('/api/connect-info');
    if (!response.ok) {
      throw new Error('info failed');
    }
    const data = (await response.json()) as { lanAddresses?: string[] };
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    const protocol = window.location.protocol;
    const path = props.path.startsWith('/') ? props.path : `/${props.path}`;
    urls.value = (data.lanAddresses ?? []).map((ip) => `${protocol}//${ip}:${port}${path}`);
    if (urls.value.length === 0) {
      status.value = 'Geen LAN-IP gevonden. Staat je pc op wifi/ethernet?';
    }
  } catch {
    status.value = 'Kon LAN-adres niet ophalen. Check of de server op poort 3000 draait.';
  }
}
</script>

<style scoped>
.muted {
  margin: 0 0 0.6rem;
}

.urls {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  word-break: break-all;
}
</style>
