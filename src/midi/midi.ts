import { MIDI } from './constants'

let midiAccess: WebMidi.MIDIAccess | null = null
let selectedOutput: WebMidi.MIDIOutput | null = null

function clampMidiValue(value: number) {
  const n = Math.floor(Number(value) || 0)
  return Math.max(0, Math.min(127, n))
}

export async function initMidi() {
  if (navigator && (navigator as any).requestMIDIAccess) {
    midiAccess = await (navigator as any).requestMIDIAccess()
    return midiAccess
  }
  throw new Error('Web MIDI API not supported')
}

export function listOutputs() {
  if (!midiAccess) return []
  const outs: {id:string,name:string}[] = []
  midiAccess.outputs.forEach((o:any)=> outs.push({id: o.id, name: o.name || o.manufacturer || o.id}))
  return outs
}

export function selectOutput(id:string) {
  if (!midiAccess) return null
  const out = midiAccess.outputs.get(id)
  selectedOutput = out ?? null
  return selectedOutput
}

export function sendNote(outputId:string, note:number, velocity:number, lengthMs:number) {
  if (!midiAccess) return
  const out = midiAccess.outputs.get(outputId)
  if (!out) return
  const safeNote = clampMidiValue(note)
  const safeVelocity = clampMidiValue(velocity)
  console.log(`[midi-note-on] output=${outputId} note=${safeNote} velocity=${safeVelocity} time=${new Date().toISOString()}`)
  out.send([MIDI.NOTE_ON, safeNote, safeVelocity])
  setTimeout(()=> out.send([MIDI.NOTE_OFF, safeNote, MIDI.DEFAULT_OFF_VELOCITY]), lengthMs)
}

export function sendRaw(note:number, velocity:number, lengthMs:number) {
  if (!selectedOutput) return
  const safeNote = clampMidiValue(note)
  const safeVelocity = clampMidiValue(velocity)
  console.log(`[midi-note-on] output=${selectedOutput.id} note=${safeNote} velocity=${safeVelocity} time=${new Date().toISOString()}`)
  selectedOutput.send([MIDI.NOTE_ON, safeNote, safeVelocity])
  setTimeout(()=> selectedOutput && selectedOutput.send([MIDI.NOTE_OFF, safeNote, MIDI.DEFAULT_OFF_VELOCITY]), lengthMs)
}
