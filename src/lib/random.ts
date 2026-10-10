/**
 * Get a random whole number from `from` to `to`, both included, counting up or
 * down
 */
export const random = (from: number, to: number) =>
  from +
  Math.sign(to - from) * Math.floor(Math.random() * (Math.abs(to - from) + 1))
