import { prisma } from '../src/lib/db';
import { saveWorkout } from '../src/app/actions/workout';

async function main() {
    console.log('Testing database connection...');

    // Create a dummy user if not exists (for testing, normally created via Auth)
    const email = 'test@example.com';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log('Creating test user...');
        user = await prisma.user.create({
            data: {
                email,
                name: 'Test User',
                ftp: 250,
                weight: 75
            }
        });
    }

    console.log('User found/created:', user.id);

    // Mock workout data
    const data = [];
    const startTime = Date.now() - 3600000; // 1 hour ago
    for (let i = 0; i < 3600; i++) {
        data.push({
            timestamp: startTime + i * 1000,
            power: 200 + Math.random() * 50, // Random power around 200-250
            heartRate: 140,
            cadence: 90
        });
    }

    console.log('Saving workout...');
    // We can't call server action directly here easily because of context, 
    // but we can test the logic if we extract it or just use prisma directly to verify schema.
    // Actually, let's just use prisma to create a workout to verify schema.
    // The server action uses `getServerSession` which won't work in this script.

    const workout = await prisma.workout.create({
        data: {
            userId: user.id,
            name: 'Test Workout',
            startTime: new Date(startTime),
            endTime: new Date(),
            duration: 3600,
            totalWork: 3600 * 225,
            averagePower: 225,
            normalizedPower: 230,
            intensityFactor: 0.92,
            trainingStressScore: 85.0,
            variabilityIndex: 1.02,
            data: JSON.stringify(data.slice(0, 10)) // Just store a bit
        }
    });

    console.log('Workout saved:', workout.id);

    const savedWorkout = await prisma.workout.findUnique({ where: { id: workout.id } });
    console.log('Retrieved workout:', savedWorkout);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
