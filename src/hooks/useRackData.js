import { useState, useMemo, useCallback } from 'react';
import { getSwitchPortCount, getSwitchSubPortCount, getFabricGroup, syncLiquidCoolingConnections } from '../utils/helpers';
import { DEFAULT_RACK_U_COUNT } from '../utils/constants';

export function useRackData(alertModalRef, initialRacks, initialDevices) {
    const [racks, setRacks] = useState(() => (
        Array.isArray(initialRacks) && initialRacks.length > 0
            ? initialRacks
            : [{ id: 'rack-1', name: 'RACK-001', type: 'General', uCount: DEFAULT_RACK_U_COUNT, powerLimit: 24000, slotIndex: null, weight: 150 }]
    ));
    const [devices, setDevicesRaw] = useState(() => (
        Array.isArray(initialDevices) ? syncLiquidCoolingConnections(initialDevices) : []
    ));

    // 同步管理水冷 (LC) 連線與斷開，避免額外 useEffect 觸發二次渲染與污染 Undo 歷史
    const setDevices = useCallback((updater) => {
        setDevicesRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return syncLiquidCoolingConnections(next);
        });
    }, []);

    // Core references for calculations
    const generateId = useCallback(() => Math.random().toString(36).slice(2, 11), []);
    
    // Connection caching
    const connectedPortsSet = useMemo(() => {
        const set = new Set();
        devices.forEach(d => {
            if (d.connections) {
                Object.entries(d.connections).forEach(([localKey, targetKey]) => {
                    if (targetKey) {
                        set.add(`${d.id}-${localKey}`);
                        set.add(targetKey);
                    }
                });
            }
        });
        return set;
    }, [devices]);

    const handleUpdateRack = (id, updates) => {
        const targetRack = racks.find(r => r.id === id);
        if (targetRack) {
            const nextRack = { ...targetRack, ...updates };
            if (nextRack.type === 'ORv3') {
                nextRack.uCount = 44;
            }
            const nextMaxU = nextRack.uCount || DEFAULT_RACK_U_COUNT;
            const currentMaxU = targetRack.type === 'ORv3' ? 44 : (targetRack.uCount || DEFAULT_RACK_U_COUNT);
            if (nextMaxU < currentMaxU) {
                const exceedingDev = devices.find(
                    d => d.rackId === id && d.type !== 'SideCDU' && (d.startU + d.size - 1) > nextMaxU
                );
                if (exceedingDev) {
                    if (alertModalRef?.current) {
                        alertModalRef.current(
                            `警告：機櫃內有設備【${exceedingDev.customName || exceedingDev.type}】(位於 U${exceedingDev.startU}-U${exceedingDev.startU + exceedingDev.size - 1}) 超出 ${nextMaxU}U 空間上限！\n請先移動或移除高處設備後再變更機櫃高度或規格。`,
                            '空間衝突',
                            'warning'
                        );
                    }
                    return;
                }
            }
        }

        setRacks(prev => prev.map(rack => {
            if (rack.id !== id) return rack;
            const updatedRack = { ...rack, ...updates };
            if (updatedRack.type === 'ORv3') {
                updatedRack.uCount = 44;
            }
            return updatedRack;
        }));
    };

    const handleUpdateDevice = (id, updates) => {
        setDevices(prev => {
            const dev = prev.find(d => d.id === id);
            if (!dev) return prev;
            const nextDev = { ...dev, ...updates };

            if (
                nextDev.type !== 'SideCDU' &&
                (updates.size !== undefined || updates.startU !== undefined || updates.rackId !== undefined)
            ) {
                const targetRack = racks.find(r => r.id === nextDev.rackId);
                const rackMaxU = targetRack?.type === 'ORv3' ? 44 : (targetRack?.uCount || DEFAULT_RACK_U_COUNT);
                const nextStartU = nextDev.startU || 1;
                const nextEndU = nextStartU + (nextDev.size || 1) - 1;

                if (nextStartU < 1 || nextEndU > rackMaxU) {
                    if (alertModalRef?.current) {
                        alertModalRef.current(
                            `警告：設備高度變更後 (U${nextStartU}-U${nextEndU}) 超出機櫃上限 (${rackMaxU}U)！`,
                            '空間不足',
                            'warning'
                        );
                    }
                    return prev;
                }

                const conflictDev = prev.find(other => {
                    if (other.id === id || other.rackId !== nextDev.rackId || other.type === 'SideCDU') return false;
                    const otherEndU = other.startU + other.size - 1;
                    return Math.max(nextStartU, other.startU) <= Math.min(nextEndU, otherEndU);
                });

                if (conflictDev) {
                    if (alertModalRef?.current) {
                        alertModalRef.current(
                            `警告：設備高度變更後 (U${nextStartU}-U${nextEndU}) 會與【${conflictDev.customName || conflictDev.type}】(U${conflictDev.startU}-U${conflictDev.startU + conflictDev.size - 1}) 重疊！`,
                            '空間衝突',
                            'warning'
                        );
                    }
                    return prev;
                }
            }

            return prev.map(d => d.id === id ? nextDev : d);
        });
    };

    const handleBatchUpdateDevices = (ids, updatesOrFn) => {
        const idSet = new Set(ids);
        setDevices(prev => prev.map(dev => {
            if (!idSet.has(dev.id)) return dev;
            const patch = typeof updatesOrFn === 'function' ? updatesOrFn(dev) : updatesOrFn;
            return { ...dev, ...patch };
        }));
    };

    const handleDisconnectPort = (fullPortId) => {
        setDevices(prev => prev.map(dev => {
            let modified = false;
            const newConns = { ...(dev.connections || {}) };
            
            if (fullPortId.startsWith(dev.id + '-')) {
                const portKey = fullPortId.replace(dev.id + '-', '');
                // 移除主要 slot
                if (newConns[portKey]) {
                    delete newConns[portKey];
                    modified = true;
                }
                // 一併移除 __2 ~ __8 所有 twin slot
                for (let i = 2; i <= 8; i++) {
                    const slotKey = `${portKey}__${i}`;
                    if (newConns[slotKey]) { delete newConns[slotKey]; modified = true; }
                }
            }
            
            // 移除其他設備連向此 port 的引用
            Object.keys(newConns).forEach(k => {
                if (newConns[k] === fullPortId) {
                    delete newConns[k];
                    modified = true;
                }
            });

            return modified ? { ...dev, connections: newConns } : dev;
        }));
    };

    const handleConnectionChange = (deviceId, portKey, targetConnection) => {
        if (!targetConnection) {
            setDevices(prev => prev.map(dev => {
                if (dev.id !== deviceId) return dev;
                const newConnections = { ...(dev.connections || {}) };
                delete newConnections[portKey];
                return { ...dev, connections: newConnections };
            }));
            return;
        }

        if (targetConnection === `${deviceId}-${portKey}`) return;

        setDevices(prev => {
            const dev = prev.find(d => d.id === deviceId);
            const targetDev = prev.find(d => targetConnection.startsWith(d.id + '-'));
            if (!dev || !targetDev) return prev;

            const targetDevId = targetDev.id;
            const targetPortKey = targetConnection.substring(targetDevId.length + 1);

            const isSwitchOrRouter = (targetDev.type || '').startsWith('Switch') || targetDev.type === 'Router';

            if (isSwitchOrRouter) {
                const mainPortMax = getSwitchPortCount(targetDev);
                const subPortMax = getSwitchSubPortCount(targetDev);
                const totalMax = mainPortMax + subPortMax;
                const occupiedPorts = new Set();
                prev.forEach(d => {
                    if (d.connections) {
                        Object.entries(d.connections).forEach(([key, tg]) => {
                            if (d.id === deviceId && key === portKey) return;
                            if (tg && (tg.startsWith(`${targetDevId}-port-`) || tg.startsWith(`${targetDevId}-subport-`))) {
                                occupiedPorts.add(tg);
                            }
                        });
                    }
                });

                if (occupiedPorts.size >= totalMax) {
                    if (alertModalRef?.current) {
                        alertModalRef.current(`警告：網路設備【${targetDev.customName || targetDev.type}】的連接埠已達上限 (${totalMax} 埠)，無法新增連線！`, '連線失敗', 'error');
                    }
                    return prev;
                }

                if (occupiedPorts.has(targetConnection)) {
                    if (alertModalRef?.current) {
                        const portName = targetPortKey.startsWith('subport-')
                            ? `副連接埠 ${targetPortKey.replace('subport-', '')}`
                            : `連接埠 ${targetPortKey.replace('port-', '')}`;
                        alertModalRef.current(`警告：此${portName} 已被佔用！`, '連線失敗', 'error');
                    }
                    return prev;
                }
            } else {
                // For non-switch connections (like Server to Server network anchors, or Server to CDU water cooling):
                // Check if the target port is already occupied in the devices connections
                const isTargetCduWaterPort = (targetDev.type === 'CDU4U' || targetDev.type === 'SideCDU') &&
                    ['water_cold', 'water_hot'].includes(targetPortKey);

                if (!isTargetCduWaterPort) {
                    const isOccupied = prev.some(d => {
                        if (!d.connections) return false;
                        return Object.entries(d.connections).some(([k, tg]) => {
                            if (d.id === deviceId && k === portKey) return false;
                            return tg === targetConnection || (tg && `${d.id}-${k}` === targetConnection);
                        });
                    });
                    
                    if (isOccupied) {
                        if (alertModalRef?.current) {
                            alertModalRef.current(`警告：此連接埠/錨點已被佔用！`, '連線失敗', 'error');
                        }
                        return prev;
                    }
                }
            }

            return prev.map(d => {
                if (d.id !== deviceId) return d;
                const newConnections = { ...(d.connections || {}) };
                newConnections[portKey] = targetConnection;
                return { ...d, connections: newConnections };
            });
        });
    };

    const handleHardwareSpecChange = (deviceId, specKey, field, value) => {
        setDevices(prev => prev.map(dev => {
            if (dev.id !== deviceId) return dev;
            const currentSpecs = dev.hardwareSpecs || {};
            const currentSpec = currentSpecs[specKey] || { model: '', qty: '' };
            return { ...dev, hardwareSpecs: { ...currentSpecs, [specKey]: { ...currentSpec, [field]: value } } };
        }));
    };

    const handleAutoConnectGroup = (deviceId, portPrefix, count, targetSwitchId) => {
        if (!targetSwitchId) return;
        setDevices(prev => {
            const dev = prev.find(d => d.id === deviceId);
            const targetSwitch = prev.find(d => d.id === targetSwitchId);
            if (!dev || !targetSwitch) return prev;
            
            const portMax = getSwitchPortCount(targetSwitch);
            const occupiedPorts = new Set();
            prev.forEach(d => {
                if (d.connections) Object.entries(d.connections).forEach(([key, tg]) => {
                    if (d.id === deviceId && key.startsWith(`${portPrefix}-`)) return;
                    if (tg) occupiedPorts.add(tg);
                });
            });

            const newConnections = { ...(dev.connections || {}) };
            let portsConnected = 0; let nextAvailablePortIdx = 1;

            for (let i = 1; i <= count; i++) {
                const localPortKey = `${portPrefix}-${i}`;
                let assigned = false;
                while (nextAvailablePortIdx <= portMax && !assigned) {
                    const p = `${targetSwitchId}-port-${nextAvailablePortIdx}`;
                    if (!occupiedPorts.has(p)) {
                        newConnections[localPortKey] = p; occupiedPorts.add(p); assigned = true; nextAvailablePortIdx++;
                    } else {
                        nextAvailablePortIdx++;
                    }
                }
                if (assigned) portsConnected++;
                else break;
            }
            if (portsConnected < count && alertModalRef?.current) {
                alertModalRef.current(`注意：【${targetSwitch.customName}】 孔位不足！\n僅成功自動連線 ${portsConnected} 條線路。`, '警告', 'warning');
            }
            return prev.map(d => d.id === deviceId ? { ...d, connections: newConnections } : d);
        });
    };

    const handleHAAutoConnect = (deviceId) => {
        setDevices(prev => {
            const ewLeafSwitches = prev.filter(d => {
                const isSwitch = (d.type || '').startsWith('Switch') || d.type === 'Router';
                const isEW = getFabricGroup(d) === 'East-West';
                const isLeaf = d.networkRole !== 'Spine' && !(d.networkRole === undefined && (d.type === 'Router' || d.type === 'Switch800G'));
                return isSwitch && isEW && isLeaf;
            });

            const sortedLeafs = [...ewLeafSwitches].sort((a, b) => {
                const groupA = a.topologyGroup || '';
                const groupB = b.topologyGroup || '';
                if (groupA !== groupB) return groupA.localeCompare(groupB);
                return (a.customName || '').localeCompare(b.customName || '');
            });

            if (sortedLeafs.length < 8 && alertModalRef?.current) {
                alertModalRef.current(`錯誤：East-West Leaf 交換器數量不足！\n目前僅有 ${sortedLeafs.length} 台，需要 8 台以執行 HA 分散拉線。`, '警告', 'warning');
                return prev;
            }

            const occupiedPorts = new Set();
            prev.forEach(d => {
                if (d.connections) Object.entries(d.connections).forEach(([key, tg]) => {
                    if (d.id === deviceId && key.startsWith('cx8-')) return;
                    if (tg) occupiedPorts.add(tg);
                });
            });

            const dev = prev.find(d => d.id === deviceId);
            const newConnections = { ...(dev.connections || {}) };
            let portsConnected = 0;
            const portsToConnect = Array.from({ length: 8 }).map((_, i) => `cx8-${i + 1}`);

            portsToConnect.forEach((localPortKey, i) => {
                const targetSwitch = sortedLeafs[i % sortedLeafs.length];
                const portMax = getSwitchPortCount(targetSwitch);
                let assigned = false;
                for (let pIdx = 1; pIdx <= portMax; pIdx++) {
                    const p = `${targetSwitch.id}-port-${pIdx}`;
                    if (!occupiedPorts.has(p)) {
                        newConnections[localPortKey] = p; occupiedPorts.add(p); assigned = true; break;
                    }
                }
                if (assigned) portsConnected++;
            });

            if (portsConnected < 8 && alertModalRef?.current) {
               alertModalRef.current(`部分連線失敗：因目標交換器孔位不足，僅成功連線 ${portsConnected}/8 條 HA 線路。`, '警告', 'warning');
            }

            return prev.map(d => d.id === deviceId ? { ...d, connections: newConnections } : d);
        });
    };

    const handleApplyRATemplate = (type) => {
        if (type === 'GB200_NVL72') {
            const rackId = 'rack-template-1';
            setRacks([
                { id: rackId, name: 'NV-GB200-NVL72', type: 'ORv3', uCount: 44, powerLimit: 20000 }
            ]);
            
            const newDevs = [];
            newDevs.push({ id: generateId(), rackId, type: 'CDU4U', customName: 'Liquid CDU', size: 4, startU: 1, theme: 'cyan', power: 2500, coolingCapacity: 100000 });
            newDevs.push({ id: generateId(), rackId, type: 'Blank', customName: 'Power Shelf 1', size: 2, startU: 5, theme: 'slate', power: 0 });
            
            for (let i = 0; i < 9; i++) {
                newDevs.push({ 
                    id: generateId(), rackId, type: 'Switch800G', 
                    customName: `NVLink Switch ${i+1}`, size: 2, startU: 7 + (i * 2), 
                    theme: 'purple', power: 600, networkRole: 'Spine', topologyGroup: 'NVLink'
                });
            }
            
            const computeStartU = 25;
            for (let i = 0; i < 18; i++) {
                if (computeStartU + i > 44) break;
                newDevs.push({ 
                    id: generateId(), rackId, type: 'Server1U', 
                    customName: `GB200 Compute Tray ${i+1}`, size: 1, startU: computeStartU + i, 
                    theme: 'blue', power: 1200 
                });
            }
            setDevices(newDevs);
        } else if (type === 'H100_HGX') {
            const rackId = 'rack-template-2';
            setRacks([
                { id: rackId, name: 'NV-H100-HGX-A01', type: 'General', uCount: 48, powerLimit: 20000 }
            ]);
            
            const newDevs = [];
            for (let i = 0; i < 4; i++) {
                newDevs.push({ 
                    id: generateId(), rackId, type: 'Server5U',
                    customName: `H100 HGX Node ${i+1}`, size: 8, startU: 1 + (i * 10), 
                    theme: 'blue', power: 10000 
                });
            }
            
            newDevs.push({ id: generateId(), rackId, type: 'Switch400G', customName: 'IB Spine SW 01', size: 2, startU: 41, theme: 'purple', power: 400, networkRole: 'Spine' });
            newDevs.push({ id: generateId(), rackId, type: 'Switch400G', customName: 'IB Spine SW 02', size: 2, startU: 43, theme: 'purple', power: 400, networkRole: 'Spine' });
            newDevs.push({ id: generateId(), rackId, type: 'Router', customName: 'Management Router', size: 1, startU: 45, theme: 'violet', power: 100 });
            
            setDevices(newDevs);
        }
    };

    return {
        racks, setRacks,
        devices, setDevices,
        connectedPortsSet,
        generateId,
        handleUpdateRack,
        handleUpdateDevice,
        handleBatchUpdateDevices,
        handleConnectionChange,
        handleDisconnectPort,
        handleHardwareSpecChange,
        handleAutoConnectGroup,
        handleHAAutoConnect,
        handleApplyRATemplate
    };
}
