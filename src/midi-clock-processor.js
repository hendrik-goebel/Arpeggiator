class MidiClockProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = sampleRate; // provided by the worklet global scope
    this.bpm = 120;
    this.samplesPerTick = this.sampleRate * 60 / this.bpm;
    this.samplesUntilNext = this.samplesPerTick;
    this.running = false;
    this.pendingBpm = null;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d && d.type === 'init') {
        this.sampleRate = d.sampleRate || this.sampleRate;
        // allow main thread to provide default BPM from config
        if (typeof d.bpm === 'number') this.bpm = d.bpm;
      } else if (d && d.type === 'setBpm') {
        this.pendingBpm = d.bpm;
      } else if (d && d.type === 'start') {
        this.running = true;
        this.samplesPerTick = this.sampleRate * 60 / (d.bpm || this.bpm);
        this.samplesUntilNext = (typeof d.startInSamples === 'number') ? d.startInSamples : this.samplesPerTick;
        this.bpm = d.bpm || this.bpm;
        this.pendingBpm = null;
      } else if (d && d.type === 'stop') {
        this.running = false;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const frames = (outputs && outputs[0] && outputs[0][0]) ? outputs[0][0].length : 128;
    if (!this.running) return true;
    let f = frames;
    while (f-- > 0) {
      this.samplesUntilNext -= 1;
      if (this.samplesUntilNext <= 0) {
        // emit a tick to main thread
        this.port.postMessage({ type: 'tick' });
        // apply pending bpm change after tick
        if (this.pendingBpm != null) {
          this.bpm = this.pendingBpm;
          this.pendingBpm = null;
        }
        this.samplesPerTick = this.sampleRate * 60 / this.bpm;
        this.samplesUntilNext += this.samplesPerTick;
      }
    }
    return true;
  }
}

registerProcessor('midi-clock-processor', MidiClockProcessor);
