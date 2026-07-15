<script setup lang="ts">
import { computed } from 'vue'
import StepsGrid from './StepsGrid.vue'
import LogPanel from './LogPanel.vue'
import { DEFAULT_BASE, KEYBOARD_OCTAVE_SIZE } from '../config'
const props = defineProps<{ channel: any, outputs: any[], selectedOutputId: string | null, log: string[] }>()

const base = computed(() => props.channel?.base ?? DEFAULT_BASE)
const fullNotes = computed(() => Array.from({ length: KEYBOARD_OCTAVE_SIZE }, (_, i) => base.value + i))
</script>

<template>
  <div class="arpeggiator-panel">
    <h2>{{ channel.name }} Arpeggiator</h2>
    <div class="controls">
      <label>Tempo (BPM): <input type="number" :value="channel.bpm" @input="$emit('update-bpm', +$event.target.value)" min="20" max="300" /></label>
      <label>Pattern:
        <select :value="channel.pattern" @change="$emit('update-pattern', $event.target.value)">
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="updown">UpDown</option>
          <option value="random">Random</option>
        </select>
      </label>
      <label>Quantisation:
        <select :value="channel.quantisation" @change="$emit('update-quant', +$event.target.value)">
          <option v-for="q in [1,2,3,4,5,8,16,32,64]" :key="q" :value="q">{{ q }}</option>
        </select>
      </label>
      <label>Note length (ms): <input type="number" :value="channel.noteLength" @input="$emit('update-noteLength', +$event.target.value)" min="50" max="2000" /></label>
      <label>Loop length:
        <input type="number" :value="channel.loopLength" @input="$emit('update-loop-length', +$event.target.value)" min="1" max="32" />
      </label>
      <button @click="$emit('toggle-play')">{{ channel.playing ? 'Stop' : 'Play' }}</button>
      <button @click="$emit('enable-midi')">Enable MIDI</button>
      <button @click="$emit('clear-notes')">Clear All</button>
      <label>Output:
        <select :value="selectedOutputId" @change="$emit('select-output', $event.target.value)">
          <option v-for="o in outputs" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
      </label>
    </div>

    <StepsGrid :notes="fullNotes" :steps="channel.steps" :base="channel.base" :play-step="channel.playStep" :step-count="channel.loopLength" @toggle-note="$emit('toggle-note', $event)" @toggle-step="$emit('cycle-step', $event)" />

    <LogPanel :lines="log" />
  </div>
</template>

<style scoped>
.arpeggiator-panel { border-top:1px solid #eee; padding-top:1rem }
.controls { display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap }
</style>
