<template>
  <main class="instrument">

    <section class="global-controls module">
      <div class="module-heading">
        <h2> </h2>
      </div>
      <div class="master-control">
        <label>GLOBAL TEMPO
          <span class="input-wrap"><input type="number" :value="globalBpm" @input="(e)=> setGlobalBpm(+e.target.value)" min="20" max="300" /><small>BPM</small></span>
        </label>
        <button class="master-play" @click="toggleGlobalPlay">{{ globalPlaying ? 'Stop All' : 'Start All' }}</button>
        <label class="clock-control">CLOCK OUT
          <select :value="clockOutputId" @change="setClockOutput($event.target.value || null)">
            <option value="">Off</option>
            <option v-for="output in clockOutputs" :key="output.id" :value="output.id">{{ output.name }}</option>
          </select>
        </label>
        <label class="clock-control">CLOCK IN
          <select :value="clockInputId" @change="setClockInput($event.target.value || null)">
            <option value="">Off</option>
            <option v-for="input in clockInputs" :key="input.id" :value="input.id">{{ input.name }}</option>
          </select>
        </label>
      </div>
    </section>


    <section class="module channel-module">
      <ChannelsBar :channels="channels" :currentIndex="currentIndex" @select="selectChannel" @toggle="toggleChannelPlay" @variation="createVariation" @update-key="updateChannelKey" @update-midi-channel="updateMidiChannel" @update-bpm="updateChannelBpm" />
    </section>


    <ArpeggiatorPanel :channel="currentChannel" :outputs="outputs" :selectedOutputId="selectedOutputId" :log="log"
      :global-key="globalKey"
      @toggle-note="toggleNote" @cycle-step="cycleStep" @toggle-play="togglePlay" @enable-midi="enableMidi"
      @select-output="(id)=>{ selectedOutputId = id }" @update-pattern="updatePattern" @update-noteLength="updateNoteLength" @update-octave="updateArpeggioOctave" @clear-notes="clearNotes" @update-loop-length="updateLoopLength" @update-quant="updateQuantisation"
      @update-arpeggio-length="updateArpeggioLength" @update-global-key="updateGlobalKey" @global-variation="createGlobalVariation" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import ChannelsBar from './components/ChannelsBar.vue'
import ArpeggiatorPanel from './components/ArpeggiatorPanel.vue'
import { useChannels } from './useChannels'

const {
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
  createGlobalVariation,
  selectChannel,
  toggleChannelPlay,
  createVariation,
  updateMidiChannel,
  togglePlay,
  toggleNote,
  cycleStep,
  clearNotes,
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
  updatePattern,
  updateChannelKey,
  updateNoteLength,
  updateLoopLength,
  updateArpeggioLength,
  updateQuantisation,
  updateArpeggioOctave
} = useChannels()

function handleKeydown(event: KeyboardEvent) {
  if (event.repeat) return
  if (!event.getModifierState('CapsLock')) return

  const target = event.target
  if (target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName))) {
    return
  }

  if (playKeyboardNote(event.key)) event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  void enableMidi().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    log.value.unshift(`${new Date().toISOString()} MIDI unavailable: ${message}`)
  })
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.instrument {
  width: min(1180px, calc(100% - 2rem));
  margin: 2rem auto;
  color: var(--text);
}

.instrument-header, .module-heading, .master-control {
  display: flex;
  align-items: center;
}

.instrument-header {
  justify-content: space-between;
  margin: 0 0 1.25rem;
  padding: 0 .25rem;
}

.eyebrow, h1, h2 { margin: 0; }
.eyebrow { color: var(--text-dim); font-size: .65rem; font-weight: 800; letter-spacing: .18em; }
h1 { margin-top: .2rem; color: #f3fbff; font-size: clamp(1.7rem, 4vw, 2.5rem); letter-spacing: .08em; }
h1 span { color: var(--teal); font-weight: 400; }
.status-light { color: var(--text-muted); font-size: .65rem; font-weight: 700; letter-spacing: .12em; }
.status-light i { display: inline-block; width: .5rem; height: .5rem; margin-right: .4rem; border-radius: 50%; background: var(--teal); box-shadow: 0 0 12px var(--teal); }

.module {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: linear-gradient(145deg, var(--bg-raised), var(--bg-panel));
  box-shadow: 0 18px 40px rgba(0, 0, 0, .22), inset 0 1px rgba(255, 255, 255, .035);
}

.channel-module { padding: 1rem; margin-bottom: 1rem; }
.module-heading { gap: .7rem; margin-bottom: .85rem; }
.module-index { color: var(--teal); font-family: monospace; font-size: .7rem; }
h2 { color: var(--text-muted); font-size: .7rem; letter-spacing: .16em; }

.global-controls {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}
.global-controls .module-heading { margin: 0; }
.master-control { gap: 1.2rem; }
.master-control label { color: var(--text-muted); font-size: .62rem; font-weight: 800; letter-spacing: .13em; }
.input-wrap { display: flex; align-items: center; margin-top: .3rem; }
.master-control input {
  width: 4rem; padding: .35rem .1rem; border: 0; border-bottom: 1px solid var(--line-strong);
  background: transparent; color: #f3fbff; font: 700 1.1rem ui-monospace, monospace; outline: 0;
}
.master-control small { margin-left: .4rem; color: var(--teal); font-size: .58rem; }
.master-play {
  border: 1px solid var(--teal); border-radius: 5px; padding: .7rem 1rem; background: var(--teal-deep);
  color: var(--teal-soft); font-size: .65rem; font-weight: 800; letter-spacing: .1em; cursor: pointer;
}
.clock-control { display: grid; gap: .3rem; color: var(--text-muted); font-size: .55rem; font-weight: 800; letter-spacing: .1em; }
.clock-control select { max-width: 10rem; border: 1px solid var(--line-strong); border-radius: 4px; padding: .35rem; background: var(--bg-control); color: var(--text); font-size: .65rem; }
.master-stop {
  border: 1px solid var(--coral); border-radius: 5px; padding: .7rem 1rem; background: var(--coral-deep);
  color: var(--coral-soft); font-size: .65rem; font-weight: 800; letter-spacing: .1em; cursor: pointer;
}
@media (max-width: 650px) {
  .instrument { width: min(100% - 1rem, 1180px); margin-top: 1rem; }
  .instrument-header, .global-controls { align-items: flex-start; flex-direction: column; gap: 1rem; }
  .global-controls { padding: 1rem; }
}
</style>
