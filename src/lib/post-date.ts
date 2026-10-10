// Kept apart from posts.ts, which reads files with Node, so components that
// show a post's date also work in the browser (Storybook)

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

// Built by hand: Intl abbreviates September as "Sept" in en-GB, and parsing
// the date would bring time zones into it
export const formatPostDate = (date: string) => {
  const [year, month, day] = date.split('-')
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}
