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
  let steps: number[] = [] // MIDI note numbers or -1 for rest
  let loopLength = STEP_COUNT
  let clock: any = null
  let isPlaying = false

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

  function ensureClock() {
    // compute subdivision from loopLength (ticks per beat = loopLength / 4)
    const subdivision = Math.max(1, Math.floor(loopLength / 4))
    // recreate clock with new subdivision
    if (clock && typeof clock.stop === 'function') clock.stop()
    clock = createMidiClock(DEFAULT_BPM, tick, subdivision)
    if (isPlaying && clock && typeof clock.start === 'function') clock.start()
  }

  function setLoopLength(n:number){
    loopLength = Math.max(1, Math.min(32, Math.floor(n)))
    // resize steps array to match loopLength
    if (!steps) steps = []
    if (steps.length < loopLength) {
      steps = steps.concat(Array.from({ length: loopLength - steps.length }, () => -1))
    } else if (steps.length > loopLength) {
      steps = steps.slice(0, loopLength)
    }
    stepPointer = stepPointer % Math.max(1, loopLength)
    ensureClock()
  }

  function tick() {
    if (!steps || steps.length === 0) { stepPointer = (stepPointer + 1) % Math.max(1, loopLength); advanceIndexForPattern(); return }

    const stepCount = Math.max(1, steps.length)
    const currentStep = stepPointer % stepCount
    const stepValue = steps[currentStep]

    if (Array.isArray(stepValue)) {
      // chord: play all notes
      stepValue.forEach((n:any)=>{ if (typeof n === 'number' && n >= 0) sendNote(n, MIDI.VELOCITY_MAX, noteLength) })
    } else if (typeof stepValue === 'number' && stepValue >= 0) {
      // single MIDI note
      sendNote(stepValue, MIDI.VELOCITY_MAX, noteLength)
    }

    // advance pointers
    stepPointer = (stepPointer + 1) % Math.max(1, loopLength)

    // also advance pattern index for pattern-based arpeggios (keeps legacy behavior usable)
    advanceIndexForPattern()
  }

  // initialize clock
  ensureClock()

  function start(){
    if (!notes.length) return
    stepPointer = 0
    noteIndex = (pattern === 'random' && notes.length) ? Math.floor(Math.random() * notes.length) : 0
    if (clock && typeof clock.start === 'function') { clock.start(); isPlaying = true }
  }

  function startAlignedTo(other:any){
    if (!notes.length) return

    if (other && typeof other.getState === 'function') {
      const s = other.getState()
      noteIndex = s.index ?? noteIndex
      stepPointer = s.stepIndex ?? stepPointer
      scanDirection = s.direction ?? scanDirection
      pattern = s.pattern ?? pattern
    }

    const delay = (other && typeof other.timeToNextTick === 'function') ? other.timeToNextTick() : 0
    if (clock && typeof clock.startAlignedTo === 'function') clock.startAlignedTo(delay)
    if (clock && typeof clock.start === 'function' && delay === 0) { clock.start(); isPlaying = true }
  }

  function timeToNextTick(){ return clock ? clock.timeToNextTick() : 0 }

  function getState(){ return { index: noteIndex, stepIndex: stepPointer, direction: scanDirection, pattern } }

  function stop(){ if (clock && typeof clock.stop === 'function') { clock.stop(); isPlaying = false } }

  function setBpm(v:number){ if (clock && typeof clock.setBpm === 'function') clock.setBpm(v) }
  function setPattern(p:Pattern){ pattern = p }
  function setNotes(n:number[]){ notes = n; noteIndex = (pattern === 'random' && n.length) ? Math.floor(Math.random() * n.length) : 0; scanDirection = 1 }
  function setNoteLength(ms:number){ noteLength = ms }
  function setSteps(s:number[]){ steps = s; stepPointer = 0 }

  return { start, startAlignedTo, stop, setBpm, setPattern, setNotes, setNoteLength, setSteps, getState, timeToNextTick, setLoopLength }
}
