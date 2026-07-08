import { ref, computed, watch } from 'vue'
import { initMidi, listOutputs, selectOutput } from './midi/midi'
import { createChannel } from './models/channel'
import { CHANNEL_COUNT, DEFAULT_BPM } from './config'

export function useChannels() {
  const log = ref<string[]>([])
  const outputs = ref<{id:string,name:string}[]>([])
  const selectedOutputId = ref<string | null>(null)

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
      channels.forEach(channel => { if (channel.playing) { channel.arpeggiator.stop(); channel.playing = false } })
      globalPlaying.value = false
    } else {
      // start all channels
      channels.forEach(channel => { if (!channel.playing) { channel.arpeggiator.start(); channel.playing = true } })
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
      channel.arpeggiator.stop(); channel.playing = false
    } else {
      // if any other channel is playing, align this channel's first note to them
      const referenceChannel = channels.find(c => c.playing && c !== channel)
      if (referenceChannel && typeof channel.arpeggiator.startAlignedTo === 'function') {
        channel.arpeggiator.startAlignedTo(referenceChannel.arpeggiator)
      } else {
        channel.arpeggiator.start()
      }
      channel.playing = true
    }
  }

  function togglePlay(){
    const channel = currentChannel.value
    if (channel.playing) { channel.arpeggiator.stop(); channel.playing = false }
    else {
      const referenceChannel = channels.find(c => c.playing && c !== channel)
      if (referenceChannel && typeof channel.arpeggiator.startAlignedTo === 'function') {
        channel.arpeggiator.startAlignedTo(referenceChannel.arpeggiator)
      } else {
        channel.arpeggiator.start()
      }
      channel.playing = true
    }
  }

  function toggleNote(note:number){
    const channel = currentChannel.value
    const noteIndex = channel.notes.indexOf(note)
    if (noteIndex === -1) {
      channel.notes = [...channel.notes, note].sort((a,b)=>a-b)
    } else {
      channel.notes = channel.notes.filter((x:any)=>x!==note)
      const maxIndex = channel.notes.length - 1
      channel.steps = channel.steps.map((stepValue:any)=> (stepValue > maxIndex ? -1 : stepValue))
    }
    channel.arpeggiator.setNotes(channel.notes)
  }

  function cycleStep(stepIndex:number){
    const channel = currentChannel.value
    const noteCount = channel.notes.length
    let value = channel.steps[stepIndex]
    if (noteCount === 0) { channel.steps[stepIndex] = -1; channel.arpeggiator.setSteps(channel.steps); return }
    if (value == null) value = -1
    value = value + 1
    if (value >= noteCount) value = -1
    const newSteps = channel.steps.slice()
    newSteps[stepIndex] = value
    channel.steps = newSteps
    channel.arpeggiator.setSteps(channel.steps)
  }

  async function enableMidi(){
    await initMidi()
    outputs.value = listOutputs()
    if (outputs.value.length) selectedOutputId.value = outputs.value[0].id
  }

  watch(selectedOutputId, (id) => { if (id) selectOutput(id) })

  function updateBpm(bpm:number){
    if (syncChannels.value) {
      // update the global BPM and apply to all running clocks; do not change channel BPM fields
      globalBpm.value = bpm
      channels.forEach(channel => { channel.arpeggiator.setBpm(bpm) })
    } else {
      currentChannel.value.arpeggiator.setBpm(bpm); currentChannel.value.bpm = bpm
    }
  }
  function updatePattern(pattern:any){ currentChannel.value.arpeggiator.setPattern(pattern); currentChannel.value.pattern = pattern }
  function updateNoteLength(length:number){ currentChannel.value.arpeggiator.setNoteLength(length); currentChannel.value.noteLength = length }

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
    outputs,
    selectedOutputId,
    enableMidi,
    log,
    updateBpm,
    updatePattern,
    updateNoteLength
  }
}
