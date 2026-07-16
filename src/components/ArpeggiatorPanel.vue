<script setup lang="ts">
import { computed } from 'vue'
import StepsGrid from './StepsGrid.vue'
import LogPanel from './LogPanel.vue'
import { DEFAULT_BASE, KEYBOARD_OCTAVE_SIZE } from '../config'
const props = defineProps<{ channel: any, outputs: any[], selectedOutputId: string | null, log: string[], synthEnabled: boolean }>()

const base = computed(() => props.channel?.base ?? DEFAULT_BASE)
const fullNotes = computed(() => Array.from({ length: KEYBOARD_OCTAVE_SIZE }, (_, i) => base.value + i))
</script>

<template>
  <section class="arpeggiator-panel">
    <div class="panel-title">
      <div><p>ACTIVE VOICE</p><h2>{{ channel.name }} ARPEGGIATOR</h2></div>
      <button class="play-button" :class="{ playing: channel.playing }" @click="$emit('toggle-play')"><span></span>{{ channel.playing ? 'Stop' : 'Play' }}</button>
    </div>
    <div class="controls">
      <div class="control-column">
        <h3>PERFORMANCE</h3>
        <label>Tempo <span class="value-input"><input type="number" :value="channel.bpm" @input="$emit('update-bpm', +$event.target.value)" min="20" max="300" /><small>BPM</small></span></label>
        <label>Note length <span class="value-input"><input type="number" :value="channel.noteLength" @input="$emit('update-noteLength', +$event.target.value)" min="50" max="2000" /><small>MS</small></span></label>
      </div>
      <div class="control-column">
        <h3>SEQUENCE</h3>
        <label>Pattern <select :value="channel.pattern" @change="$emit('update-pattern', $event.target.value)"><option value="up">Up</option><option value="down">Down</option><option value="updown">UpDown</option><option value="random">Random</option></select></label>
        <label>Quantisation <select :value="channel.quantisation" @change="$emit('update-quant', +$event.target.value)"><option v-for="q in [1,2,3,4,5,8,16,32,64]" :key="q" :value="q">{{ q }}</option></select></label>
        <label>Loop length <span class="value-input"><input type="number" :value="channel.loopLength" @input="$emit('update-loop-length', +$event.target.value)" min="1" max="32" /><small>STEPS</small></span></label>
      </div>
      <div class="control-column routing">
        <h3>ROUTING</h3>
        <label>Output <select :value="selectedOutputId" @change="$emit('select-output', $event.target.value)"><option v-for="o in outputs" :key="o.id" :value="o.id">{{ o.name }}</option></select></label>
        <div class="utility-buttons">
          <button @click="$emit('enable-midi')">Enable MIDI</button>
          <button :class="{ active: props.synthEnabled }" @click="$emit('toggle-synth')">Synth {{ props.synthEnabled ? 'On' : 'Off' }}</button>
          <button class="clear-button" @click="$emit('clear-notes')">Clear grid</button>
        </div>
      </div>
    </div>
    <div class="sequencer">
      <div class="section-label">STEP SEQUENCER <span>CLICK CELLS TO PROGRAM</span></div>
      <StepsGrid :notes="fullNotes" :steps="channel.steps" :base="channel.base" :play-step="channel.playStep" :step-count="channel.loopLength" @toggle-note="$emit('toggle-note', $event)" @toggle-step="$emit('cycle-step', $event)" />
    </div>
    <LogPanel :lines="log" />
  </section>
</template>

<style scoped>
.arpeggiator-panel { padding: 1.25rem; border: 1px solid #263642; border-radius: 10px; background: #10181f; }
.panel-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.panel-title p, h2, h3 { margin: 0; }
.panel-title p, h3, label, .section-label { color: #82929e; font-size: .62rem; font-weight: 800; letter-spacing: .13em; }
h2 { color: #effaff; font-size: 1.15rem; letter-spacing: .08em; }
.play-button { border: 1px solid #63e6cf; border-radius: 5px; padding: .7rem 1rem; background: #173934; color: #dffff9; font-size: .65rem; font-weight: 800; letter-spacing: .12em; cursor: pointer; }
.play-button span { display: inline-block; width: 0; height: 0; margin-right: .45rem; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid currentColor; }
.play-button.playing { border-color: #ffb86b; background: #523719; color: #ffe1b6; }
.play-button.playing span { width: 6px; height: 8px; border: 0; border-left: 2px solid currentColor; border-right: 2px solid currentColor; }
.controls { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 1px; margin-bottom: 1.25rem; border: 1px solid #2b3a45; border-radius: 7px; overflow: hidden; background: #2b3a45; }
.control-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem 1rem; padding: 1rem; background: #162129; }
.control-column h3 { grid-column: 1 / -1; color: #63e6cf; }
.control-column label { display: grid; gap: .38rem; }
select, input { min-width: 0; box-sizing: border-box; border: 1px solid #334956; border-radius: 4px; padding: .45rem .5rem; background: #0d151b; color: #e7f6fb; font: 600 .75rem ui-monospace, monospace; outline: none; }
select:focus, input:focus { border-color: #63e6cf; box-shadow: 0 0 0 2px rgba(99, 230, 207, .12); }
.value-input { display: flex; align-items: center; border-bottom: 1px solid #334956; }
.value-input input { width: 100%; border: 0; border-radius: 0; background: transparent; padding: .35rem 0; }
.value-input small { color: #63e6cf; font-size: .55rem; }
.routing { grid-template-columns: 1fr; }
.utility-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; }
.utility-buttons button { border: 1px solid #334956; border-radius: 4px; padding: .5rem .3rem; background: #1c2a33; color: #aabcc7; font-size: .56rem; font-weight: 800; letter-spacing: .06em; cursor: pointer; }
.utility-buttons button.active { border-color: #63e6cf; color: #63e6cf; }
.utility-buttons .clear-button { color: #ff9c8c; }
.sequencer { overflow-x: auto; }
.section-label { display: flex; justify-content: space-between; margin: 0 0 .6rem; }
.section-label span { color: #52636f; font-size: .55rem; }
@media (max-width: 850px) { .controls { grid-template-columns: 1fr 1fr; } .routing { grid-column: 1 / -1; } }
@media (max-width: 560px) { .arpeggiator-panel { padding: .8rem; } .controls { grid-template-columns: 1fr; } .routing { grid-column: auto; } .control-column { grid-template-columns: 1fr 1fr; } }
</style>
