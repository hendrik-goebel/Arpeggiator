import { createTickProcessor } from '../midi/tickProcessor'
import { createWorkletClock } from '../midi/workletClock'

export function createMidiClock(initialBpm: number, onTick: () => void, subdivision = 1) {
  // Create both implementations and prefer worklet when available
  const fallback = createTickProcessor(initialBpm, onTick, subdivision)
  const worklet = createWorkletClock(initialBpm, onTick, subdivision)

  let isUsingWorklet = false
  let isPlaying = false

  async function startInternal(delayMs?: number) {
    if (isPlaying) return
    isPlaying = true

    // Try to initialize worklet module
    const workletReady = await worklet.ensureWorkletModule()
    if (workletReady) {
      worklet.start()
      isUsingWorklet = true
      // stop fallback if it started for some reason
      try { fallback.stop() } catch (e) {}
      return
    }

    // fallback
    ;(fallback as any).startAlignedTo(delayMs || 0)
    // if module loads later, switch over using async/await
    (async () => {
      try {
        const ready = await worklet.ensureWorkletModule()
        if (!isPlaying || !ready) return
        try { fallback.stop() } catch (e) {}
        worklet.startAlignedTo(delayMs || 0)
        isUsingWorklet = true
      } catch (e) {}
    })()
  }

  function start() { void startInternal() }
  function startAlignedTo(delayMs: number) { void startInternal(delayMs) }

  function stop() {
    if (!isPlaying) return
    isPlaying = false
    try { fallback.stop() } catch (e) {}
    try { worklet.stop() } catch (e) {}
    isUsingWorklet = false
  }

  function setBpm(v: number) {
    // update both implementations so they stay in sync when switching
    try { fallback.setBpm(v) } catch (e) {}
    try { worklet.setBpm(v) } catch (e) {}
  }

  function timeToNextTick() {
    try {
      if (isUsingWorklet) return worklet.timeToNextTick()
    return fallback.timeToNextTick()
  } catch (e) { return 0 }
  }

  function getState() {
    try { return isUsingWorklet ? worklet.getState() : fallback.getState() } catch (e) { return { bpm: initialBpm, lastTickAt: 0 } }
  }

  return { start, startAlignedTo, stop, setBpm, timeToNextTick, getState }
}
