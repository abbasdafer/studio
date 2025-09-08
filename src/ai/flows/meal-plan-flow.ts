
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
  goal: z.enum(["weightLoss", "bulking", "maintenance"]).describe("The user's fitness goal, which will determine the diet's focus."),
});
export type MealPlanInput = z.infer<typeof MealPlanInputSchema>;

const MealPlanOutputSchema = z.object({
    planTitle: z.string().describe("A title for the meal plan, reflecting its goal and calorie target, e.g., 'خطة تضخيم - 3000 سعر حراري'."),
    breakfast: z.object({
        meal: z.string().describe("The name of the breakfast meal."),
        description: z.string().describe("A short description of the breakfast meal."),
        calories: z.number().describe("Estimated calories for the breakfast meal."),
        alternatives: z.string().describe("Practical alternatives if the main meal is not available."),
    }),
    lunch: z.object({
        meal: z.string().describe("The name of the lunch meal."),
        description: z.string().describe("A short description of the lunch meal."),
        calories: z.number().describe("Estimated calories for the lunch meal."),
        alternatives: z.string().describe("Practical alternatives if the main meal is not available."),
    }),
    dinner: z.object({
        meal: z.string().describe("The name of the dinner meal."),
        description: z.string().describe("A short description of the dinner meal."),
        calories: z.number().describe("Estimated calories for the dinner meal."),
        alternatives: z.string().describe("Practical alternatives if the main meal is not available."),
    }),
    snacks: z.array(z.object({
        meal: z.string().describe("The name of the snack."),
        description: z.string().describe("A short description of the snack."),
        calories: z.number().describe("Estimated calories for the snack."),
        alternatives: z.string().describe("Practical alternatives if the main snack is not available."),
    })).describe("A list of healthy snacks for the day."),
    totalCalories: z.number().describe("The total estimated calories for the entire day's plan."),
});
export type MealPlanOutput = z.infer<typeof MealPlanOutputSchema>;

export async function generateMealPlan(input: MealPlanInput): Promise<MealPlanOutput> {
  try {
    const plan = await generateMealPlanFlow(input);
    if (!plan) {
      throw new Error("Received an empty response from the AI model.");
    }
    return plan;
  } catch (err) {
    console.error("[AI_FLOW_ERROR] Failed to generate meal plan:", err);
    // Re-throw a user-friendly error to be caught by the client
    throw new Error("An unexpected error occurred while communicating with the AI service. Please check the server logs for details.");
  }
}

const prompt = ai.definePrompt({
  name: 'generateMealPlanPrompt',
  input: { schema: MealPlanInputSchema },
  output: { schema: MealPlanOutputSchema },
  prompt: `You are an expert Iraqi nutritionist creating a one-day meal plan for a user in Iraq.
The meal plan must be in Arabic.
The target is approximately {{{calories}}} calories.
The user's goal is: {{{goal}}}. Tailor the plan accordingly:
- For "bulking": Focus on high-protein and complex carbs.
- For "weightLoss": Create a slight calorie deficit and focus on lean protein and vegetables.
- For "maintenance": Create a balanced plan.

VERY IMPORTANT: All meals and ingredients must be common, affordable, and readily available in Iraq.
- FOCUS ON: Chicken breast, rice (taman), lentils (adas), chickpeas, local vegetables, yogurt (laban), dates, eggs, oats, and bread (khubz). Use dishes like Chicken Tashreeb, Lentil Soup (Shorbat Adas), grilled chicken/meat, and jajik salad.
- AVOID: Exotic or expensive ingredients not common in Iraq, like avocado, quinoa, kale, or almond flour.

For each meal and snack, provide a practical and simple alternative in case the primary option isn't available.

Calculate approximate calories for each item and the total for the day, which should be close to the target.
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
