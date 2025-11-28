# Quick Setup: Enable AI Visualization Creator

## 🆓 Want FREE Options? 

**See `SETUP_FREE_AI.md` for:**
- Google Gemini (FREE - recommended!)
- Groq (FREE & super fast!)

Or continue below for OpenAI (paid).

---

## Step 1: Install Dependencies

**For Google Gemini (FREE):**
```bash
npm install ai @ai-sdk/google
```

**For OpenAI (Paid):**
```bash
npm install ai @ai-sdk/openai
```

## Step 2: Add API Key

**For Google Gemini (FREE):**
```bash
# Get key from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

**For OpenAI (Paid):**
```bash
# Get key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here
```

Add to `.env.local`

## Step 3: Enable AI Generation

Edit `/src/app/api/generate-visualization/route.ts`:

### Uncomment the imports at the top:

**For Google Gemini:**
```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
```

**For OpenAI:**
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
```

### Uncomment the generation code:

**For Google Gemini (OPTION 3):**
```typescript
const { text } = await generateText({
  model: google('gemini-2.5-flash'), // Fast, stable, 1M token context
  system: SYSTEM_PROMPT,
  prompt: prompt,
  temperature: 0.7,
  maxTokens: 2000,
});
```

**For OpenAI (OPTION 1):**
```typescript
const { text } = await generateText({
  model: openai('gpt-4-turbo'),
  system: SYSTEM_PROMPT,
  prompt: prompt,
  temperature: 0.7,
  maxTokens: 2000,
});
```

Remove the TEMPORARY mock code block.

## Step 4: Restart Dev Server

```bash
npm run dev
```

## That's it! 🎉

Now you can:
1. Open the player
2. Click the visualization dropdown
3. Click "CREATE YOUR OWN VISUALIZATION"
4. Describe what you want
5. Watch AI create it!

## Test It

Try these prompts:
- "Create 5 spinning cubes that pulse with bass"
- "Make a spiral of glowing spheres"
- "Create floating shapes that dance to music"

## Troubleshooting

**"Failed to generate" or 401 Error**
- Check `.env.local` has OPENAI_API_KEY
- Restart dev server after adding env vars
- Make sure you're logged in (sign in with Spotify)
- Check OpenAI account has credits

**No audio reactivity**
- Enable microphone (⦿ button in player)
- Allow microphone permissions in browser

## Cost Estimation

- **Google Gemini: FREE** ⭐ (15 req/min, 1.5k/day)
- **Groq: FREE** ⭐ (30 req/min, 14k/day)
- Anthropic Claude: ~$0.003-0.015 per generation
- OpenAI GPT-4: ~$0.01-0.03 per generation

All generate in 1-5 seconds. Code is cached locally after generation.

## Alternative: Use Mock Mode

The system works without AI using mock responses. You can:
1. Skip installing AI SDK
2. Keep the TEMPORARY mock code
3. Still create visualizations manually
4. Test the UI/UX

The mock code creates a simple dancing spheres visualization for any prompt.

