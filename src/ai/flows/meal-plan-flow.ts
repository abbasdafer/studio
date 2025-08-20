'use server';
/**
 * @fileOverview A meal plan generation AI agent.
 *
 * - generateMealPlan - A function that handles the meal plan generation process.
 * - MealPlanInput - The input type for the generateMealPlan function.
 * - MealPlanOutput - The return type for the generateMealPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MealPlanInputSchema = z.object({
  calories: z
    .number()
    .describe(
      "The target daily calorie intake for the meal plan."
    ),
});
export type MealPlanInput = z.infer<typeof MealPlanInputSchema>;

const MealPlanOutputSchema = z.object({
    breakfast: z.object({
        meal: z.string().describe("The name of the breakfast meal."),
        description: z.string().describe("A short description of the breakfast meal."),
        calories: z.number().describe("Estimated calories for the breakfast meal."),
    }),
    lunch: z.object({
        meal: z.string().describe("The name of the lunch meal."),
        description: z.string().describe("A short description of the lunch meal."),
        calories: z.number().describe("Estimated calories for the lunch meal."),
    }),
    dinner: z.object({
        meal: z.string().describe("The name of the dinner meal."),
        description: z.string().describe("A short description of the dinner meal."),
        calories: z.number().describe("Estimated calories for the dinner meal."),
    }),
    snacks: z.array(z.object({
        meal: z.string().describe("The name of the snack."),
        description: z.string().describe("A short description of the snack."),
        calories: z.number().describe("Estimated calories for the snack."),
    })).describe("A list of healthy snacks for the day."),
    totalCalories: z.number().describe("The total estimated calories for the entire day's plan."),
});
export type MealPlanOutput = z.infer<typeof MealPlanOutputSchema>;

export async function generateMealPlan(input: MealPlanInput): Promise<MealPlanOutput> {
  return generateMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMealPlanPrompt',
  input: { schema: MealPlanInputSchema },
  output: { schema: MealPlanOutputSchema },
  prompt: `You are an expert nutritionist. Create a simple, healthy, one-day meal plan for a person who wants to consume approximately {{{calories}}} calories.
The meal plan should be in Arabic.
Provide a variety of common and easy-to-prepare foods.
Include breakfast, lunch, dinner, and two healthy snacks.
Calculate the approximate calories for each meal and the total for the day. The total should be as close to the target calories as possible.
`,
});

const generateMealPlanFlow = ai.defineFlow(
  {
    name: 'generateMealPlanFlow',
    inputSchema: MealPlanInputSchema,
    outputSchema: MealPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model failed to generate a meal plan.");
    }
    return output;
  }
);
