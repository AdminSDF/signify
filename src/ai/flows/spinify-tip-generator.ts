'use server';
/**
 * @fileOverview AI-powered tip generator for the Spinify game.
 *
 * - generateTip - A function that generates a tip based on the player's spin history.
 * - SpinHistory - The input type for the generateTip function, representing the player's spin history.
 * - TipOutput - The return type for the generateTip function, containing the generated tip.
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

const TipOutputSchema = z.object({
  tip: z.string().describe('An AI-generated tip for the player.'),
});

export type TipOutput = z.infer<typeof TipOutputSchema>;

export async function generateTip(spinHistory: SpinHistory): Promise<TipOutput> {
  return generateTipFlow(spinHistory);
}

const generateTipPrompt = ai.definePrompt({
  name: 'generateTipPrompt',
  input: {schema: SpinHistorySchema},
  output: {schema: TipOutputSchema},
  prompt: `You are an AI assistant that provides helpful tips to players of the Spinify game based on their spin history.

  Analyze the following spin history and provide a single, concise tip to help the player improve their chances of winning. The tip should be actionable and based on patterns or trends in their previous spins. Be encouraging and positive.

  Spin History:
  {{#each this}}
    Spin {{spinNumber}}: Reward - {{reward}}
  {{/each}}
  `,
});

const generateTipFlow = ai.defineFlow(
  {
    name: 'generateTipFlow',
    inputSchema: SpinHistorySchema,
    outputSchema: TipOutputSchema,
  },
  async spinHistory => {
    const {output} = await generateTipPrompt(spinHistory);
    return output!;
  }
);
