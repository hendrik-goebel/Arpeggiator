import { ref, computed, watch } from 'vue'
import { initMidi, listOutputs, listInputs, getOutput, getInput, selectOutput, sendNote, enableSineSynth, disableSineSynth, SINE_OUTPUT_ID } from './midi/midi'
import { createMidiClockInput, createMidiClockOutput } from './midi/clockSync'
import { createChannel } from './models/channel'
import { isSustainedStep, Pattern, stepNotes, StepValue } from './models/arpeggiator'
import { CHANNEL_COUNT, CHORD_NOTE_CHANGE_PROBABILITY, DEFAULT_BASE, DEFAULT_BPM, KEYBOARD_NOTE_OFFSETS, MAJOR_SCALE_OFFSETS, CIRCLE_OF_FIFTHS_KEYS, STEP_COUNT, NOTE_LENGTH_OPTIONS, CircleOfFifthsKey, noteLengthToMilliseconds } from './config'
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
  const clockOutputs = ref<{id:string,name:string}[]>([])
  const clockInputs = ref<{id:string,name:string}[]>([])
  const clockOutputId = ref<string | null>(null)
  const clockInputId = ref<string | null>(null)
  const midiClockOutputEnabled = ref(false)
  const midiClockInputEnabled = ref(false)
  const midiClockOutput = createMidiClockOutput(globalBpm.value)
  const midiClockInput = createMidiClockInput({
    onTempo: (bpm) => setGlobalBpm(Math.round(bpm * 10) / 10),
    onStart: () => { if (!globalPlaying.value) toggleGlobalPlay() },
    onStop: () => { if (globalPlaying.value) stopAll() }
  })

  function setGlobalBpm(bpm:number){
    globalBpm.value = bpm
    channels.forEach(channel => {
      channel.bpm = bpm + channel.tempoOffset
      channel.arpeggiator.setBpm(channel.bpm)
    })
    midiClockOutput.setBpm(bpm)
  }

  function updateGlobalKey(key: string) {
    if (!CIRCLE_OF_FIFTHS_KEYS.some(candidate => candidate.name === key)) return
    globalKey.value = key as CircleOfFifthsKey
    channels.forEach(channel => { channel.key = globalKey.value })
  }

  function syncMidiClockTransport() {
    if (!midiClockOutputEnabled.value) return
    if (channels.some(channel => channel.playing)) midiClockOutput.start()
    else midiClockOutput.stop()
  }

  function toggleGlobalPlay(){
    if (globalPlaying.value) {
      // stop all channels
      channels.forEach(channel => { if (channel.playing) channel.arpeggiator.stop() })
      globalPlaying.value = false
      midiClockOutput.stop()
    } else {
      // start all channels
      channels.forEach(channel => { if (!channel.playing) channel.arpeggiator.start() })
      globalPlaying.value = true
      syncMidiClockTransport()
    }
  }

  function stopAll() {
    channels.forEach(channel => channel.arpeggiator.stop())
    globalPlaying.value = false
    midiClockOutput.stop()
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
    syncMidiClockTransport()
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
      syncMidiClockTransport()
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
      channel.steps = channel.steps.map((stepValue): StepValue => {
        if (stepValue === note) return -1
        const remaining = stepNotes(stepValue).filter(stepNote => stepNote !== note)
        if (remaining.length === 0) return -1
        if (isSustainedStep(stepValue)) return { notes: remaining.length === 1 ? remaining[0] : remaining, duration: stepValue.duration }
        return remaining.length === 1 ? remaining[0] : remaining
      })
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
      const current = channel.steps[stepIndex]
      // if current is a MIDI note, find its index among channel.notes
      let idx = typeof current === 'number' ? channel.notes.indexOf(current) : -1
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

    const { step, note, add = false } = payload
    const newSteps = channel.steps.slice()
    if (add) {
      const current = newSteps[step]
      let sustainSourceIndex = -1
      for (let sourceStep = step - 1; sourceStep >= 0; sourceStep--) {
        const source = newSteps[sourceStep]
        if (isSustainedStep(source) &&
            sourceStep + source.duration >= step &&
            stepNotes(source).includes(note)) {
          sustainSourceIndex = sourceStep
          break
        }
      }
      const previous = newSteps[step - 1]
      const extendsAdjacentNote = current === -1 &&
        (sustainSourceIndex >= 0 || stepNotes(previous).includes(note))

      if (extendsAdjacentNote) {
        if (sustainSourceIndex >= 0) {
          const source = newSteps[sustainSourceIndex]
          if (isSustainedStep(source)) {
            source.duration = Math.max(source.duration, step - sustainSourceIndex + 1)
          }
        } else if (isSustainedStep(previous)) {
          previous.duration = Math.max(previous.duration, 2)
        } else {
          newSteps[step - 1] = { notes: previous, duration: 2 }
        }
      } else {
        const chord = Array.isArray(current) ? current.slice() : (typeof current === 'number' && current >= 0 ? [current] : [])
        const noteIndex = chord.indexOf(note)
        if (noteIndex >= 0) chord.splice(noteIndex, 1)
        else chord.push(note)
        chord.sort((a, b) => a - b)
        newSteps[step] = chord.length === 0 ? -1 : chord.length === 1 ? chord[0] : chord
        if (chord.length > 0 && !channel.notes.includes(note)) {
          channel.notes = [...channel.notes, note].sort((a, b) => a - b)
        }
      }
    } else if (newSteps[step] === note) newSteps[step] = -1
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
      ? previousSteps.map(step => (typeof step === 'number' && step >= 0) || (Array.isArray(step) && step.length > 0))
      : Array.from({ length: channel.loopLength }, () => true)
    let notePosition = 0
    const variedSteps = activeSteps.map((isActive, stepIndex) => {
      if (!isActive) return -1
      const previousStep = previousSteps[stepIndex]
      if (Array.isArray(previousStep)) {
        const variedChord: number[] = []
        previousStep.forEach(note => {
          const shouldChange = !keyPitches.includes(note) || Math.random() < CHORD_NOTE_CHANGE_PROBABILITY
          if (!shouldChange) {
            variedChord.push(note)
            return
          }

          const candidates = keyPitches.filter(candidate => candidate !== note && !variedChord.includes(candidate))
          variedChord.push(candidates.length
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : note)
        })
        return [...new Set(variedChord)].sort((a, b) => a - b)
      }

      const note = notes[notePosition % notes.length]
      notePosition++
      return note
    })
    channel.steps = variedSteps
    const chordNotes = variedSteps.flatMap(step => Array.isArray(step) ? step : [])
    channel.notes = [...new Set([...channel.notes, ...chordNotes])].sort((a, b) => a - b)
    channel.arpeggiator.setNotes(channel.notes)
    channel.arpeggiator.setSteps(channel.steps)
  }

  function createGlobalVariation() {
    channels.forEach((_, index) => createVariation(index))
  }

  function initializeRandomState() {
    const patterns: Pattern[] = ['up', 'down', 'updown', 'random']
    const quantisations = [3, 4, 6, 8, 16]
    const randomBpm = 80 + Math.floor(Math.random() * 51)
    const randomKey = CIRCLE_OF_FIFTHS_KEYS[Math.floor(Math.random() * CIRCLE_OF_FIFTHS_KEYS.length)]

    setGlobalBpm(randomBpm)
    updateGlobalKey(randomKey.name)
    channels.forEach(channel => {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)]
      const quantisation = quantisations[Math.floor(Math.random() * quantisations.length)]
      const noteLength = NOTE_LENGTH_OPTIONS[Math.floor(Math.random() * NOTE_LENGTH_OPTIONS.length)]
      channel.pattern = pattern
      channel.quantisation = quantisation
      channel.noteLength = noteLength
      channel.arpeggiator.setPattern(pattern)
      channel.arpeggiator.setSubdivision(quantisation)
      channel.arpeggiator.setNoteLength(noteLength)
    })
    createGlobalVariation()
  }

  function playKeyboardNote(key: string) {
    const offset = KEYBOARD_NOTE_OFFSETS[key.toLowerCase()]
    if (offset === undefined) return false

    const channel = currentChannel.value
    const note = channel.base + offset
    const outputId = selectedOutputId.value
    const noteLengthMilliseconds = noteLengthToMilliseconds(channel.noteLength, channel.bpm)
    if (outputId) sendNote(outputId, note, MIDI.VELOCITY_MAX, noteLengthMilliseconds, channel.midiChannel - 1)

    channel.active = true
    log.value.unshift(`${new Date().toISOString()} ${channel.name} NOTE ${note} vel=${MIDI.VELOCITY_MAX} len=${noteLengthMilliseconds}`)
    setTimeout(() => { channel.active = false }, Math.max(noteLengthMilliseconds, 120))
    return true
  }

  async function enableMidi(){
    outputs.value = listOutputs()
    await initMidi()
    outputs.value = listOutputs()
    clockOutputs.value = outputs.value.filter(output => output.id !== SINE_OUTPUT_ID)
    clockInputs.value = listInputs()
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

  function setClockOutput(id: string | null) {
    clockOutputId.value = id
    midiClockOutputEnabled.value = id !== null
    midiClockOutput.setOutput(getOutput(id))
    if (id === null) midiClockOutput.stop()
    else if (globalPlaying.value) midiClockOutput.start()
  }

  function setClockInput(id: string | null) {
    clockInputId.value = id
    midiClockInputEnabled.value = id !== null
    midiClockInput.setInput(getInput(id))
  }

  initializeRandomState()

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
    clockOutputs,
    clockInputs,
    clockOutputId,
    clockInputId,
    setClockOutput,
    setClockInput,
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
