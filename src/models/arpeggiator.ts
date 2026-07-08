import { DEFAULT_BPM, DEFAULT_NOTE_LENGTH } from '../config'
import { createMidiClock } from './midiClock'

export type Pattern = 'up'|'down'|'updown'|'random'

export function createArpeggiator(sendNote: (note:number, vel:number, len:number)=>void) {
  let notes: number[] = []
  let pattern: Pattern = 'up'
  let noteLength = DEFAULT_NOTE_LENGTH
  let noteIndex = 0
  let stepPointer = 0
  let scanDirection = 1
  let steps: number[] = [] // indexes into notes[] or -1 for rest

  const safeModulo = (n:number, m:number) => ((n % m) + m) % m

  function advanceIndexForPattern() {
    if (pattern === 'up') noteIndex = safeModulo(noteIndex + 1, notes.length)
    else if (pattern === 'down') noteIndex = safeModulo(noteIndex - 1, notes.length)
    else if (pattern === 'updown') {
      if (notes.length <= 1) { noteIndex = 0; return }
      if (scanDirection === 1 && noteIndex >= notes.length - 1) scanDirection = -1
      else if (scanDirection === -1 && noteIndex <= 0) scanDirection = 1
      noteIndex = Math.max(0, Math.min(notes.length - 1, noteIndex + scanDirection))
    }
  }

  function tick() {
    if (!notes.length) return

    let noteToPlay: number | undefined
    switch (pattern) {
      case 'random':
        noteToPlay = notes[Math.floor(Math.random() * notes.length)]
        break
      default:
        noteToPlay = notes[noteIndex]
        advanceIndexForPattern()
    }

    if (noteToPlay != null) sendNote(noteToPlay, 0x7f, noteLength)
  }

  // use a dedicated MIDI clock for timing and BPM handling
  const clock = createMidiClock(DEFAULT_BPM, tick)

  function start(){
    if (!notes.length) return
    stepPointer = 0
    noteIndex = 0
    clock.start()
  }

  function startAlignedTo(other:any){
    if (!notes.length) return

    // copy position state from other if available (guarded)
    if (other && typeof other.getState === 'function') {
      const s = other.getState()
      noteIndex = s.index ?? noteIndex
      stepPointer = s.stepIndex ?? stepPointer
      scanDirection = s.direction ?? scanDirection
      pattern = s.pattern ?? pattern
    }

    const delay = (other && typeof other.timeToNextTick === 'function') ? other.timeToNextTick() : 0
    clock.startAlignedTo(delay)
  }

  function timeToNextTick(){ return clock.timeToNextTick() }

  function getState(){ return { index: noteIndex, stepIndex: stepPointer, direction: scanDirection, pattern } }

  function stop(){ clock.stop() }

  function setBpm(v:number){ clock.setBpm(v) }
  function setPattern(p:Pattern){ pattern = p }
  function setNotes(n:number[]){ notes = n; noteIndex = 0; scanDirection = 1 }
  function setNoteLength(ms:number){ noteLength = ms }
  function setSteps(s:number[]){ steps = s; stepPointer = 0 }

  return { start, startAlignedTo, stop, setBpm, setPattern, setNotes, setNoteLength, setSteps, getState, timeToNextTick }
}
