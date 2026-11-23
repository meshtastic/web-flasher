import { describe, expect, it } from 'vitest'
import { deviceIllustrations } from './deviceImages'

describe('deviceIllustrations', () => {
  it('drops the model files listed after the illustrations', () => {
    expect(deviceIllustrations(['rak4631.svg', 'rak4631.usdz', 'rak4631.glb'])).toEqual(['rak4631.svg'])
  })

  it('keeps every illustration of a board with two', () => {
    expect(deviceIllustrations(['a.svg', 'a_case.svg', 'a.usdz', 'a.glb', 'a_case.usdz', 'a_case.GLB']))
      .toEqual(['a.svg', 'a_case.svg'])
  })

  it('leaves a list without models alone', () => {
    expect(deviceIllustrations(['t-watch-ultra.svg'])).toEqual(['t-watch-ultra.svg'])
  })

  it('passes a missing list through', () => {
    expect(deviceIllustrations(undefined)).toBeUndefined()
  })
})
