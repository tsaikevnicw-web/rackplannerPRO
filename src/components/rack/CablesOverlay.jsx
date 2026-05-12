import React, { useEffect, useState } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getDeviceLayerPrefix, getDeviceGroupName } from '../../utils/helpers';

const CablesOverlay = () => {
    const { devices, racks, drawing, setDrawing, showCables, handleConnectionChange, scaleFactor, isFitToScreen, viewMode, selectedId, expandedNetGroups } = useRackPlanner();
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

        const handleConnectEvent = (e) => {
            if (e.detail && e.detail.drawing) {
                const { sourceId, sourcePortKey } = e.detail.drawing;
                const { targetDevId, targetPortKey } = e.detail;

                const sourceDevice = devices.find(d => d.id === sourceId);
                const isServerOrStorage = sourceDevice &&
                    ((sourceDevice.type || '').startsWith('Server') ||
                     (sourceDevice.type || '').startsWith('Storage'));

                if (isServerOrStorage) {
                    const MAX_CONN = 8;
                    const existing = sourceDevice.connections?.[sourcePortKey];
                    if (!existing) {
                        // 第一 slot 尚空
                        handleConnectionChange(sourceId, sourcePortKey, `${targetDevId}-${targetPortKey}`);
                    } else {
                        // 從 __2 找到第一個空間
                        let useKey = null;
                        for (let i = 2; i <= MAX_CONN; i++) {
                            const slotKey = `${sourcePortKey}__${i}`;
                            if (!sourceDevice.connections?.[slotKey]) { useKey = slotKey; break; }
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

    if (!showCables && !selectedId) return null;

    const GROUP_COLORS = [
        'stroke-green-500', 'stroke-red-500', 'stroke-blue-500', 
        'stroke-yellow-400', 'stroke-purple-500', 'stroke-pink-500', 
        'stroke-cyan-400', 'stroke-orange-500'
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
            srcBase === 'host_water_cold' || tgtBase === 'host_water_cold') return 'stroke-blue-400';
        if (srcBase === 'water_hot'  || tgtBase === 'water_hot' ||
            srcBase === 'host_water_hot'  || tgtBase === 'host_water_hot')  return 'stroke-red-400';

        // ── BMC 鈔點 → 藍色 ──
        const isBMC = srcBase === 'bmc' || srcBase.startsWith('bmc')
                   || tgtBase === 'bmc' || tgtBase.startsWith('bmc');
        if (isBMC) return 'stroke-blue-400';

        const devA = devices.find(d => d.id === devAId);
        const devB = devices.find(d => d.id === devBId);
        const types = [devA?.type, devB?.type].filter(Boolean);

        // ── 2U2N 專屬 Node 1 / Node 2 網路線顏色區分 (OPA/NIC) ──
        if (srcBase.includes('_n1-') || tgtBase.includes('_n1-')) return 'stroke-yellow-400';
        if (srcBase.includes('_n2-') || tgtBase.includes('_n2-')) return 'stroke-red-500';

        // 優先順序：Router > Switch800G > Switch400G (含 400G1U) > Switch10G > Switch1G
        if (types.some(t => t === 'Router'))           return 'stroke-red-500';
        if (types.some(t => t === 'Switch800G'))        return 'stroke-emerald-400';
        if (types.some(t => t === 'Switch400G' || t === 'Switch400G1U')) return 'stroke-yellow-400';
        if (types.some(t => t === 'Switch10G'))         return 'stroke-orange-400';
        if (types.some(t => t === 'Switch1G'))          return 'stroke-blue-400';

        // Fallback: 依 portKey 前綴判斷
        if (srcBase.startsWith('cx8-'))    return 'stroke-green-500';
        if (srcBase.startsWith('ns_nic_')) return 'stroke-yellow-400';
        if (srcBase.startsWith('port-'))   return 'stroke-purple-500';
        return 'stroke-slate-500';
    };

    const generatePath = (startCoord, endCoord) => {
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
                    const isHighlighted = selectedId && (dev.id === selectedId || targetDevId === selectedId);
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
                                        path: generatePath(startCoord, endCoord),
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
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none z-[100]" style={{ overflow: 'visible' }}>
            {connectionPaths.map(conn => {
                const opacityClass = conn.isHighlighted ? "opacity-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.7)]" : (selectedId ? "opacity-[0.03]" : "opacity-80");
                const thickness = conn.isHighlighted ? (conn.isGroupConnection ? "6" : "3") : (conn.isGroupConnection ? "4" : "2");
                
                return (
                    <g key={conn.id} className={`transition-all duration-300 ${opacityClass} ${conn.isHighlighted ? 'z-50' : 'z-10'}`}>
                        {/* Shadow line */}
                        <path d={conn.path} className="stroke-slate-950" strokeWidth={conn.isGroupConnection ? "8" : "4"} fill="none" opacity="0.3"/>
                        {/* Colored line, filter removed for html2canvas compatibility */}
                        <path d={conn.path} className={`${conn.colorClass}`} strokeWidth={thickness} fill="none" />
                    </g>
                );
            })}

            {drawing && drawing.startX !== drawing.currentX && (
                <g>
                    <path 
                        d={generatePath({x: drawing.startX, y: drawing.startY}, {x: drawing.currentX, y: drawing.currentY})} 
                        className="stroke-slate-950" strokeWidth="4" fill="none" strokeDasharray="8 4" opacity="0.25"
                    />
                    <path 
                        d={generatePath({x: drawing.startX, y: drawing.startY}, {x: drawing.currentX, y: drawing.currentY})} 
                        className={`${getLineColor(drawing.sourcePortKey, drawing.sourceId, null, '', null, null)} opacity-40`} 
                        strokeWidth="2" fill="none" strokeDasharray="8 4"
                    />
                </g>
            )}
        </svg>
    );
};

export default CablesOverlay;
