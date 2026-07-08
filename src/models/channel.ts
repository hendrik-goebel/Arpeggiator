import { reactive, Ref } from 'vue'
import { createArpeggiator, Pattern } from './arpeggiator'
import { sendNote } from '../midi'
import { DEFAULT_NOTES, DEFAULT_STEPS, DEFAULT_BASE, DEFAULT_BPM, DEFAULT_NOTE_LENGTH } from '../config'

export interface Channel {
  id: number
  name: string
  bpm: number
  pattern: Pattern | any
  noteLength: number
  playing: boolean
  notes: number[]
  steps: number[]
  base: number
  arpeggiator: ReturnType<typeof createArpeggiator> | any
  color: string
  active: boolean
}

export function createChannel(index: number, selectedOutputId: Ref<string | null>, log: Ref<string[]>) : Channel {
  const palette = ['#f28b82','#fbbc04','#fff475','#ccff90','#a7ffeb','#cbf0f8','#aecbfa','#d7aefb']
  const channel = reactive({
    id: index,
    name: `Ch ${index+1}`,
    bpm: DEFAULT_BPM,
    pattern: 'up' as any,
    noteLength: DEFAULT_NOTE_LENGTH,
    playing: false,
    notes: DEFAULT_NOTES.slice() as number[],
    steps: DEFAULT_STEPS.slice() as number[],
    base: DEFAULT_BASE,
    arpeggiator: null as any,
    color: palette[index % palette.length],
    active: false
  }) as Channel

  channel.arpeggiator = createArpeggiator((note, vel, len) => {
    const outputId = selectedOutputId.value
    if (outputId) sendNote(outputId, note, vel, len)
    log.value.unshift(`${new Date().toISOString()} ${channel.name} NOTE ${note} vel=${vel} len=${len}`)
    // flash the channel button while the note sounds
    channel.active = true
    const timeoutMs = Math.max(len || channel.noteLength || 120, 120)
    setTimeout(() => { channel.active = false }, timeoutMs)
  })

  channel.arpeggiator.setBpm(channel.bpm)
  channel.arpeggiator.setPattern(channel.pattern)
  channel.arpeggiator.setNoteLength(channel.noteLength)
  channel.arpeggiator.setNotes(channel.notes)
  channel.arpeggiator.setSteps(channel.steps)
  return channel
}
