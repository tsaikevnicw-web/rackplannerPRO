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

export const getFabricGroup = (dev, designType) => {
    if (designType === 'msft') return 'North-South';
    if (dev.fabricGroup) return dev.fabricGroup;
    if (dev.type === 'Switch1G' || dev.type === 'Switch10G' || dev.type === 'Router') return 'North-South';
    return 'East-West';
};

export const getNicCount = (dev, key, designType) => {
    if (key === 'super_nic_mgt' && designType === 'msft') return 0;
    if (key === 'ns_nic_1') {
        const val = parseInt(dev.hardwareSpecs?.['pcie_slot_1']?.qty);
        if (!isNaN(val)) return val;
    }
    if (key === 'ns_nic_2') {
        const val = parseInt(dev.hardwareSpecs?.['pcie_slot_2']?.qty);
        if (!isNaN(val)) return val;
    }
    const val = parseInt(dev.hardwareSpecs?.[key]?.qty);
    if (!isNaN(val)) return val;
    return 0;
};

export const getSwitchPortCount = (dev) => {
    if (!dev) return 48;
    const portsVal = parseInt(dev.hardwareSpecs?.ports?.qty);
    if (!isNaN(portsVal) && portsVal > 0) return portsVal;
    const portQtyVal = parseInt(dev.hardwareSpecs?.portQty?.qty);
    if (!isNaN(portQtyVal) && portQtyVal > 0) return portQtyVal;
    if (dev.type === 'Switch1G') return 48;
    if (dev.type === 'Switch400G1U' || dev.type === 'Switch400G') return 32;
    if (dev.type === 'Switch800G') return 64;
    if (dev.type === 'Router') return 24;
    return 48; // Default for Switch
};

export const getSwitchSubPortCount = (dev) => {
    if (!dev) return 0;
    const sub = dev.hardwareSpecs?.subPorts;
    if (!sub || !sub.enabled) return 0;
    const qty = parseInt(sub.qty);
    return isNaN(qty) ? 0 : qty;
};

export const getSwitchSubPortSpeed = (dev) => {
    if (!dev) return '';
    return dev.hardwareSpecs?.subPorts?.speed || '';
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

export const getSwitchPortNumber = (rIdx, cIdx, rows, cols, isMsft = false, devSize = 1, totalPorts = 48) => {
    if (!isMsft) {
        return rIdx * cols + cIdx + 1;
    }
    if (devSize === 1 || rows === 2) {
        if (rIdx === 0) return cIdx * 2 + 1;
        if (rIdx === 1) return cIdx * 2 + 2;
    }
    if (devSize >= 2 && totalPorts >= 48) {
        return cIdx * rows + rIdx + 1;
    }
    return rIdx * cols + cIdx + 1;
};

export const getCustomNetworkPortLabel = (dev, portNum) => {
    const customNet = dev?.hardwareSpecs?.customNetwork;
    if (!customNet) return `Port ${portNum}`;
    if (customNet.portNames && customNet.portNames[portNum]) {
        return customNet.portNames[portNum];
    }
    if (customNet.portName) {
        return `${customNet.portName} ${portNum}`;
    }
    return `Port ${portNum}`;
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

export const getServerCategory = (dev) => {
    if (!dev || !dev.type || !dev.type.startsWith('Server')) return null;
    if (dev.type === 'ServerHighDensity' || dev.type === 'Server2U2N') return 'HighDensity';
    if (dev.type === 'ServerAI' || dev.type === 'Server5U') return 'AI';
    return 'General';
};

export const getServerConfig = (dev) => {
    if (!dev) return null;
    if (dev.serverConfig) return dev.serverConfig;
    const cat = getServerCategory(dev);
    if (cat === 'General') {
        return `${dev.size || 1}U`;
    } else if (cat === 'HighDensity') {
        if (dev.type === 'Server2U2N') return '2U2N';
        return '1U1N';
    } else if (cat === 'AI') {
        return `${dev.size || 5}U`;
    }
    return null;
};

export const getHighDensityNodes = (dev) => {
    const config = getServerConfig(dev);
    if (config === '1U1N' || config === '2U1N') return ['n1'];
    if (config === '1U2N' || config === '2U2N') return ['n1', 'n2'];
    if (config === '2U4N') return ['n1', 'n2', 'n3', 'n4'];
    return ['n1', 'n2']; // Default fallback for Server2U2N
};

export const getHighDensitySize = (opt) => {
    if (!opt) return 1;
    if (opt.startsWith('1U')) return 1;
    if (opt.startsWith('2U')) return 2;
    return 1;
};

export const getAIServerSize = (opt) => {
    if (!opt) return 5;
    const val = parseInt(opt);
    return isNaN(val) ? 5 : val;
};

export const getPcieSlotInfo = (dev, slotIdx, nodeKey = null) => {
    const slotKey = nodeKey ? `pcie_slot_${slotIdx}_${nodeKey}` : `pcie_slot_${slotIdx}`;
    const spec = dev.hardwareSpecs?.[slotKey];
    let model = spec?.model || '';
    let qty = parseInt(spec?.qty);
    
    // Fallback for legacy data (ns_nic_1 / ns_nic_2)
    if (slotIdx <= 2) {
        const legacyKey = nodeKey ? `ns_nic_${slotIdx}_${nodeKey}` : `ns_nic_${slotIdx}`;
        const legacySpec = dev.hardwareSpecs?.[legacyKey];
        if (!model && legacySpec?.model) {
            model = legacySpec.model;
        }
        if (isNaN(qty)) {
            qty = parseInt(legacySpec?.qty);
        }
    }
    
    // Default fallbacks if still not specified
    if (!model) {
        model = `PCIe Slot ${slotIdx}`;
    }
    if (isNaN(qty)) {
        qty = slotIdx <= 2 ? 2 : 0;
    }
    
    return { model, qty };
};

export const getDeviceWeight = (dev) => {
    if (dev.weight !== undefined && dev.weight !== null && !isNaN(Number(dev.weight))) {
        return Number(dev.weight);
    }
    const type = dev.type || '';
    const size = Number(dev.size || 1);
    if (type.startsWith('ServerAI') || type === 'Server5U') return 80;
    if (type === 'Server2U2N' || type === 'ServerHighDensity') return 35;
    if (type === 'Server1U') return 15;
    if (type === 'Server2U') return 25;
    if (type.startsWith('Server')) return size * 15;
    if (type.startsWith('Switch') || type === 'Router') return 10;
    if (type === 'PowerShelf') return 15;
    if (type === 'PDU') return 5;
    if (type.startsWith('UPS')) return 50;
    if (type.startsWith('CDU')) return 60;
    return size * 5; // Fallback
};

export const checkHighGravityWarning = (dev, rack) => {
    if (!dev || !rack) return false;
    const weight = getDeviceWeight(dev);
    const startU = Number(dev.startU);
    const uCount = Number(rack.uCount);
    if (isNaN(weight) || isNaN(startU) || isNaN(uCount)) return false;
    return weight >= 40 && startU > uCount / 2;
};

/**
 * 安全解析連線字串 `${deviceId}-${portKey}`，支援 deviceId 本身包含 `-` 字元的情況
 */
export const parseTargetConnection = (targetKey, devices = []) => {
    if (!targetKey || typeof targetKey !== 'string') {
        return { targetDevId: '', targetPortKey: '', targetDev: null };
    }
    if (devices && devices.length > 0) {
        let matchedDev = null;
        for (let i = 0; i < devices.length; i++) {
            const d = devices[i];
            if (d && d.id && targetKey.startsWith(d.id + '-')) {
                if (!matchedDev || d.id.length > matchedDev.id.length) {
                    matchedDev = d;
                }
            }
        }
        if (matchedDev) {
            return {
                targetDevId: matchedDev.id,
                targetPortKey: targetKey.substring(matchedDev.id.length + 1),
                targetDev: matchedDev
            };
        }
    }
    const dashIdx = targetKey.indexOf('-');
    if (dashIdx === -1) {
        return { targetDevId: targetKey, targetPortKey: '', targetDev: null };
    }
    return {
        targetDevId: targetKey.substring(0, dashIdx),
        targetPortKey: targetKey.substring(dashIdx + 1),
        targetDev: null
    };
};

/**
 * 統一格式化遠端連接埠名稱 (供 CSV 匯出與 PDF 規格書共用)
 */
export const formatRemotePort = (portKey) => {
    if (!portKey) return '-';
    const cleanKey = portKey.replace(/__\d+$/, '');

    // 1. PCIe slot with node: pcie_slot_1_n1-2 -> N1 Slot 1 P2
    const pcieNodeMatch = cleanKey.match(/^pcie_slot_(\d+)_([nN]\d+)-(\d+)$/);
    if (pcieNodeMatch) {
        const [, slotIdx, nodeKey, portIdx] = pcieNodeMatch;
        return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
    }

    // 2. PCIe slot standard: pcie_slot_1-2 -> Slot 1 P2
    const pcieMatch = cleanKey.match(/^pcie_slot_(\d+)-(\d+)$/);
    if (pcieMatch) {
        const [, slotIdx, portIdx] = pcieMatch;
        return `Slot ${slotIdx} P${portIdx}`;
    }

    // 3. BMC with node: bmc_n1 -> N1 MGMT
    const bmcNodeMatch = cleanKey.match(/^bmc_([nN]\d+)$/);
    if (bmcNodeMatch) {
        const [, nodeKey] = bmcNodeMatch;
        return `${nodeKey.toUpperCase()} MGMT`;
    }

    // 4. OCP with node: ocp_n1-1 -> N1 OCP P1
    const ocpNodeMatch = cleanKey.match(/^ocp_([nN]\d+)-(\d+)$/);
    if (ocpNodeMatch) {
        const [, nodeKey, portIdx] = ocpNodeMatch;
        return `${nodeKey.toUpperCase()} OCP P${portIdx}`;
    }

    // 5. Legacy NS-NIC with node: ns_nic_1_n1-2 -> N1 Slot 1 P2
    const legacyNicNodeMatch = cleanKey.match(/^ns_nic_(\d+)_([nN]\d+)-(\d+)$/);
    if (legacyNicNodeMatch) {
        const [, slotIdx, nodeKey, portIdx] = legacyNicNodeMatch;
        return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
    }

    // 6. Legacy NS-NIC standard: ns_nic_1-2 -> Slot 1 P2
    const legacyNicMatch = cleanKey.match(/^ns_nic_(\d+)-(\d+)$/);
    if (legacyNicMatch) {
        const [, slotIdx, portIdx] = legacyNicMatch;
        return `Slot ${slotIdx} P${portIdx}`;
    }

    // 7. General formatting
    if (cleanKey.startsWith('cx8-')) return cleanKey.replace('cx8-', 'EW NIC P');
    if (cleanKey.startsWith('ocp-')) return cleanKey.replace('ocp-', 'OCP P');
    if (cleanKey.startsWith('port-')) return cleanKey.replace('port-', 'Port ');
    if (cleanKey.startsWith('subport-')) return cleanKey.replace('subport-', 'SubPort ');
    if (cleanKey === 'bmc') return 'MGMT';

    return cleanKey;
};

/**
 * 計算單一機櫃的功耗與重量統計
 */
export const getRackStats = (rack, devices = []) => {
    if (!rack) return { power: 0, weight: 0, isCooling: false };
    if (rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone') {
        return { power: 0, weight: 0, isCooling: false };
    }

    if (rack.type === 'Cooling') return { power: rack.power || 4500, weight: rack.weight || 320, isCooling: true };
    if (rack.type === 'CDU') return { power: rack.power || 2500, weight: rack.weight || 350, isCooling: true };
    if (rack.type === 'UPS') return { power: 0, weight: rack.weight || 850, isCooling: false };
    if (rack.type === 'Battery') return { power: 0, weight: rack.weight || 1200, isCooling: false };
    if (rack.type === 'Switchboard') return { power: 0, weight: rack.weight || 420, isCooling: false };
    if (rack.type === 'PowerPanel') return { power: 0, weight: rack.weight || 120, isCooling: false };
    if (rack.type === 'FireSuppression') return { power: 0, weight: rack.weight || 250, isCooling: false };
    if (rack.type === 'Monitoring') return { power: 0, weight: rack.weight || 180, isCooling: false };
    if (rack.type === 'EnvControl') return { power: 0, weight: rack.weight || 150, isCooling: false };

    const rackDevices = devices.filter(d => d.rackId === rack.id);
    const devicePower = rackDevices.reduce((sum, d) => sum + (d.power || 0), 0);
    const deviceWeight = rackDevices.reduce((sum, d) => sum + (d.weight !== undefined && d.weight !== null ? Number(d.weight) : 10), 0);

    return {
        power: devicePower,
        weight: (rack.weight || 150) + deviceWeight,
        isCooling: false
    };
};

/**
 * 計算單一貨櫃的總重、IT功耗、冷卻功耗、總功耗與 PUE
 */
export const getSingleContainerStats = (container, racks = [], devices = []) => {
    if (!container) {
        return { totalWeight: 0, totalItPower: 0, totalCoolingPower: 0, totalPower: 0, pue: 1.15 };
    }
    const activeRacks = racks.filter(r => (r.containerId || 'container-1') === container.id);
    const selfW = container.selfWeight !== undefined
        ? container.selfWeight
        : (container.type === '20ft' ? 2200 : (container.type === '40ft' ? 3800 : (container.customLength ? container.customLength * 95 : 3800)));

    let totalWeight = selfW;
    let totalItPower = 0;
    let totalCoolingPower = 0;

    activeRacks.forEach(rack => {
        if (rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone') return;
        const stats = getRackStats(rack, devices);
        totalWeight += stats.weight;
        if (stats.isCooling) {
            totalCoolingPower += stats.power;
        } else {
            totalItPower += stats.power;
        }
    });

    const upsLosses = totalItPower * 0.05;
    const pue = totalItPower > 0
        ? (totalItPower + totalCoolingPower + upsLosses) / totalItPower
        : 1.15;

    return {
        totalWeight,
        totalItPower,
        totalCoolingPower,
        totalPower: totalItPower + totalCoolingPower + upsLosses,
        pue: Math.max(1.15, pue)
    };
};

/**
 * 計算全專案所有貨櫃的彙總統計指標 (供 Header 頂部資訊列使用)
 */
export const calculateAllContainersStats = (containers = [], racks = [], devices = []) => {
    let totalWeight = 0;
    let totalItPower = 0;
    let totalCoolingPower = 0;
    let totalWeightLimit = 0;
    let totalPowerLimit = 0;

    containers.forEach(container => {
        totalWeightLimit += (container.weightLimit || 0);
        totalPowerLimit += (container.powerLimit || 0);
        const cStats = getSingleContainerStats(container, racks, devices);
        totalWeight += cStats.totalWeight;
        totalItPower += cStats.totalItPower;
        totalCoolingPower += cStats.totalCoolingPower;
    });

    const upsLosses = totalItPower * 0.05;
    const pue = totalItPower > 0
        ? (totalItPower + totalCoolingPower + upsLosses) / totalItPower
        : 1.15;

    return {
        totalWeight,
        totalItPower,
        totalCoolingPower,
        totalPower: totalItPower + totalCoolingPower + upsLosses,
        pue: Math.max(1.15, pue),
        totalWeightLimit,
        totalPowerLimit
    };
};

/**
 * 同步計算並維護設備與同機櫃 CDU 之間的水冷管線連接 (純函式，避免額外 useEffect 二次渲染)
 */
export const syncLiquidCoolingConnections = (devices) => {
    if (!Array.isArray(devices) || devices.length === 0) return devices;

    let changed = false;
    const nextDevices = devices.map(dev => {
        const isServer = (dev.type || '').startsWith('Server') || (dev.type || '').startsWith('Storage');
        if (!isServer) return dev;

        const hostCooling = dev.hardwareSpecs?.cooling?.host || 'AC';
        const gpuCooling = dev.hardwareSpecs?.cooling?.gpu || 'AC';
        const isHostLC = hostCooling === 'LC';
        const isGpuLC = gpuCooling === 'LC';

        const cdu = devices.find(d =>
            d.rackId === dev.rackId &&
            (d.type === 'CDU4U' || d.type === 'SideCDU')
        );

        const newConns = { ...(dev.connections || {}) };
        let devChanged = false;

        if (isHostLC && cdu) {
            const expectedCold = `${cdu.id}-water_cold`;
            const expectedHot = `${cdu.id}-water_hot`;
            if (newConns.host_water_cold !== expectedCold) {
                newConns.host_water_cold = expectedCold;
                devChanged = true;
            }
            if (newConns.host_water_hot !== expectedHot) {
                newConns.host_water_hot = expectedHot;
                devChanged = true;
            }
        } else {
            if (newConns.host_water_cold) {
                delete newConns.host_water_cold;
                devChanged = true;
            }
            if (newConns.host_water_hot) {
                delete newConns.host_water_hot;
                devChanged = true;
            }
        }

        const isAI = getServerCategory(dev) === 'AI';
        if (isGpuLC && isAI && cdu) {
            const expectedCold = `${cdu.id}-water_cold`;
            const expectedHot = `${cdu.id}-water_hot`;
            if (newConns.water_cold !== expectedCold) {
                newConns.water_cold = expectedCold;
                devChanged = true;
            }
            if (newConns.water_hot !== expectedHot) {
                newConns.water_hot = expectedHot;
                devChanged = true;
            }
        } else {
            if (newConns.water_cold) {
                delete newConns.water_cold;
                devChanged = true;
            }
            if (newConns.water_hot) {
                delete newConns.water_hot;
                devChanged = true;
            }
        }

        if (devChanged) {
            changed = true;
            return { ...dev, connections: newConns };
        }
        return dev;
    });

    return changed ? nextDevices : devices;
};


