import { calculateNormalizedPower, calculateIntensityFactor, calculateTSS, calculateVariabilityIndex } from '../src/lib/workout/metrics';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function testNormalizedPower() {
    console.log('Testing Normalized Power...');
    // Case 1: Constant power
    const constantData = new Array(120).fill(200); // 2 mins of 200W
    const np = calculateNormalizedPower(constantData);
    assert(np === 200, `Expected NP 200, got ${np}`);

    // Case 2: Varied power (simple example)
    // 30s at 100W, 30s at 300W.
    // Rolling avg will transition.
    // This is hard to calc manually exactly without the rolling window logic, 
    // but NP should be higher than Avg (200).
    const variedData = [...new Array(30).fill(100), ...new Array(30).fill(300)];
    const npVaried = calculateNormalizedPower(variedData);
    const avgVaried = 200;
    console.log(`Varied NP: ${npVaried}, Avg: ${avgVaried}`);
    assert(npVaried > avgVaried, 'NP should be > Avg for varied effort');
}

function testIntensityFactor() {
    console.log('Testing Intensity Factor...');
    const ftp = 250;
    const np = 200;
    const ifFactor = calculateIntensityFactor(np, ftp);
    assert(ifFactor === 0.8, `Expected IF 0.8, got ${ifFactor}`);
}

function testTSS() {
    console.log('Testing TSS...');
    // 1 hour at FTP (IF = 1.0) should be 100 TSS
    const ftp = 250;
    const np = 250;
    const ifFactor = 1.0;
    const duration = 3600;
    const tss = calculateTSS(duration, np, ifFactor, ftp);
    assert(Math.abs(tss - 100) < 0.1, `Expected TSS 100, got ${tss}`);

    // 30 mins at 0.8 IF
    // TSS = (1800 * 200 * 0.8) / (250 * 3600) * 100
    // = (288000) / (900000) * 100 = 32
    const tss2 = calculateTSS(1800, 200, 0.8, 250);
    assert(Math.abs(tss2 - 32) < 0.1, `Expected TSS 32, got ${tss2}`);
}

function main() {
    try {
        testNormalizedPower();
        testIntensityFactor();
        testTSS();
        console.log('All metric tests passed!');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
