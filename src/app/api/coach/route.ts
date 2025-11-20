import { NextRequest, NextResponse } from 'next/server';
import { coachService } from '@/lib/ai/CoachService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, data } = body;

        if (action === 'consultation') {
            const response = await coachService.generatePreWorkoutConsultation(data.history);
            return NextResponse.json({ message: response });
        }

        if (action === 'analysis') {
            const { targetPower, actualPower, heartRate, cadence, userFeedback } = data;
            const feedback = await coachService.analyzeInterval(
                targetPower,
                actualPower,
                heartRate,
                cadence,
                userFeedback
            );
            return NextResponse.json(feedback);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
