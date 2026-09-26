/**
 * Coalesces saves. Every save rewrites the whole .5boardz archive, so a fast series of edits
 * (typing in a codeblock) must not cause one write per edit. The edits themselves are already in
 * the in-memory document — only the write to disk is delayed.
 */
export class SaveScheduler {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastSaveAt = 0;

  constructor(
    private readonly save: () => void,
    private readonly intervalMs: number,
  ) {}

  /** Saves at most once per interval, with a trailing save for the last edit. */
  requestSave(): void {
    if (this.timer) return;
    const wait = Math.max(0, this.intervalMs - (Date.now() - this.lastSaveAt));
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.runSave();
    }, wait);
  }

  /** Saves right away; a pending request is covered by the same write. */
  saveNow(): void {
    this.cancel();
    this.runSave();
  }

  /** Writes a pending save, e.g. when the document closes. */
  flush(): void {
    if (this.timer) this.saveNow();
  }

  private cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private runSave(): void {
    this.lastSaveAt = Date.now();
    this.save();
  }
}
