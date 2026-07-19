<template>
  <span class="stepper">
    <span class="stepper-value">{{ value }}</span>
    <span class="stepper-buttons">
      <button type="button" aria-label="Increase value" @click="move(1)">&#9650;</button>
      <button type="button" aria-label="Decrease value" @click="move(-1)">&#9660;</button>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string | number, values: Array<string | number> }>()
const emit = defineEmits<{ 'update:value': [value: string | number] }>()

const currentIndex = computed(() => {
  const index = props.values.findIndex(option => String(option) === String(props.value))
  return index >= 0 ? index : 0
})

function move(direction: number) {
  const nextIndex = (currentIndex.value + direction + props.values.length) % props.values.length
  emit('update:value', props.values[nextIndex])
}
</script>

<style scoped>
.stepper {
  display: flex;
  min-width: 0;
  min-height: 1.8rem;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--bg-control);
  color: #e7f6fb;
  font: 600 .75rem ui-monospace, monospace;
}
.stepper-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: .45rem .5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stepper-buttons {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--line-strong);
}
.stepper-buttons button {
  width: 1.35rem;
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: .55rem;
  line-height: 1;
  cursor: pointer;
}
.stepper-buttons button + button { border-top: 1px solid var(--line-strong); }
.stepper-buttons button:hover { background: var(--teal-deep); color: var(--teal-soft); }
.stepper:focus-within { border-color: var(--teal); box-shadow: 0 0 0 2px rgba(104, 216, 195, .12); }
</style>
