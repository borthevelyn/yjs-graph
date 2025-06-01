const cracoWasm = require("craco-wasm")

module.exports = {
  plugins: [cracoWasm()],
    webpack: {
    alias: {
      console: 'console-browserify',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify'
    }
  }
}