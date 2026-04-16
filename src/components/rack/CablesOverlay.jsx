import React, { useEffect, useState } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const CablesOverlay = () => {
    const { devices, drawing, setDrawing, showCables, handleConnectionChange, scaleFactor, isFitToScreen, viewMode, selectedId } = useRackPlanner();
    const [localCoords, setLocalCoords] = useState({});

    useEffect(() => {
        let animationFrameId;

        const updateCoords = () => {
            const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement || document.querySelector('.main-canvas > div > div');
            if (rackContainer) {
                const ports = document.querySelectorAll('[data-port-id]');
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
    }, [drawing, setDrawing, handleConnectionChange, isFitToScreen, scaleFactor, viewMode]);

    if (!showCables && !selectedId) return null;

    const getLineColor = (portKey) => {
        const base = portKey.replace('__2', '');
        if (base.startsWith('cx8-')) return 'stroke-green-500';
        if (base.startsWith('ns_nic_')) return 'stroke-yellow-400';
        if (base === 'bmc' || base.startsWith('bmc')) return 'stroke-blue-500';
        if (base.startsWith('port-')) return 'stroke-purple-500';
        return 'stroke-slate-500';
    };

    const generatePath = (x1, y1, x2, y2) => {
        const dx = Math.abs(x2 - x1);
        const dy = y2 - y1;
        // Adjusted curved logic for side-routing rack aesthetic
        let controlPointOffset = Math.max(dx * 0.5, 100);
        if (dx < 50 && Math.abs(dy) > 100) controlPointOffset = 200;

        return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
    };

    // Gather all established connections
    const connectionPaths = [];
    devices.forEach(dev => {
        if (dev.connections) {
            Object.entries(dev.connections).forEach(([localKey, targetKey]) => {
                if (targetKey) {
                    const targetDevId = targetKey.includes('-') ? targetKey.substring(0, targetKey.indexOf('-')) : targetKey;
                    const isHighlighted = selectedId && (dev.id === selectedId || targetDevId === selectedId);
                    const shouldDraw = showCables || isHighlighted;
                    
                    if (shouldDraw) {
                        const baseLocalKey = localKey.replace(/__\d+$/, '');
                        const localFullId = `${dev.id}-${baseLocalKey}`;
                        const targetFullId = targetKey;
                        const startCoord = localCoords[localFullId];
                        const endCoord = localCoords[targetFullId];

                        if (startCoord && endCoord) {
                            connectionPaths.push({
                                id: `${localFullId}-to-${targetFullId}`,
                                path: generatePath(startCoord.x, startCoord.y, endCoord.x, endCoord.y),
                                colorClass: getLineColor(localKey),
                                isHighlighted
                            });
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
                const thickness = conn.isHighlighted ? "3" : "2";
                
                return (
                    <g key={conn.id} className={`transition-all duration-300 ${opacityClass} ${conn.isHighlighted ? 'z-50' : 'z-10'}`}>
                        {/* Shadow line */}
                        <path d={conn.path} className="stroke-slate-950" strokeWidth="4" fill="none" opacity="0.3"/>
                        {/* Colored line, filter removed for html2canvas compatibility */}
                        <path d={conn.path} className={`${conn.colorClass}`} strokeWidth={thickness} fill="none" />
                    </g>
                );
            })}

            {drawing && drawing.startX !== drawing.currentX && (
                <g>
                    <path 
                        d={generatePath(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY)} 
                        className="stroke-slate-950" strokeWidth="4" fill="none" strokeDasharray="8 4" opacity="0.25"
                    />
                    <path 
                        d={generatePath(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY)} 
                        className={`${getLineColor(drawing.sourcePortKey)} opacity-40`} 
                        strokeWidth="2" fill="none" strokeDasharray="8 4"
                    />
                </g>
            )}
        </svg>
    );
};

export default CablesOverlay;
