export interface TrainingZone {
    id: number;
    name: string;
    minPercent: number;
    maxPercent: number;
    minPower: number;
    maxPower: number;
    color: string;
    description: string;
}

export const ZONES_DEFINITION = [
    { id: 1, name: 'Active Recovery', min: 0, max: 55, color: 'bg-gray-400', description: 'Easy spinning, recovery' },
    { id: 2, name: 'Endurance', min: 56, max: 75, color: 'bg-blue-500', description: 'All day pace, base building' },
    { id: 3, name: 'Tempo', min: 76, max: 90, color: 'bg-green-500', description: 'Rhythmic, aerobic pace' },
    { id: 4, name: 'Threshold', min: 91, max: 105, color: 'bg-yellow-500', description: 'Sustainable hard effort' },
    { id: 5, name: 'VO2 Max', min: 106, max: 120, color: 'bg-orange-500', description: 'Very hard, short intervals' },
    { id: 6, name: 'Anaerobic', min: 121, max: 150, color: 'bg-red-500', description: 'Severe effort, very short' },
    { id: 7, name: 'Neuromuscular', min: 151, max: 1000, color: 'bg-purple-500', description: 'Maximal sprinting' },
];

export function calculateZones(ftp: number): TrainingZone[] {
    return ZONES_DEFINITION.map(zone => ({
        id: zone.id,
        name: zone.name,
        minPercent: zone.min,
        maxPercent: zone.max,
        minPower: Math.round(ftp * (zone.min / 100)),
        maxPower: Math.round(ftp * (zone.max / 100)),
        color: zone.color,
        description: zone.description
    }));
}
