import { DEFAULT_BPM, DEFAULT_NOTE_LENGTH } from './config'

export type Pattern = 'up'|'down'|'updown'|'random'|'custom'

export function createArpeggiator(sendNote: (note:number, vel:number, len:number)=>void) {
  let notes: number[] = []
  let playing = false
  let bpm = DEFAULT_BPM
  let pendingBpm: number | null = null
  let intervalId: any = null
  let pattern: Pattern = 'up'
  let noteLength = DEFAULT_NOTE_LENGTH
  let index = 0
  let stepIndex = 0
  let direction = 1
  let steps: number[] = [] // indexes into notes[] or -1 for rest
  let lastTickAt = 0

  function tick() {
    if (!notes.length) return
    let noteToPlay: number | undefined

    if (pattern === 'random') {
      noteToPlay = notes[Math.floor(Math.random() * notes.length)]
    } else if (pattern === 'custom') {
      if (!steps.length) return
      const s = steps[stepIndex]
      if (s != null && s >= 0 && s < notes.length) noteToPlay = notes[s]
      stepIndex = (stepIndex + 1) % steps.length
    } else {
      // play current index, then advance for next tick
      noteToPlay = notes[index]

      if (pattern === 'up') {
        index = (index + 1) % notes.length
      } else if (pattern === 'down') {
        index = (index - 1 + notes.length) % notes.length
      } else if (pattern === 'updown') {
        if (notes.length === 1) {
          index = 0
        } else {
          if (direction === 1 && index >= notes.length - 1) direction = -1
          else if (direction === -1 && index <= 0) direction = 1
          index += direction
          if (index < 0) index = 0
          if (index >= notes.length) index = notes.length - 1
        }
      }
    }

    if (noteToPlay != null) {
      sendNote(noteToPlay, 0x7f, noteLength)
    }

    // record last tick time
    lastTickAt = Date.now()

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

  function start(){
    if (playing) return
    if (!notes.length) return
    playing = true
    stepIndex = 0
    index = 0
    // play immediately then schedule subsequent notes
    tick()
    const intervalMs = 60000 / bpm
    intervalId = setInterval(tick, intervalMs)
  }

  function startAlignedTo(other:any){
    if (playing) return
    if (!notes.length) return
    // copy position state from other if available
    try {
      const s = other.getState()
      index = s.index
      stepIndex = s.stepIndex
      direction = s.direction
      pattern = s.pattern
    } catch (e) {
      // ignore if other doesn't expose state
    }

    // schedule first tick to align with other's next tick
    const delay = (typeof other.timeToNextTick === 'function') ? other.timeToNextTick() : 0
    playing = true
    // do not call tick immediately; set timer to call tick in sync
    const intervalMs = 60000 / bpm
    intervalId = setTimeout(() => {
      tick()
      // then set recurring interval
      if (intervalId) clearInterval(intervalId)
      intervalId = setInterval(tick, intervalMs)
    }, delay)
  }

  function timeToNextTick(){
    if (!lastTickAt) return 0
    const intervalMs = 60000 / bpm
    const elapsed = Date.now() - lastTickAt
    return Math.max(0, intervalMs - (elapsed % intervalMs))
  }

  function getState(){
    return { index, stepIndex, direction, pattern }
  }

  function stop(){
    if (!playing) return
    playing = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function setBpm(v:number){
    if (playing) {
      // defer tempo change until the end of the current tick to avoid sudden notes
      pendingBpm = v
    } else {
      bpm = v
    }
  }
  function setPattern(p:Pattern){ pattern = p }
  function setNotes(n:number[]){ notes = n; index = 0; direction = 1 }
  function setNoteLength(ms:number){ noteLength = ms }
  function setSteps(s:number[]){ steps = s; stepIndex = 0 }

  return { start, startAlignedTo, stop, setBpm, setPattern, setNotes, setNoteLength, setSteps, getState, timeToNextTick }
}
