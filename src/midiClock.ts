export function createMidiClock(initialBpm: number, onTick: () => void) {
  let bpm = initialBpm
  let pendingBpm: number | null = null
  let playing = false
  let audioCtx: any = null
  let schedulerTimer: any = null
  let lastTickAt = 0

  // Worklet/node state
  let workletNode: any = null
  let moduleLoading: Promise<void> | null = null
  let workletLoaded = false

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

  // Load an external AudioWorklet module file instead of inlining
  function ensureWorkletModule() {
    if (moduleLoading || workletLoaded) return
    if (!tryCreateAudioContext()) return

    try {
      const moduleUrl = new URL('./midi-clock-processor.js', import.meta.url).toString()
      moduleLoading = audioCtx.audioWorklet.addModule(moduleUrl).then(() => { workletLoaded = true }).catch(() => { workletLoaded = false })
    } catch (e) {
      moduleLoading = Promise.resolve()
      workletLoaded = false
    }
  }

  function startWorklet(delayMs?: number) {
    if (!audioCtx || !workletLoaded) return false
    if (workletNode) return true
    try {
      workletNode = new (globalThis as any).AudioWorkletNode(audioCtx, 'midi-clock-processor')
      workletNode.port.onmessage = (e:any) => {
        if (e && e.data && e.data.type === 'tick') {
          lastTickAt = Date.now()
          // apply pendingBpm after worklet emits tick? Worklet applies its own pending bpm
          onTick()
        }
      }
      // init
      workletNode.port.postMessage({ type: 'init', sampleRate: audioCtx.sampleRate, bpm })
      // start with optional delay
      const startInSamples = (typeof delayMs === 'number') ? Math.max(0, Math.floor((delayMs/1000) * audioCtx.sampleRate)) : undefined
      workletNode.port.postMessage({ type: 'start', bpm, startInSamples })
      return true
    } catch (e) {
      workletNode = null
      return false
    }
  }

  // Fallback perf-based scheduler (drift-correcting)
  let nextTickPerf = 0
  function scheduleLoopFallback() {
    if (!playing) return
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now()
    if (!nextTickPerf) nextTickPerf = now

    let safety = 0
    while (nextTickPerf <= now + 1 && safety < 1000) {
      lastTickAt = Date.now()
      onTick()
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
    lastTickAt = 0

    // attempt to use AudioWorklet
    ensureWorkletModule()
    if (workletLoaded) {
      if (startWorklet()) return
    }

    // if worklet not ready or failed, fallback to perf scheduler
    nextTickPerf = (typeof performance !== 'undefined') ? performance.now() : Date.now()
    scheduleLoopFallback()

    // if module is still loading, attempt to switch to worklet when ready
    if (moduleLoading) {
      moduleLoading.then(() => {
        if (playing && workletLoaded) {
          // stop fallback
          clearTimeout(schedulerTimer)
          schedulerTimer = null
          nextTickPerf = 0
          // start worklet without delay
          startWorklet()
        }
      }).catch(() => {})
    }
  }

  function startAlignedTo(delayMs: number) {
    if (playing) return
    playing = true
    lastTickAt = 0

    ensureWorkletModule()
    if (workletLoaded) {
      if (startWorklet(delayMs)) return
    }

    // fallback
    nextTickPerf = ((typeof performance !== 'undefined') ? performance.now() : Date.now()) + delayMs
    scheduleLoopFallback()

    if (moduleLoading) {
      moduleLoading.then(() => {
        if (playing && workletLoaded) {
          clearTimeout(schedulerTimer)
          schedulerTimer = null
          nextTickPerf = 0
          startWorklet(delayMs)
        }
      }).catch(() => {})
    }
  }

  function stop() {
    if (!playing) return
    playing = false
    if (schedulerTimer) {
      clearTimeout(schedulerTimer)
      schedulerTimer = null
    }
    // stop worklet if running
    if (workletNode) {
      try { workletNode.port.postMessage({ type: 'stop' }) } catch (e) {}
      try { workletNode.disconnect(); workletNode = null } catch (e) { workletNode = null }
    }
  }

  function setBpm(v: number) {
    if (playing) {
      pendingBpm = v
      // inform worklet if present
      if (workletNode) {
        try { workletNode.port.postMessage({ type: 'setBpm', bpm: v }) } catch (e) {}
        // worklet will apply pending bpm after next tick
      }
    } else {
      bpm = v
    }
  }

  function timeToNextTick() {
    if (!playing) return 0
    if (workletNode && audioCtx) {
      // worklet maintains its own samplesUntilNext; best-effort: not exposed; return 0 to indicate unknown
      return 0
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
