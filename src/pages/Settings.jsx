import { useEffect, useState } from 'react'
import {
  DEFAULT_GOAL_TARGET,
  DEFAULT_STARTING_BALANCE,
  getAccountState,
  resetAccountState,
  saveAccountState
} from '../utils/accountStorage'

export default function Settings() {
  const [cashBalance, setCashBalance] = useState(DEFAULT_STARTING_BALANCE)
  const [startingBalance, setStartingBalance] = useState(DEFAULT_STARTING_BALANCE)
  const [goalTarget, setGoalTarget] = useState(DEFAULT_GOAL_TARGET)
  const [depositAmt, setDepositAmt] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [goalDraft, setGoalDraft] = useState(DEFAULT_GOAL_TARGET)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    const state = getAccountState()
    setCashBalance(state.cashBalance || DEFAULT_STARTING_BALANCE)
    setGoalTarget(state.goalTarget || DEFAULT_GOAL_TARGET)
    setGoalDraft(state.goalTarget || DEFAULT_GOAL_TARGET)
    setStartingBalance(state.startingBalance || DEFAULT_STARTING_BALANCE)
    const sync = () => {
      const latest = getAccountState()
      setCashBalance(latest.cashBalance || DEFAULT_STARTING_BALANCE)
      setGoalTarget(latest.goalTarget || DEFAULT_GOAL_TARGET)
      setGoalDraft(latest.goalTarget || DEFAULT_GOAL_TARGET)
      setStartingBalance(latest.startingBalance || DEFAULT_STARTING_BALANCE)
    }
    window.addEventListener('portfolio-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('portfolio-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const handleDeposit = (event) => {
    event.preventDefault()
    setError(null)
    const amount = Number.parseInt(depositAmt, 10)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive whole number to deposit.')
      return
    }
    const nextCash = Number((cashBalance + amount).toFixed(2))
    const nextStart = Number((startingBalance + amount).toFixed(2))
    const next = saveAccountState({ cashBalance: nextCash, startingBalance: nextStart })
    setCashBalance(next.cashBalance)
    setStartingBalance(next.startingBalance)
    setDepositAmt('')
    setMessage(`Deposited $${amount.toLocaleString()}`)
  }

  const handleWithdraw = (event) => {
    event.preventDefault()
    setError(null)
    const amount = Number.parseInt(withdrawAmt, 10)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive whole number to withdraw.')
      return
    }
    if (amount > cashBalance + 1e-6) {
      setError('Not enough cash to withdraw that amount.')
      return
    }
    const nextCash = Number((cashBalance - amount).toFixed(2))
    const nextStart = Math.max(0, Number((startingBalance - amount).toFixed(2)))
    const next = saveAccountState({ cashBalance: nextCash, startingBalance: nextStart })
    setCashBalance(next.cashBalance)
    setStartingBalance(next.startingBalance)
    setWithdrawAmt('')
    setMessage(`Withdrew $${amount.toLocaleString()}`)
  }

  const handleGoalUpdate = (event) => {
    event.preventDefault()
    setError(null)
    const parsed = Number.parseInt(goalDraft, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a positive whole number for your goal.')
      return
    }
    const next = saveAccountState({ goalTarget: parsed })
    setGoalTarget(next.goalTarget)
    setGoalDraft(next.goalTarget)
    setMessage('Goal updated.')
  }

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      setTimeout(() => setResetConfirm(false), 1800)
      return
    }
    setError(null)
    const next = resetAccountState()
    setCashBalance(next.cashBalance)
    setGoalTarget(next.goalTarget)
    setGoalDraft(next.goalTarget)
    setStartingBalance(next.startingBalance)
    setDepositAmt('')
    setWithdrawAmt('')
    setMessage('Account reset to defaults.')
    setResetConfirm(false)
  }

  return (
    <div className="d-flex justify-content-center align-items-start py-4" style={{ minHeight: '70vh' }}>
      <div
        className="settings-card glass-panel rounded-4 p-4 shadow-lg"
        style={{
          width: 'min(720px, 42vw)',
          minWidth: '320px',
          background:
            'radial-gradient(circle at 22% 12%, rgba(54,215,255,0.18), transparent 36%), radial-gradient(circle at 80% 16%, rgba(124,58,237,0.18), transparent 32%), rgba(8,14,28,0.9)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div className="mb-3">
          <div className="text-white-50 text-uppercase small">Settings</div>
          <h3 className="text-white mb-1">Account controls</h3>
          <p className="text-white-50 mb-0">
            Manage cash, goals, and reset your simulator. Changes are stored locally on this device.
          </p>
        </div>

        <div className="settings-section rounded-3 p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="text-white-50 small">Cash balance</div>
              <div className="text-white fw-semibold fs-5">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-white-50 small">Starting balance (for profit)</div>
              <div className="text-white fw-semibold">${startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          <form className="settings-section rounded-3 p-3" onSubmit={handleDeposit}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="text-white mb-0">Deposit</h6>
              <small className="text-white-50">Adds cash and adjusts starting balance</small>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-transparent text-white-50 border-secondary">$</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="form-control bg-transparent text-white border-secondary"
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                placeholder="Amount"
              />
              <button className="btn btn-info text-dark fw-semibold" type="submit">Deposit</button>
            </div>
          </form>

          <form className="settings-section rounded-3 p-3" onSubmit={handleWithdraw}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="text-white mb-0">Withdraw</h6>
              <small className="text-white-50">Deducts cash and lowers starting balance</small>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-transparent text-white-50 border-secondary">$</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="form-control bg-transparent text-white border-secondary"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                placeholder="Amount"
              />
              <button className="btn btn-outline-light fw-semibold" type="submit">Withdraw</button>
            </div>
          </form>

          <form className="settings-section rounded-3 p-3" onSubmit={handleGoalUpdate}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="text-white mb-0">Goal target</h6>
              <small className="text-white-50">Used for dashboard progress</small>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-transparent text-white-50 border-secondary">$</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="form-control bg-transparent text-white border-secondary"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="$20,000"
              />
              <button className="btn btn-info text-dark fw-semibold" type="submit">Save goal</button>
            </div>
          </form>

          <div className="settings-section rounded-3 p-3 d-flex flex-column gap-2">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="text-white mb-0">Reset simulator</h6>
              <small className="text-white-50">Clears cash, holdings, transactions, goal</small>
            </div>
            <button
              type="button"
              className={`btn ${resetConfirm ? 'btn-danger' : 'btn-outline-danger'} fw-semibold`}
              onClick={handleReset}
            >
              {resetConfirm ? 'Click again to confirm' : 'Reset account'}
            </button>
          </div>
        </div>

        {message ? <div className="alert alert-success text-dark mt-3 py-2 mb-2">{message}</div> : null}
        {error ? <div className="alert alert-warning text-dark mt-3 py-2 mb-0">{error}</div> : null}
      </div>
    </div>
  )
}
