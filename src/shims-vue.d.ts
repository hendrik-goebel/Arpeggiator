declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare namespace WebMidi {
  interface MIDIOutput {
    id: string
    name?: string
    manufacturer?: string
    send(data: number[]): void
  }

  interface MIDIAccess {
    outputs: Map<string, MIDIOutput>
  }
}
