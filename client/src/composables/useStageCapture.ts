import { onMounted, onUnmounted, ref } from 'vue';
import { runCountdown } from '../audio/countdown';
import { DEFAULT_TRACK_TITLE, MusicPlayer } from '../audio/MusicPlayer';
import { StageRecorder, type RecorderState } from '../recording/StageRecorder';

export function useStageCapture(getCanvas: () => HTMLCanvasElement | null) {
  const player = new MusicPlayer();
  const recorder = new StageRecorder();
  const countdownLabel = ref('');
  const counting = ref(false);
  const recordOnStart = ref(true);
  const recorderState = ref<RecorderState>('idle');
  const recorderError = ref('');
  const isPlaying = ref(false);
  const trackTitle = ref(DEFAULT_TRACK_TITLE);
  let poll = 0;

  onMounted(() => {
    poll = window.setInterval(() => {
      isPlaying.value = !player.paused;
      trackTitle.value = player.title;
    }, 200);
  });

  onUnmounted(() => {
    window.clearInterval(poll);
    player.dispose();
    recorder.dispose();
  });

  async function startWithCountdown(): Promise<void> {
    if (counting.value) {
      return;
    }
    counting.value = true;
    try {
      await player.arm();
      await runCountdown((label) => {
        countdownLabel.value = label;
      });
      await player.play();
      if (recordOnStart.value) {
        await startRecording();
      }
    } catch (error) {
      recorderError.value = error instanceof Error ? error.message : 'Muziek afspelen mislukt';
    } finally {
      counting.value = false;
      countdownLabel.value = '';
    }
  }

  async function startRecording(): Promise<void> {
    const canvas = getCanvas();
    if (!canvas) {
      recorderError.value = 'Geen stage-canvas om op te nemen';
      return;
    }
    try {
      await recorder.start(canvas, player.getAudioStream());
      recorderState.value = recorder.state;
      recorderError.value = '';
    } catch (error) {
      recorderError.value = error instanceof Error ? error.message : 'Opname starten mislukt';
    }
  }

  async function stopRecording(): Promise<void> {
    await recorder.stop();
    recorderState.value = recorder.state;
    recorderError.value = recorder.errorMessage;
  }

  function downloadRecording(): void {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    recorder.download(`halloweenpuppet-${stamp}.webm`);
  }

  return {
    player,
    countdownLabel,
    counting,
    recordOnStart,
    recorderState,
    recorderError,
    startWithCountdown,
    startRecording,
    stopRecording,
    isPlaying,
    trackTitle,
    downloadRecording,
  };
}
