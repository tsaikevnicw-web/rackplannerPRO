import { Server } from 'lucide-react';
import { DEVICE_TEMPLATES } from './constants';

export const getIconByType = (type) => {
    for (const tpl of DEVICE_TEMPLATES) {
        if (tpl.isGroup) {
            const sub = tpl.subItems.find(s => s.type === type);
            if (sub) return sub.icon;
        } else {
            if (tpl.type === type) return tpl.icon;
        }
    }
    return Server;
};

export const getFabricGroup = (dev) => {
    if (dev.fabricGroup) return dev.fabricGroup;
    if (dev.type === 'Switch1G' || dev.type === 'Switch10G' || dev.type === 'Router') return 'North-South';
    return 'East-West';
};

export const getNicCount = (dev, key) => {
    const val = parseInt(dev.hardwareSpecs?.[key]?.qty);
    if (!isNaN(val)) return val;
    return 0;
};

export const getSwitchPortCount = (dev) => {
    const val = parseInt(dev.hardwareSpecs?.ports?.qty);
    if (!isNaN(val)) return val;
    if (dev.type === 'Switch1G') return 48;
    if (dev.type === 'Switch400G1U' || dev.type === 'Switch400G') return 32;
    if (dev.type === 'Switch800G') return 64;
    if (dev.type === 'Router') return 24;
    return 48; // Default for Switch
};

export const getSwitchPortLayout = (portCount, size = 1) => {
    if (size >= 2) {
        if (portCount > 32) {
            const cols = Math.ceil(portCount / 4);
            return { rows: 4, cols: cols > 0 ? cols : 1 };
        } else {
            const cols = Math.ceil(portCount / 2);
            return { rows: 2, cols: cols > 0 ? cols : 1 };
        }
    }

    const cols = Math.ceil(portCount / 2);
    return { rows: 2, cols: cols > 0 ? cols : 1 };
};

export const getGroupedDevices = (devList, racks) => {
    const groups = {};
    devList.forEach(d => {
        const gName = getDeviceGroupName(d, racks);
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(d);
    });
    return Object.entries(groups).map(([name, devs]) => ({ name, devs }));
};

export const getDeviceGroupName = (dev, racks) => {
    return dev.topologyGroup || racks.find(r => r.id === dev.rackId)?.name || '未分類群組';
};

export const getDeviceLayerPrefix = (dev) => {
    const isSwitchOrRouter = (dev.type || '').startsWith('Switch') || dev.type === 'Router';
    if (!isSwitchOrRouter) {
        if (dev.type === 'Blank' || dev.type === 'UPS' || dev.type === 'SideCDU') return null;
        return 'EP';
    }
    const fabric = getFabricGroup(dev);
    const isSpine = dev.networkRole === 'Spine';
    if (fabric === 'North-South') return isSpine ? 'NS-Spine' : 'NS-Leaf';
    return isSpine ? 'Spine' : 'Leaf';
};
