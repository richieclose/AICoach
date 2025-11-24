'use server';

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getUserProfile() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) return null;

    return {
        name: user.name,
        ftp: user.ftp,
        weight: user.weight,
        height: user.height,
        image: user.image
    };
}

export async function updateUserProfile(data: {
    name?: string;
    ftp?: number;
    weight?: number;
    height?: number;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        throw new Error("Unauthorized");
    }

    const user = await prisma.user.update({
        where: { email: session.user.email },
        data: {
            ...data
        }
    });

    return user;
}
