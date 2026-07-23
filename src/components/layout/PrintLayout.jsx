import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getServerCategory, getFabricGroup, getHighDensityNodes, getNicCount, getSwitchPortCount } from '../../utils/helpers';

const PrintLayout = ({ isForDownload = false }) => {
    const { racks, devices, rackScreenshots, topoScreenshot, printTimestamp, projectName, projectInfo } = useRackPlanner();

    const totalSpace = devices.filter(d => d.type !== 'SideCDU').reduce((sum, dev) => sum + (dev.size || 0), 0);
    const totalPower = devices.reduce((sum, dev) => sum + (dev.power || 0), 0);
    const totalPrice = devices.reduce((sum, dev) => sum + (dev.price || 0), 0);

    const sortedDevices = [...devices].sort((a, b) => {
        if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
        return b.startU - a.startU;
    });



    const formatRemotePortPrint = (portKey) => {
        if (!portKey) return '-';
        const pcieNodeMatch = portKey.match(/^pcie_slot_(\d+)_([nN]\d+)-(\d+)$/);
        if (pcieNodeMatch) {
            const [, slotIdx, nodeKey, portIdx] = pcieNodeMatch;
            return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
        }
        const pcieMatch = portKey.match(/^pcie_slot_(\d+)-(\d+)$/);
        if (pcieMatch) {
            const [, slotIdx, portIdx] = pcieMatch;
            return `Slot ${slotIdx} P${portIdx}`;
        }
        if (portKey.startsWith('cx8-')) return portKey.replace('cx8-', 'EW NIC P');
        if (portKey.startsWith('ocp-')) return portKey.replace('ocp-', 'OCP P');
        if (portKey.startsWith('port-')) return portKey.replace('port-', 'Port ');
        if (portKey === 'bmc') return 'BMC';
        return portKey;
    };

    const getDeviceSpecsSummary = (dev) => {
        if (!dev) return '-';
        
        const hw = dev.hardwareSpecs || {};
        const type = dev.type || '';

        // 1. CDU
        if (type === 'CDU4U' || type === 'SideCDU') {
            const defaultCapacity = type === 'CDU4U' ? 80000 : 150000;
            const capVal = dev.coolingCapacity || defaultCapacity;
            const capacity = capVal ? `${capVal.toLocaleString()}W` : '';
            const power = dev.power ? `${dev.power}W` : '';
            return [
                capacity ? `解熱能力: ${capacity}` : '',
                power ? `功耗: ${power}` : ''
            ].filter(Boolean).join(', ') || 'CDU 液冷分配單元';
        }

        // 2. Switch
        if (type.startsWith('Switch')) {
            const defaultPorts = type === 'Switch1G' ? 48 : (type === 'Switch800G' ? 64 : 32);
            const ports = getNicCount(dev, 'ports') || getSwitchPortCount(dev) || defaultPorts;
            
            let defaultSpeed = '10Gbps';
            if (type === 'Switch1G') defaultSpeed = '1Gbps';
            else if (type === 'Switch10G') defaultSpeed = '10Gbps';
            else if (type === 'Switch400G1U' || type === 'Switch400G') defaultSpeed = '400Gbps';
            else if (type === 'Switch800G') defaultSpeed = '800Gbps';
            const speed = hw.speed?.model || defaultSpeed;
            
            const role = dev.networkRole || (type === 'Switch800G' ? 'Spine' : 'Leaf');
            return `${ports} 埠交換器 (速率: ${speed}), 角色: ${role}`;
        }

        // 3. Router
        if (type === 'Router') {
            const ports = hw.ports?.qty || getSwitchPortCount(dev) || 24;
            const speed = hw.speed?.model || '10Gbps';
            const role = dev.networkRole || 'Spine';
            return `${ports} 埠路由器 (速率: ${speed}), 角色: ${role}`;
        }

        // 4. UPS
        if (type === 'UPS') {
            const power = dev.power || 2000;
            return `不斷電系統, 額定容量/功耗: ${power}W`;
        }

        // 5. Blank panel
        if (type === 'Blank') {
            return `空白機櫃擋板 (${dev.size || 1}U)`;
        }

        // 6. Servers and Storages
        const isHighDensity = getServerCategory(dev) === 'HighDensity';
        const isServerOrStorage = type.startsWith('Server') || type.startsWith('Storage');

        if (!isServerOrStorage) {
            return '-';
        }

        const formatPart = (part) => {
            if (!part) return null;
            if (part.model || part.qty) {
                return `${part.model || '標準元件'} *${part.qty !== undefined ? part.qty : 1}`;
            }
            return null;
        };

        const isConfigured = (part) => {
            return part && (part.model || part.qty);
        };

        if (isHighDensity) {
            const hdNodes = getHighDensityNodes(dev); // e.g., ['n1', 'n2']
            const nodeSummaries = hdNodes.map((nodeKey, idx) => {
                const nodeNum = idx + 1;
                const parts = [];
                
                const cpu = hw[`cpu_${nodeKey}`];
                const dimm = hw[`dimm_${nodeKey}`];
                const ocp = hw[`ocp_${nodeKey}`];
                const nic1 = hw[`ns_nic_1_${nodeKey}`];
                const gpu = hw[`gpu_${nodeKey}`];
                const m2 = hw[`m2_${nodeKey}`];
                const hdd = hw[`hdd_${nodeKey}`];

                if (isConfigured(cpu)) parts.push(`CPU: ${formatPart(cpu)}`);
                if (isConfigured(dimm)) parts.push(`DIMM: ${formatPart(dimm)}`);
                if (isConfigured(ocp)) parts.push(`OCP: ${formatPart(ocp)}`);
                if (isConfigured(nic1)) parts.push(`NIC1: ${formatPart(nic1)}`);
                if (isConfigured(gpu)) parts.push(`GPU: ${formatPart(gpu)}`);
                if (isConfigured(m2)) parts.push(`M.2: ${formatPart(m2)}`);
                if (isConfigured(hdd)) parts.push(`HDD: ${formatPart(hdd)}`);

                // PCIe slots for node
                const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                const pcieSlotQty = hw[pcieSlotQtyKey]?.qty || 2;
                const slots = [];
                for (let s = 1; s <= pcieSlotQty; s++) {
                    const slotKey = `pcie_slot_${s}_${nodeKey}`;
                    const slotVal = hw[slotKey];
                    if (isConfigured(slotVal)) {
                        slots.push(`Slot ${s}: ${formatPart(slotVal)}`);
                    }
                }
                if (slots.length > 0) {
                    parts.push(`PCIe [${slots.join(', ')}]`);
                }

                return parts.length > 0 ? `Node ${nodeNum}: (${parts.join('; ')})` : '';
            }).filter(Boolean);

            return nodeSummaries.join(' | ') || `高密度伺服器 (${hdNodes.length}節點, 未設定詳細規格)`;
        } else {
            // General or AI Server or Storage
            const parts = [];
            if (isConfigured(hw.cpu)) parts.push(`CPU: ${formatPart(hw.cpu)}`);
            if (isConfigured(hw.dimm)) parts.push(`DIMM: ${formatPart(hw.dimm)}`);
            
            // NICs / OCP
            if (isConfigured(hw.ns_nic_1)) parts.push(`NIC1: ${formatPart(hw.ns_nic_1)}`);
            if (isConfigured(hw.ns_nic_2)) parts.push(`NIC2: ${formatPart(hw.ns_nic_2)}`);
            if (isConfigured(hw.ocp)) parts.push(`OCP: ${formatPart(hw.ocp)}`);

            // GPU / Accelerator
            if (getServerCategory(dev) === 'AI') {
                const accel = hw.accelerator?.type || 'Nvidia';
                if (isConfigured(hw.gpu)) {
                    parts.push(`GPU: ${accel} ${formatPart(hw.gpu)}`);
                }
            } else if (isConfigured(hw.gpu)) {
                parts.push(`GPU: ${formatPart(hw.gpu)}`);
            }

            // Storage / PSU / Cooling
            if (isConfigured(hw.m2)) parts.push(`M.2: ${formatPart(hw.m2)}`);
            if (isConfigured(hw.hdd)) parts.push(`HDD: ${formatPart(hw.hdd)}`);
            if (isConfigured(hw.psu54v)) parts.push(`54V PSU: ${formatPart(hw.psu54v)}`);
            if (isConfigured(hw.psu12v)) parts.push(`12V PSU: ${formatPart(hw.psu12v)}`);
            
            // PCIe slots
            const pcieSlotQty = hw.pcieSlotQty?.qty || 2;
            const slots = [];
            for (let s = 1; s <= pcieSlotQty; s++) {
                const slotKey = `pcie_slot_${s}`;
                const slotVal = hw[slotKey];
                if (isConfigured(slotVal)) {
                    slots.push(`Slot ${s}: ${formatPart(slotVal)}`);
                }
            }
            if (slots.length > 0) {
                parts.push(`PCIe [${slots.join(', ')}]`);
            }

            if (hw.cooling?.host || hw.cooling?.gpu) {
                const hostCool = hw.cooling.host || 'AC';
                const gpuCool = hw.cooling.gpu || 'AC';
                parts.push(`冷卻: 主機 ${hostCool} / GPU ${gpuCool}`);
            }

            if (isConfigured(hw.other)) parts.push(`其他: ${formatPart(hw.other)}`);

            if (parts.length > 0) {
                return parts.join(', ');
            }

            // Default fallbacks for unconfigured servers/storages
            if (getServerCategory(dev) === 'AI') {
                return `AI 加速伺服器 (${dev.size || 5}U)`;
            } else if (type.startsWith('Storage')) {
                return `高容量儲存伺服器 (${dev.size || 2}U)`;
            }
            return `通用運算伺服器 (${dev.size || 1}U)`;
        }
    };

    // Grouping logic for repeating items
    const expandedDevices = [];
    sortedDevices.forEach(dev => {
        expandedDevices.push(dev);
        if (dev.type === 'PowerShelf' && projectInfo?.designType === 'msft') {
            const subKeys = [
                { key: 'powerShelfKit', label: 'Power Shelf Kit', type: 'PowerShelfKit' },
                { key: 'powerShelfEnclosure', label: 'Power Shelf Enclosure', type: 'PowerShelfEnclosure' },
                { key: 'powerSupplyUnit', label: 'Power Supply Unit', type: 'PowerSupplyUnit' },
                { key: 'railForPowerShelf', label: 'Rail for Power shelf', type: 'RailForPowerShelf' },
                { key: 'rackScm', label: 'Rack-SCM', type: 'RackScm' },
                { key: 'c13Module', label: 'C-13 Module', type: 'C13Module' },
                { key: 'psuFiller', label: 'PSU filler', type: 'PsuFiller' }
            ];
            subKeys.forEach(sub => {
                if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                    expandedDevices.push({
                        id: `${dev.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: dev.startU,
                        rackId: dev.rackId,
                        isSubDevice: true,
                        hardwareSpecs: {}
                    });
                }
            });
            if (dev.powerShelfCustom && Array.isArray(dev.powerShelfCustom)) {
                dev.powerShelfCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'PowerShelfCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }

        if (dev.type === 'ServerGeneral' && projectInfo?.designType === 'msft') {
            const subKeys = [
                { key: 'computeNode', label: 'Compute Node', type: 'ComputeNode' },
                { key: 'slideRailForNode', label: 'Slide Rail for Node', type: 'SlideRailForNode' },
                { key: 'screwForNodeRail', label: 'Screw for Node Rail', type: 'ScrewForNodeRail' },
                { key: 'nutForNodeRail', label: 'NUT for Node Rail', type: 'NutForNodeRail' }
            ];
            subKeys.forEach(sub => {
                if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                    expandedDevices.push({
                        id: `${dev.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: dev.startU,
                        rackId: dev.rackId,
                        isSubDevice: true,
                        hardwareSpecs: {}
                    });
                }
            });
            if (dev.serverGeneralCustom && Array.isArray(dev.serverGeneralCustom)) {
                dev.serverGeneralCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'ServerGeneralCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }

        if (dev.type === 'Blank' && projectInfo?.designType === 'msft') {
            const subKeys = [
                { key: 'oneOu', label: '1OU', type: 'OneOu' },
                { key: 'ouEia', label: 'OU-EIA', type: 'OuEia' }
            ];
            subKeys.forEach(sub => {
                if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                    expandedDevices.push({
                        id: `${dev.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: dev.startU,
                        rackId: dev.rackId,
                        isSubDevice: true,
                        hardwareSpecs: {}
                    });
                }
            });
            if (dev.blankCustom && Array.isArray(dev.blankCustom)) {
                dev.blankCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'BlankCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }

        if (dev.type === 'StorageJBOD' && projectInfo?.designType === 'msft') {
            const subKeys = [
                { key: 'jbod', label: 'JBOD', type: 'Jbod' },
                { key: 'railForJbod', label: 'Rail for JBOD', type: 'RailForJbod' },
                { key: 'halfOuBlank', label: '0.5OU Blank', type: 'HalfOuBlank' }
            ];
            subKeys.forEach(sub => {
                if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                    expandedDevices.push({
                        id: `${dev.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: dev.startU,
                        rackId: dev.rackId,
                        isSubDevice: true,
                        hardwareSpecs: {}
                    });
                }
            });
            if (dev.jbodCustom && Array.isArray(dev.jbodCustom)) {
                dev.jbodCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'JbodCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }

        if (dev.type === 'StorageJBOF' && projectInfo?.designType === 'msft') {
            const subKeys = [
                { key: 'jbof', label: 'JBOF', type: 'Jbof' },
                { key: 'railForJbof', label: 'Rail for JBOF', type: 'RailForJbof' },
                { key: 'halfOuBlank', label: '0.5OU Blank', type: 'HalfOuBlank' }
            ];
            subKeys.forEach(sub => {
                if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                    expandedDevices.push({
                        id: `${dev.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: dev.startU,
                        rackId: dev.rackId,
                        isSubDevice: true,
                        hardwareSpecs: {}
                    });
                }
            });
            if (dev.jbofCustom && Array.isArray(dev.jbofCustom)) {
                dev.jbofCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'JbofCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }
        if ((dev.type || '').startsWith('Switch') && projectInfo?.designType === 'msft') {
            const switchTag = dev.switchTag;
            if (switchTag === 'tor') {
                const subKeys = [
                    { key: 'tor', label: 'TOR', type: 'Tor' },
                    { key: 'eiaAdapter2U', label: 'EIA 19” Adapter 2U', type: 'EiaAdapter2U' },
                    { key: 'mountingKitTor', label: 'Mounting kit for TOR', type: 'MountingKitTor' },
                    { key: 'powerCordTor', label: 'Power cord for TOR', type: 'PowerCordTor' },
                    { key: 'sleeveC13', label: 'Sleeve C13', type: 'SleeveC13' }
                ];
                subKeys.forEach(sub => {
                    if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                        expandedDevices.push({
                            id: `${dev.id}-${sub.key}`,
                            type: sub.type,
                            customName: sub.label,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            } else if (switchTag === 'mgmt') {
                const subKeys = [
                    { key: 'managementSwitch', label: 'Management Switch', type: 'ManagementSwitch' },
                    { key: 'eiaAdapter1U', label: 'EIA 19” Adapter 1U', type: 'EiaAdapter1U' },
                    { key: 'mountingKitMgmt', label: 'Mounting kit for MGMT', type: 'MountingKitMgmt' },
                    { key: 'powerCordMgmt', label: 'Power cord for MGMT', type: 'PowerCordMgmt' },
                    { key: 'sleeveC13', label: 'Sleeve C13', type: 'SleeveC13' }
                ];
                subKeys.forEach(sub => {
                    if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
                        expandedDevices.push({
                            id: `${dev.id}-${sub.key}`,
                            type: sub.type,
                            customName: sub.label,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
            if (dev.switchCustom && Array.isArray(dev.switchCustom)) {
                dev.switchCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        expandedDevices.push({
                            id: `${dev.id}-custom-${cIdx}`,
                            type: 'SwitchCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: dev.startU,
                            rackId: dev.rackId,
                            isSubDevice: true,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        }
    });

    // Add Rack attachments for MSFT design
    if (projectInfo?.designType === 'msft') {
        racks.forEach(rack => {
            const subKeys = [
                { key: 'rackEnclosure', label: 'Rack enclosure', type: 'RackEnclosure' },
                { key: 'busbar', label: 'Busbar', type: 'Busbar' },
                { key: 'sidePanel', label: 'Side Panel', type: 'SidePanel' },
                { key: 'leakManagement', label: 'Leak Management', type: 'LeakManagement' },
                { key: 'cableManagement', label: 'Cable Management', type: 'CableManagement' },
                { key: 'rackNut', label: 'NUT', type: 'RackNut' },
                { key: 'rackScrew', label: 'SCREW', type: 'RackScrew' },
                { key: 'ioCables', label: 'IO Cables', type: 'IoCables' },
                { key: 'cat6Rj45', label: 'CAT-6 RJ45', type: 'Cat6Rj45' },
                { key: 'rackGrounding', label: 'Rack Grounding', type: 'RackGrounding' }
            ];
            subKeys.forEach(sub => {
                if (rack[sub.key]) {
                    const rackPosition = projectInfo?.isCdcProject
                        ? (rack.slotIndex !== null && rack.slotIndex !== undefined 
                            ? `Slot ${rack.slotIndex + 1}` 
                            : "未分配")
                        : "一般佈局";
                    expandedDevices.push({
                        id: `${rack.id}-${sub.key}`,
                        type: sub.type,
                        customName: sub.label,
                        size: 0,
                        power: 0,
                        price: 0,
                        startU: 1,
                        rackId: rack.id,
                        isSubDevice: true,
                        customPosition: `${rackPosition} (附屬)`,
                        hardwareSpecs: {}
                    });
                }
            });
            if (rack.rackCustom && Array.isArray(rack.rackCustom)) {
                rack.rackCustom.forEach((customItem, cIdx) => {
                    const trimmed = (customItem || '').trim();
                    if (trimmed) {
                        const rackPosition = projectInfo?.isCdcProject
                            ? (rack.slotIndex !== null && rack.slotIndex !== undefined 
                                ? `Slot ${rack.slotIndex + 1}` 
                                : "未分配")
                            : "一般佈局";
                        expandedDevices.push({
                            id: `${rack.id}-custom-${cIdx}`,
                            type: 'RackCustom',
                            customName: trimmed,
                            size: 0,
                            power: 0,
                            price: 0,
                            startU: 1,
                            rackId: rack.id,
                            isSubDevice: true,
                            customPosition: `${rackPosition} (附屬)`,
                            hardwareSpecs: {}
                        });
                    }
                });
            }
        });
    }

    const groupedDevices = [];
    expandedDevices.forEach(dev => {
        const specSummary = getDeviceSpecsSummary(dev);
        const keyName = dev.customName || dev.type || '未指定設備';
        
        const existing = groupedDevices.find(g => 
            g.type === dev.type &&
            (g.customName || g.type) === keyName &&
            (g.power || 0) === (dev.power || 0) &&
            (g.price || 0) === (dev.price || 0) &&
            (g.size || 1) === (dev.size || 1) &&
            g.specSummary === specSummary
        );

        const rackName = racks.find(r => r.id === dev.rackId)?.name || '未知';
        const isSub = dev.isSubDevice;
        const position = dev.customPosition 
            ? dev.customPosition 
            : (dev.type === 'SideCDU' 
                ? 'SideCar' 
                : (isSub 
                    ? `U${dev.startU} (附屬)` 
                    : `U${dev.startU}-U${dev.startU + dev.size - 1}`));

        if (existing) {
            existing.qty += 1;
            existing.positions.push({ rackName, position });
        } else {
            groupedDevices.push({
                ...dev,
                specSummary,
                qty: 1,
                positions: [{ rackName, position }]
            });
        }
    });

    const getGroupedRackCell = (g) => {
        const uniqueRacks = [...new Set(g.positions.map(p => p.rackName))];
        return uniqueRacks.join(', ');
    };

    const getGroupedPositionCell = (g) => {
        if (g.qty === 1) {
            return g.positions[0].position;
        }
        
        const formatPosRange = (pos) => pos.replace(/-U/g, '-');
        const posList = g.positions.map(p => formatPosRange(p.position));
        if (posList.length > 4) {
            return `${posList.slice(0, 3).join(', ')} 等共 ${posList.length} 處`;
        }
        return posList.join(', ');
    };

    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    const getCableRows = () => {
        const rows = [];
        devices.forEach(dev => {
            if (dev.connections) {
                Object.entries(dev.connections).forEach(([localKey, targetKey]) => {
                    if (!targetKey) return;
                    const targetDev = devices.find(d => targetKey.startsWith(d.id + '-'));
                    if (targetDev) {
                        const targetDevId = targetDev.id;
                        const targetPortKey = targetKey.substring(targetDevId.length + 1);
                        const isSwitch = (d) => (d.type || '').startsWith('Switch') || d.type === 'Router';
                        let cableRole = 'General';
                        if (isSwitch(targetDev)) {
                            cableRole = getFabricGroup(targetDev, projectInfo?.designType);
                        } else if (isSwitch(dev)) {
                            cableRole = getFabricGroup(dev, projectInfo?.designType);
                        } else {
                            const srcBase = localKey.replace(/__\d+$/, '');
                            const tgtBase = targetPortKey.replace(/__\d+$/, '');
                            const isBmc = srcBase === 'bmc' || tgtBase === 'bmc' || srcBase.startsWith('bmc') || tgtBase.startsWith('bmc');
                            const isNsPort = srcBase.startsWith('ns_nic_') || tgtBase.startsWith('ns_nic_') || srcBase.startsWith('ocp-') || tgtBase.startsWith('ocp-');
                            if (isBmc || isNsPort) {
                                cableRole = 'North-South';
                            } else {
                                cableRole = 'East-West';
                            }
                        }

                        rows.push({
                            src: dev.customName || dev.type,
                            srcPort: formatRemotePortPrint(localKey),
                            dst: targetDev.customName || targetDev.type,
                            dstPort: formatRemotePortPrint(targetPortKey),
                            role: cableRole
                        });
                    }
                });
            }
        });
        return rows;
    };

    const categorised = {
        cdu: {
            title: "CDU 液冷分配單元 (Cooling Distribution Units)",
            devices: groupedDevices.filter(d => d.type === 'CDU4U' || d.type === 'SideCDU')
        },
        switch: {
            title: "網路交換設備 (Network Switch & Router Devices)",
            devices: groupedDevices.filter(d => (d.type || '').startsWith('Switch') || d.type === 'Router')
        },
        server: {
            title: "運算與儲存伺服器 (Computing & Storage Servers)",
            devices: groupedDevices.filter(d => (d.type || '').startsWith('Server') || (d.type || '').startsWith('Storage'))
        },
        other: {
            title: "其他與空白擋板 (Other Accessories & Panels)",
            devices: groupedDevices.filter(d => 
                d.type !== 'CDU4U' && d.type !== 'SideCDU' &&
                !(d.type || '').startsWith('Switch') && d.type !== 'Router' &&
                !(d.type || '').startsWith('Server') && !(d.type || '').startsWith('Storage')
            )
        }
    };

    const getRowHeight = (dev) => {
        const specSummary = dev.specSummary || '';
        // Estimate lines conservatively: assuming ~32 characters per line for wrapping in 320px column
        const lines = Math.ceil(specSummary.length / 32) || 1;
        return 36 + Math.max(0, lines - 1) * 16;
    };

    const maxPageHeight = 640; // Reduced from 740 to be extremely conservative and prevent any overflow cutoffs
    const bomPages = [];
    let currentPage = [];
    let currentPageHeight = 0;

    const categories = [categorised.cdu, categorised.switch, categorised.server, categorised.other];
    
    categories.forEach(cat => {
        if (cat.devices.length === 0) return;

        let remainingDevices = [...cat.devices];
        let isFirstChunkForCategory = true;

        while (remainingDevices.length > 0) {
            const firstDevHeight = getRowHeight(remainingDevices[0]);
            const headerCost = 65; // title + table header cost
            
            // If the next category header + first row cannot fit in the current page, start a new page
            if (currentPage.length > 0 && currentPageHeight + headerCost + firstDevHeight > maxPageHeight) {
                bomPages.push(currentPage);
                currentPage = [];
                currentPageHeight = 0;
            }

            const section = {
                title: isFirstChunkForCategory ? cat.title : `${cat.title} (續)`,
                rows: []
            };

            currentPageHeight += headerCost;

            while (remainingDevices.length > 0) {
                const dev = remainingDevices[0];
                const devHeight = getRowHeight(dev);

                // Allow if it fits OR if this section has no rows yet (safety guard to prevent infinite loops)
                if (section.rows.length === 0 || currentPageHeight + devHeight <= maxPageHeight) {
                    section.rows.push(dev);
                    currentPageHeight += devHeight;
                    remainingDevices.shift();
                } else {
                    break;
                }
            }

            currentPage.push(section);
            isFirstChunkForCategory = false;
        }
    });

    if (currentPage.length > 0) {
        bomPages.push(currentPage);
    }

    if (bomPages.length === 0) {
        bomPages.push([{ title: categorised.other.title, rows: [] }]);
    }
    
    const bomTotalPages = bomPages.length;

    const cableRows = getCableRows();
    const cableChunks = cableRows.length > 0 ? chunkArray(cableRows, 25) : [[]];
    const cableTotalPages = cableChunks.length;

    const subsequentRackPagesCount = racks.length > 1 ? Math.ceil((racks.length - 1) / 2) : 0;
    const totalDocPages = 1 + subsequentRackPagesCount + 1 + bomTotalPages + cableTotalPages;

    const renderWatermark = () => (
        <div className="pdf-watermark">
            <div className="pdf-watermark-wrapper">
                <div className="pdf-watermark-text">Inventec Confidential</div>
                <div className="pdf-watermark-time">{printTimestamp}</div>
            </div>
        </div>
    );

    const renderMiniHeader = (pageTitle) => (
        <div className="border-b-2 border-[#D71422] pb-2 mb-4 flex items-center justify-between">
            <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                    RACK<span className="text-[#D71422]">PLANNER</span> PRO
                </span>
                <span className="text-[10px] font-bold text-slate-400 ml-3">機櫃拓撲與規格設計報告書</span>
                <span className="text-[11px] font-extrabold text-indigo-600 ml-3">專案: {projectName || '未命名專案'}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{pageTitle}</span>
        </div>
    );

    const renderFooter = (pageNo) => (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center text-[10px] text-slate-400 font-mono pointer-events-none">
            第 {pageNo} / {totalDocPages} 頁
        </div>
    );

    return (
        <div className={`${isForDownload ? 'block' : 'hidden print:block p-8'} print-layout bg-white text-slate-900 font-sans w-full max-w-[800px] mx-auto relative`}>
            {/* ── PAGE 1: Cover Header + Summary + First Rack ── */}
            <div className="pdf-page">
                {renderWatermark()}
                {renderFooter(1)}

                {/* Full Report Header (Page 1 only) */}
                <div className="border-b-4 border-[#D71422] pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            RACK<span className="text-[#D71422]">PLANNER</span> PRO
                        </h1>
                        <p className="text-lg font-extrabold text-indigo-600 mt-1">專案名稱: {projectName || '未命名專案'}</p>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">機櫃拓撲與規格設計報告書 (Rack Architecture & Spec Report)</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                        <p>報告產生日期: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Project Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 block mb-1">空間佔用</span>
                        <span className="text-xl font-extrabold text-slate-800">{totalSpace} U ({racks.length} 台機櫃)</span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 block mb-1">預估功耗</span>
                        <span className="text-xl font-extrabold text-slate-800">{totalPower.toLocaleString()} W</span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 block mb-1">估計報價</span>
                        <span className="text-xl font-extrabold text-[#D71422]">${totalPrice.toLocaleString()} USD</span>
                    </div>
                </div>

                {/* Section 1 heading + first rack on page 1 */}
                <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                    機櫃配置示意圖 (Rack Configurations)
                </h2>

                {racks.length > 0 && (() => {
                    const rack0 = racks[0];
                    const shot0 = rackScreenshots[rack0.id];
                    return (
                        <div className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm w-full" style={{ pageBreakInside: 'avoid' }}>
                            <div className="text-xs font-bold text-slate-800 font-mono mb-2">{rack0.name}</div>
                            {shot0
                                ? <img src={shot0} alt={rack0.name} className="max-h-[480px] w-auto rounded border border-slate-700 object-contain shadow-md" />
                                : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取機櫃圖...</div>
                            }
                        </div>
                    );
                })()}
            </div>

            {/* ── SUBSEQUENT RACK PAGES: mini-header + 2 racks per page ── */}
            {(() => {
                const remainingRacks = racks.slice(1);
                if (remainingRacks.length === 0) return null;

                // Group remaining racks in pairs
                const pages = [];
                for (let i = 0; i < remainingRacks.length; i += 2) {
                    pages.push(remainingRacks.slice(i, i + 2));
                }

                return pages.map((pair, pageIdx) => (
                    <div key={pageIdx} className="pdf-page" style={{ pageBreakBefore: 'always' }}>
                        {renderWatermark()}
                        {renderMiniHeader("機櫃配置示意圖 (Rack Configurations)")}
                        {renderFooter(2 + pageIdx)}

                        <div className="flex flex-col gap-6">
                            {pair.map(rack => {
                                const shot = rackScreenshots[rack.id];
                                return (
                                    <div key={rack.id} className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm w-full" style={{ pageBreakInside: 'avoid' }}>
                                        <div className="text-xs font-bold text-slate-800 font-mono mb-2">{rack.name}</div>
                                        {shot
                                            ? <img src={shot} alt={rack.name} className="max-h-[390px] w-auto rounded border border-slate-700 object-contain shadow-md" />
                                            : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取機櫃圖...</div>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ));
            })()}

            {/* ── SECTION 2: Network Topology ── */}
            <div className="pdf-page" style={{ pageBreakBefore: 'always' }}>
                {renderWatermark()}
                {renderMiniHeader("網路拓撲示意圖 (Network Topology)")}
                {renderFooter(2 + subsequentRackPagesCount)}
                
                <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                    網路拓撲示意圖 (Network Topology)
                </h2>
                <div className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm max-w-full">
                    {topoScreenshot
                        ? <img src={topoScreenshot} alt="Network Topology" className="max-w-full h-auto rounded border border-slate-700 shadow-md" />
                        : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取網路拓撲圖...</div>
                    }
                </div>
            </div>

            {/* ── SECTION 3: BOM Table (Categorised & Paginated) ── */}
            {bomPages.map((pageSections, pageIdx) => (
                <div key={`bom-page-${pageIdx}`} className="pdf-page" style={{ pageBreakBefore: 'always' }}>
                    {renderWatermark()}
                    {renderFooter(3 + subsequentRackPagesCount + pageIdx)}
                    {renderMiniHeader(`設備清單與規格 (BOM) - 第 ${pageIdx + 1} / ${bomTotalPages} 頁`)}

                    <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                        <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                        設備清單與規格 (BOM Specifications)
                    </h2>

                    <div className="flex flex-col gap-6">
                        {pageSections.map((sec, secIdx) => (
                            <div key={`sec-${secIdx}`} className="flex flex-col">
                                <h3 className="text-xs font-bold text-slate-700 mb-2 bg-slate-100/80 px-2 py-1 rounded border-l-2 border-indigo-500">
                                    {sec.title}
                                </h3>
                                <table className="w-full border-collapse text-[10px] text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-600 font-semibold">
                                            <th className="p-1.5 border border-slate-200 w-[12%]">機櫃</th>
                                            <th className="p-1.5 border border-slate-200 w-[10%]">位置</th>
                                            <th className="p-1.5 border border-slate-200 w-[18%]">設備名稱</th>
                                            <th className="p-1.5 border border-slate-200 text-center w-[6%]">數量</th>
                                            <th className="p-1.5 border border-slate-200 w-[10%]">類型</th>
                                            <th className="p-1.5 border border-slate-200 text-right w-[10%]">功耗(W)</th>
                                            <th className="p-1.5 border border-slate-200 text-right w-[10%]">估價(USD)</th>
                                            <th className="p-1.5 border border-slate-200 w-[24%]">硬體規格摘要</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sec.rows.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="p-3 text-center text-slate-400">當前分區無設備。</td>
                                            </tr>
                                        ) : (
                                            sec.rows.map((dev, idx) => {
                                                const rackCell = getGroupedRackCell(dev);
                                                const positionCell = getGroupedPositionCell(dev);

                                                return (
                                                    <tr key={dev.id} className={`${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200`}>
                                                        <td className="p-1.5 border border-slate-200 font-mono font-bold">{rackCell}</td>
                                                        <td className="p-1.5 border border-slate-200 font-mono text-slate-600">{positionCell}</td>
                                                        <td className="p-1.5 border border-slate-200 font-bold text-slate-800">{dev.customName}</td>
                                                        <td className="p-1.5 border border-slate-200 text-center font-mono font-bold">{dev.qty}</td>
                                                        <td className="p-1.5 border border-slate-200 text-slate-500">{dev.type}</td>
                                                        <td className="p-1.5 border border-slate-200 text-right font-mono">
                                                            {(dev.power * dev.qty).toLocaleString()}
                                                            {dev.qty > 1 && dev.power > 0 && (
                                                                <span className="block text-[8px] text-slate-400">單件: {dev.power.toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-1.5 border border-slate-200 text-right font-mono text-slate-600">
                                                            ${(dev.price * dev.qty).toLocaleString()}
                                                            {dev.qty > 1 && dev.price > 0 && (
                                                                <span className="block text-[8px] text-slate-400">單件: ${dev.price.toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-1.5 border border-slate-200 text-slate-500 font-sans text-[9px] leading-relaxed max-w-[320px]">{dev.specSummary}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* ── SECTION 4: Connection Cables (Paginated) ── */}
            {cableChunks.map((chunk, chunkIdx) => (
                <div key={`cable-page-${chunkIdx}`} className="pdf-page" style={{ pageBreakBefore: 'always' }}>
                    {renderWatermark()}
                    {renderFooter(3 + subsequentRackPagesCount + bomTotalPages + chunkIdx)}
                    {renderMiniHeader(`線路對接規格表 - 第 ${chunkIdx + 1} / ${cableTotalPages} 頁`)}

                    <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                        <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                        線路對接規格表 (Connection Specifications)
                    </h2>

                    <table className="w-full border-collapse text-[10px] text-left">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                                <th className="p-1.5 border border-slate-200 w-[22%]">來源設備</th>
                                <th className="p-1.5 border border-slate-200 w-[18%]">來源端口</th>
                                <th className="p-1.5 border border-slate-200 w-[22%]">目的設備</th>
                                <th className="p-1.5 border border-slate-200 w-[18%]">目的端口</th>
                                <th className="p-1.5 border border-slate-200 w-[20%]">所屬網路</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chunk.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-3 text-center text-slate-400">當前專案未規劃任何實體連接線路。</td>
                                </tr>
                            ) : (
                                chunk.map((row, idx) => (
                                    <tr key={idx} className={`${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200`}>
                                        <td className="p-1.5 border border-slate-200 font-bold text-slate-800">{row.src}</td>
                                        <td className="p-1.5 border border-slate-200 font-mono text-slate-600">{row.srcPort}</td>
                                        <td className="p-1.5 border border-slate-200 font-bold text-slate-800">{row.dst}</td>
                                        <td className="p-1.5 border border-slate-200 font-mono text-slate-600">{row.dstPort}</td>
                                        <td className="p-1.5 border border-slate-200 text-slate-500">{row.role}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default PrintLayout;
