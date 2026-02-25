import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}
