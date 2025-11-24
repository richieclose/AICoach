import { Workout, Interval } from './types';

export function parseZwo(xmlContent: string, ftp: number): Workout {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    const workoutFile = xmlDoc.querySelector("workout_file");
    if (!workoutFile) throw new Error("Invalid ZWO file");

    const name = workoutFile.querySelector("name")?.textContent || "Imported Workout";
    const description = workoutFile.querySelector("description")?.textContent || "";
    const workoutNode = workoutFile.querySelector("workout");

    if (!workoutNode) throw new Error("No workout data found");

    const intervals: Interval[] = [];
    let intervalCount = 0;

    Array.from(workoutNode.children).forEach((node) => {
        const duration = parseInt(node.getAttribute("Duration") || "0");

        if (node.tagName === "Warmup" || node.tagName === "Cooldown") {
            const powerLow = parseFloat(node.getAttribute("PowerLow") || "0");
            const powerHigh = parseFloat(node.getAttribute("PowerHigh") || "0");
            const avgPower = (powerLow + powerHigh) / 2;

            intervals.push({
                id: `interval-${intervalCount++}`,
                duration,
                targetPower: Math.round(avgPower * ftp),
                type: node.tagName === "Warmup" ? 'warmup' : 'cooldown',
                description: `${node.tagName} (${Math.round(avgPower * 100)}% FTP)`
            });
        } else if (node.tagName === "SteadyState") {
            const power = parseFloat(node.getAttribute("Power") || "0");

            intervals.push({
                id: `interval-${intervalCount++}`,
                duration,
                targetPower: Math.round(power * ftp),
                type: 'active',
                description: `Steady State (${Math.round(power * 100)}% FTP)`
            });
        } else if (node.tagName === "IntervalsT") {
            const repeat = parseInt(node.getAttribute("Repeat") || "1");
            const onDuration = parseInt(node.getAttribute("OnDuration") || "0");
            const offDuration = parseInt(node.getAttribute("OffDuration") || "0");
            const onPower = parseFloat(node.getAttribute("OnPower") || "0");
            const offPower = parseFloat(node.getAttribute("OffPower") || "0");

            for (let i = 0; i < repeat; i++) {
                // On Interval
                intervals.push({
                    id: `interval-${intervalCount++}`,
                    duration: onDuration,
                    targetPower: Math.round(onPower * ftp),
                    type: 'active',
                    description: `Interval ${i + 1}/${repeat} (On)`
                });
                // Off Interval
                intervals.push({
                    id: `interval-${intervalCount++}`,
                    duration: offDuration,
                    targetPower: Math.round(offPower * ftp),
                    type: 'recovery',
                    description: `Interval ${i + 1}/${repeat} (Off)`
                });
            }
        } else if (node.tagName === "Ramp") {
            // Treat ramp as average power for now, or split into chunks?
            // Simple approach: Average power
            const powerLow = parseFloat(node.getAttribute("PowerLow") || "0");
            const powerHigh = parseFloat(node.getAttribute("PowerHigh") || "0");
            const avgPower = (powerLow + powerHigh) / 2;

            intervals.push({
                id: `interval-${intervalCount++}`,
                duration,
                targetPower: Math.round(avgPower * ftp),
                type: 'active',
                description: `Ramp (${Math.round(avgPower * 100)}% FTP)`
            });
        }
    });

    return {
        id: `imported-${Date.now()}`,
        name,
        description,
        intervals,
        totalDuration: intervals.reduce((acc, i) => acc + i.duration, 0)
    };
}
