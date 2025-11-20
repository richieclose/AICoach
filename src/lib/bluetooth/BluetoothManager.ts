import { create } from 'zustand';

// Bluetooth UUIDs
export const SERVICE_UUIDS = {
    HEART_RATE: 0x180d,
    CYCLING_POWER: 0x1818,
    FITNESS_MACHINE: 0x1826,
};

export const CHARACTERISTIC_UUIDS = {
    HEART_RATE_MEASUREMENT: 0x2a37,
    CYCLING_POWER_MEASUREMENT: 0x2a63,
    FTMS_CONTROL_POINT: 0x2ad9,
    FTMS_STATUS: 0x2ada,
    INDOOR_BIKE_DATA: 0x2ad2,
};

export interface BluetoothDeviceState {
    isConnected: boolean;
    deviceName: string | null;
    batteryLevel: number | null;
    heartRate: number | null;
    power: number | null;
    cadence: number | null;
    isSimulating: boolean;
}

interface BluetoothStore extends BluetoothDeviceState {
    controlPoint: BluetoothRemoteGATTCharacteristic | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleSimulation: () => void;
    setTargetPower: (watts: number) => Promise<void>;
}

// Mock Data Generator State
let simulationInterval: NodeJS.Timeout | null = null;

export const useBluetoothStore = create<BluetoothStore>((set, get) => ({
    isConnected: false,
    deviceName: null,
    batteryLevel: null,
    heartRate: null,
    power: null,
    cadence: null,
    isSimulating: false,
    controlPoint: null,

    connect: async () => {
        const { isSimulating } = get();
        if (isSimulating) {
            console.log('Starting Simulation Mode');
            set({ isConnected: true, deviceName: 'Simulated Bike' });
            startSimulation(set);
            return;
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [SERVICE_UUIDS.FITNESS_MACHINE] },
                    { services: [SERVICE_UUIDS.CYCLING_POWER] },
                    { services: [SERVICE_UUIDS.HEART_RATE] },
                ],
                optionalServices: [
                    SERVICE_UUIDS.HEART_RATE,
                    SERVICE_UUIDS.CYCLING_POWER,
                    SERVICE_UUIDS.FITNESS_MACHINE,
                ],
            });

            if (!device) return;

            const server = await device.gatt?.connect();
            if (!server) throw new Error('Could not connect to GATT server');

            set({ isConnected: true, deviceName: device.name || 'Unknown Device' });

            // Setup Services
            await setupHeartRate(server, set);
            await setupCyclingPower(server, set);
            await setupFTMS(server, set);

            device.addEventListener('gattserverdisconnected', () => {
                set({ isConnected: false, deviceName: null, controlPoint: null });
            });

        } catch (error) {
            console.error('Bluetooth connection failed:', error);
        }
    },

    disconnect: () => {
        const { isSimulating } = get();
        if (isSimulating) {
            if (simulationInterval) clearInterval(simulationInterval);
            set({ isConnected: false, deviceName: null });
            return;
        }
        // Real device disconnect logic would go here if we stored the device reference
        // For now, just reset state
        set({ isConnected: false, deviceName: null, controlPoint: null });
    },

    toggleSimulation: () => {
        set((state) => ({ isSimulating: !state.isSimulating }));
    },

    setTargetPower: async (watts: number) => {
        const { isSimulating, controlPoint } = get();
        console.log(`Setting target power to ${watts}W`);

        if (isSimulating) {
            // In simulation, we just log it. 
            // Ideally, the simulated power would trend towards this target.
            return;
        }

        if (controlPoint) {
            try {
                // FTMS Set Target Power (Opcode 0x05)
                // Format: Opcode (1 byte) + Power (2 bytes, sint16)
                const buffer = new ArrayBuffer(3);
                const view = new DataView(buffer);
                view.setUint8(0, 0x05); // Opcode: Set Target Power
                view.setInt16(1, watts, true); // Power value (Little Endian)

                await controlPoint.writeValue(buffer);
            } catch (e) {
                console.error('Failed to set target power via FTMS:', e);
            }
        }
    },
}));

// Service Handlers

async function setupHeartRate(server: BluetoothRemoteGATTServer, set: any) {
    try {
        const service = await server.getPrimaryService(SERVICE_UUIDS.HEART_RATE);
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT);

        await characteristic.startNotifications();

        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const flags = value.getUint8(0);
            let hr = 0;

            // Check if format is 8-bit (0) or 16-bit (1)
            if (flags & 0x01) {
                hr = value.getUint16(1, true); // 16-bit
            } else {
                hr = value.getUint8(1); // 8-bit
            }

            set({ heartRate: hr });
        });

        console.log('Heart Rate service connected');
    } catch (e) {
        console.warn('Heart Rate service not found or failed to connect', e);
    }
}

async function setupCyclingPower(server: BluetoothRemoteGATTServer, set: any) {
    try {
        const service = await server.getPrimaryService(SERVICE_UUIDS.CYCLING_POWER);
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUIDS.CYCLING_POWER_MEASUREMENT);

        await characteristic.startNotifications();

        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const flags = value.getUint16(0, true);

            // Instant Power is always present at offset 2 (sint16)
            const power = value.getInt16(2, true);
            set({ power });

            let offset = 4;

            // Check for Pedal Power Balance (Bit 0)
            if (flags & (1 << 0)) {
                offset += 1;
            }

            // Check for Accumulated Torque (Bit 2)
            if (flags & (1 << 2)) {
                offset += 2;
            }

            // Check for Wheel Revolution Data (Bit 4)
            if (flags & (1 << 4)) {
                offset += 6; // 4 bytes for revs, 2 bytes for time
            }

            // Check for Crank Revolution Data (Bit 5) - Cadence
            if (flags & (1 << 5)) {
                // const cumulativeCrankRevs = value.getUint16(offset, true);
                // const lastCrankEventTime = value.getUint16(offset + 2, true);

                // For now, we just advance offset. 
                offset += 4;
            }
        });

        console.log('Cycling Power service connected');
    } catch (e) {
        console.warn('Cycling Power service not found or failed to connect', e);
    }
}

async function setupFTMS(server: BluetoothRemoteGATTServer, set: any) {
    try {
        const service = await server.getPrimaryService(SERVICE_UUIDS.FITNESS_MACHINE);
        const controlPoint = await service.getCharacteristic(CHARACTERISTIC_UUIDS.FTMS_CONTROL_POINT);

        // Request Control (Opcode 0x00)
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, 0x00);
        await controlPoint.writeValue(buffer);

        set({ controlPoint });
        console.log('FTMS Control Point connected and control requested');

        // Subscribe to Indoor Bike Data for cadence and other metrics
        try {
            const indoorBikeData = await service.getCharacteristic(CHARACTERISTIC_UUIDS.INDOOR_BIKE_DATA);
            await indoorBikeData.startNotifications();

            indoorBikeData.addEventListener('characteristicvaluechanged', (event: any) => {
                const value = event.target.value;
                const flags = value.getUint16(0, true);
                let offset = 2;

                // Instantaneous Speed (if present, Bit 0)
                if (flags & (1 << 0)) {
                    offset += 2;
                }

                // Average Speed (if present, Bit 1)
                if (flags & (1 << 1)) {
                    offset += 2;
                }

                // Instantaneous Cadence (if present, Bit 2)
                if (flags & (1 << 2)) {
                    const cadence = value.getUint16(offset, true) * 0.5; // Resolution 0.5 RPM
                    set({ cadence: Math.round(cadence) });
                    offset += 2;
                }

                // Average Cadence (if present, Bit 3)
                if (flags & (1 << 3)) {
                    offset += 2;
                }

                // Instantaneous Power (if present, Bit 6)
                if (flags & (1 << 6)) {
                    const power = value.getInt16(offset, true);
                    set({ power });
                    offset += 2;
                }

                // Average Power (if present, Bit 7)
                if (flags & (1 << 7)) {
                    offset += 2;
                }
            });

            console.log('FTMS Indoor Bike Data connected for cadence');
        } catch (e) {
            console.warn('Indoor Bike Data characteristic not found', e);
        }
    } catch (e) {
        console.warn('FTMS service not found or failed to connect', e);
    }
}

function startSimulation(set: any) {
    if (simulationInterval) clearInterval(simulationInterval);

    let power = 150;
    let hr = 120;
    let cadence = 80;

    simulationInterval = setInterval(() => {
        // Random walk
        power += Math.floor(Math.random() * 10) - 5;
        hr += Math.floor(Math.random() * 4) - 2;
        cadence += Math.floor(Math.random() * 6) - 3;

        // Bounds
        power = Math.max(50, Math.min(400, power));
        hr = Math.max(60, Math.min(190, hr));
        cadence = Math.max(40, Math.min(120, cadence));

        set({ power, heartRate: hr, cadence });
    }, 1000);
}
