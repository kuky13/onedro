import { ApiKeyService } from './apiKeyService'

const API_URL = 'https://api.deepseek.com/v1/chat/completions'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatInputMessage {
  role: ChatRole
  content: string
}

export async function deepseekChat(messages: ChatInputMessage[], temperature = 0.7) {
  const key = await ApiKeyService.getDeepSeekApiKey()
  console.log('DeepSeek API Key retrieved:', key ? 'FOUND' : 'NOT FOUND')
  if (!key || key === 'sk-placeholder-replace-via-supabase') {
    throw new Error('Chave da DeepSeek não configurada. Por favor, acesse o Supabase Dashboard e configure a chave na tabela api_keys.')
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Falha na DeepSeek')
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content as string
}

export async function deepseekStream(
  messages: ChatInputMessage[],
  temperature: number,
  onDelta: (chunk: string) => void
) {
  const key = await ApiKeyService.getDeepSeekApiKey()
  console.log('DeepSeek API Key retrieved:', key ? 'FOUND' : 'NOT FOUND')
  if (!key || key === 'sk-placeholder-replace-via-supabase') {
    throw new Error('Chave da DeepSeek não configurada. Por favor, acesse o Supabase Dashboard e configure a chave na tabela api_keys.')
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      stream: true
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Falha na DeepSeek')
  }
  if (!res.body) {
    return deepseekChat(messages, temperature)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let final = ''
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    done = d
    if (value) {
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        if (line === 'data: [DONE]') continue
        if (line.startsWith('data: ')) {
          const payload = line.slice(6)
          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || ''
            if (delta) {
              final += delta
              onDelta(delta)
            }
          } catch {
          }
        }
      }
    }
  }
  return final
}