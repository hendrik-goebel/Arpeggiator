export function createMidiClock(initialBpm: number, onTick: () => void) {
  let bpm = initialBpm
  let pendingBpm: number | null = null
  let intervalId: any = null
  let lastTickAt = 0
  let playing = false

  function tick() {
    // record last tick time
    lastTickAt = Date.now()

    // call the provided tick handler
    onTick()

    // apply any pending BPM change at the end of this tick so tempo changes occur on the next beat
    if (pendingBpm != null) {
      bpm = pendingBpm
      pendingBpm = null
      if (intervalId) {
        clearInterval(intervalId)
        const intervalMs = 60000 / bpm
        intervalId = setInterval(tick, intervalMs)
      }
    }
  }

  function start() {
    if (playing) return
    playing = true
    // play immediately then schedule subsequent ticks
    tick()
    const intervalMs = 60000 / bpm
    intervalId = setInterval(tick, intervalMs)
  }

  function startAlignedTo(delay: number) {
    if (playing) return
    playing = true
    // schedule first tick to align with provided delay
    intervalId = setTimeout(() => {
      tick()
      // then set recurring interval
      if (intervalId) clearInterval(intervalId)
      const intervalMs = 60000 / bpm
      intervalId = setInterval(tick, intervalMs)
    }, delay)
  }

  function timeToNextTick() {
    if (!lastTickAt) return 0
    const intervalMs = 60000 / bpm
    const elapsed = Date.now() - lastTickAt
    return Math.max(0, intervalMs - (elapsed % intervalMs))
  }

  function getState() {
    return { bpm, lastTickAt }
  }

  function stop() {
    if (!playing) return
    playing = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function setBpm(v: number) {
    if (playing) {
      // defer tempo change until the end of the current tick to avoid sudden notes
      pendingBpm = v
    } else {
      bpm = v
    }
  }

  return { start, startAlignedTo, stop, setBpm, timeToNextTick, getState }
}
