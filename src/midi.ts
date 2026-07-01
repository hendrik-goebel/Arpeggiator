let midiAccess: WebMidi.MIDIAccess | null = null
let selectedOutput: WebMidi.MIDIOutput | null = null

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
  out.send([0x90, note & 0x7f, velocity & 0x7f])
  setTimeout(()=> out.send([0x80, note & 0x7f, 0x40]), lengthMs)
}

export function sendRaw(note:number, velocity:number, lengthMs:number) {
  if (!selectedOutput) return
  selectedOutput.send([0x90, note & 0x7f, velocity & 0x7f])
  setTimeout(()=> selectedOutput && selectedOutput.send([0x80, note & 0x7f, 0x40]), lengthMs)
}
