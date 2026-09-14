export class FpsCounter {
  private frames = 0;
  private lastStamp = performance.now();
  private fps = 0;

  tick(now = performance.now()): number {
    this.frames += 1;
    const elapsed = now - this.lastStamp;
    if (elapsed >= 500) {
      this.fps = (this.frames * 1000) / elapsed;
      this.frames = 0;
      this.lastStamp = now;
    }
    return this.fps;
  }

  get value(): number {
    return this.fps;
  }
}
