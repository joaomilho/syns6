# Free AI Options for Visualization Generator

You don't need to pay for OpenAI! Here are **FREE** alternatives:

---

## 🚀 RECOMMENDED: Google Gemini (FREE!)

Google's Gemini has a generous free tier that's perfect for this use case.

### Setup:

```bash
# 1. Install
npm install ai @ai-sdk/google

# 2. Get FREE API key from Google AI Studio
# Visit: https://aistudio.google.com/app/apikey
# Click "Get API Key" - no credit card required!

# 3. Add to .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

### Edit `/src/app/api/generate-visualization/route.ts`:

Uncomment OPTION 3:

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// In the POST function, use:
const { text } = await generateText({
  model: google('gemini-2.5-flash'), // Fast and stable!
  // Alternative: google('gemini-2.5-pro') for more advanced reasoning
  system: SYSTEM_PROMPT,
  prompt: prompt,
  temperature: 0.7,
  maxTokens: 2000,
});
```

**Free Tier:**
- 15 requests per minute
- 1,500 requests per day
- 1 million requests per month
- More than enough for personal use!

---

## ⚡ ALTERNATIVE: Groq (FREE & SUPER FAST!)

Groq offers FREE access to Llama models with incredible speed.

### Setup:

```bash
# 1. Install
npm install ai @ai-sdk/groq

# 2. Get FREE API key
# Visit: https://console.groq.com/keys
# Sign up (no credit card needed)

# 3. Add to .env.local
GROQ_API_KEY=your-key-here
```

### Edit `/src/app/api/generate-visualization/route.ts`:

Uncomment OPTION 4:

```typescript
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

// In the POST function, uncomment:
const { text } = await generateText({
  model: groq('llama-3.1-70b-versatile'),
  system: SYSTEM_PROMPT,
  prompt: prompt,
  temperature: 0.7,
  maxTokens: 2000,
});
```

**Free Tier:**
- 30 requests per minute
- 14,400 requests per day
- Very fast inference (often <1 second)
- Great quality with Llama 3.1

---

## 💰 Paid Options (For Reference)

### Anthropic Claude
- Better code generation than GPT-4
- ~$0.003-0.015 per generation (cheaper than OpenAI)
- Excellent at following instructions

```bash
npm install ai @ai-sdk/anthropic
# ANTHROPIC_API_KEY=your-key-here
```

### OpenAI GPT-4
- Most well-known
- ~$0.01-0.03 per generation
- Good but more expensive

```bash
npm install ai @ai-sdk/openai
# OPENAI_API_KEY=your-key-here
```

---

## 🎯 Which Should You Choose?

| Provider | Cost | Speed | Quality | Setup Difficulty |
|----------|------|-------|---------|------------------|
| **Google Gemini** | FREE ⭐ | Fast | Very Good | Easy |
| **Groq** | FREE ⭐ | Very Fast ⚡ | Good | Easy |
| Anthropic | $$ | Medium | Excellent | Easy |
| OpenAI | $$$ | Medium | Very Good | Easy |

**Recommendation:** Start with **Google Gemini** (free and great quality) or **Groq** (free and super fast).

---

## Quick Start: Google Gemini (5 minutes)

```bash
# 1. Install
npm install ai @ai-sdk/google

# 2. Get key: https://aistudio.google.com/app/apikey

# 3. Add to .env.local:
echo "GOOGLE_GENERATIVE_AI_API_KEY=your-key-here" >> .env.local

# 4. Edit src/app/api/generate-visualization/route.ts
# Uncomment the imports and OPTION 3

# 5. Restart
npm run dev
```

That's it! No credit card, no payment, completely free! 🎉

---

## Testing Without Any API Key

The system works in **mock mode** without installing anything. You'll get a demo visualization that still works and responds to music. Use this to test the UI/UX before setting up AI.

---

## Environment Variable Names

Different providers use different variable names:

```bash
# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=...

# Groq
GROQ_API_KEY=...

# OpenAI
OPENAI_API_KEY=...

# Anthropic
ANTHROPIC_API_KEY=...
```

Make sure you use the correct name for your provider!

---

## Need Help?

Check the Vercel AI SDK docs: https://sdk.vercel.ai/providers

All providers work the same way - just change the import and model name!

