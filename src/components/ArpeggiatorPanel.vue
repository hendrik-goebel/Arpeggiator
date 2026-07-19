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
  <section class="arpeggiator-panel">
    <div class="controls">
      <div class="control-section sequence-section">
        <h3>SEQUENCE</h3>
        <label>Pattern <select :value="channel.pattern" @change="$emit('update-pattern', $event.target.value)"><option value="up">Up</option><option value="down">Down</option><option value="updown">UpDown</option><option value="random">Random</option></select></label>
        <label>Arpeggio length <span class="value-input"><input type="number" :value="channel.arpeggioLength" @input="$emit('update-arpeggio-length', +$event.target.value)" min="1" max="32" /><small>NOTES</small></span></label>
        <label>Quantisation <select :value="channel.quantisation" @change="$emit('update-quant', +$event.target.value)"><option v-for="q in [1,2,3,4,5,8,16,32,64]" :key="q" :value="q">{{ q }}</option></select></label>
        <label>Loop length <span class="value-input"><input type="number" :value="channel.loopLength" @input="$emit('update-loop-length', +$event.target.value)" min="1" max="64" /><small>STEPS</small></span></label>
        <label>Note length <span class="value-input"><input type="number" :value="channel.noteLength" @input="$emit('update-noteLength', +$event.target.value)" min="50" max="2000" /><small>MS</small></span></label>
      </div>
    </div>

    <div class="sequencer">
      <StepsGrid :notes="fullNotes" :steps="channel.steps" :base="channel.base" :key-root="channel.key" :play-step="channel.playStep" :step-count="channel.loopLength" @toggle-note="$emit('toggle-note', $event)" @toggle-step="$emit('cycle-step', $event)" />
    </div>
    <div class="routing-section">
      <div class="control-column routing">
        <label>Output <select :value="selectedOutputId" @change="$emit('select-output', $event.target.value)"><option v-for="o in outputs" :key="o.id" :value="o.id">{{ o.name }}</option></select></label>
        <div class="utility-buttons">
          <button class="clear-button" @click="$emit('clear-notes')">Clear grid</button>
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped>
.arpeggiator-panel { padding: 1.25rem; border: 1px solid var(--line); border-radius: 10px; background: var(--bg-panel); }
.panel-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.panel-title p, h2, h3 { margin: 0; }
.panel-title p, h3, label, .section-label { color: var(--text-muted); font-size: .62rem; font-weight: 800; letter-spacing: .13em; }
h2 { color: #effaff; font-size: 1.15rem; letter-spacing: .08em; }
.play-button { border: 1px solid var(--teal); border-radius: 5px; padding: .7rem 1rem; background: var(--teal-deep); color: var(--teal-soft); font-size: .65rem; font-weight: 800; letter-spacing: .12em; cursor: pointer; }
.play-button span { display: inline-block; width: 0; height: 0; margin-right: .45rem; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid currentColor; }
.play-button.playing { border-color: var(--coral); background: var(--coral-deep); color: var(--coral-soft); }
.play-button.playing span { width: 6px; height: 8px; border: 0; border-left: 2px solid currentColor; border-right: 2px solid currentColor; }
.controls { display: grid; gap: 1.25rem; margin-bottom: 1.25rem; }
.control-section, .routing-section { border: 1px solid var(--line); border-radius: 7px; overflow: hidden; background: var(--line); }
.control-section { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem 1rem; padding: 1rem; background: var(--bg-raised); }
.sequence-section { grid-template-columns: minmax(5.5rem, auto) repeat(5, minmax(0, 1fr)); align-items: end; }
.routing-section { grid-template-columns: 1fr; }
.control-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem 1rem; padding: 1rem; background: var(--bg-raised); }
.control-section h3 { grid-column: 1 / -1; color: var(--teal); }
.sequence-section h3 { grid-column: auto; }
.control-section label { display: grid; gap: .38rem; }
.control-column h3 { grid-column: 1 / -1; color: var(--teal); }
.control-column label { display: grid; gap: .38rem; }
select, input { min-width: 0; box-sizing: border-box; border: 1px solid var(--line-strong); border-radius: 4px; padding: .45rem .5rem; background: var(--bg-control); color: #e7f6fb; font: 600 .75rem ui-monospace, monospace; outline: none; }
select:focus, input:focus { border-color: var(--teal); box-shadow: 0 0 0 2px rgba(104, 216, 195, .12); }
.value-input { display: flex; align-items: center; border-bottom: 1px solid var(--line-strong); }
.value-input input { width: 100%; border: 0; border-radius: 0; background: transparent; padding: .35rem 0; }
.value-input small { color: var(--teal); font-size: .55rem; }
.routing { grid-template-columns: minmax(0, 1fr) 2fr; }
.routing h3 { grid-column: 1 / -1; }
.utility-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; }
.utility-buttons button { border: 1px solid var(--line-strong); border-radius: 4px; padding: .5rem .3rem; background: #1c2a33; color: #aabcc7; font-size: .56rem; font-weight: 800; letter-spacing: .06em; cursor: pointer; }
.utility-buttons button.active { border-color: var(--teal); color: var(--teal); }
.utility-buttons .clear-button { color: var(--coral); }
.sequencer { overflow-x: auto; }
.section-label { display: flex; justify-content: space-between; margin: 0 0 .6rem; }
.section-label span { color: #52636f; font-size: .55rem; }
@media (max-width: 560px) { .arpeggiator-panel { padding: .8rem; } .sequence-section { grid-template-columns: 1fr 1fr; } .sequence-section h3 { grid-column: 1 / -1; } .routing { grid-template-columns: 1fr; } .control-column { grid-template-columns: 1fr 1fr; } }
</style>
