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
    isBikeConnected: boolean;
    isHRConnected: boolean;
    bikeDeviceName: string | null;
    hrDeviceName: string | null;

    connectBike: () => Promise<void>;
    connectHeartRate: () => Promise<void>;
    disconnect: () => void;
    toggleSimulation: () => void;
    setTargetPower: (watts: number) => Promise<void>;
}

// Mock Data Generator State
let simulationInterval: NodeJS.Timeout | null = null;

export const useBluetoothStore = create<BluetoothStore>((set, get) => ({
    isConnected: false, // Deprecated, use specific flags
    isBikeConnected: false,
    isHRConnected: false,
    deviceName: null, // Deprecated
    bikeDeviceName: null,
    hrDeviceName: null,

    batteryLevel: null,
    heartRate: null,
    power: null,
    cadence: null,
    isSimulating: false,
    controlPoint: null,

    connectBike: async () => {
        const { isSimulating } = get();
        if (isSimulating) {
            console.log('Starting Simulation Mode');
            set({ isBikeConnected: true, bikeDeviceName: 'Simulated Bike', isConnected: true });
            startSimulation(set);
            return;
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [SERVICE_UUIDS.FITNESS_MACHINE] },
                    { services: [SERVICE_UUIDS.CYCLING_POWER] },
                ],
                optionalServices: [
                    SERVICE_UUIDS.HEART_RATE, // In case bike also does HR
                    SERVICE_UUIDS.CYCLING_POWER,
                    SERVICE_UUIDS.FITNESS_MACHINE,
                ],
            });

            if (!device) return;

            const server = await device.gatt?.connect();
            if (!server) throw new Error('Could not connect to GATT server');

            set({ isBikeConnected: true, bikeDeviceName: device.name || 'Bike', isConnected: true });

            // Setup Services
            await setupCyclingPower(server, set);
            await setupFTMS(server, set);

            // Try to setup HR from bike too, just in case
            await setupHeartRate(server, set);

            device.addEventListener('gattserverdisconnected', () => {
                set({ isBikeConnected: false, bikeDeviceName: null, controlPoint: null });
            });

        } catch (error) {
            console.error('Bike connection failed:', error);
        }
    },

    connectHeartRate: async () => {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [SERVICE_UUIDS.HEART_RATE] },
                ],
                optionalServices: [
                    SERVICE_UUIDS.HEART_RATE,
                ],
            });

            if (!device) return;

            const server = await device.gatt?.connect();
            if (!server) throw new Error('Could not connect to GATT server');

            set({ isHRConnected: true, hrDeviceName: device.name || 'HR Monitor' });

            // Setup Services
            await setupHeartRate(server, set);

            device.addEventListener('gattserverdisconnected', () => {
                set({ isHRConnected: false, hrDeviceName: null, heartRate: null });
            });

        } catch (error) {
            console.error('HR Monitor connection failed:', error);
        }
    },

    disconnect: () => {
        const { isSimulating } = get();
        if (isSimulating) {
            if (simulationInterval) clearInterval(simulationInterval);
            set({ isConnected: false, isBikeConnected: false, isHRConnected: false, deviceName: null, bikeDeviceName: null, hrDeviceName: null });
            return;
        }
        // Ideally we would disconnect specific devices if we stored their references.
        // For now, just reset state. The browser handles actual disconnects often, or we rely on user to disconnect via browser UI?
        // Actually, without storing 'device' object, we can't call device.gatt.disconnect().
        // But for this prototype, resetting state is the "soft" disconnect.
        set({
            isConnected: false,
            isBikeConnected: false,
            isHRConnected: false,
            deviceName: null,
            bikeDeviceName: null,
            hrDeviceName: null,
            controlPoint: null,
            power: null,
            cadence: null,
            heartRate: null
        });
    },

    toggleSimulation: () => {
        set((state) => ({ isSimulating: !state.isSimulating }));
    },

    setTargetPower: async (watts: number) => {
        const { isSimulating, controlPoint } = get();
        console.log(`Setting target power to ${watts}W`);

        if (isSimulating) {
            return;
        }

        if (controlPoint) {
            try {
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

        // Enable Indications to receive response codes
        await controlPoint.startNotifications();

        controlPoint.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const opcode = value.getUint8(0);

            if (opcode === 0x80) { // Response Code
                const requestOpcode = value.getUint8(1);
                const resultCode = value.getUint8(2);

                let resultStr = 'Unknown';
                switch (resultCode) {
                    case 0x01: resultStr = 'Success'; break;
                    case 0x02: resultStr = 'Op Code not supported'; break;
                    case 0x03: resultStr = 'Invalid Parameter'; break;
                    case 0x04: resultStr = 'Operation Failed'; break;
                    case 0x05: resultStr = 'Control Not Permitted'; break;
                }

                console.log(`FTMS Control Point Response: Request 0x${requestOpcode.toString(16)} -> ${resultStr} (0x${resultCode.toString(16)})`);
            }
        });

        // Request Control (Opcode 0x00)
        console.log('Requesting FTMS Control...');
        const requestControl = new Uint8Array([0x00]);
        await controlPoint.writeValue(requestControl);

        // Send Start or Resume (Opcode 0x07)
        // Some bikes require this to start accepting target power commands
        console.log('Sending Start/Resume command...');
        const startCommand = new Uint8Array([0x07]);
        await controlPoint.writeValue(startCommand);

        set({ controlPoint });
        console.log('FTMS Control Point setup complete');

        // Subscribe to Indoor Bike Data for cadence and other metrics
        try {
            const indoorBikeData = await service.getCharacteristic(CHARACTERISTIC_UUIDS.INDOOR_BIKE_DATA);
            await indoorBikeData.startNotifications();

            indoorBikeData.addEventListener('characteristicvaluechanged', (event: any) => {
                const value = event.target.value;
                const flags = value.getUint16(0, true);
                let offset = 2;

                // Instantaneous Speed is always present (2 bytes)
                offset += 2;

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
