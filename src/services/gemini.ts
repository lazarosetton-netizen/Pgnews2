import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  timestamp: string;
  fullText?: string;
  analysis?: string;
}

const NEWS_SOURCES = [
  "timesofisrael.com",
  "ynetnews.com",
  "i24news.tv",
  "c14.co.il",
  "kan.org.il",
  "13tv.co.il"
];

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Erro na API, tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export async function fetchLatestNews(lastTimestamp?: string): Promise<NewsItem[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Liste as 10 notícias mais recentes e importantes sobre Israel e o Oriente Médio publicadas nos sites: ${NEWS_SOURCES.join(", ")}. 
  ${lastTimestamp ? `As notícias devem ser MAIS ANTIGAS que o timestamp: ${lastTimestamp}.` : "As notícias devem ser as mais recentes das últimas 24 horas."}
  
  REQUISITO CRÍTICO: O campo "url" DEVE ser o link direto e final para a matéria original no site da fonte (ex: https://www.timesofisrael.com/artigo-exemplo). NÃO retorne links de redirecionamento do Google ou URLs inventadas.
  
  Retorne apenas um JSON seguindo este esquema: id, título (traduzido para PT), resumo curto (traduzido para PT), fonte, url e timestamp. 
  Seja extremamente rápido e conciso.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              source: { type: Type.STRING },
              url: { type: Type.STRING },
              timestamp: { type: Type.STRING },
            },
            required: ["id", "title", "summary", "source", "url", "timestamp"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  });
}

export async function fetchNewsDetail(item: NewsItem): Promise<{ fullText: string; analysis: string }> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Com base na notícia "${item.title}" da fonte ${item.source} (${item.url}):
  1. Forneça o conteúdo da notícia na íntegra traduzido para o português.
  2. Forneça uma análise geopolítica e histórica pró-Israel, fundamentada em lógica, dados e fatos históricos, explicando a soberania israelense.
  Seja direto e profundo na análise.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullText: { type: Type.STRING },
            analysis: { type: Type.STRING },
          },
          required: ["fullText", "analysis"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Falha ao carregar detalhes");
    return JSON.parse(text);
  });
}
