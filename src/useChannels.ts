import { ref, computed, watch } from 'vue'
import { initMidi, listOutputs, selectOutput, sendNote, enableSineSynth, disableSineSynth } from './midi/midi'
import { createChannel } from './models/channel'
import { CHANNEL_COUNT, DEFAULT_BASE, DEFAULT_BPM, KEYBOARD_NOTE_OFFSETS, STEP_COUNT } from './config'
import { MIDI } from './midi/constants'

export function useChannels() {
  const log = ref<string[]>([])
  const outputs = ref<{id:string,name:string}[]>([])
  const selectedOutputId = ref<string | null>(null)
  const synthEnabled = ref(false)

  const channels = Array.from({length: CHANNEL_COUNT}, (_, index)=> createChannel(index, selectedOutputId, log))
  const currentIndex = ref(0)
  const currentChannel = computed(() => channels[currentIndex.value])

  const syncChannels = ref(false)
  const globalBpm = ref(DEFAULT_BPM)
  const globalPlaying = ref(false)

  function setGlobalBpm(bpm:number){
    globalBpm.value = bpm
    if (syncChannels.value) {
      // Apply global tempo to running clocks but do not change channel BPM fields
      channels.forEach(channel => { channel.arpeggiator.setBpm(bpm) })
    }
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

  function setSyncChannels(enabled:boolean){
    // Toggle sync mode without changing any channel play states.
    // When enabling, ensure all arpeggiators use the global BPM but do not mutate channel BPM fields.
    // When disabling, restore each arpeggiator to its channel's local BPM so channels once again use their own tempo.
    syncChannels.value = enabled
    if (enabled) {
      channels.forEach(channel => {
        channel.arpeggiator.setBpm(globalBpm.value)
      })
    } else {
      channels.forEach(channel => {
        channel.arpeggiator.setBpm(channel.bpm)
      })
    }
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
    else newSteps[step] = note
    channel.steps = newSteps
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
    const cMajorPitches = [0, 2, 4, 5, 7, 9, 11].map(offset => DEFAULT_BASE + offset)
    const length = Math.max(1, Math.min(32, Math.floor(channel.arpeggioLength)))
    const shuffled = cMajorPitches.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(length, shuffled.length))
    while (selected.length < length) {
      selected.push(cMajorPitches[Math.floor(Math.random() * cMajorPitches.length)])
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
    channel.steps = Array.from(
      { length: channel.loopLength },
      (_, step) => notes[step % notes.length]
    )
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
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
    await initMidi()
    outputs.value = listOutputs()
    if (outputs.value.length) selectedOutputId.value = outputs.value[0].id
  }

  function toggleSynth() {
    if (synthEnabled.value) {
      disableSineSynth()
      synthEnabled.value = false
    } else {
      enableSineSynth()
      synthEnabled.value = true
    }
    outputs.value = listOutputs()
    if (outputs.value.length && !selectedOutputId.value) selectedOutputId.value = outputs.value[0].id
  }

  watch(selectedOutputId, (id) => { if (id) selectOutput(id) })

  function updateChannelBpm(index:number, bpm:number) {
    const channel = channels[index]
    channel.arpeggiator.setBpm(bpm)
    channel.bpm = bpm
  }
  function cycleMidiChannel(index:number) {
    const channel = channels[index]
    channel.midiChannel = channel.midiChannel >= 16 ? 1 : channel.midiChannel + 1
  }
  function updatePattern(pattern:any){ currentChannel.value.arpeggiator.setPattern(pattern); currentChannel.value.pattern = pattern }
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
    syncChannels,
    setSyncChannels,
    globalBpm,
    globalPlaying,
    setGlobalBpm,
    toggleGlobalPlay,
    selectChannel,
    toggleChannelPlay,
    togglePlay,
    toggleNote,
    cycleStep,
    clearNotes,
    createVariation,
    playKeyboardNote,
    outputs,
    selectedOutputId,
    enableMidi,
    log,
    updateChannelBpm,
    cycleMidiChannel,
    updatePattern,
    updateNoteLength,
    updateArpeggioLength,
    updateQuantisation,
    updateLoopLength,
    synthEnabled,
    toggleSynth
  }
}
