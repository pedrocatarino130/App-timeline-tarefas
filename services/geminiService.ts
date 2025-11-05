
import { GoogleGenAI } from "@google/genai";

const API_KEY_STORAGE = 'gemini_api_key';

let ai: GoogleGenAI | null = null;

// Try to get API key from localStorage first, then fall back to environment variable
const getApiKey = (): string | null => {
  // Check localStorage first (for browser environments)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) return storedKey;
  }

  // Fall back to environment variable (for dev environments)
  return process.env.API_KEY || null;
};

// Initialize or re-initialize the AI client
const initializeAI = () => {
  const apiKey = getApiKey();
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
    return true;
  }
  return false;
};

// Initialize on load
initializeAI();

export const setApiKey = (apiKey: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
    initializeAI();
  }
};

export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};

export const clearApiKey = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(API_KEY_STORAGE);
    ai = null;
  }
};

export const askGemini = async (prompt: string): Promise<string> => {
  if (!ai) {
    const initialized = initializeAI();
    if (!initialized) {
      return "Please configure your Gemini API key first. Click the settings icon to add your key.";
    }
  }

  try {
    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes('API key')) {
      return "Invalid API key. Please check your Gemini API key configuration.";
    }
    return "Sorry, I encountered an error. Please check the console for details.";
  }
};
