import React, { useEffect } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const CablesOverlay = () => {
    const { devices, portCoords, drawing, setDrawing, showCables, handleConnectionChange } = useRackPlanner();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (drawing) {
                const scrollParent = document.querySelector('.main-canvas');
                const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement;
                if (!scrollParent || !rackContainer) return;
                
                const containerRect = rackContainer.getBoundingClientRect();
                const sLeft = scrollParent.scrollLeft;
                const sTop = scrollParent.scrollTop;

                const currentX = e.clientX - containerRect.left + sLeft;
                const currentY = e.clientY - containerRect.top + sTop;

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
                // Form key as deviceId-portKey
                handleConnectionChange(sourceId, sourcePortKey, `${targetDevId}-${targetPortKey}`);
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
    }, [drawing, setDrawing, handleConnectionChange]);

    if (!showCables) return null;

    const getLineColor = (portKey) => {
        if (portKey.startsWith('cx8-')) return 'stroke-green-500';
        if (portKey.startsWith('ns_nic_')) return 'stroke-yellow-400';
        if (portKey === 'bmc') return 'stroke-blue-500';
        if (portKey.startsWith('port-')) return 'stroke-purple-500';
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
                    const localFullId = `${dev.id}-${localKey}`;
                    const targetFullId = targetKey;
                    const startCoord = portCoords[localFullId];
                    const endCoord = portCoords[targetFullId];

                    if (startCoord && endCoord) {
                        connectionPaths.push({
                            id: `${localFullId}-to-${targetFullId}`,
                            path: generatePath(startCoord.x, startCoord.y, endCoord.x, endCoord.y),
                            colorClass: getLineColor(localKey)
                        });
                    }
                }
            });
        }
    });

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]" style={{ overflow: 'visible' }}>
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            
            {connectionPaths.map(conn => (
                <g key={conn.id}>
                    {/* Shadow line */}
                    <path d={conn.path} className="stroke-slate-950" strokeWidth="4" fill="none" opacity="0.6"/>
                    {/* Colored glow line */}
                    <path d={conn.path} className={`${conn.colorClass}`} strokeWidth="2" fill="none" opacity="0.8" filter="url(#glow)"/>
                </g>
            ))}

            {drawing && drawing.startX !== drawing.currentX && (
                <g>
                    <path 
                        d={generatePath(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY)} 
                        className="stroke-slate-950" strokeWidth="4" fill="none" strokeDasharray="8 4" opacity="0.5"
                    />
                    <path 
                        d={generatePath(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY)} 
                        className={`${getLineColor(drawing.sourcePortKey)} opacity-70`} 
                        strokeWidth="2" fill="none" strokeDasharray="8 4"
                    />
                </g>
            )}
        </svg>
    );
};

export default CablesOverlay;
