<template>
  <section class="panel pair">
    <p class="kicker">QR-koppeling</p>
    <p class="muted">
      Scan op je telefoon (zelfde wifi). Accepteer daarna de certificaatwaarschuwing, anders start de camera
      niet.
    </p>
    <div v-if="primary" class="card">
      <img v-if="qrSrc" :src="qrSrc" :alt="`QR naar ${primary}`" width="220" height="220" />
      <p v-else class="muted">QR maken…</p>
      <div class="actions">
        <a :href="primary">{{ primary }}</a>
        <button type="button" class="secondary" @click="copyPrimary">{{ copied ? 'Gekopieerd' : 'Kopieer link' }}</button>
      </div>
    </div>
    <ul v-if="urls.length > 1" class="urls">
      <li v-for="url in urls.slice(1)" :key="url">
        <a :href="url">{{ url }}</a>
      </li>
    </ul>
    <p v-else-if="!primary" class="muted">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { qrDataUrl } from '../pairing/qr';

const props = defineProps<{
  path: string;
}>();

const urls = ref<string[]>([]);
const primary = ref('');
const qrSrc = ref('');
const status = ref('LAN-adres ophalen…');
const copied = ref(false);

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
  copied.value = false;
  try {
    const response = await fetch('/api/connect-info');
    if (!response.ok) {
      throw new Error('info failed');
    }
    const data = (await response.json()) as {
      lanAddresses?: string[];
      port?: number;
      protocol?: string;
    };
    const port = String(
      data.port ?? (window.location.port || (window.location.protocol === 'https:' ? '443' : '80')),
    );
    const protocol = data.protocol ? `${data.protocol}:` : window.location.protocol;
    const path = props.path.startsWith('/') ? props.path : `/${props.path}`;
    urls.value = (data.lanAddresses ?? []).map((ip) => `${protocol}//${ip}:${port}${path}`);
    primary.value = urls.value[0] ?? '';
    qrSrc.value = primary.value ? await qrDataUrl(primary.value) : '';
    if (!primary.value) {
      status.value = 'Geen LAN-IP gevonden. Staat je pc op wifi/ethernet?';
    }
  } catch {
    status.value = 'Kon LAN-adres niet ophalen. Draait de server?';
    primary.value = '';
    qrSrc.value = '';
  }
}

async function copyPrimary(): Promise<void> {
  if (!primary.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(primary.value);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
</script>

<style scoped>
.pair {
  display: grid;
  gap: 0.65rem;
}

.muted {
  margin: 0;
}

.card {
  display: grid;
  justify-items: center;
  gap: 0.65rem;
  padding: 0.75rem;
  border-radius: 14px;
  background: #100d14;
}

.card img {
  width: min(220px, 70vw);
  height: auto;
  border-radius: 12px;
  background: #f4eef8;
}

.actions {
  display: grid;
  gap: 0.45rem;
  width: 100%;
  justify-items: center;
  text-align: center;
  word-break: break-all;
  font-size: 0.82rem;
}

.actions button {
  min-height: 2.6rem;
}

.urls {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  word-break: break-all;
}
</style>
