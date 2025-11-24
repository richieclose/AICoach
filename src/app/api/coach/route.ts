import { NextRequest, NextResponse } from 'next/server';
import { coachService } from '@/lib/ai/CoachService';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, data } = body;

        if (action === 'consultation') {
            const { history, userName } = data;
            const response = await coachService.generatePreWorkoutConsultation(history, userName);
            return NextResponse.json({ message: response });
        }

        if (action === 'analysis') {
            const { targetPower, actualPower, heartRate, cadence, userFeedback, userName } = data;
            const feedback = await coachService.analyzeInterval(
                targetPower,
                actualPower,
                heartRate,
                cadence,
                userFeedback,
                userName
            );
            return NextResponse.json(feedback);
        }

        if (action === 'generate_workout') {
            const { userRequest, ftp } = data;

            // Fetch last 30 days of history to give the AI context
            const session = await getServerSession(authOptions);
            let recentWorkoutsStr = '';

            if (session?.user?.email) {
                const user = await prisma.user.findUnique({ where: { email: session.user.email } });
                if (user) {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const recentWorkouts = await prisma.workout.findMany({
                        where: {
                            userId: user.id,
                            startTime: { gte: thirtyDaysAgo }
                        },
                        orderBy: { startTime: 'desc' },
                        select: {
                            startTime: true,
                            name: true,
                            duration: true,
                            normalizedPower: true,
                            trainingStressScore: true,
                            intensityFactor: true
                        }
                    });

                    recentWorkoutsStr = recentWorkouts.map((w: any) =>
                        `- ${w.startTime.toISOString().split('T')[0]}: ${w.name} (${Math.round(w.duration / 60)}m, NP: ${w.normalizedPower}W, TSS: ${w.trainingStressScore}, IF: ${w.intensityFactor})`
                    ).join('\n');
                }
            }

            const workout = await coachService.generateWorkout(userRequest, ftp, recentWorkoutsStr);
            return NextResponse.json(workout);
        }

        if (action === 'feedback') {
            const { intervalDescription, targetPower, recentData, userName } = data;
            const feedback = await coachService.generateRealtimeFeedback(intervalDescription, targetPower, recentData, userName);
            return NextResponse.json(feedback);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        }, { status: 500 });
    }
}
