/**
 * Calculates Normalized Power (NP) using the standard algorithm:
 * 1. Calculate 30-second rolling average power.
 * 2. Raise values to the 4th power.
 * 3. Average the values.
 * 4. Take the 4th root.
 */
export function calculateNormalizedPower(data: number[]): number {
    if (data.length < 30) return 0;

    const rollingAverages: number[] = [];
    for (let i = 0; i <= data.length - 30; i++) {
        const chunk = data.slice(i, i + 30);
        const avg = chunk.reduce((a, b) => a + b, 0) / 30;
        rollingAverages.push(avg);
    }

    const sumPow4 = rollingAverages.reduce((a, b) => a + Math.pow(b, 4), 0);
    const avgPow4 = sumPow4 / rollingAverages.length;
    return Math.round(Math.pow(avgPow4, 0.25));
}

/**
 * Calculates Intensity Factor (IF).
 * IF = NP / FTP
 */
export function calculateIntensityFactor(np: number, ftp: number): number {
    if (ftp === 0) return 0;
    return parseFloat((np / ftp).toFixed(2));
}

/**
 * Calculates Training Stress Score (TSS).
 * TSS = (sec x NP x IF) / (FTP x 3600) x 100
 */
export function calculateTSS(durationSeconds: number, np: number, ifFactor: number, ftp: number): number {
    if (ftp === 0) return 0;
    return parseFloat(((durationSeconds * np * ifFactor) / (ftp * 3600) * 100).toFixed(1));
}

/**
 * Calculates Variability Index (VI).
 * VI = NP / Average Power
 */
export function calculateVariabilityIndex(np: number, avgPower: number): number {
    if (avgPower === 0) return 0;
    return parseFloat((np / avgPower).toFixed(2));
}
