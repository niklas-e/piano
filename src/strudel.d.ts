// Strudel ships no type declarations; these cover the parts the app uses.

declare module "@strudel/core" {
  export interface Pattern<T> {
    readonly __value?: T
  }

  export interface Hap<T> {
    value: T
  }

  export function sequence<T>(...values: T[]): Pattern<T>
  export function cat<T>(...patterns: Pattern<T>[]): Pattern<T>
  export const silence: Pattern<never>

  /** Strudel's scheduler: asks a pattern for its events a little ahead of time. */
  export class Cyclist<T> {
    constructor(options: {
      getTime: () => number
      onTrigger: (
        hap: Hap<T>,
        deadline: number,
        /** Seconds the event lasts. */
        duration: number,
        cps: number,
        /** When the event starts, on the `getTime` clock. */
        time: number,
      ) => void
    })
    setCps(cyclesPerSecond: number): void
    setPattern(pattern: Pattern<T>, autostart?: boolean): Promise<void>
    stop(): void
  }
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
