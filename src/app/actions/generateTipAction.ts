// @ts-nocheck
// remove ts-nocheck if you want to fix the types
"use server";

import { generateTip, type SpinHistory } from '@/ai/flows/spinify-tip-generator';

export interface TipGenerationResult {
  tip?: string;
  error?: string;
}

export async function getAiTipAction(spinHistory: SpinHistory): Promise<TipGenerationResult> {
  if (!spinHistory || spinHistory.length === 0) {
    return { tip: "Spin a few times to get your first tip!" };
  }
  try {
    const result = await generateTip(spinHistory);
    return { tip: result.tip };
  } catch (error) {
    console.error("Error generating tip:", error);
    // Check if error is an instance of Error to safely access message
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: `Could not generate a tip: ${errorMessage}. Try again later!` };
  }
}
