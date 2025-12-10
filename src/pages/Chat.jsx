import { useEffect, useMemo, useRef, useState } from 'react'

const defaultMessages = [
  {
    id: 'intro',
    role: 'assistant',
    content:
      'Hey there! I am your market co-pilot. Ask about stocks, news, trading concepts, or what you see in this app. I am not financial advice.'
  }
]

export default function Chat () {
  const [messages, setMessages] = useState(defaultMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollerRef = useRef(null)

  const chatEndpoint = useMemo(() => {
    return 'https://chatproxy-q2lidtpoma-uc.a.run.app'
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const sendMessage = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setError(null)
    setLoading(true)
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    try {
      const payload = {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content
        })),
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      }

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let message = 'Chat service is unavailable right now.'
        try {
          const errJson = await response.clone().json()
          if (errJson?.error) {
            message = `Chat error: ${errJson.error}`
          }
        } catch (_) {
          const bodyText = await response.text()
          if (bodyText) message = `Chat error: ${bodyText.slice(0, 200)}`
        }
        console.error('Chat proxy error', response.status, message)
        throw new Error(message)
      }

      const data = await response.json()
      const assistantMsg = data?.reply
        ? {
            id: crypto.randomUUID(),
            role: data.reply.role || 'assistant',
            content: data.reply.content
          }
        : null

      if (assistantMsg) {
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Try again.')
      // Keep the user message so they see what was attempted.
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(event)
    }
  }

  const quickPrompts = [
    'What are key catalysts for AAPL this quarter?',
    'Explain call vs. put options like I am new.',
    'Summarize today’s market tone in two sentences.',
    'Build a checklist before entering a trade.'
  ]

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-lg-row align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">AI desk</div>
          <h2 className="text-white mb-2">Chat with the GPT co-pilot</h2>
          <p className="text-white-50 mb-0">
            Ask about markets, education, or how to use this app. Responses are informational only.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="btn btn-outline-info btn-sm text-nowrap"
              onClick={() => setInput(prompt)}
              type="button"
            >
              {prompt.slice(0, 28)}{prompt.length > 28 ? '…' : ''}
            </button>
          ))}
        </div>
      </div>

      <div
        className="card text-bg-dark border-0"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          boxShadow: '0 14px 28px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div
          ref={scrollerRef}
          className="p-3"
          style={{ maxHeight: '60vh', overflowY: 'auto' }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className="p-3 rounded-4"
                style={{
                  maxWidth: '80%',
                  backgroundColor:
                    msg.role === 'user'
                      ? 'rgba(54,215,255,0.16)'
                      : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e9f4ff',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <div className="small text-white-50 mb-1">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="d-flex align-items-center gap-2 text-white-50">
              <div className="spinner-border spinner-border-sm text-info" role="status" />
              <span>Thinking...</span>
            </div>
          ) : null}
        </div>

        <div className="card-footer bg-transparent border-0">
          {error ? (
            <div className="alert alert-warning text-dark py-2 mb-3">{error}</div>
          ) : null}
          <form className="d-flex flex-column gap-2" onSubmit={sendMessage}>
            <textarea
              className="form-control bg-transparent text-white"
              placeholder="Ask about markets, strategies, or this app..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: '0 0 0 1px rgba(54,215,255,0.12)'
              }}
            />
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-white-50">
                Press Enter to send, Shift+Enter for a new line. No investment advice.
              </small>
              <button
                type="submit"
                className="btn btn-info text-dark fw-semibold px-4"
                disabled={loading || !input.trim()}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
