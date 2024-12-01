// This file's purpose is very clear, although the reason why it is required, isn't.
// When executing automerge in jest's test environment (which is some kind of node), these dependencies
// are not automatically provided. This file provides them from a third party library.

import { TextDecoder, TextEncoder } from 'util'

global.TextDecoder = TextDecoder as any
global.TextEncoder = TextEncoder as any

export default undefined