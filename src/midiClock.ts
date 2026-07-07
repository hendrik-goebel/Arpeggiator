export function createMidiClock(initialBpm: number, onTick: () => void) {
  let beatsPerMinute = initialBpm
  let pendingBeatsPerMinute: number | null = null
  let isPlaying = false
  let audioContext: any = null
  let fallbackSchedulerTimer: any = null
  let lastTickTimestamp = 0

  // Worklet/node state
  let audioWorkletNode: any = null
  let moduleLoadingPromise: Promise<void> | null = null
  let workletModuleLoaded = false

  const getIntervalMs = () => (60000 / beatsPerMinute)
  const nowMs = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now()

  function tryCreateAudioContext() {
    if (audioContext) return true
    const AudioContext = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext
    if (!AudioContext) return false
    try {
      audioContext = new AudioContext()
      if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') audioContext.resume().catch(() => {})
      return true
    } catch (e) {
      audioContext = null
      return false
    }
  }

  // Helper to safely post messages to the worklet
  function postToWorklet(message: any) {
    try { audioWorkletNode?.port?.postMessage(message) } catch (e) {}
  }

  // Load an external AudioWorklet module file; returns a Promise<boolean> indicating success
  let moduleLoadingPromise: Promise<boolean> | null = null
  async function ensureWorkletModule(): Promise<boolean> {
    if (workletModuleLoaded) return true
    if (moduleLoadingPromise) return moduleLoadingPromise
    if (!tryCreateAudioContext()) return false

    moduleLoadingPromise = (async () => {
      try {
        const moduleUrl = new URL('./midi-clock-processor.js', import.meta.url).toString()
        await audioContext.audioWorklet.addModule(moduleUrl)
        workletModuleLoaded = true
        return true
      } catch (e) {
        workletModuleLoaded = false
        return false
      }
    })()

    return moduleLoadingPromise
  }

  function startWorklet(delayMs?: number) {
    if (!audioContext || !workletModuleLoaded) return false
    if (audioWorkletNode) return true
    try {
      audioWorkletNode = new (globalThis as any).AudioWorkletNode(audioContext, 'midi-clock-processor')
      audioWorkletNode.port.onmessage = (event:any) => {
        if (event?.data?.type === 'tick') {
          lastTickTimestamp = Date.now()
          onTick()
        }
      }
      // init
      postToWorklet({ type: 'init', sampleRate: audioContext.sampleRate, bpm: beatsPerMinute })
      // start with optional delay
      const startInSamples = (typeof delayMs === 'number') ? Math.max(0, Math.floor((delayMs/1000) * audioContext.sampleRate)) : undefined
      postToWorklet({ type: 'start', bpm: beatsPerMinute, startInSamples })
      return true
    } catch (e) {
      audioWorkletNode = null
      return false
    }
  }

  // Fallback perf-based scheduler (drift-correcting)
  let nextScheduledTickPerf = 0
  function scheduleLoopFallback() {
    if (!isPlaying) return
    const now = nowMs()
    nextScheduledTickPerf ||= now

    let safety = 0
    while (nextScheduledTickPerf <= now + 1 && safety < 1000) {
      lastTickTimestamp = Date.now()
      onTick()
      if (pendingBeatsPerMinute != null) { beatsPerMinute = pendingBeatsPerMinute; pendingBeatsPerMinute = null }
      nextScheduledTickPerf += getIntervalMs()
      safety++
    }

    const msUntil = Math.max(nextScheduledTickPerf - nowMs() - 2, 0)
    clearTimeout(fallbackSchedulerTimer)
    fallbackSchedulerTimer = setTimeout(scheduleLoopFallback, msUntil)
  }

  async function startInternal(delayMs?: number) {
    if (isPlaying) return
    isPlaying = true
    lastTickTimestamp = 0

    // attempt to use AudioWorklet first
    const workletReady = await ensureWorkletModule()
    if (workletReady && startWorklet(delayMs)) return

    // fallback to perf scheduler
    nextScheduledTickPerf = nowMs() + (delayMs || 0)
    scheduleLoopFallback()

    // when module finishes loading, switch to worklet if possible
    moduleLoadingPromise?.then((ready) => {
      if (!isPlaying || !ready) return
      clearTimeout(fallbackSchedulerTimer)
      fallbackSchedulerTimer = null
      nextScheduledTickPerf = 0
      startWorklet(delayMs)
    }).catch(() => {})
  }

  function start() { void startInternal() }
  function startAlignedTo(delayMs: number) { void startInternal(delayMs) }

  function stop() {
    if (!isPlaying) return
    isPlaying = false
    clearTimeout(fallbackSchedulerTimer)
    fallbackSchedulerTimer = null
    // stop worklet if running
    if (audioWorkletNode) {
      postToWorklet({ type: 'stop' })
      try { audioWorkletNode.disconnect(); audioWorkletNode = null } catch (e) { audioWorkletNode = null }
    }
  }

  function setBpm(v: number) {
    if (!isPlaying) { beatsPerMinute = v; return }
    pendingBeatsPerMinute = v
    postToWorklet({ type: 'setBpm', bpm: v })
  }

  function timeToNextTick() {
    if (!isPlaying) return 0
    if (audioWorkletNode && audioContext) return 0
    return Math.max(0, (nextScheduledTickPerf || 0) - nowMs())
  }

  function getState() {
    return { bpm: beatsPerMinute, lastTickAt: lastTickTimestamp }
  }

  return { start, startAlignedTo, stop, setBpm, timeToNextTick, getState }
}
