import { ref, computed, watch } from 'vue'
import { initMidi, listOutputs, selectOutput, sendNote, enableSineSynth, disableSineSynth, SINE_OUTPUT_ID } from './midi/midi'
import { createChannel } from './models/channel'
import { CHANNEL_COUNT, DEFAULT_BASE, DEFAULT_BPM, KEYBOARD_NOTE_OFFSETS, MAJOR_SCALE_OFFSETS, CIRCLE_OF_FIFTHS_KEYS, STEP_COUNT, CircleOfFifthsKey } from './config'
import { MIDI } from './midi/constants'

export function useChannels() {
  const log = ref<string[]>([])
  const outputs = ref<{id:string,name:string}[]>([])
  const selectedOutputId = ref<string | null>(null)
  const channels = Array.from({length: CHANNEL_COUNT}, (_, index)=> createChannel(index, selectedOutputId, log))
  const currentIndex = ref(0)
  const currentChannel = computed(() => channels[currentIndex.value])

  const globalBpm = ref(DEFAULT_BPM)
  const globalKey = ref<CircleOfFifthsKey>('C')
  const globalPlaying = ref(false)

  function setGlobalBpm(bpm:number){
    globalBpm.value = bpm
    channels.forEach(channel => {
      channel.bpm = bpm + channel.tempoOffset
      channel.arpeggiator.setBpm(channel.bpm)
    })
  }

  function updateGlobalKey(key: string) {
    if (!CIRCLE_OF_FIFTHS_KEYS.some(candidate => candidate.name === key)) return
    globalKey.value = key as CircleOfFifthsKey
    channels.forEach(channel => { channel.key = globalKey.value })
  }

  function toggleGlobalPlay(){
    if (globalPlaying.value) {
      // stop all channels
      channels.forEach(channel => { if (channel.playing) channel.arpeggiator.stop() })
      globalPlaying.value = false
    } else {
      // start all channels
      channels.forEach(channel => { if (!channel.playing) channel.arpeggiator.start() })
      globalPlaying.value = true
    }
  }

  function stopAll() {
    channels.forEach(channel => channel.arpeggiator.stop())
    globalPlaying.value = false
  }

  function selectChannel(index:number){ currentIndex.value = index }
  function toggleChannelPlay(index:number){
    const channel = channels[index]
    if (channel.playing) {
      channel.arpeggiator.stop()
    } else {
      // if any other channel is playing, align this channel's first note to them
      const referenceChannel = channels.find(c => c.playing && c !== channel)
      if (referenceChannel && typeof channel.arpeggiator.startAlignedTo === 'function') {
        channel.arpeggiator.startAlignedTo(referenceChannel.arpeggiator)
      } else {
        channel.arpeggiator.start()
      }
    }
  }

  function togglePlay(){
    const channel = currentChannel.value
    if (channel.playing) { channel.arpeggiator.stop() }
    else {
      const referenceChannel = channels.find(c => c.playing && c !== channel)
      if (referenceChannel && typeof channel.arpeggiator.startAlignedTo === 'function') {
        channel.arpeggiator.startAlignedTo(referenceChannel.arpeggiator)
      } else {
        channel.arpeggiator.start()
      }
    }
  }

  function toggleNote(note:number){
    const channel = currentChannel.value
    const noteIndex = channel.notes.indexOf(note)
    if (noteIndex === -1) {
      channel.notes = [...channel.notes, note].sort((a,b)=>a-b)
    } else {
      channel.notes = channel.notes.filter((x:any)=>x!==note)
      // replace any matching step note values with -1 (rest)
      channel.steps = channel.steps.map((stepValue:any)=> (stepValue === note ? -1 : stepValue))
    }
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
  }

  function cycleStep(payload:any){
    const channel = currentChannel.value
    // payload can be a number (legacy) or {step, note}
    if (typeof payload === 'number') {
      // legacy: toggle through available notes by rotating index into channel.notes
      const stepIndex = payload
      const noteCount = channel.notes.length
      if (noteCount === 0) { channel.steps[stepIndex] = -1; channel.arpeggiator.setSteps(channel.steps); return }
      let current = channel.steps[stepIndex]
      // if current is a MIDI note, find its index among channel.notes
      let idx = channel.notes.indexOf(current)
      if (idx === -1) idx = -1
      idx = idx + 1
      if (idx >= noteCount) {
        channel.steps[stepIndex] = -1
      } else {
        channel.steps[stepIndex] = channel.notes[idx]
      }
      channel.arpeggiator.setSteps(channel.steps)
      return
    }

    const { step, note } = payload
    const newSteps = channel.steps.slice()
    if (newSteps[step] === note) newSteps[step] = -1
    else {
      newSteps[step] = note
      if (!channel.notes.includes(note)) {
        channel.notes = [...channel.notes, note].sort((a, b) => a - b)
      }
    }
    channel.steps = newSteps
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
  }

  function clearNotes(){
    const channel = currentChannel.value
    channel.notes = []
    channel.steps = Array.from({ length: STEP_COUNT }, () => -1)
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
  }

  function createVariation(index: number) {
    const channel = channels[index]
    const keyPitchClass = CIRCLE_OF_FIFTHS_KEYS.find(key => key.name === channel.key)?.pitchClass ?? 0
    const keyPitches = MAJOR_SCALE_OFFSETS.map(offset => DEFAULT_BASE + ((keyPitchClass + offset) % 12))
    const length = Math.max(1, Math.min(32, Math.floor(channel.arpeggioLength)))
    const shuffled = keyPitches.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(length, shuffled.length))
    while (selected.length < length) {
      selected.push(keyPitches[Math.floor(Math.random() * keyPitches.length)])
    }
    selected.sort((a, b) => a - b)
    const notes: number[] = []

    if (channel.pattern === 'random') {
      notes.push(...selected.sort(() => Math.random() - 0.5))
    } else if (channel.pattern === 'down') {
      notes.push(...selected.reverse())
    } else if (channel.pattern === 'updown') {
      notes.push(...selected, ...selected.slice(1, -1).reverse())
    } else {
      notes.push(...selected)
    }

    channel.base = DEFAULT_BASE
    channel.notes = [...new Set(selected)].sort((a, b) => a - b)
    const previousSteps = channel.steps.slice(0, channel.loopLength)
    const hasRhythm = previousSteps.length > 0
    const activeSteps = hasRhythm
      ? previousSteps.map(step => typeof step === 'number' && step >= 0)
      : Array.from({ length: channel.loopLength }, () => true)
    let notePosition = 0
    channel.steps = activeSteps.map(isActive => {
      if (!isActive) return -1
      const note = notes[notePosition % notes.length]
      notePosition++
      return note
    })
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
  }

  function createGlobalVariation() {
    channels.forEach((_, index) => createVariation(index))
  }

  function playKeyboardNote(key: string) {
    const offset = KEYBOARD_NOTE_OFFSETS[key.toLowerCase()]
    if (offset === undefined) return false

    const channel = currentChannel.value
    const note = channel.base + offset
    const outputId = selectedOutputId.value
    if (outputId) sendNote(outputId, note, MIDI.VELOCITY_MAX, channel.noteLength, channel.midiChannel - 1)

    channel.active = true
    log.value.unshift(`${new Date().toISOString()} ${channel.name} NOTE ${note} vel=${MIDI.VELOCITY_MAX} len=${channel.noteLength}`)
    setTimeout(() => { channel.active = false }, Math.max(channel.noteLength, 120))
    return true
  }

  async function enableMidi(){
    outputs.value = listOutputs()
    await initMidi()
    outputs.value = listOutputs()
    if (outputs.value.length) selectedOutputId.value = outputs.value[0].id
  }

  watch(selectedOutputId, (id) => {
    if (id === SINE_OUTPUT_ID) enableSineSynth()
    else disableSineSynth()
    if (id) selectOutput(id)
  })

  function updateChannelBpm(index:number, bpm:number) {
    const channel = channels[index]
    channel.tempoOffset = bpm - globalBpm.value
    channel.bpm = bpm
    channel.arpeggiator.setBpm(bpm)
  }
  function updateMidiChannel(index:number, midiChannel:number) {
    const channel = channels[index]
    channel.midiChannel = Math.max(1, Math.min(16, Math.floor(midiChannel)))
  }
  function updatePattern(pattern:any){ currentChannel.value.arpeggiator.setPattern(pattern); currentChannel.value.pattern = pattern }
  function updateChannelKey(index: number, key: string) {
    const channel = channels[index]
    if (!channel || !CIRCLE_OF_FIFTHS_KEYS.some(candidate => candidate.name === key)) return
    channel.key = key as CircleOfFifthsKey
  }
  function updateNoteLength(length:number){ currentChannel.value.arpeggiator.setNoteLength(length); currentChannel.value.noteLength = length }
  function updateArpeggioLength(length:number){
    currentChannel.value.arpeggioLength = Math.max(1, Math.min(32, Math.floor(length)))
  }
  function updateLoopLength(length:number){
    const channel = currentChannel.value
    const newLen = Math.max(1, Math.min(64, Math.floor(length)))
    if (!channel.steps) channel.steps = []
    if (channel.steps.length < newLen) {
      const arpeggio = channel.steps.filter(step => typeof step === 'number' && step >= 0)
      const addedSteps = Array.from(
        { length: newLen - channel.steps.length },
        (_, index) => arpeggio.length ? arpeggio[index % arpeggio.length] : -1
      )
      channel.steps = channel.steps.concat(addedSteps)
    }
    else if (channel.steps.length > newLen) channel.steps = channel.steps.slice(0, newLen)
    channel.loopLength = newLen
    if (typeof channel.arpeggiator.setLoopLength === 'function') {
      channel.arpeggiator.setLoopLength(newLen)
      // ensure arpeggiator uses the resized steps array
      if (typeof channel.arpeggiator.setSteps === 'function') channel.arpeggiator.setSteps(channel.steps)
    }
  }

  function updateQuantisation(q:number){
    const channel = currentChannel.value
    const newQ = Math.max(1, Math.min(64, Math.floor(q)))
    channel.quantisation = newQ
    if (typeof channel.arpeggiator.setSubdivision === 'function') channel.arpeggiator.setSubdivision(newQ)
  }

  return {
    channels,
    currentIndex,
    currentChannel,
    globalBpm,
    globalKey,
    globalPlaying,
    setGlobalBpm,
    updateGlobalKey,
    toggleGlobalPlay,
    stopAll,
    selectChannel,
    toggleChannelPlay,
    togglePlay,
    toggleNote,
    cycleStep,
    clearNotes,
    createVariation,
    createGlobalVariation,
    playKeyboardNote,
    outputs,
    selectedOutputId,
    enableMidi,
    log,
    updateChannelBpm,
    updateMidiChannel,
    updatePattern,
    updateChannelKey,
    updateNoteLength,
    updateArpeggioLength,
    updateQuantisation,
    updateLoopLength,
  }
}
