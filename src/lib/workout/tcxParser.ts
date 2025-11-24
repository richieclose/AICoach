import { WorkoutDataPoint } from './workoutStore';

export interface ParsedTCXWorkout {
    name: string;
    startTime: Date;
    endTime: Date;
    duration: number; // seconds
    dataPoints: WorkoutDataPoint[];
}

export type TCXParseResult =
    | { success: true; data: ParsedTCXWorkout }
    | { success: false; error: string };

export function parseTCX(tcxContent: string): TCXParseResult {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(tcxContent, 'text/xml');

        const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
        if (parserError) {
            return { success: false, error: `XML Parsing Error: ${parserError.textContent}` };
        }

        const activities = xmlDoc.getElementsByTagName('Activity');
        if (activities.length === 0) {
            // Try finding 'Activities' first, maybe structure is different
            if (xmlDoc.getElementsByTagName('TrainingCenterDatabase').length === 0) {
                return { success: false, error: 'Invalid TCX: Missing TrainingCenterDatabase tag' };
            }
            return { success: false, error: 'Invalid TCX: No Activity element found' };
        }
        const activity = activities[0];

        // Helper to get text content safely
        const getText = (parent: Element, tagName: string): string => {
            const elements = parent.getElementsByTagName(tagName);
            return elements.length > 0 ? elements[0].textContent || '' : '';
        };

        const notes = getText(activity, 'Notes');
        const id = getText(activity, 'Id');
        const name = notes || `Imported Workout ${id.split('T')[0]}`;

        const trackpoints = Array.from(xmlDoc.getElementsByTagName('Trackpoint'));
        if (trackpoints.length === 0) {
            return { success: false, error: 'Invalid TCX: No Trackpoints found' };
        }

        const dataPoints: WorkoutDataPoint[] = [];
        let firstTimestamp: Date | null = null;

        for (const tp of trackpoints) {
            const timeStr = getText(tp, 'Time');
            if (!timeStr) continue;

            const timestamp = new Date(timeStr).getTime();
            if (isNaN(timestamp)) continue;

            if (!firstTimestamp) {
                firstTimestamp = new Date(timeStr);
            }

            const hrValue = getText(tp, 'HeartRateBpm') ? getText(tp.getElementsByTagName('HeartRateBpm')[0], 'Value') : '0';
            const heartRate = parseInt(hrValue || '0');

            const cadence = parseInt(getText(tp, 'Cadence') || '0');

            // Power is usually in Extensions -> TPX -> Watts
            // We try multiple ways to find it to be robust against different TCX versions/exporters
            let watts = 0;
            const ns3 = 'http://www.garmin.com/xmlschemas/ActivityExtension/v2';

            // Try standard namespace method
            const wattsElements = tp.getElementsByTagNameNS(ns3, 'Watts');
            if (wattsElements.length > 0) {
                watts = parseInt(wattsElements[0].textContent || '0');
            } else {
                // Fallback: try finding 'Watts' or 'ns3:Watts' by tag name directly
                const w1 = getText(tp, 'Watts');
                const w2 = getText(tp, 'ns3:Watts');
                watts = parseInt(w1 || w2 || '0');
            }

            dataPoints.push({
                timestamp,
                power: isNaN(watts) ? 0 : watts,
                heartRate: isNaN(heartRate) ? 0 : heartRate,
                cadence: isNaN(cadence) ? 0 : cadence
            });
        }

        if (!firstTimestamp || dataPoints.length === 0) {
            return { success: false, error: 'Invalid TCX: No valid data points extracted' };
        }

        const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp);
        const start = firstTimestamp as Date;
        const duration = Math.round((lastTimestamp.getTime() - start.getTime()) / 1000);

        return {
            success: true,
            data: {
                name,
                startTime: start,
                endTime: lastTimestamp,
                duration,
                dataPoints
            }
        };
    } catch (error: any) {
        console.error('Error parsing TCX:', error);
        return { success: false, error: `Exception: ${error.message}` };
    }
}
