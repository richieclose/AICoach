import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
// Note: In a real app, this should be server-side or use a proxy to hide the key.
// For this prototype, we'll assume the user provides the key or it's in env.
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

const COACH_SYSTEM_PROMPT = `
You are an elite cycling coach. Your name is "Aero".
Your goal is to help the user improve their fitness through structured workouts.
You are encouraging but firm. You focus on data (Power, Heart Rate, Cadence).
Keep your responses concise and suitable for text-to-speech (short sentences).
`;

export interface CoachFeedback {
    message: string;
    suggestedAction?: 'increase_resistance' | 'decrease_resistance' | 'keep_steady';
}

export class CoachService {
    private model;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async generatePreWorkoutConsultation(userHistory: string): Promise<string> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      The user is about to start a workout.
      User History: ${userHistory}
      
      Greet the user and ask them how they are feeling today and what their goal is.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Gemini API Error:', error);
            return "Ready to ride? Let's get started.";
        }
    }

    async analyzeInterval(
        targetPower: number,
        actualPower: number,
        heartRate: number,
        cadence: number,
        userFeedback?: string
    ): Promise<CoachFeedback> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      Analyze the user's recent interval performance.
      
      Target Power: ${targetPower} W
      Actual Power (Avg): ${actualPower} W
      Heart Rate: ${heartRate} BPM
      Cadence: ${cadence} RPM
      User Feedback: ${userFeedback || 'None'}
      
      Provide a short feedback message (max 2 sentences) and a suggested action.
      Format response as JSON: { "message": "...", "suggestedAction": "..." }
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Gemini API Error:', error);
            return { message: "Keep pushing!", suggestedAction: 'keep_steady' };
        }
    }
}

export const coachService = new CoachService();
