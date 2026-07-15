export const DEFAULT_BPM = 120
export const DEFAULT_NOTE_LENGTH = 200
export const DEFAULT_QUANT = 4
export const CHANNEL_COUNT = 8
export const STEP_COUNT = 16
export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
export const OCTAVE_OFFSET = -1
export const DEFAULT_STEPS = [60,64,67,60,64,67,60,64,60,64,67,60,64,67,60,64]
export const DEFAULT_NOTES = [60,64,67]
export const DEFAULT_BASE = 60
export const KEYBOARD_OCTAVE_SIZE = 12

// German keyboard layout: white keys span C through D in the next octave,
// while the black keys continue the chromatic sequence between them.
export const KEYBOARD_NOTE_OFFSETS: Record<string, number> = {
  a: 0,  w: 1,
  s: 2,  e: 3,
  d: 4,
  f: 5,  r: 6,
  g: 7,  t: 8,
  h: 9,  z: 10,
  j: 11,
  k: 12, u: 13,
  l: 14, i: 15,
  o: 16,
  p: 17
}
