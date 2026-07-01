import { DEFAULT_BPM, DEFAULT_NOTE_LENGTH } from './config'

export type Pattern = 'up'|'down'|'updown'|'random'|'custom'

export function createArpeggiator(sendNote: (note:number, vel:number, len:number)=>void) {
  let notes: number[] = []
  let playing = false
  let bpm = DEFAULT_BPM
  let intervalId: any = null
  let pattern: Pattern = 'up'
  let noteLength = DEFAULT_NOTE_LENGTH
  let index = 0
  let stepIndex = 0
  let direction = 1
  let steps: number[] = [] // indexes into notes[] or -1 for rest

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

  function stop(){
    if (!playing) return
    playing = false
    if (intervalId) clearInterval(intervalId)
    intervalId = null
  }

  function setBpm(v:number){ bpm = v; if (playing){ stop(); start() } }
  function setPattern(p:Pattern){ pattern = p }
  function setNotes(n:number[]){ notes = n; index = 0; direction = 1 }
  function setNoteLength(ms:number){ noteLength = ms }
  function setSteps(s:number[]){ steps = s; stepIndex = 0 }

  return { start, stop, setBpm, setPattern, setNotes, setNoteLength, setSteps }
}
