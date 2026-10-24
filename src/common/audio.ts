let context: AudioContext | undefined

/**
 * The app's audio context, started for playing. Browsers only let audio start
 * in response to a tap, click or key press, so call this from the event
 * handler before awaiting anything.
 */
export function startAudio(): AudioContext {
  context ??= new AudioContext()
  void context.resume()
  return context
}
