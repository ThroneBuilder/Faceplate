const EXTREME_ADJS = [
  'awesome', 'epic', 'legendary', 'supreme', 'ultimate',
  'radical', 'elite', 'stellar', 'maximum', 'fierce',
]

const BRICK_ADJS = [
  'brick', 'stud', 'mosaic', 'pixel', 'plate',
  'block', 'tile', 'lego', 'builder', 'master',
]

const FANATIC_NOUNS = [
  'champion', 'fanatic', 'legend', 'wizard', 'guru',
  'hero', 'maestro', 'titan', 'genius', 'ace',
]

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function generateRandomName(): string {
  return `${pick(EXTREME_ADJS)} ${pick(BRICK_ADJS)} ${pick(FANATIC_NOUNS)}`
}
