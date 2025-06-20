"use server";

import { generateTip, type SpinHistory } from '@/ai/flows/spinify-tip-generator';

export interface TipGenerationResult {
  tip?: string;
  error?: string;
}

export async function getAiTipAction(spinHistory: SpinHistory): Promise<TipGenerationResult> {
  // This is a server action, it can access process.env
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      console.error("AI Service is not configured. The API key is missing on the server. Please add GOOGLE_API_KEY to your .env file.");
      return { error: "The AI Tip Generator is not configured on the server." };
  }

  if (!spinHistory || spinHistory.length === 0) {
    return { tip: "Spin a few times to get your first tip!" };
  }
  
  try {
    const result = await generateTip(spinHistory);
    return { tip: result.tip };
  } catch (error) {
    console.error("Error generating tip:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";

    // Provide a more user-friendly error for invalid API keys
    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
        return { error: "Could not generate a tip. The server's API key is invalid." };
    }

    // Generic error for other issues to avoid exposing too much detail to the client.
    return { error: `Could not generate a tip. An unexpected error occurred.` };
  }
}
