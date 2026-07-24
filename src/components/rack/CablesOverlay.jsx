import React, { useEffect, useState } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getDeviceLayerPrefix, getDeviceGroupName, getSwitchPortCount, getNicCount, getPcieSlotInfo } from '../../utils/helpers';

const CablesOverlay = () => {
    const { devices, racks, drawing, setDrawing, showCables, handleConnectionChange, scaleFactor, isFitToScreen, viewMode, selectedId, expandedNetGroups, isGeneratingPDF, isCableRoutingOptimized } = useRackPlanner();
    const [localCoords, setLocalCoords] = useState({});

    useEffect(() => {
        let animationFrameId;

        const updateCoords = () => {
            const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement || document.querySelector('.main-canvas > div > div');
            if (rackContainer) {
                const ports = document.querySelectorAll('[data-port-id]');
                const groups = document.querySelectorAll('[data-group-anchor]');
                const containerRect = rackContainer.getBoundingClientRect();

                const newCoords = {};
                let changed = false;

                const currentScale = (isFitToScreen && viewMode !== 'single') ? scaleFactor : 1;

                ports.forEach(port => {
                    const id = port.getAttribute('data-port-id');
                    const rect = port.getBoundingClientRect();
                    const x = (rect.left + rect.width / 2 - containerRect.left) / currentScale;
                    const y = (rect.top + rect.height / 2 - containerRect.top) / currentScale;
                    newCoords[id] = { x, y };
                });

                const racksEl = document.querySelectorAll('[data-rack-id]');
                racksEl.forEach(rackEl => {
                    const id = rackEl.getAttribute('data-rack-id');
                    const rect = rackEl.getBoundingClientRect();
                    const x = (rect.left - containerRect.left) / currentScale;
                    const y = (rect.top - containerRect.top) / currentScale;
                    const w = rect.width / currentScale;
                    const h = rect.height / currentScale;
                    newCoords[`rack-${id}`] = { x, y, w, h };
                });

                groups.forEach(group => {
                    const id = group.getAttribute('data-group-anchor');
                    const rect = group.getBoundingClientRect();
                    const x = (rect.left + rect.width / 2 - containerRect.left) / currentScale;
                    const y = (rect.top + rect.height / 2 - containerRect.top) / currentScale;
                    newCoords[id] = { 
                        id,
                        x, y, 
                        isGroup: true,
                        rect: {
                            top: (rect.top - containerRect.top) / currentScale,
                            bottom: (rect.bottom - containerRect.top) / currentScale,
                            left: (rect.left - containerRect.left) / currentScale,
                            right: (rect.right - containerRect.left) / currentScale
                        }
                    };
                });

                setLocalCoords(prev => {
                    for (let k in newCoords) {
                        if (!prev[k] || Math.abs(prev[k].x - newCoords[k].x) > 0.5 || Math.abs(prev[k].y - newCoords[k].y) > 0.5) {
                            changed = true;
                            break;
                        }
                    }
                    if (Object.keys(newCoords).length !== Object.keys(prev).length) changed = true;
                    return changed ? newCoords : prev;
                });
            }
            animationFrameId = requestAnimationFrame(updateCoords);
        };

        animationFrameId = requestAnimationFrame(updateCoords);
        return () => cancelAnimationFrame(animationFrameId);
    }, [showCables, isFitToScreen, scaleFactor, viewMode, selectedId]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (drawing) {
                const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement || document.querySelector('.main-canvas > div > div');
                if (!rackContainer) return;
                
                const containerRect = rackContainer.getBoundingClientRect();

                const currentScale = (isFitToScreen && viewMode !== 'single') ? scaleFactor : 1;
                const currentX = (e.clientX - containerRect.left) / currentScale;
                const currentY = (e.clientY - containerRect.top) / currentScale;

                setDrawing(prev => ({ ...prev, currentX, currentY }));
            }
        };

        const handleMouseUp = () => {
            if (drawing && !drawing.isHoveringTarget) {
                setDrawing(null); // Just drop the cable in empty space
            }
        };

        const getAvailableTargetPortKey = (targetDev) => {
            const targetDevId = targetDev.id;
            const isSwitchOrRouter = (targetDev.type || '').startsWith('Switch') || targetDev.type === 'Router';
            
            if (isSwitchOrRouter) {
                const portMax = getSwitchPortCount(targetDev);
                const occupiedPorts = new Set();
                devices.forEach(d => {
                    if (d.connections) {
                        Object.entries(d.connections).forEach(([key, tg]) => {
                            if (tg && tg.startsWith(`${targetDevId}-port-`)) {
                                occupiedPorts.add(tg.substring(targetDevId.length + 1));
                            }
                        });
                    }
                    if (d.id === targetDevId && d.connections) {
                        Object.keys(d.connections).forEach(key => {
                            if (key.startsWith('port-') && d.connections[key]) {
                                occupiedPorts.add(key);
                            }
                        });
                    }
                });
                for (let pIdx = 1; pIdx <= portMax; pIdx++) {
                    const portKey = `port-${pIdx}`;
                    if (!occupiedPorts.has(portKey)) {
                        return portKey;
                    }
                }
                return null;
            }

            const possiblePorts = [];
            
            const nic1Count = getNicCount(targetDev, 'ns_nic_1');
            if (nic1Count > 0) possiblePorts.push('ns_nic_1');
            
            const nic2Count = getNicCount(targetDev, 'ns_nic_2');
            if (nic2Count > 0) possiblePorts.push('ns_nic_2');

            const ocpCount = getNicCount(targetDev, 'ocp');
            for (let i = 1; i <= ocpCount; i++) {
                possiblePorts.push(`ocp-${i}`);
            }

            const pcieSlotQty = targetDev.hardwareSpecs?.pcieSlotQty?.qty || 2;
            for (let i = 1; i <= pcieSlotQty; i++) {
                const { qty: slotPortCount } = getPcieSlotInfo(targetDev, i);
                for (let pIdx = 1; pIdx <= slotPortCount; pIdx++) {
                    possiblePorts.push(`pcie_slot_${i}-${pIdx}`);
                }
            }

            possiblePorts.push('bmc');

            const occupiedPorts = new Set();
            devices.forEach(d => {
                if (d.connections) {
                    Object.entries(d.connections).forEach(([key, tg]) => {
                        if (tg && tg.startsWith(`${targetDevId}-`)) {
                            occupiedPorts.add(tg.substring(targetDevId.length + 1));
                        }
                    });
                }
                if (d.id === targetDevId && d.connections) {
                    Object.keys(d.connections).forEach(key => {
                        if (d.connections[key]) {
                            occupiedPorts.add(key);
                        }
                    });
                }
            });

            for (const portKey of possiblePorts) {
                if (!occupiedPorts.has(portKey)) {
                    return portKey;
                }
            }

            return null;
        };

        const handleConnectEvent = (e) => {
            if (e.detail && e.detail.drawing) {
                let { sourceId, sourcePortKey } = e.detail.drawing;
                let { targetDevId, targetPortKey } = e.detail;

                const sourceDevice = devices.find(d => d.id === sourceId);
                const targetDevice = devices.find(d => d.id === targetDevId);

                if (!targetDevice) return;

                if (!targetPortKey) {
                    targetPortKey = getAvailableTargetPortKey(targetDevice);
                }

                if (!targetPortKey) return; // No free ports available

                if (sourceDevice) {
                    const isSourceCDU = sourceDevice.type === 'CDU4U' || sourceDevice.type === 'SideCDU';
                    const isTargetCDU = targetDevice.type === 'CDU4U' || targetDevice.type === 'SideCDU';
                    const isWaterPort = (port) => ['water_cold', 'water_hot', 'host_water_cold', 'host_water_hot'].includes(port);

                    if ((isSourceCDU || isTargetCDU) && isWaterPort(sourcePortKey) && isWaterPort(targetPortKey)) {
                        // If the source is a CDU and target is not, swap so the server is the source.
                        if (isSourceCDU && !isTargetCDU) {
                            const tempId = sourceId;
                            const tempPort = sourcePortKey;
                            sourceId = targetDevId;
                            sourcePortKey = targetPortKey;
                            targetDevId = tempId;
                            targetPortKey = tempPort;
                        }
                    }
                }

                const finalSourceDevice = devices.find(d => d.id === sourceId);
                const isServerOrStorage = finalSourceDevice &&
                    ((finalSourceDevice.type || '').startsWith('Server') ||
                     (finalSourceDevice.type || '').startsWith('Storage'));

                if (isServerOrStorage) {
                    const MAX_CONN = 8;
                    const existing = finalSourceDevice.connections?.[sourcePortKey];
                    if (!existing) {
                        // 第一 slot 尚空
                        handleConnectionChange(sourceId, sourcePortKey, `${targetDevId}-${targetPortKey}`);
                    } else {
                        // 從 __2 找到第一個空間
                        let useKey = null;
                        for (let i = 2; i <= MAX_CONN; i++) {
                            const slotKey = `${sourcePortKey}__${i}`;
                            if (!finalSourceDevice.connections?.[slotKey]) { useKey = slotKey; break; }
                        }
                        if (useKey) handleConnectionChange(sourceId, useKey, `${targetDevId}-${targetPortKey}`);
                        // 超過 8 條則不作用
                    }
                } else {
                    handleConnectionChange(sourceId, sourcePortKey, `${targetDevId}-${targetPortKey}`);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('rackplanner-connect', handleConnectEvent);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('rackplanner-connect', handleConnectEvent);
        };
    }, [drawing, setDrawing, handleConnectionChange, isFitToScreen, scaleFactor, viewMode, devices]);

    // During PDF generation, cables are driven strictly by showCables flag
    // (ignore selectedId so rack screenshots are cable-free and topo is fully visible)
    if (isGeneratingPDF) {
        if (!showCables) return null;
    } else {
        if (!showCables && !selectedId) return null;
    }

    const GROUP_COLORS = [
        '#22c55e', '#ef4444', '#3b82f6', 
        '#facc15', '#a855f7', '#ec4899', 
        '#22d3ee', '#f97316'
    ];

    // 依互連設備的 type 決定線色；fallback 依 portKey 前綴
    // portKey = 來源端 portKey，targetPortKey = 目標端 portKey
    const getLineColor = (portKey, devAId, devBId, targetPortKey = '', localAnchor = null, targetAnchor = null) => {
        if (localAnchor && targetAnchor && (localAnchor.isGroup || targetAnchor.isGroup)) {
            let leafId = null;
            if (localAnchor.id.includes('Leaf')) leafId = localAnchor.id;
            else if (targetAnchor.id.includes('Leaf')) leafId = targetAnchor.id;
            
            if (leafId) {
                const leafGroupIds = Object.keys(localCoords)
                    .filter(k => k.includes('Leaf') && localCoords[k].isGroup)
                    .sort();
                const index = leafGroupIds.indexOf(leafId);
                return GROUP_COLORS[index >= 0 ? index % GROUP_COLORS.length : 0];
            }
        }

        const srcBase = portKey.replace(/__\d+$/, '');
        const tgtBase = targetPortKey.replace(/__\d+$/, '');

        // ── 水冷管優先判斷（GPU water_cold/hot 和 Host host_water_cold/hot） ──
        if (srcBase === 'water_cold' || tgtBase === 'water_cold' ||
            srcBase === 'host_water_cold' || tgtBase === 'host_water_cold') return '#60a5fa';
        if (srcBase === 'water_hot'  || tgtBase === 'water_hot' ||
            srcBase === 'host_water_hot'  || tgtBase === 'host_water_hot')  return '#f87171';

        const devA = devices.find(d => d.id === devAId);
        const devB = devices.find(d => d.id === devBId);

        const getAnchorCat = (key) => {
            if (!key) return null;
            const b = key.replace(/__\d+$/, '');
            if (b.startsWith('cx8-') || b === 'cx8p') return 'ew_nic';
            if (b.startsWith('pcie_slot_') || b.startsWith('ns_nic_')) return 'pcie_slot';
            if (b.startsWith('super_nic_mgt')) return 's_nic_m';
            if (b.startsWith('bmc')) return 'bmc';
            return null;
        };

        const catA = getAnchorCat(portKey);
        const catB = getAnchorCat(targetPortKey);

        if (catA && devA?.anchorCableColors?.[catA]) return devA.anchorCableColors[catA];
        if (catB && devB?.anchorCableColors?.[catB]) return devB.anchorCableColors[catB];

        // ── BMC 錨點預設 → 藍色 ──
        const isBMC = srcBase === 'bmc' || srcBase.startsWith('bmc')
                   || tgtBase === 'bmc' || tgtBase.startsWith('bmc');
        if (isBMC) return devA?.anchorCableColors?.bmc || devB?.anchorCableColors?.bmc || '#60a5fa';

        const types = [devA?.type, devB?.type].filter(Boolean);

        // ── 2U2N 專屬 Node 1 / Node 2 網路線顏色區分 (OPA/NIC) ──
        if (srcBase.includes('_n1-') || tgtBase.includes('_n1-')) return '#facc15';
        if (srcBase.includes('_n2-') || tgtBase.includes('_n2-')) return '#ef4444';

        // 優先順序：Router > Switch800G > Switch400G (含 400G1U) > Switch10G > Switch1G
        if (types.some(t => t === 'Router'))           return '#ef4444';
        if (types.some(t => t === 'Switch800G'))        return '#34d399';
        if (types.some(t => t === 'Switch400G' || t === 'Switch400G1U')) return '#facc15';
        if (types.some(t => t === 'Switch10G'))         return '#fb923c';
        if (types.some(t => t === 'Switch1G'))          return '#60a5fa';

        // Fallback: 依 portKey 前綴判斷
        if (srcBase.startsWith('cx8-'))    return devA?.anchorCableColors?.ew_nic || devB?.anchorCableColors?.ew_nic || '#22c55e';
        if (srcBase.startsWith('ns_nic_') || srcBase.startsWith('pcie_slot_')) return devA?.anchorCableColors?.pcie_slot || devB?.anchorCableColors?.pcie_slot || '#facc15';
        if (srcBase.startsWith('super_nic_mgt')) return devA?.anchorCableColors?.s_nic_m || devB?.anchorCableColors?.s_nic_m || '#a855f7';
        if (srcBase.startsWith('port-'))   return '#a855f7';
        return '#64748b';
    };

    const drawRoundedPath = (points, radius = 8) => {
        if (!points || points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length - 1; i++) {
            const pPrev = points[i - 1];
            const pCurr = points[i];
            const pNext = points[i + 1];
            
            const dx1 = pPrev.x - pCurr.x;
            const dy1 = pPrev.y - pCurr.y;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            
            const dx2 = pNext.x - pCurr.x;
            const dy2 = pNext.y - pCurr.y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            if (len1 === 0 || len2 === 0) {
                d += ` L ${pCurr.x} ${pCurr.y}`;
                continue;
            }
            
            const r = Math.min(radius, len1 / 2, len2 / 2);
            
            const cornerStart = {
                x: pCurr.x + (dx1 / len1) * r,
                y: pCurr.y + (dy1 / len1) * r
            };
            const cornerEnd = {
                x: pCurr.x + (dx2 / len2) * r,
                y: pCurr.y + (dy2 / len2) * r
            };
            
            d += ` L ${cornerStart.x} ${cornerStart.y} Q ${pCurr.x} ${pCurr.y}, ${cornerEnd.x} ${cornerEnd.y}`;
        }
        
        d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
        return d;
    };

    const generatePath = (startCoord, endCoord, startPortId = null, endPortId = null) => {
        let x1 = startCoord.x;
        let y1 = startCoord.y;
        let x2 = endCoord.x;
        let y2 = endCoord.y;

        if (startCoord.isGroup && startCoord.rect) {
            x1 = startCoord.x; // fixed horizontal center
            if (startCoord.id.includes('EP')) y1 = startCoord.rect.top;
            else if (startCoord.id.includes('Spine')) y1 = startCoord.rect.bottom;
            else if (startCoord.id.includes('Leaf')) {
                if (endCoord.id && endCoord.id.includes('Spine')) y1 = startCoord.rect.top;
                else y1 = startCoord.rect.bottom;
            }
        }

        if (endCoord.isGroup && endCoord.rect) {
            x2 = endCoord.x; // fixed horizontal center
            if (endCoord.id.includes('EP')) y2 = endCoord.rect.top;
            else if (endCoord.id.includes('Spine')) y2 = endCoord.rect.bottom;
            else if (endCoord.id.includes('Leaf')) {
                if (startCoord.id && startCoord.id.includes('Spine')) y2 = endCoord.rect.top;
                else y2 = endCoord.rect.bottom;
            }
        }

        // Optimized cabling routing path calculation
        if (viewMode !== 'network' && isCableRoutingOptimized && startPortId && endPortId && !startCoord.isGroup && !endCoord.isGroup) {
            const devAId = startPortId.includes('-') ? startPortId.substring(0, startPortId.indexOf('-')) : startPortId;
            const devBId = endPortId.includes('-') ? endPortId.substring(0, endPortId.indexOf('-')) : endPortId;
            
            const devA = devices.find(d => d.id === devAId);
            const devB = devices.find(d => d.id === devBId);
            
            if (devA && devB) {
                const rackACoords = localCoords[`rack-${devA.rackId}`];
                const rackBCoords = localCoords[`rack-${devB.rackId}`];
                
                if (rackACoords && rackBCoords) {
                    const isMsft = projectInfo?.designType === 'msft';

                    const getCableChannelCategory = (device, portId) => {
                        if (!device || !portId) return 'other';
                        const rawPortKey = portId.includes('-') ? portId.substring(device.id.length + 1) : portId;
                        const baseKey = rawPortKey.replace(/__\d+$/, '');

                        if (baseKey.startsWith('bmc')) return 'bmc';
                        if (baseKey.startsWith('pcie_slot_') || baseKey.startsWith('ns_nic_') || baseKey.startsWith('cx8-') || baseKey === 'cx8p' || baseKey.startsWith('super_nic_mgt')) return 'pcie';
                        return 'other';
                    };

                    const getCableSide = (device, portId) => {
                        if (!device || !portId) return 'right';
                        const rawPortKey = portId.includes('-') ? portId.substring(device.id.length + 1) : portId;
                        const baseKey = rawPortKey.replace(/__\d+$/, '');

                        const anchorSides = device.anchorCableSides || {};

                        if (baseKey.startsWith('cx8-') || baseKey === 'cx8p') return anchorSides.ew_nic || 'right';
                        if (baseKey.startsWith('pcie_slot_') || baseKey.startsWith('ns_nic_')) return anchorSides.pcie_slot || 'right';
                        if (baseKey.startsWith('super_nic_mgt')) return anchorSides.s_nic_m || 'right';
                        if (baseKey.startsWith('bmc')) return anchorSides.bmc || 'right';

                        if (device.portCableSides && device.portCableSides[rawPortKey]) return device.portCableSides[rawPortKey];
                        return device.cableSide || 'right';
                    };

                    const getChannelX = (rackCoords, side, cat) => {
                        const baseLeft = rackCoords.x + 16;
                        const baseRight = rackCoords.x + rackCoords.w - 16;

                        if (!isMsft) return side === 'left' ? baseLeft : baseRight;

                        if (side === 'left') {
                            if (cat === 'bmc') return baseLeft - 6;
                            if (cat === 'pcie') return baseLeft;
                            return baseLeft + 6;
                        } else {
                            if (cat === 'bmc') return baseRight + 6;
                            if (cat === 'pcie') return baseRight;
                            return baseRight - 6;
                        }
                    };

                    const sideA = getCableSide(devA, startPortId);
                    const catA = getCableChannelCategory(devA, startPortId);
                    const channelAX = getChannelX(rackACoords, sideA, catA);

                    const sideB = getCableSide(devB, endPortId);
                    const catB = getCableChannelCategory(devB, endPortId);
                    const channelBX = getChannelX(rackBCoords, sideB, catB);

                    if (devA.rackId === devB.rackId) {
                        // Same rack routing optimization
                        const isDevASwitch = (devA.type || '').startsWith('Switch') || devA.type === 'Router';
                        const isDevBSwitch = (devB.type || '').startsWith('Switch') || devB.type === 'Router';

                        let effectiveChannelA = channelAX;
                        let effectiveChannelB = channelBX;

                        if (isDevASwitch && !isDevBSwitch) {
                            effectiveChannelA = getChannelX(rackACoords, sideB, catB);
                        } else if (isDevBSwitch && !isDevASwitch) {
                            effectiveChannelB = getChannelX(rackBCoords, sideA, catA);
                        } else if (sideA === 'left' && sideB === 'right') {
                            const rawBKey = endPortId.includes('-') ? endPortId.substring(devB.id.length + 1) : endPortId;
                            const baseBKey = rawBKey.replace(/__\d+$/, '');
                            const bCustomized = devB.anchorCableSides?.[baseBKey] || devB.portCableSides?.[rawBKey];
                            if (!bCustomized) effectiveChannelB = getChannelX(rackBCoords, 'left', catB);
                        } else if (sideB === 'left' && sideA === 'right') {
                            const rawAKey = startPortId.includes('-') ? startPortId.substring(devA.id.length + 1) : startPortId;
                            const baseAKey = rawAKey.replace(/__\d+$/, '');
                            const aCustomized = devA.anchorCableSides?.[baseAKey] || devA.portCableSides?.[rawAKey];
                            if (!aCustomized) effectiveChannelA = getChannelX(rackACoords, 'left', catA);
                        }

                        if (Math.abs(effectiveChannelA - effectiveChannelB) < 3) {
                            const points = isMsft ? [
                                { x: effectiveChannelA, y: y1 },
                                { x: effectiveChannelA, y: y2 }
                            ] : [
                                { x: x1, y: y1 },
                                { x: effectiveChannelA, y: y1 },
                                { x: effectiveChannelA, y: y2 },
                                { x: x2, y: y2 }
                            ];
                            return drawRoundedPath(points, 8);
                        } else {
                            const rackCenterY = rackACoords.y + rackACoords.h / 2;
                            const yCross = (y1 + y2) / 2 < rackCenterY 
                                ? (rackACoords.y + 48)
                                : (rackACoords.y + rackACoords.h - 16);
                            
                            const points = isMsft ? [
                                { x: effectiveChannelA, y: y1 },
                                { x: effectiveChannelA, y: yCross },
                                { x: effectiveChannelB, y: yCross },
                                { x: effectiveChannelB, y: y2 }
                            ] : [
                                { x: x1, y: y1 },
                                { x: effectiveChannelA, y: y1 },
                                { x: effectiveChannelA, y: yCross },
                                { x: effectiveChannelB, y: yCross },
                                { x: effectiveChannelB, y: y2 },
                                { x: x2, y: y2 }
                            ];
                            return drawRoundedPath(points, 8);
                        }
                    } else {
                        // Different racks: route via overhead tray
                        const overheadY = Math.min(rackACoords.y, rackBCoords.y) - 24;
                        const points = isMsft ? [
                            { x: channelAX, y: y1 },
                            { x: channelAX, y: overheadY },
                            { x: channelBX, y: overheadY },
                            { x: channelBX, y: y2 }
                        ] : [
                            { x: x1, y: y1 },
                            { x: channelAX, y: y1 },
                            { x: channelAX, y: overheadY },
                            { x: channelBX, y: overheadY },
                            { x: channelBX, y: y2 },
                            { x: x2, y: y2 }
                        ];
                        return drawRoundedPath(points, 8);
                    }
                }
            }
        }

        const dx = Math.abs(x2 - x1);
        const dy = y2 - y1;

        let cx1 = x1;
        let cy1 = y1;
        let cx2 = x2;
        let cy2 = y2;

        let yOff = Math.max(Math.abs(dy) * 0.5, 50);
        let xOff = Math.max(Math.abs(x2 - x1) * 0.5, 100);
        if (dx < 50 && Math.abs(dy) > 100) xOff = 200;

        if (startCoord.isGroup) {
            cy1 = y1 + (y2 > y1 ? yOff : -yOff);
        } else {
            cx1 = x1 + xOff;
        }

        if (endCoord.isGroup) {
            cy2 = y2 + (y1 > y2 ? yOff : -yOff);
        } else {
            cx2 = x2 - xOff;
        }

        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    };

    const getDeviceAnchor = (devId, portKey) => {
        const dev = devices.find(d => d.id === devId);
        if (!dev) return null;
        if (viewMode === 'network') {
            const prefix = getDeviceLayerPrefix(dev);
            if (prefix) {
                const groupName = getDeviceGroupName(dev, racks);
                const groupKey = `${prefix}-${groupName}`;
                if (expandedNetGroups && expandedNetGroups[groupKey] === false) {
                    return { id: groupKey, isGroup: true };
                }
            }
        }
        return { id: `${devId}-${portKey}`, isGroup: false };
    };

    // Gather all established connections
    const connectionPaths = [];
    const drawnSet = new Set();

    devices.forEach(dev => {
        if (dev.connections) {
            Object.entries(dev.connections).forEach(([localKey, targetKey]) => {
                if (targetKey) {
                    const targetDevId = targetKey.includes('-') ? targetKey.substring(0, targetKey.indexOf('-')) : targetKey;
                    const isHighlighted = !isGeneratingPDF && selectedId && (dev.id === selectedId || targetDevId === selectedId);
                    const shouldDraw = showCables || isHighlighted;
                    
                    if (shouldDraw) {
                        const baseLocalKey = localKey.replace(/__\d+$/, '');
                        const targetPortKey = targetKey.substring(targetDevId.length + 1);

                        const localAnchor = getDeviceAnchor(dev.id, baseLocalKey);
                        const targetAnchor = getDeviceAnchor(targetDevId, targetPortKey);

                        if (localAnchor && targetAnchor && localAnchor.id !== targetAnchor.id) {
                            const dedupKey = [localAnchor.id, targetAnchor.id].sort().join('--');
                            const isGroupConnection = localAnchor.isGroup || targetAnchor.isGroup;
                            
                            if (!isGroupConnection || !drawnSet.has(dedupKey)) {
                                const startCoord = localCoords[localAnchor.id];
                                const endCoord = localCoords[targetAnchor.id];

                                if (startCoord && endCoord) {
                                    connectionPaths.push({
                                        id: `${dev.id}-${localKey}-to-${targetKey}`,
                                        path: generatePath(startCoord, endCoord, localAnchor.id, targetAnchor.id),
                                        colorClass: getLineColor(localKey, dev.id, targetDevId, targetPortKey, localAnchor, targetAnchor),
                                        isHighlighted,
                                        isGroupConnection
                                    });
                                    if (isGroupConnection) drawnSet.add(dedupKey);
                                }
                            }
                        }
                    }
                }
            });
        }
    });

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" className="absolute inset-0 pointer-events-none z-[100]" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
            {connectionPaths.map(conn => {
                const opacityValue = conn.isHighlighted ? 1 : (selectedId && !isGeneratingPDF ? 0.03 : 0.8);
                const filterValue = conn.isHighlighted ? 'drop-shadow(0px 0px 5px rgba(255,255,255,0.7))' : 'none';
                const thickness = conn.isHighlighted ? (conn.isGroupConnection ? "6" : "3") : (conn.isGroupConnection ? "4" : "2");
                
                return (
                    <g key={conn.id} className={`transition-all duration-300 ${conn.isHighlighted ? 'z-50' : 'z-10'}`} style={{ opacity: opacityValue, filter: filterValue }}>
                        {/* Shadow line */}
                        <path d={conn.path} stroke="#020617" strokeWidth={conn.isGroupConnection ? "8" : "4"} fill="none" opacity="0.3"/>
                        {/* Colored line, explicitly styling stroke for html2canvas compatibility */}
                        <path d={conn.path} stroke={conn.colorClass} strokeWidth={thickness} fill="none" />
                    </g>
                );
            })}

            {drawing && drawing.startX !== drawing.currentX && (
                <g>
                    <path 
                        d={generatePath({x: drawing.startX, y: drawing.startY}, {x: drawing.currentX, y: drawing.currentY})} 
                        stroke="#020617" strokeWidth="4" fill="none" strokeDasharray="8 4" opacity="0.25"
                    />
                    <path 
                        d={generatePath({x: drawing.startX, y: drawing.startY}, {x: drawing.currentX, y: drawing.currentY})} 
                        stroke={getLineColor(drawing.sourcePortKey, drawing.sourceId, null, '', null, null)} 
                        strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.4"
                    />
                </g>
            )}
        </svg>
    );
};

export default CablesOverlay;
