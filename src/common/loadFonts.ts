import "@fontsource-variable/inter"

// abcjs measures text when it renders, so the app font has to be ready before
// anything renders. If it fails to load, the system font stack takes over.
await document.fonts.load('700 1em "Inter Variable"').catch(() => [])
