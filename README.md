Web Arpeggiator (Vue 3 + TypeScript)

Quick start:

1. npm install
2. npm run dev
3. Open the app in Chrome/Edge (Web MIDI supported). Click "Enable MIDI" and select an output.

MIDI clock output sends standard 24 PPQN realtime clock messages to the selected clock output
while Global Play is running. MIDI clock input measures incoming `0xF8` pulses, updates the
global tempo, and follows incoming Start/Continue/Stop transport messages.

Notes:
- Web MIDI requires a user gesture to grant access. Use the Enable MIDI button.
- To route MIDI to other apps, use a virtual MIDI port (IAC on macOS, loopMIDI on Windows).
- With Caps Lock active, play the current channel from the German keyboard layout: `A S D F G H J K L` are white keys and `W E R T Z U I O P` are black keys.
