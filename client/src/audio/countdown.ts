const STEPS = ['3', '2', '1', 'GO'] as const;

export async function runCountdown(
  onTick: (label: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (const label of STEPS) {
    if (signal?.aborted) {
      onTick('');
      return;
    }
    onTick(label);
    await wait(label === 'GO' ? 450 : 1000, signal);
  }
  onTick('');
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
