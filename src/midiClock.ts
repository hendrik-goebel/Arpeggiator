export function createMidiClock(initialBpm: number, onTick: () => void) {
  let bpm = initialBpm
  let pendingBpm: number | null = null
  let playing = false
  let audioCtx: any = null
  let schedulerTimer: any = null
  let lastTickAt = 0
  let nextTickAudioTime = 0 // seconds (audioCtx.currentTime)
  let nextTickPerf = 0 // ms (performance.now)
  const SCHEDULE_AHEAD = 0.1 // seconds

  const getIntervalSec = () => 60 / bpm
  const getIntervalMs = () => (60000 / bpm)

  function tryCreateAudioContext() {
    if (audioCtx) return true
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext
    if (!AC) return false
    try {
      audioCtx = new AC()
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        // resume may require user gesture; attempt anyway
        audioCtx.resume().catch(() => {})
      }
      return true
    } catch (e) {
      audioCtx = null
      return false
    }
  }

  // Audio-synced scheduler: uses audioCtx.currentTime as stable clock and schedules ahead
  function scheduleLoopAudio() {
    if (!audioCtx || !playing) return
    const now = audioCtx.currentTime
    // initialize nextTickAudioTime if needed
    if (!nextTickAudioTime) nextTickAudioTime = now

    // catch up ticks that fall within the schedule-ahead window
    while (nextTickAudioTime <= now + SCHEDULE_AHEAD) {
      // invoke tick callback
      onTick()
      lastTickAt = Date.now()

      // apply pending BPM changes after emitting tick
      if (pendingBpm != null) { bpm = pendingBpm; pendingBpm = null }

      nextTickAudioTime += getIntervalSec()
    }

    // schedule next check shortly before the next tick (minus a small margin)
    const msUntilNext = Math.max((nextTickAudioTime - audioCtx.currentTime) * 1000 - 5, 0)
    clearTimeout(schedulerTimer)
    schedulerTimer = setTimeout(scheduleLoopAudio, msUntilNext)
  }

  // High-resolution fallback scheduler using performance.now with drift correction
  function scheduleLoopFallback() {
    if (!playing) return
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now()
    if (!nextTickPerf) nextTickPerf = now

    // emit any ticks that should have happened by now
    let safety = 0
    while (nextTickPerf <= now + 1 && safety < 1000) {
      onTick()
      lastTickAt = Date.now()
      if (pendingBpm != null) { bpm = pendingBpm; pendingBpm = null }
      nextTickPerf += getIntervalMs()
      safety++
    }

    const msUntil = Math.max(nextTickPerf - ((typeof performance !== 'undefined') ? performance.now() : Date.now()) - 2, 0)
    clearTimeout(schedulerTimer)
    schedulerTimer = setTimeout(scheduleLoopFallback, msUntil)
  }

  function start() {
    if (playing) return
    playing = true
    // reset scheduling anchors
    nextTickPerf = 0
    nextTickAudioTime = 0

    // prefer audio context when available
    if (tryCreateAudioContext()) {
      // align next tick to audio clock and start scheduler
      nextTickAudioTime = audioCtx.currentTime
      scheduleLoopAudio()
    } else {
      // fallback to perf-based scheduling
      nextTickPerf = (typeof performance !== 'undefined') ? performance.now() : Date.now()
      scheduleLoopFallback()
    }
  }

  function startAlignedTo(delayMs: number) {
    if (playing) return
    playing = true
    if (tryCreateAudioContext()) {
      nextTickAudioTime = audioCtx.currentTime + (delayMs / 1000)
      scheduleLoopAudio()
    } else {
      nextTickPerf = ((typeof performance !== 'undefined') ? performance.now() : Date.now()) + delayMs
      scheduleLoopFallback()
    }
  }

  function stop() {
    if (!playing) return
    playing = false
    if (schedulerTimer) {
      clearTimeout(schedulerTimer)
      schedulerTimer = null
    }
    // do not close audioCtx to avoid requiring user gesture to recreate later
  }

  function setBpm(v: number) {
    if (playing) {
      // apply after current tick
      pendingBpm = v
    } else {
      bpm = v
    }
  }

  function timeToNextTick() {
    if (!playing) return 0
    if (audioCtx && nextTickAudioTime) {
      const ms = Math.max(0, (nextTickAudioTime - audioCtx.currentTime) * 1000)
      return ms
    }
    if (nextTickPerf) {
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now()
      return Math.max(0, nextTickPerf - now)
    }
    return 0
  }

  function getState() {
    return { bpm, lastTickAt }
  }

  return { start, startAlignedTo, stop, setBpm, timeToNextTick, getState }
}
