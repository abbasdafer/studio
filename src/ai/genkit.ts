'use client';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local, then .env
dotenv.config({path: `.env.local`});
dotenv.config();

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
});
