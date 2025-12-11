import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { FiRefreshCw } from 'react-icons/fi'

const defaultMessages = [
  {
    id: 'intro',
    role: 'assistant',
    content:
      'Hey there! I am your market co-pilot. Ask about stocks, news, trading concepts, or what you see in this app. I am not financial advice.'
  }
]

export default function Chat () {
  const systemInstruction =
    'You are an assistant for trading, stocks, and crypto. Only answer questions relevant to markets, finance, trading concepts, and this app. Decline unrelated topics.'
  const storageKey = 'chatMessages'
  const [messages, setMessages] = useState(() => {
    if (typeof window === 'undefined') return defaultMessages
    try {
      const saved = window.sessionStorage.getItem(storageKey)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length ? parsed : defaultMessages
    } catch (err) {
      console.error('chat load error', err)
      return defaultMessages
    }
  })
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages))
    } catch (err) {
      console.error('chat persist error', err)
    }
  }, [messages])

  const resetChat = () => {
    setMessages(defaultMessages)
    setError(null)
    setInput('')
    setLoading(false)
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKey)
      } catch (err) {
        console.error('chat reset error', err)
      }
    }
  }

  const sendMessage = async (event, overrideText) => {
    if (event && event.preventDefault) event.preventDefault()
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    setError(null)
    setLoading(true)
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text
    }
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')

    try {
      const payload = {
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages,
          userMessage
        ].map((m) => ({
          role: m.role,
          content: m.content
        })),
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      }

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
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

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream not supported')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const chunk of parts) {
          const line = chunk.trim()
          if (!line.startsWith('data:')) continue
          const payloadText = line.replace(/^data:\s*/, '')
          if (payloadText === '[DONE]') continue
          try {
            const parsed = JSON.parse(payloadText)
            const delta = parsed?.choices?.[0]?.delta?.content || ''
            if (delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: (m.content || '') + delta } : m
                )
              )
            }
          } catch (err) {
            console.error('stream parse error', err)
          }
        }
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Try again.')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
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
    'What has been the overall impact of AI on the stock market?',
    "Explain call vs. put options as if I'm a beginner.",
    "How does the Federal Reserve's guidance influence the market?",
    "Breakdown Nvidia's business model and their recent boom.",
    'What are the main factors that move technology stocks?',
    'How do interest rates typically affect equity valuations?',
    'What is dollar-cost averaging and when is it useful?',
    'How do earnings reports usually move a stock price?',
    'What does market capitalization tell you about a company?',
    'How do dividends work and why do they matter to investors?',
    'What are common risks of using margin or leverage?',
    'How do you read basic candlestick patterns on a chart?',
    'What is support and resistance in technical analysis?',
    'How does implied volatility influence options pricing?',
    'What are key differences between ETFs and mutual funds?',
    'What are typical risks of holding cryptocurrency assets?',
    'How do Bitcoin “halvings” affect supply dynamics?',
    'What is a stablecoin and why do they exist?',
    'What is diversification and why is it important?',
    'How do stop-loss and take-profit orders help manage risk?'
  ]

  const [displayedPrompts, setDisplayedPrompts] = useState(() => {
    const copy = [...quickPrompts]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, 3)
  })

  const shufflePrompts = () => {
    const copy = [...quickPrompts]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    setDisplayedPrompts(copy.slice(0, 3))
  }

  return (
    <div className="container pb-4">
      <div className="d-flex flex-column flex-lg-row align-items-start justify-content-between gap-3 mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">AI desk</div>
          <h1 className="text-white mb-2 h2">Chat with your AI Trading Assistant</h1>
          <p className="text-white-50 mb-0">
            Ask about markets, education, or how to use this app. Responses are informational only.
          </p>
        </div>
        <div className="flex flex-column" style={{ maxWidth: '480px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-white-50 small">Quick prompts</span>
            <button
              className="btn btn-outline-info btn-sm text-info fw-semibold me-3"
              onClick={shufflePrompts}
              type="button"
              aria-label="Shuffle prompts"
            >
              <FiRefreshCw />
            </button>
          </div>
          {displayedPrompts.map((prompt) => (
            <button
              key={prompt}
              className="btn btn-outline-info btn-sm text-start my-1"
              onClick={(e) => {
                e.currentTarget.blur()
                sendMessage(null, prompt)
              }}
              type="button"
              style={{ whiteSpace: 'normal' }}
            >
              {prompt}
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
          <div
            className="d-flex justify-content-end p-2 pb-0"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
            }}
          >
            <button className="btn btn-outline-light btn-sm" type="button" onClick={resetChat}>
              Reset chat
            </button>
          </div>

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
                      whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal'
                    }}
                  >
                    <div className="small text-white-50 mb-1">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    {msg.role === 'assistant' ? (
                      <div
                        className="text-white-50"
                        style={{ whiteSpace: 'normal' }}
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '') }}
                      />
                    ) : (
                      msg.content
                    )}
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
              className="form-control bg-transparent text-white chat-input"
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
                Not investment advice.
              </small>
              <button
                type="submit"
                className="btn btn-info text-dark fw-semibold px-4"
                disabled={loading || !input.trim()}
              >
                {loading ? 'Waiting...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
