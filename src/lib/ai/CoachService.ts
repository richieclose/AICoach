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
        this.model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    }

    async generatePreWorkoutConsultation(userHistory: string, userName?: string): Promise<string> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      The user is about to start a workout.
      User Name: ${userName || 'Rider'}
      User History: ${userHistory}
      
      Greet the user by name (if provided) and ask them how they are feeling today and what their goal is.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Gemini API Error:', error);
            return `Ready to ride, ${userName || 'Rider'}? Let's get started.`;
        }
    }

    async analyzeInterval(
        targetPower: number,
        actualPower: number,
        heartRate: number,
        cadence: number,
        userFeedback?: string,
        userName?: string
    ): Promise<CoachFeedback> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      Analyze the user's recent interval performance.
      User Name: ${userName || 'Rider'}
      
      Target Power: ${targetPower} W
      Actual Power (Avg): ${actualPower} W
      Heart Rate: ${heartRate} BPM
      Cadence: ${cadence} RPM
      User Feedback: ${userFeedback || 'None'}
      
      Provide a short feedback message (max 2 sentences) addressing the user by name if appropriate, and a suggested action.
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
    async generateWorkout(userRequest: string, ftp: number, recentWorkouts?: string): Promise<any> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      The user wants you to create a structured cycling workout.
      
      User Request: "${userRequest}"
      User FTP: ${ftp} W
      
      Recent Workout History (Last 30 days):
      ${recentWorkouts || "No recent history available."}
      
      Instructions:
      1. Analyze the User Request to understand their goal (e.g., "recovery", "VO2 max", "based on last week's load").
      2. If the user refers to their history (e.g., "based on my last 7 days", "I'm tired from yesterday"), use the provided "Recent Workout History" to inform the workout structure.
      3. If the user specifies a time period (e.g. "last 7 days"), filter the history accordingly.
      4. Create a workout that fits the user's request and current training context.

      Calculate specific target power (in Watts) for each interval based on the user's FTP and standard training zones:
      - Active Recovery: <55% FTP
      - Endurance: 56-75% FTP
      - Tempo: 76-90% FTP
      - Threshold: 91-105% FTP
      - VO2 Max: 106-120% FTP
      - Anaerobic: >121% FTP
      
      Output strictly valid JSON matching this TypeScript interface:
      interface Workout {
        name: string;
        description: string; // Explain the goal of this workout and how it addresses the user's request (max 2 sentences).
        intervals: {
          duration: number; // in seconds
          targetPower: number; // in watts (integer)
          type: 'warmup' | 'active' | 'recovery' | 'cooldown';
          description: string; // short description e.g. "5 mins @ 200W"
        }[];
      }
      
      Ensure the workout has a warmup and cooldown.
      Do not include any markdown formatting or explanation, just the JSON object.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            console.log('Gemini Raw Response:', text); // Debug log

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const workout = JSON.parse(jsonStr);

            // Validation
            if (!workout.intervals || !Array.isArray(workout.intervals) || workout.intervals.length === 0) {
                throw new Error('Generated workout is missing intervals');
            }

            // Calculate total duration and assign IDs
            workout.intervals = workout.intervals.map((interval: any, index: number) => ({
                ...interval,
                id: `interval-${index}-${Date.now()}`
            }));
            workout.totalDuration = workout.intervals.reduce((acc: number, i: any) => acc + i.duration, 0);
            workout.id = `ai-generated-${Date.now()}`;

            return workout;
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error('Failed to generate workout');
        }
    }

    async generateRealtimeFeedback(
        intervalDescription: string,
        targetPower: number,
        recentData: { avgPower: number; avgHR: number; avgCadence: number },
        userName?: string
    ): Promise<{ message: string; modification?: { type: 'power' | 'duration'; value: number; reason: string } }> {
        const prompt = `
      ${COACH_SYSTEM_PROMPT}
      Analyze the user's performance over the last minute to provide feedback and potential workout adjustments.
      User Name: ${userName || 'Rider'}
      
      Current Interval Goal: ${intervalDescription} (Target: ${targetPower}W)
      Recent Performance (Last 60s):
      - Avg Power: ${recentData.avgPower} W
      - Avg Heart Rate: ${recentData.avgHR} BPM
      - Avg Cadence: ${recentData.avgCadence} RPM
      
      1. Provide a short feedback sentence (encouragement or correction), using the user's name occasionally.
      2. Decide if a workout modification is needed based on the data:
         - If HR is dangerously high (>180 BPM for sustained period) or they are struggling significantly (Power < Target - 20W), suggest DECREASING intensity (-10% to -20%).
         - If they are cruising easily (HR low, Power > Target + 20W), suggest INCREASING intensity (+5% to +10%).
         - Otherwise, no modification.
      
      IMPORTANT: If your feedback message suggests a change (e.g. "increase power", "push harder"), you MUST include the "modification" object. Do not suggest a change in text without the object.

      Output strictly valid JSON:
      {
        "message": "Your feedback message here.",
        "modification": {
            "type": "power", 
            "value": 10, // Positive to increase watts, negative to decrease (e.g. -20)
            "reason": "Heart rate is too high"
        } // OR null if no modification
      }
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Gemini Feedback Error:', error);
            return { message: '' };
        }
    }
}

export const coachService = new CoachService();
