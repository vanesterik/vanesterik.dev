// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { encodeArgs, posterArgs, run } from './record.ts'

// The argument that follows a flag, or undefined without it
const argumentOf = (args: string[], flag: string) =>
  args[args.indexOf(flag) + 1]

describe('encodeArgs', () => {
  const args = encodeArgs('raw.webm', 'out.mp4', 1.2, 30)

  it('trims the raw recording to the flow', () => {
    expect(argumentOf(args, '-ss')).toBe('1.2')
    expect(argumentOf(args, '-i')).toBe('raw.webm')
    expect(argumentOf(args, '-t')).toBe('30')
    // Seeking before the input is fast and frame-accurate when re-encoding
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
  })

  it('writes an H.264 MP4 every browser plays, without sound', () => {
    expect(argumentOf(args, '-c:v')).toBe('libx264')
    expect(argumentOf(args, '-pix_fmt')).toBe('yuv420p')
    expect(argumentOf(args, '-movflags')).toBe('+faststart')
    expect(args).toContain('-an')
    expect(args).toContain('-y')
    expect(args.at(-1)).toBe('out.mp4')
  })
})

describe('posterArgs', () => {
  it('takes the first frame of the video', () => {
    const args = posterArgs('out.mp4', 'out.jpg')
    expect(argumentOf(args, '-i')).toBe('out.mp4')
    expect(argumentOf(args, '-frames:v')).toBe('1')
    expect(args).toContain('-y')
    expect(args.at(-1)).toBe('out.jpg')
  })
})

describe('run', () => {
  it('names the projects it can record when given another', async () => {
    await expect(run('nope')).rejects.toThrow(
      /^Unknown project "nope": record one of .*leaseplan/,
    )
  })
})
