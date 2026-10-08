/**
 * Utility function to repeat a callback passed number of times. Useful for
 * creating an array containing a number of elements.
 *
 * @usage repeat(3, () => 'hello') // ['hello', 'hello', 'hello']
 */
export const repeat = <T>(numTimes: number, callback: (index: number) => T) =>
  Array.from(Array(numTimes).keys()).map((index) => callback(index))
