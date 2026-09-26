import { strict as assert } from 'assert';
import { SaveScheduler } from '../board/SaveScheduler';

const INTERVAL_MS = 40;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Counts writes; the scheduler only decides *when* one happens. */
function makeScheduler() {
  let saves = 0;
  const scheduler = new SaveScheduler(() => saves++, INTERVAL_MS);
  return { scheduler, saved: () => saves };
}

describe('SaveScheduler', function () {
  it('writes a burst of requests once', async function () {
    const { scheduler, saved } = makeScheduler();

    for (let i = 0; i < 10; i++) scheduler.requestSave();
    assert.equal(saved(), 0, 'nothing is written while the burst is still running');

    await wait(INTERVAL_MS * 2);
    assert.equal(saved(), 1);
  });

  it('keeps writing while requests keep coming, but not per request', async function () {
    const { scheduler, saved } = makeScheduler();

    for (let round = 0; round < 3; round++) {
      scheduler.requestSave();
      scheduler.requestSave();
      await wait(INTERVAL_MS * 2);
    }

    assert.equal(saved(), 3);
  });

  it('lets an immediate save absorb a pending one', async function () {
    const { scheduler, saved } = makeScheduler();

    scheduler.requestSave();
    scheduler.saveNow();
    assert.equal(saved(), 1);

    await wait(INTERVAL_MS * 2);
    assert.equal(saved(), 1, 'the pending timer was dropped, not just ignored');
  });

  it('writes a pending save on flush', function () {
    const { scheduler, saved } = makeScheduler();

    scheduler.requestSave();
    scheduler.flush();

    assert.equal(saved(), 1);
  });

  it('does not write on flush when nothing is pending', function () {
    const { scheduler, saved } = makeScheduler();

    scheduler.flush();

    assert.equal(saved(), 0);
  });

  it('delays the first request after an immediate save by the full interval', async function () {
    const { scheduler, saved } = makeScheduler();

    scheduler.saveNow();
    scheduler.requestSave();

    await wait(INTERVAL_MS / 2);
    assert.equal(saved(), 1, 'still inside the interval of the immediate save');

    await wait(INTERVAL_MS);
    assert.equal(saved(), 2);
  });
});
