import { TextDecoder, TextEncoder } from 'util'

global.TextDecoder = TextDecoder as any
global.TextEncoder = TextEncoder as any

export default undefined