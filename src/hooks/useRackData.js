import { useState, useRef, useMemo, useCallback } from 'react';
import { getNicCount, getSwitchPortCount, getFabricGroup } from '../utils/helpers';
import { DEFAULT_RACK_U_COUNT } from '../utils/constants';

export function useRackData(alertModalRef) {
    const [racks, setRacks] = useState([{ id: 'rack-1', name: 'RACK-A01', type: 'General', uCount: DEFAULT_RACK_U_COUNT }]);
    const [devices, setDevices] = useState([]);
    
    // Core references for calculations
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
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

    const handleUpdateDevice = (id, updates) => {
        setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, ...updates } : dev));
    };

    const handleConnectionChange = (deviceId, portKey, targetConnection) => {
        setDevices(prev => prev.map(dev => {
            if (dev.id !== deviceId) return dev;
            const newConnections = { ...(dev.connections || {}) };
            if (targetConnection) newConnections[portKey] = targetConnection;
            else delete newConnections[portKey];
            return { ...dev, connections: newConnections };
        }));
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

    return {
        racks, setRacks,
        devices, setDevices,
        connectedPortsSet,
        generateId,
        handleUpdateDevice,
        handleConnectionChange,
        handleHardwareSpecChange,
        handleAutoConnectGroup,
        handleHAAutoConnect
    };
}
