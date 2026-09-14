import { onMounted, onUnmounted, ref } from 'vue';

export function useNarrowViewport(query = '(max-width: 900px)') {
  const narrow = ref(false);

  onMounted(() => {
    const media = window.matchMedia(query);
    const sync = () => {
      narrow.value = media.matches;
    };
    sync();
    media.addEventListener('change', sync);
    onUnmounted(() => media.removeEventListener('change', sync));
  });

  return narrow;
}
