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
    if (key === 'ns_nic_1') return dev.type === 'Server5U' ? 4 : 2;
    return 0;
};

export const getSwitchPortCount = (dev) => {
    const val = parseInt(dev.hardwareSpecs?.ports?.qty);
    if (!isNaN(val)) return val;
    if (dev.type === 'Switch1G') return 48;
    if (dev.type === 'Switch400G1U' || dev.type === 'Switch400G') return 32;
    if (dev.type === 'Switch800G') return 64;
    if (dev.type === 'Router') return 24;
    return 24;
};

export const getSwitchPortLayout = (portCount) => {
    if (portCount === 48) return { rows: 2, cols: 24 };
    if (portCount === 32) return { rows: 2, cols: 16 };
    if (portCount === 64) return { rows: 4, cols: 16 };
    if (portCount === 24) return { rows: 2, cols: 12 };

    const cols = Math.ceil(portCount / 2);
    return { rows: 2, cols: cols > 0 ? cols : 1 };
};

export const getGroupedDevices = (devList, racks) => {
    const groups = {};
    devList.forEach(d => {
        const gName = d.topologyGroup || racks.find(r => r.id === d.rackId)?.name || '未分類群組';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(d);
    });
    return Object.entries(groups).map(([name, devs]) => ({ name, devs }));
};
