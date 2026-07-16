export const MIDI = {
  // MIDI status bytes for channel 0
  NOTE_ON: 0x90,
  NOTE_OFF: 0x80,
  // Mask for 7-bit value fields (note number, velocity)
  VELOCITY_MAX: 0x7f,
  DEFAULT_OFF_VELOCITY: 0x40
}

export function noteOnStatus(channel: number) {
  return MIDI.NOTE_ON | (Math.max(0, Math.min(15, Math.floor(channel))) & 0x0f)
}

export function noteOffStatus(channel: number) {
  return MIDI.NOTE_OFF | (Math.max(0, Math.min(15, Math.floor(channel))) & 0x0f)
}
