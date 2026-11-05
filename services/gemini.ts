export const generateAppConcept = async (prompt: string): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || "Failed to generate concept.";
  } catch (error: any) {
    console.error("Concept generation error:", error);
    throw error;
  }
};

export const parseMatchText = async (rawText: string): Promise<any> => {
  try {
    const res = await fetch('/api/gemini/parse-match-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Text parsing error:", error);
    throw error;
  }
};

export const parseMatchScreenshot = async (base64Image: string): Promise<any> => {
  try {
    const res = await fetch('/api/gemini/parse-match-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Screenshot parsing error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const res = await fetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.imageUrl || null;
  } catch (error: any) {
    console.error("Image generation error:", error);
    throw error;
  }
};

export const generateVideo = async (prompt: string, progressCallback: (msg: string) => void): Promise<string | null> => {
  // Video generation requires paid model/Interactions API; return notice if called
  progressCallback("Videogenerering är inte tillgänglig i förhandsvisningsläge.");
  return null;
};

export const analyzeGameFrame = async (
  base64Images: string | string[],
  userInstruction?: string,
  playerFocus?: string
): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/analyze-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Images, userInstruction, playerFocus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || "Ingen analys kunde genereras.";
  } catch (error) {
    console.error("Frame analysis error:", error);
    return "Ett fel uppstod vid AI-analysen.";
  }
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
