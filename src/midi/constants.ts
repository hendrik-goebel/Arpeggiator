export const MIDI = {
  // MIDI status bytes (channel 0)
  NOTE_ON: 0x90,
  NOTE_OFF: 0x80,
  // Mask for 7-bit value fields (note number, velocity)
  VELOCITY_MAX: 0x7f,
  DEFAULT_OFF_VELOCITY: 0x40
}
