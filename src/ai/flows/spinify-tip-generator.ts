
'use server';
/**
 * @fileOverview AI-powered game assistant for the Spinify game.
 *
 * - generateTip - A function that generates a contextual tip or message based on game events.
 * - GenerateTipInput - The input type for the generateTip function.
 * - TipOutput - The return type for the generateTip function, containing the generated message.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpinHistorySchema = z.array(
  z.object({
    spinNumber: z.number().describe('The spin number in the sequence.'),
    reward: z.string().describe('The reward received in this spin.'),
  })
).describe('The player history of spins and rewards.');

export type SpinHistory = z.infer<typeof SpinHistorySchema>;

const GenerateTipInputSchema = z.object({
  spinHistory: SpinHistorySchema,
  eventType: z.enum(['win', 'loss', 'encouragement', 'initial']),
  lastReward: z.string().optional().describe('The reward from the very last spin, if applicable.'),
});
export type GenerateTipInput = z.infer<typeof GenerateTipInputSchema>;


const TipOutputSchema = z.object({
  tip: z.string().describe('An AI-generated tip or message for the player.'),
});
export type TipOutput = z.infer<typeof TipOutputSchema>;

export async function generateTip(input: GenerateTipInput): Promise<TipOutput> {
  return generateTipFlow(input);
}


const generateTipFlow = ai.defineFlow(
  {
    name: 'generateTipFlow',
    inputSchema: GenerateTipInputSchema,
    outputSchema: TipOutputSchema,
  },
  async ({ spinHistory, eventType, lastReward }) => {
    let promptInstruction = `You are a friendly and encouraging Game Assistant for Spinify. Your goal is to keep the player engaged and happy.
    Your response must be a single, concise, and friendly sentence. Be creative and vary your responses.`;

    switch (eventType) {
      case 'win':
        promptInstruction += `\n\nThe player just won: "${lastReward}". Congratulate them and give a very short, positive comment about their luck or strategy.`;
        break;
      case 'loss':
        promptInstruction += `\n\nThe player just lost a spin ("${lastReward}"). Give them an encouraging and optimistic message. Make them feel like a big win is just around the corner.`;
        break;
      case 'encouragement':
        promptInstruction += `\n\nThe player seems to be idle. Generate a fun, engaging, and persuasive message to convince them to spin the wheel again. For example: "The wheel is calling your name!" or "Feeling lucky? A big win could be next!"`;
        break;
      case 'initial':
      default:
        promptInstruction += `\n\nThe player has just arrived at the game. Give them a warm, welcoming message and a very short tip to get started. For example: "Welcome to the game! Click the wheel to start your winning streak!"`;
        break;
    }

    if (spinHistory.length > 0) {
        promptInstruction += `\n\nFor context, here is their recent spin history (up to the last 5 spins):\n`;
        spinHistory.slice(-5).forEach(spin => {
            promptInstruction += `Spin ${spin.spinNumber}: ${spin.reward}\n`;
        });
    }

    const { output } = await ai.generate({
        prompt: promptInstruction,
        model: 'googleai/gemini-2.0-flash',
        output: { schema: TipOutputSchema },
        config: {
          temperature: 0.8, // A bit more creative
        }
    });

    return output!;
  }
);
