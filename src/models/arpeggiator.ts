import { DEFAULT_BPM, DEFAULT_NOTE_LENGTH, STEP_COUNT } from '../config'
import { createMidiClock } from './midiClock'
import { MIDI } from '../midi/constants'

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
    if (!notes.length) return
    if (pattern === 'random') {
      noteIndex = Math.floor(Math.random() * notes.length)
    } else if (pattern === 'up') {
      noteIndex = safeModulo(noteIndex + 1, notes.length)
    } else if (pattern === 'down') {
      noteIndex = safeModulo(noteIndex - 1, notes.length)
    } else if (pattern === 'updown') {
      if (notes.length <= 1) { noteIndex = 0; return }
      if (scanDirection === 1 && noteIndex >= notes.length - 1) scanDirection = -1
      else if (scanDirection === -1 && noteIndex <= 0) scanDirection = 1
      noteIndex = Math.max(0, Math.min(notes.length - 1, noteIndex + scanDirection))
    }
  }

  function tick() {
    // Tick is called at a subdivision of the beat (configured in midiClock).
    // Use steps[] mapping to decide whether to play a note on this 16th.
    if (!steps || steps.length === 0) { stepPointer = (stepPointer + 1) % Math.max(1, STEP_COUNT); advanceIndexForPattern(); return }

    const stepCount = Math.max(1, steps.length)
    const currentStep = stepPointer % stepCount
    const stepValue = steps[currentStep]

    if (typeof stepValue === 'number' && stepValue >= 0) {
      // stepValue is a MIDI note number
      sendNote(stepValue, MIDI.VELOCITY_MAX, noteLength)
    }

    // advance pointers
    stepPointer = (stepPointer + 1) % Math.max(1, STEP_COUNT)

    // also advance pattern index for pattern-based arpeggios
    advanceIndexForPattern()
  }

  // use a dedicated MIDI clock for timing and BPM handling
  // compute subdivision: how many ticks per beat (STEP_COUNT / 4, since 4 beats per bar)
  const subdivision = Math.max(1, Math.floor(STEP_COUNT / 4))
  const clock = createMidiClock(DEFAULT_BPM, tick, subdivision)

  function start(){
    if (!notes.length) return
    stepPointer = 0
    noteIndex = (pattern === 'random' && notes.length) ? Math.floor(Math.random() * notes.length) : 0
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
  function setNotes(n:number[]){ notes = n; noteIndex = (pattern === 'random' && n.length) ? Math.floor(Math.random() * n.length) : 0; scanDirection = 1 }
  function setNoteLength(ms:number){ noteLength = ms }
  function setSteps(s:number[]){ steps = s; stepPointer = 0 }

  return { start, startAlignedTo, stop, setBpm, setPattern, setNotes, setNoteLength, setSteps, getState, timeToNextTick }
}
