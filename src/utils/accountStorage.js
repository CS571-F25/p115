export const DEFAULT_STARTING_BALANCE = 100000
export const DEFAULT_GOAL_TARGET = 20000

const STORAGE_KEYS = {
  cash: 'paperCash',
  holdings: 'paperHoldings',
  transactions: 'paperTransactions',
  goal: 'paperGoalTarget',
  starting: 'paperStartingBalance'
}

export function normalizeHoldings(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {}
  const next = {}
  Object.entries(safe).forEach(([sym, val]) => {
    const sharesRaw = Number(val?.shares)
    const shares = Number.isFinite(sharesRaw) ? Number(sharesRaw.toFixed(2)) : 0
    const avgPrice = Number.isFinite(val?.avgPrice) ? Number(val.avgPrice) : 0
    if (shares > 0) {
      next[sym.toUpperCase()] = { shares, avgPrice }
    }
  })
  return next
}

const readNumber = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  const parsed = raw ? Number.parseFloat(raw) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const readJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.error('account storage parse error', err)
    return fallback
  }
}

export function getAccountState() {
  const cashBalance = readNumber(STORAGE_KEYS.cash, DEFAULT_STARTING_BALANCE)
  const goalTarget = readNumber(STORAGE_KEYS.goal, DEFAULT_GOAL_TARGET)
  const startingBalance = readNumber(STORAGE_KEYS.starting, cashBalance || DEFAULT_STARTING_BALANCE)
  const holdingsRaw = readJson(STORAGE_KEYS.holdings, {})
  const transactionsRaw = readJson(STORAGE_KEYS.transactions, [])
  const holdings = normalizeHoldings(holdingsRaw)
  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : []
  return { cashBalance, goalTarget, startingBalance, holdings, transactions }
}

export function dispatchPortfolioUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('portfolio-updated'))
  window.dispatchEvent(new Event('storage'))
}

export function saveAccountState(partial, options = {}) {
  if (typeof window === 'undefined') return { ...partial }
  const current = getAccountState()
  const next = { ...current, ...partial }
  try {
    if ('cashBalance' in next) window.localStorage.setItem(STORAGE_KEYS.cash, String(next.cashBalance))
    if ('goalTarget' in next) window.localStorage.setItem(STORAGE_KEYS.goal, String(next.goalTarget))
    if ('startingBalance' in next)
      window.localStorage.setItem(STORAGE_KEYS.starting, String(next.startingBalance))
    if ('holdings' in next)
      window.localStorage.setItem(STORAGE_KEYS.holdings, JSON.stringify(next.holdings || {}))
    if ('transactions' in next)
      window.localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(next.transactions || []))
  } catch (err) {
    console.error('account storage persist error', err)
  }
  if (!options.silent) {
    dispatchPortfolioUpdate()
  }
  return next
}

export function resetAccountState() {
  const reset = {
    cashBalance: DEFAULT_STARTING_BALANCE,
    goalTarget: DEFAULT_GOAL_TARGET,
    startingBalance: DEFAULT_STARTING_BALANCE,
    holdings: {},
    transactions: []
  }
  saveAccountState(reset)
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem('chatMessages')
    } catch (err) {
      console.error('session clear error', err)
    }
  }
  return reset
}

export function createAccountState(initial = {}) {
  const base = {
    cashBalance: DEFAULT_STARTING_BALANCE,
    goalTarget: DEFAULT_GOAL_TARGET,
    startingBalance: DEFAULT_STARTING_BALANCE,
    holdings: {},
    transactions: [],
    ...initial
  }
  return saveAccountState(base)
}
