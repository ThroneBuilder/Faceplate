import type { CandidateKey, HistoryEntry, SelectionHistory } from '../../types/index.js'

export function createHistory(initialKey: CandidateKey, initialStep: number): SelectionHistory {
  return {
    entries: [{ key: initialKey, stepSize: initialStep, chosenAt: Date.now() }],
    activeIndex: 0,
  }
}

export function pushHistory(
  history: SelectionHistory,
  key: CandidateKey,
  stepSize: number,
): SelectionHistory {
  const base = history.entries.slice(0, history.activeIndex + 1)
  return {
    entries: [...base, { key, stepSize, chosenAt: Date.now() }],
    activeIndex: base.length,
  }
}

export function revertHistory(
  history: SelectionHistory,
  targetIndex: number,
): SelectionHistory {
  return { ...history, activeIndex: targetIndex }
}

export function activeEntry(history: SelectionHistory): HistoryEntry {
  return history.entries[history.activeIndex]
}
