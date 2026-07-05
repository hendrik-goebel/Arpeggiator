import { reactive, ref, computed, watch } from 'vue'
import { createArpeggiator } from './arpeggiator'
import { initMidi, listOutputs, selectOutput, sendNote } from './midi'
import { CHANNEL_COUNT, DEFAULT_STEPS, DEFAULT_NOTES, DEFAULT_BASE, DEFAULT_BPM, DEFAULT_NOTE_LENGTH } from './config'

export function useChannels() {
  const log = ref<string[]>([])
  const outputs = ref<{id:string,name:string}[]>([])
  const selectedOutputId = ref<string | null>(null)

  function makeChannel(i:number) {
    const palette = ['#f28b82','#fbbc04','#fff475','#ccff90','#a7ffeb','#cbf0f8','#aecbfa','#d7aefb']
    const ch = reactive({
      id: i,
      name: `Ch ${i+1}`,
      bpm: DEFAULT_BPM,
      pattern: 'up' as any,
      noteLength: DEFAULT_NOTE_LENGTH,
      playing: false,
      notes: DEFAULT_NOTES.slice() as number[],
      steps: DEFAULT_STEPS.slice() as number[],
      base: DEFAULT_BASE,
      ar: null as any,
      color: palette[i % palette.length],
      active: false
    })

    ch.ar = createArpeggiator((note, vel, len) => {
      const outId = selectedOutputId.value
      if (outId) sendNote(outId, note, vel, len)
      log.value.unshift(`${new Date().toISOString()} ${ch.name} NOTE ${note} vel=${vel} len=${len}`)
      // flash the channel button while the note sounds
      ch.active = true
      const timeoutMs = Math.max(len || ch.noteLength || 120, 120)
      setTimeout(() => { ch.active = false }, timeoutMs)
    })

    ch.ar.setBpm(ch.bpm)
    ch.ar.setPattern(ch.pattern)
    ch.ar.setNoteLength(ch.noteLength)
    ch.ar.setNotes(ch.notes)
    ch.ar.setSteps(ch.steps)
    return ch
  }

  const channels = Array.from({length: CHANNEL_COUNT}, (_,i)=> makeChannel(i))
  const currentIndex = ref(0)
  const currentChannel = computed(() => channels[currentIndex.value])

  const syncChannels = ref(false)
  function setSyncChannels(v:boolean){
    // Toggle sync mode without changing any channel play states.
    // When enabling, align all channel BPMs to master (channel 1, index 0) but do not start/stop any arpeggiators.
    syncChannels.value = v
    if (v) {
      const master = channels[0]
      channels.forEach(ch => {
        ch.bpm = master.bpm
        ch.ar.setBpm(master.bpm)
      })
    }
  }

  function selectChannel(i:number){ currentIndex.value = i }
  function toggleChannelPlay(i:number){
    const ch = channels[i]
    if (ch.playing) {
      if (syncChannels.value) {
        // stop all channels when any channel is stopped in sync mode
        channels.forEach(c => { if (c.playing) { c.ar.stop(); c.playing = false } })
      } else {
        ch.ar.stop(); ch.playing = false
      }
    } else {
      if (syncChannels.value) {
        // start all channels, using master (channel 0) BPM as the clock source
        const master = channels[0]
        channels.forEach(c => {
          c.bpm = master.bpm
          c.ar.setBpm(master.bpm)
          if (!c.playing) { c.ar.start(); c.playing = true }
        })
      } else {
        ch.ar.start(); ch.playing = true
      }
    }
  }

  function togglePlay(){
    const ch = currentChannel.value
    if (ch.playing) {
      if (syncChannels.value) {
        channels.forEach(c => { if (c.playing) { c.ar.stop(); c.playing = false } })
      } else {
        ch.ar.stop(); ch.playing = false
      }
    } else {
      if (syncChannels.value) {
        // make channel 0 the master and start all channels without changing master selection
        const master = channels[0]
        channels.forEach(c => {
          c.bpm = master.bpm
          c.ar.setBpm(master.bpm)
          if (!c.playing) { c.ar.start(); c.playing = true }
        })
      } else {
        ch.ar.start(); ch.playing = true
      }
    }
  }

  function toggleNote(n:number){
    const ch = currentChannel.value
    const idx = ch.notes.indexOf(n)
    if (idx === -1) {
      ch.notes = [...ch.notes, n].sort((a,b)=>a-b)
    } else {
      ch.notes = ch.notes.filter((x:any)=>x!==n)
      const maxIndex = ch.notes.length - 1
      ch.steps = ch.steps.map((s:any)=> (s > maxIndex ? -1 : s))
    }
    ch.ar.setNotes(ch.notes)
  }

  function cycleStep(i:number){
    const ch = currentChannel.value
    const noteCount = ch.notes.length
    let v = ch.steps[i]
    if (noteCount === 0) { ch.steps[i] = -1; ch.ar.setSteps(ch.steps); return }
    if (v == null) v = -1
    v = v + 1
    if (v >= noteCount) v = -1
    const newSteps = ch.steps.slice()
    newSteps[i] = v
    ch.steps = newSteps
    ch.ar.setSteps(ch.steps)
  }

  async function enableMidi(){
    await initMidi()
    outputs.value = listOutputs()
    if (outputs.value.length) selectedOutputId.value = outputs.value[0].id
  }

  watch(selectedOutputId, (id) => { if (id) selectOutput(id) })

  function updateBpm(v:number){
    if (syncChannels.value) {
      channels.forEach(c => { c.bpm = v; c.ar.setBpm(v) })
    } else {
      currentChannel.value.ar.setBpm(v); currentChannel.value.bpm = v
    }
  }
  function updatePattern(v:any){ currentChannel.value.ar.setPattern(v); currentChannel.value.pattern = v }
  function updateNoteLength(v:number){ currentChannel.value.ar.setNoteLength(v); currentChannel.value.noteLength = v }

  return {
    channels,
    currentIndex,
    currentChannel,
    syncChannels,
    setSyncChannels,
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
