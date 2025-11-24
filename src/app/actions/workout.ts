'use server';

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WorkoutDataPoint } from '@/lib/workout/workoutStore';
import { calculateNormalizedPower, calculateIntensityFactor, calculateTSS, calculateVariabilityIndex } from '@/lib/workout/metrics';

export async function saveWorkout(
    workoutName: string,
    startTime: number,
    endTime: number,
    data: WorkoutDataPoint[],
    plannedStructure?: any // JSON object or string
) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error("User not found");
    }

    const duration = Math.round((endTime - startTime) / 1000);

    // Calculate Metrics
    const powerData = data.map(d => d.power);
    const avgPower = Math.round(powerData.reduce((a, b) => a + b, 0) / powerData.length);
    const np = calculateNormalizedPower(powerData);
    const ftp = user.ftp || 200;
    const intensityFactor = calculateIntensityFactor(np, ftp);
    const tss = calculateTSS(duration, np, intensityFactor, ftp);
    const vi = calculateVariabilityIndex(np, avgPower);

    // Calculate Total Work (Joules)
    let totalWork = 0;
    for (let i = 1; i < data.length; i++) {
        const dt = (data[i].timestamp - data[i - 1].timestamp) / 1000;
        const p = (data[i].power + data[i - 1].power) / 2;
        totalWork += p * dt;
    }

    const workout = await prisma.workout.create({
        data: {
            userId: user.id,
            name: workoutName,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            duration,
            totalWork: Math.round(totalWork),
            averagePower: avgPower,
            normalizedPower: np,
            intensityFactor,
            trainingStressScore: tss,
            variabilityIndex: vi,
            data: JSON.stringify(data),
            plannedStructure: plannedStructure ? JSON.stringify(plannedStructure) : null
        }
    });

    return workout;
}

export async function getWorkouts() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        throw new Error("User not found");
    }

    return await prisma.workout.findMany({
        where: { userId: user.id },
        orderBy: { startTime: 'desc' }
    });
}
