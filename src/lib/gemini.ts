import Groq from 'groq-sdk'

export function getAIClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada')
  return new Groq({ apiKey })
}
