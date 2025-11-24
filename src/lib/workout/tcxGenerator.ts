import { Workout } from './types';
import { WorkoutDataPoint } from './workoutStore';

export function generateTCX(workoutName: string, data: WorkoutDataPoint[]): string {
    const startTime = data.length > 0 ? new Date(data[0].timestamp).toISOString() : new Date().toISOString();
    const totalTimeSeconds = data.length; // Assuming 1Hz recording

    // Calculate averages/max
    const avgHR = Math.round(data.reduce((acc, p) => acc + p.heartRate, 0) / (data.length || 1));
    const maxHR = Math.max(...data.map(p => p.heartRate), 0);

    let trackpoints = '';
    data.forEach(point => {
        const time = new Date(point.timestamp).toISOString();
        trackpoints += `
            <Trackpoint>
                <Time>${time}</Time>
                <HeartRateBpm>
                    <Value>${point.heartRate}</Value>
                </HeartRateBpm>
                <Cadence>${point.cadence}</Cadence>
                <Extensions>
                    <ns3:TPX>
                        <ns3:Watts>${point.power}</ns3:Watts>
                        <ns3:Speed>0</ns3:Speed>
                    </ns3:TPX>
                </Extensions>
            </Trackpoint>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:up2="http://www.garmin.com/xmlschemas/UserProfile/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd http://www.garmin.com/xmlschemas/UserProfile/v2 https://www8.garmin.com/xmlschemas/UserProfileExtensionv2.xsd http://www.garmin.com/xmlschemas/ActivityExtension/v2 https://www8.garmin.com/xmlschemas/ActivityExtensionv2.xsd">
    <Activities>
        <Activity Sport="Biking">
            <Id>${startTime}</Id>
            <Notes>${workoutName}</Notes>
            <Lap StartTime>${startTime}</Lap>
                <TotalTimeSeconds>${totalTimeSeconds}</TotalTimeSeconds>
                <AverageHeartRateBpm>
                    <Value>${avgHR}</Value>
                </AverageHeartRateBpm>
                <MaximumHeartRateBpm>
                    <Value>${maxHR}</Value>
                </MaximumHeartRateBpm>
                <Track>
                    ${trackpoints}
                </Track>
        </Activity>
    </Activities>
</TrainingCenterDatabase>`;
}
