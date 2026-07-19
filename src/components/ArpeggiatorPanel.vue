<script setup lang="ts">
import { computed } from 'vue'
import StepsGrid from './StepsGrid.vue'
import LogPanel from './LogPanel.vue'
import StepperControl from './StepperControl.vue'
import { ARPEGGIO_OCTAVES, CIRCLE_OF_FIFTHS_KEYS, DEFAULT_BASE, KEYBOARD_OCTAVE_SIZE, NOTE_LENGTH_OPTIONS, CircleOfFifthsKey } from '../config'
import { StoredArpeggiatorState } from '../models/channel'

const props = defineProps<{ channel: any, outputs: any[], selectedOutputId: string | null, log: string[], globalKey: CircleOfFifthsKey, storedStates: StoredArpeggiatorState[], activeStoredStateIndex: number | null }>()

const base = computed(() => props.channel?.base ?? DEFAULT_BASE)
const fullNotes = computed(() => Array.from({ length: KEYBOARD_OCTAVE_SIZE }, (_, i) => base.value + i))
</script>

<template>
  <section class="arpeggiator-panel">
    <div class="controls">
      <div class="control-section global-note-section">
        <h3>GLOBAL NOTES</h3>
        <label>Global key
          <select :value="globalKey" @change="$emit('update-global-key', $event.target.value)">
            <option v-for="key in CIRCLE_OF_FIFTHS_KEYS" :key="key.name" :value="key.name">{{ key.name }}</option>
          </select>
        </label>
        <button class="global-variation" @click="$emit('global-variation')">Var all</button>
      </div>
      <div class="control-section sequence-section">
        <h3>SEQUENCE</h3>
        <label>Pattern <StepperControl :value="channel.pattern" :values="['up', 'down', 'updown', 'random']" @update:value="$emit('update-pattern', $event)" /></label>
        <label>Arpeggio length <span class="value-input"><input type="number" :value="channel.arpeggioLength" @input="$emit('update-arpeggio-length', +$event.target.value)" min="1" max="32" /><small>NOTES</small></span></label>
        <label>Quantisation <StepperControl :value="channel.quantisation" :values="[1, 2, 3, 4, 5, 8, 16, 32, 64]" @update:value="$emit('update-quant', +$event)" /></label>
        <label>Loop length <span class="value-input"><input type="number" :value="channel.loopLength" @input="$emit('update-loop-length', +$event.target.value)" min="1" max="64" /><small>STEPS</small></span></label>
        <label>Note length <StepperControl :value="channel.noteLength" :values="NOTE_LENGTH_OPTIONS" @update:value="$emit('update-noteLength', +$event)" /></label>
        <label>Octave
          <select :value="channel.octave" @change="$emit('update-octave', +$event.target.value)">
            <option v-for="octave in ARPEGGIO_OCTAVES" :key="octave" :value="octave">C{{ octave }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="sequencer">
      <StepsGrid :notes="fullNotes" :steps="channel.steps" :base="channel.base" :key-root="channel.key" :play-step="channel.playStep" :step-count="channel.loopLength" @toggle-note="$emit('toggle-note', $event)" @toggle-step="$emit('cycle-step', $event)" />
    </div>
    <div class="state-storage">
      <button class="store-button" @click="$emit('store-state')">Store state</button>
      <div class="stored-states" v-if="storedStates.length">
        <button
          v-for="(_, index) in storedStates"
          :key="index"
          class="stored-state-button"
          :class="{ active: index === activeStoredStateIndex }"
          :aria-label="`Apply stored state ${index + 1}`"
          @click="$emit('apply-stored-state', index)"
        >{{ index + 1 }}</button>
      </div>
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
.sequence-section { grid-template-columns: minmax(5.5rem, auto) repeat(6, minmax(0, 1fr)); align-items: end; }
.global-note-section { grid-template-columns: minmax(5.5rem, auto) auto auto; align-items: end; justify-content: start; justify-items: start; }
.routing-section { grid-template-columns: 1fr; }
.control-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem 1rem; padding: 1rem; background: var(--bg-raised); }
.control-section h3 { grid-column: 1 / -1; color: var(--teal); }
.sequence-section h3 { grid-column: auto; }
.control-section label { display: grid; gap: .38rem; }
.global-note-section h3 { grid-column: auto; color: var(--teal); }
.global-note-section label { justify-self: start; }
.global-note-section select { width: 5rem; }
.global-variation { align-self: end; justify-self: start; border: 1px solid var(--lavender); border-radius: 4px; padding: .45rem .8rem; background: var(--lavender-deep); color: var(--lavender-soft); font-size: .62rem; font-weight: 800; letter-spacing: .08em; cursor: pointer; }
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
.state-storage { display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin-top: .85rem; }
.store-button, .stored-state-button {
  border: 1px solid var(--line-strong); border-radius: 4px; padding: .5rem .7rem;
  background: #1c2a33; color: var(--text-muted); font-size: .56rem; font-weight: 800;
  letter-spacing: .06em; cursor: pointer;
}
.store-button { border-color: var(--teal); color: var(--teal-soft); background: var(--teal-deep); }
.stored-states { display: flex; flex-wrap: wrap; gap: .35rem; }
.stored-state-button { min-width: 2rem; color: var(--lavender-soft); background: var(--lavender-deep); }
.stored-state-button.active { border-color: var(--teal); background: var(--teal-deep); color: var(--teal-soft); box-shadow: 0 0 8px rgba(104, 216, 195, .28); }
.section-label { display: flex; justify-content: space-between; margin: 0 0 .6rem; }
.section-label span { color: #52636f; font-size: .55rem; }
@media (max-width: 560px) { .arpeggiator-panel { padding: .8rem; } .global-note-section, .sequence-section { grid-template-columns: 1fr 1fr; } .global-note-section h3, .sequence-section h3 { grid-column: 1 / -1; } .routing { grid-template-columns: 1fr; } .control-column { grid-template-columns: 1fr 1fr; } }
</style>
