<template>
  <div class="container">
    <h1>Web Arpeggiator (Vue 3 + TS)</h1>

    <ChannelsBar :channels="channels" :currentIndex="currentIndex" :syncActive="syncChannels" @select="selectChannel" @toggle="toggleChannelPlay" @toggle-sync="setSyncChannels(!syncChannels)" />

    <div class="global-controls">
      <label>Global Tempo (BPM):
        <input type="number" :value="globalBpm" @input="(e)=> setGlobalBpm(+e.target.value)" :disabled="!syncChannels" min="20" max="300" />
      </label>
      <button @click="toggleGlobalPlay">{{ globalPlaying ? 'Stop All' : 'Start All' }}</button>
    </div>

    <ArpeggiatorPanel :channel="currentChannel" :outputs="outputs" :selectedOutputId="selectedOutputId" :log="log"
      @toggle-note="toggleNote" @cycle-step="cycleStep" @toggle-play="togglePlay" @enable-midi="enableMidi"
      @select-output="(id)=>{ selectedOutputId = id }" @update-bpm="updateBpm" @update-pattern="updatePattern" @update-noteLength="updateNoteLength" @clear-notes="clearNotes" @update-loop-length="updateLoopLength" />
  </div>
</template>

<script setup lang="ts">
import ChannelsBar from './components/ChannelsBar.vue'
import ArpeggiatorPanel from './components/ArpeggiatorPanel.vue'
import { useChannels } from './useChannels'

const {
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
  clearNotes,
  outputs,
  selectedOutputId,
  enableMidi,
  log,
  updateBpm,
  updatePattern,
  updateNoteLength,
  updateLoopLength
} = useChannels()
</script>

<style scoped>
.container { padding: 1rem; font-family: system-ui, sans-serif }
</style>
