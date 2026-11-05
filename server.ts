import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for model selection
const MODEL_NAME = 'gemini-3-flash-preview';

// 1. Dashboard AI Insight
app.post('/api/gemini/insight', async (req, res) => {
  try {
    const { playersCount, sessionsCount, recentMatches } = req.body;
    const prompt = `Du är en assisterande basketcoach. Ge en kort, proaktiv och uppmuntrande insikt (max 2 meningar) till huvudtränaren baserat på följande data:
    Antal spelare: ${playersCount || 0}. Antal träningar: ${sessionsCount || 0}. Senaste matchresultat: ${recentMatches || 'Inga'}.
    Fokusera på vad vi bör tänka på idag. Svara på svenska.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const insight = response.text?.trim() || 'Dags för en ny bra träningsvecka. Fokusera på detaljerna idag!';
    res.json({ insight });
  } catch (error: any) {
    console.error('Error generating AI insight:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AI insight' });
  }
});

// 2. AI Coach Chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, contextString } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: message,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are an expert basketball coach assistant for a youth team. 
        You have access to the following team data to provide personalized advice:
        
        ${contextString || ''}
        
        Guidelines:
        1. Use the provided data to make your answers specific. If the coach asks for a training plan, look at recent match results or training focus.
        2. Be encouraging, concise, and professional.
        3. Always answer in Swedish.
        4. Keep answers actionable and focused on player development and SBBF standards (Knäkontroll, Rörelseförståelse).
        5. If data is missing or sparse, give general expert advice but mention that more data would help.`,
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Error in AI Coach chat:', error);
    res.status(500).json({ error: error.message || 'Chat error' });
  }
});

// 3. Parse Match Text (OCR / Text)
app.post('/api/gemini/parse-match-text', async (req, res) => {
  try {
    const { rawText } = req.body;
    const optimizedText = rawText && rawText.length > 5000 ? rawText.substring(0, 5000) : rawText;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract basketball match data for Orion HU14 from this text: "${optimizedText}"`,
      config: {
        systemInstruction: 'Strict data extractor. Fields: opponent (string), score (number), opponentScore (number), date (YYYY-MM-DD), events (array of {time, description, team}). Output JSON only.',
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            opponent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            opponentScore: { type: Type.NUMBER },
            date: { type: Type.STRING },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  team: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing match text:', error);
    res.status(500).json({ error: error.message || 'Parsing error' });
  }
});

// 4. Parse Match Screenshot
app.post('/api/gemini/parse-match-image', async (req, res) => {
  try {
    const { base64Image } = req.body;
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: 'Extract basketball data. JSON fields: opponent, score, opponentScore, date, events.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            opponent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            opponentScore: { type: Type.NUMBER },
            date: { type: Type.STRING },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  team: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing match screenshot:', error);
    res.status(500).json({ error: error.message || 'Screenshot parsing error' });
  }
});

// 5. Video / Frame Analysis
app.post('/api/gemini/analyze-frame', async (req, res) => {
  try {
    const { base64Images, userInstruction, playerFocus } = req.body;
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    const isSequence = images.length > 1;
    const isFullVideo = images.length > 10;

    let prompt = '';
    if (isFullVideo) {
      prompt = `Here are ${images.length} frames extracted evenly from a basketball video. Provide a SUMMARY analysis.`;
    } else if (isSequence) {
      prompt = 'Analyze this sequence of 5 basketball frames.';
    } else {
      prompt = 'Analyze this specific basketball frame.';
    }

    prompt += ' Identify spacing issues, defensive stance quality, or scoring opportunities.';

    if (playerFocus) {
      prompt += ` Focus specifically on player number ${playerFocus}.`;
    }

    if (userInstruction) {
      prompt += ` The coach is specifically asking: "${userInstruction}".`;
    }

    const parts: any[] = images.map((img: string) => {
      const cleanBase64 = img.split(',')[1] || img;
      return {
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64,
        },
      };
    });

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    res.json({ text: response.text || 'Ingen analys kunde genereras.' });
  } catch (error: any) {
    console.error('Error analyzing frame:', error);
    res.status(500).json({ error: error.message || 'Frame analysis error' });
  }
});

// 6. Player Performance Feedback
app.post('/api/gemini/player-feedback', async (req, res) => {
  try {
    const { playerName, skillAssessment, matches, allExercises } = req.body;
    const prompt = `Du är en professionell basketcoach. Analysera följande spelares prestationer och ge personlig feedback. Föreslå även 3 specifika övningar från listan för att förbättra spelarens svagheter.
    Spelare: ${playerName}
    Skills: ${JSON.stringify(skillAssessment)}
    Matcher: ${JSON.stringify(matches)}
    Tillgängliga övningar (ID och Kategori): ${JSON.stringify(allExercises)}
    
    Svara i strikt JSON-format med följande struktur:
    {
        "feedback": "Din personliga feedback här...",
        "suggestedDrills": ["id1", "id2", "id3"]
    }`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating player feedback:', error);
    res.status(500).json({ error: error.message || 'Feedback error' });
  }
});

// 7. Player Ask Coach (Exercise Q&A)
app.post('/api/gemini/player-ask', async (req, res) => {
  try {
    const { exerciseTitle, question } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Du är en peppande basketcoach. Spelaren frågar om övningen "${exerciseTitle}". Fråga: "${question}". Svara kort, pedagogiskt och uppmuntrande på svenska.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    res.json({ text: response.text || 'Träna på och ha kul på planen!' });
  } catch (error: any) {
    console.error('Error in player ask:', error);
    res.status(500).json({ error: error.message || 'Q&A error' });
  }
});

// 7b. AI Suggest Training Exercises based on theme & duration from available library
app.post('/api/gemini/suggest-training', async (req, res) => {
  try {
    const { theme, durationMinutes, availableExercises, availableWarmups } = req.body;
    const prompt = `Du är en erfaren svensk ungdomsbasketcoach för HU15 (killar 14-15 år).
Coachen vill planera ett träningspass med följande förutsättningar:
- Tema: "${theme || 'Allround basket-IQ & matchtempo'}"
- Passlängd: ca ${durationMinutes || 90} minuter.

Välj ut de bäst lämpade övningarna ENBART från nedanstående listor av befintliga övningar i appens bibliotek.
Hitta en balanserad struktur:
1. 1-2 uppvärmningsövningar från tillgängliga uppvärmningar (totalt ca 10-15 min)
2. 3-4 huvudövningar från tillgängliga övningar (med lämplig tidsfördelning per övning i minuter).

Tillgängliga uppvärmningsövningar:
${JSON.stringify((availableWarmups || []).map((w: any) => ({ id: w.id, title: w.title, phase: w.phase })))}

Tillgängliga huvudövningar:
${JSON.stringify((availableExercises || []).map((e: any) => ({ id: e.id, title: e.title, category: e.category, level: e.level })))}

Svara i strikt JSON-format:
{
  "theme": "Passets tema (förfinat om nödvändigt)",
  "rationale": "Kort coach-motivering på 1-2 meningar på svenska varför detta upplägg passar HU15",
  "suggestedWarmupIds": ["id1", "id2"],
  "suggestedExerciseIds": ["idA", "idB", "idC"],
  "exerciseDurations": {
    "idA": 15,
    "idB": 20,
    "idC": 25
  }
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error suggesting training:', error);
    res.status(500).json({ error: error.message || 'Suggest training error' });
  }
});

// 8. Generate App Concept
app.post('/api/gemini/concept', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Design a detailed app concept based on: ${prompt}`,
      config: {
        systemInstruction: 'You are a senior product architect. Provide the response as a structured Markdown breakdown including Name, Purpose, Key Features, and Tech Stack.',
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || 'Failed to generate concept.' });
  } catch (error: any) {
    console.error('Error generating concept:', error);
    res.status(500).json({ error: error.message || 'Concept error' });
  }
});

// 9. Generate Image
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
      }
    }
    res.json({ imageUrl: null });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Image generation error' });
  }
});

// Dev / Prod Vite handling
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Basketcoach Pro server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
