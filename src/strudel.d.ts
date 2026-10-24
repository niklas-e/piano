// Strudel ships no type declarations; these cover the parts the app uses.

declare module "@strudel/core" {
  /** An exact fraction of a cycle. */
  export interface Fraction {
    valueOf(): number
  }

  export interface Hap<T> {
    value: T
    /** When the event starts and ends, in cycles. */
    whole?: { begin: Fraction; end: Fraction }
    /** Cycles the event lasts. */
    duration: Fraction
    /** Whether the event starts within the cycles asked for. */
    hasOnset(): boolean
  }

  export interface Pattern<T> {
    /** The events between the `begin` and `end` cycles. */
    queryArc(begin: number, end: number): Hap<T>[]
  }

  /** Plays the items one after another, one per cycle. */
  export function cat<T>(...items: (T | Pattern<T>)[]): Pattern<T>
}

declare module "superdough" {
  export type SoundValue = {
    s: string
    note: string
    release?: number
  }

  export function setAudioContext(context: AudioContext): AudioContext
  export function setLogger(log: (message: string) => void): void
  export function samples(
    sampleMap: Record<string, Record<string, string[]>>,
  ): Promise<void>
  export function getSampleBuffer(
    value: { note: string },
    bank: Record<string, string[]>,
  ): Promise<{ buffer: AudioBuffer; playbackRate: number }>
  export function superdough(
    value: SoundValue,
    time: number,
    duration: number,
    cps: number,
  ): Promise<void>
}
