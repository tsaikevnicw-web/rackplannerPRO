import React, { useState, useRef, useEffect } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES } from '../../utils/constants';
import { getIconByType, checkHighGravityWarning } from '../../utils/helpers';

const RackView3D = ({ racksToRender }) => {
    const { devices, selectedIds, setSelectedIds, deviceSearchTerm, showHeatmap } = useRackPlanner();
    const [rotateX, setRotateX] = useState(-15);
    const [rotateY, setRotateY] = useState(-30);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const rotateStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        // Only trigger on main mouse click
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        rotateStart.current = { x: rotateX, y: rotateY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStart.current.x;
        const deltaY = e.clientY - dragStart.current.y;
        
        // Dragging X changes rotateY (rotation around vertical Y axis)
        // Dragging Y changes rotateX (rotation around horizontal X axis)
        const nextY = rotateStart.current.y + deltaX * 0.4;
        const nextX = Math.max(-60, Math.min(60, rotateStart.current.x - deltaY * 0.4));
        
        setRotateX(nextX);
        setRotateY(nextY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div 
            className="w-full flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#0a121e] to-[#040811] rounded-2xl border border-slate-700/40 p-6 select-none shadow-2xl cursor-grab active:cursor-grabbing"
            style={{ height: '72vh', minHeight: '620px' }}
            onMouseDown={handleMouseDown}
        >
            {/* Help Control Box */}
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl px-4 py-2.5 text-[11px] text-slate-300 pointer-events-none z-50 shadow-xl flex flex-col gap-1">
                <p className="font-bold text-indigo-400 text-xs">3D 互動視角</p>
                <p>• 按住左鍵拖曳：旋轉機櫃</p>
                <p>• 點選設備：選取設備內容</p>
                <p>• 熱圖按鈕：啟用溫度模擬</p>
            </div>

            {/* 3D Scene Viewport */}
            <div 
                className="w-full h-full flex items-center justify-center"
                style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
            >
                {/* Rotatable Group Container */}
                <div 
                    className="flex justify-center items-center gap-28 transition-transform duration-75"
                    style={{ 
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
                    }}
                >
                    {racksToRender.map(rack => {
                        const rackMaxU = rack.uCount || 48;
                        const rackHeight = rackMaxU * 10; // 10px per U in 3D view (480px total height)
                        const rackWidth = 270;
                        const rackDepth = 250;
                        
                        const rackDevices = devices.filter(d => d.rackId === rack.id && d.type !== 'SideCDU');
                        const sideCDU = devices.find(d => d.rackId === rack.id && d.type === 'SideCDU');
                        
                        return (
                            <div key={rack.id} className="relative flex items-center" style={{ transformStyle: 'preserve-3d' }}>
                                {/* Main Rack 3D Cuboid */}
                                <div 
                                    className="relative transition-all duration-300"
                                    style={{ 
                                        width: rackWidth, 
                                        height: rackHeight,
                                        transformStyle: 'preserve-3d',
                                    }}
                                >
                                    {/* Front Face: Displays U Slots & Devices */}
                                    <div 
                                        className="absolute inset-0 bg-[#02050a] border-2 border-slate-700/80 rounded-sm z-20 flex flex-col justify-between"
                                        style={{ 
                                            transform: `translateZ(${rackDepth / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        {/* Rack Header Area */}
                                        <div className="bg-gradient-to-b from-slate-700/90 to-slate-800/90 h-8 border-b border-slate-600/60 flex justify-between items-center px-4 font-mono text-[10px] font-bold text-slate-200">
                                            <span>{rack.name}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                                        </div>

                                        {/* Devices Rendering Area */}
                                        <div className="flex-1 w-full relative overflow-hidden">
                                            {/* Render U level lines for references */}
                                            {Array.from({ length: Math.floor(rackMaxU / 5) }).map((_, i) => {
                                                const uVal = (i + 1) * 5;
                                                return (
                                                    <div 
                                                        key={uVal}
                                                        className="absolute left-0 right-0 border-b border-slate-800/40 text-[7px] text-slate-600 pl-1 select-none pointer-events-none"
                                                        style={{ bottom: uVal * 10 - 1 }}
                                                    >
                                                        {uVal}U
                                                    </div>
                                                );
                                            })}

                                            {/* Standard Devices */}
                                            {rackDevices.map(dev => {
                                                const isSelected = selectedIds.includes(dev.id);
                                                const isSearchMatch = deviceSearchTerm && (
                                                    (dev.customName || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
                                                    (dev.type || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
                                                );
                                                const Icon = getIconByType(dev.type);
                                                const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;
                                                const isHighGravity = checkHighGravityWarning(dev, rack);

                                                // Heatmap thermal status logic
                                                let heatmapGlowClass = '';
                                                let heatmapBgClass = '';
                                                if (showHeatmap) {
                                                    const hostCooling = dev.hardwareSpecs?.cooling?.host || 'AC';
                                                    const gpuCooling  = dev.hardwareSpecs?.cooling?.gpu  || 'AC';
                                                    const hasLC = dev.type === 'CDU4U' || hostCooling === 'LC' || gpuCooling === 'LC';
                                                    
                                                    if (hasLC) {
                                                        heatmapGlowClass = 'shadow-[0_0_15px_rgba(6,182,212,0.85)] ring-1 ring-cyan-400/80';
                                                        heatmapBgClass = 'bg-[#031d27]/90 border-cyan-500/80 text-cyan-200';
                                                    } else if ((dev.power || 0) > 1000) {
                                                        heatmapGlowClass = 'shadow-[0_0_15px_rgba(239,68,68,0.85)] ring-1 ring-red-500/80 animate-pulse';
                                                        heatmapBgClass = 'bg-[#290a0a]/90 border-red-500/80 text-red-200';
                                                    } else if ((dev.power || 0) >= 300) {
                                                        heatmapGlowClass = 'shadow-[0_0_15px_rgba(245,158,11,0.85)] ring-1 ring-amber-500/80';
                                                        heatmapBgClass = 'bg-[#281305]/90 border-amber-500/70 text-amber-200';
                                                    } else {
                                                        heatmapGlowClass = 'shadow-[0_0_10px_rgba(34,197,94,0.65)] ring-1 ring-emerald-500/60';
                                                        heatmapBgClass = 'bg-[#031c10]/90 border-emerald-500/50 text-emerald-200';
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={dev.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedIds([dev.id]);
                                                        }}
                                                        className={`absolute left-3 right-3 rounded-sm border transition-all duration-200 flex items-center justify-between px-2 cursor-pointer
                                                            ${showHeatmap ? `${heatmapBgClass} ${heatmapGlowClass}` : `${tStyle.bg} ${tStyle.border} ${tStyle.glow}`}
                                                            ${isSelected ? 'ring-2 ring-white z-30 brightness-110 shadow-lg' : ''}
                                                            ${isSearchMatch ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
                                                        `}
                                                        style={{ 
                                                            height: dev.size * 10 - 2, 
                                                            bottom: (dev.startU - 1) * 10 + 1,
                                                            transformStyle: 'preserve-3d'
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <Icon className={`w-3 h-3 shrink-0 ${tStyle.text}`} />
                                                            <span className="font-bold text-[9px] truncate">{dev.customName}</span>
                                                            {isHighGravity && <span className="text-amber-500 text-[9px] shrink-0">⚠️</span>}
                                                        </div>
                                                        <span className="text-[7px] text-slate-500 font-mono shrink-0 ml-1 bg-slate-900/60 px-1 py-0.2 rounded">{dev.size}U</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Rack Base Plate Area */}
                                        <div className="bg-slate-800 h-4 border-t border-slate-700/60"></div>
                                    </div>

                                    {/* Back Face: Mesh Door */}
                                    <div 
                                        className="absolute inset-0 bg-[#060b13] border-2 border-slate-700/80 rounded-sm z-10 flex flex-col justify-between"
                                        style={{ 
                                            transform: `rotateY(180deg) translateZ(${rackDepth / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        <div className="h-8 bg-slate-800/90 border-b border-slate-600/60 px-4 flex items-center font-mono text-[9px] text-slate-400">BACK PANEL</div>
                                        <div 
                                            className="flex-1 w-full bg-[radial-gradient(circle,#1e293b_1px,transparent_1px)] opacity-60"
                                            style={{ backgroundColor: '#020612', backgroundSize: '4px 4px' }}
                                        ></div>
                                        <div className="h-4 bg-slate-800/90 border-t border-slate-700/60"></div>
                                    </div>

                                    {/* Left Face: Metal Panel */}
                                    <div 
                                        className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700/80 rounded-sm"
                                        style={{ 
                                            width: rackDepth, 
                                            height: rackHeight,
                                            left: '50%',
                                            marginLeft: -rackDepth / 2,
                                            transform: `rotateY(-90deg) translateZ(${rackWidth / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700/40 shadow-[inset_1px_0_0_rgba(0,0,0,0.5)]"></div>
                                    </div>

                                    {/* Right Face: Metal Panel */}
                                    <div 
                                        className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700/80 rounded-sm"
                                        style={{ 
                                            width: rackDepth, 
                                            height: rackHeight,
                                            left: '50%',
                                            marginLeft: -rackDepth / 2,
                                            transform: `rotateY(90deg) translateZ(${rackWidth / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700/40 shadow-[inset_1px_0_0_rgba(0,0,0,0.5)]"></div>
                                    </div>

                                    {/* Top Face */}
                                    <div 
                                        className="absolute bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 rounded-sm shadow-md"
                                        style={{ 
                                            width: rackWidth, 
                                            height: rackDepth,
                                            top: '50%',
                                            marginTop: -rackDepth / 2,
                                            transform: `rotateX(90deg) translateZ(${rackHeight / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        <div className="flex justify-around items-center h-full w-full px-6">
                                            <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center"><div className="w-5 h-5 rounded-full border border-dashed border-slate-800"></div></div>
                                            <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center"><div className="w-5 h-5 rounded-full border border-dashed border-slate-800"></div></div>
                                        </div>
                                    </div>

                                    {/* Bottom Face */}
                                    <div 
                                        className="absolute bg-slate-950 border-2 border-slate-800 rounded-sm"
                                        style={{ 
                                            width: rackWidth, 
                                            height: rackDepth,
                                            top: '50%',
                                            marginTop: -rackDepth / 2,
                                            transform: `rotateX(-90deg) translateZ(${rackHeight / 2}px)`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    ></div>
                                </div>

                                {/* Render Side CDU in 3D if present */}
                                {sideCDU && (
                                    <div 
                                        className="relative transition-all duration-300"
                                        style={{ 
                                            width: 120,
                                            height: rackHeight,
                                            transformStyle: 'preserve-3d',
                                            transform: `translateZ(0px) translateX(${rackWidth / 2 + 70}px)`
                                        }}
                                    >
                                        {/* CDU Front Face */}
                                        <div 
                                            className={`absolute inset-0 border-2 rounded-sm z-20 flex flex-col justify-between transition-all duration-200
                                                ${showHeatmap 
                                                    ? 'bg-[#031d27]/90 border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.8)]' 
                                                    : 'bg-[#061824] border-cyan-700/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                }`}
                                            style={{ 
                                                transform: `translateZ(${rackDepth / 2}px)`,
                                                transformStyle: 'preserve-3d'
                                            }}
                                        >
                                            <div className="bg-cyan-950/80 border-b border-cyan-800 text-[8px] font-mono font-bold text-cyan-300 py-1.5 text-center">CDU SIDECAR</div>
                                            <div className="flex-1 flex flex-col items-center justify-center p-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
                                                <span className="text-[8px] font-bold text-cyan-100 text-center mt-2 truncate max-w-full">{sideCDU.customName}</span>
                                                <span className="text-[7px] text-cyan-500 font-mono mt-1">{sideCDU.coolingCapacity?.toLocaleString()} W</span>
                                            </div>
                                            <div className="bg-slate-800 h-4 border-t border-slate-700"></div>
                                        </div>

                                        {/* CDU Side Panels */}
                                        <div 
                                            className="absolute top-0 bottom-0 bg-slate-900 border-2 border-slate-800 rounded-sm"
                                            style={{ 
                                                width: rackDepth, 
                                                height: rackHeight,
                                                left: '50%',
                                                marginLeft: -rackDepth / 2,
                                                transform: `rotateY(-90deg) translateZ(60px)`,
                                                transformStyle: 'preserve-3d'
                                            }}
                                        ></div>
                                        <div 
                                            className="absolute top-0 bottom-0 bg-slate-900 border-2 border-slate-800 rounded-sm"
                                            style={{ 
                                                width: rackDepth, 
                                                height: rackHeight,
                                                left: '50%',
                                                marginLeft: -rackDepth / 2,
                                                transform: `rotateY(90deg) translateZ(60px)`,
                                                transformStyle: 'preserve-3d'
                                            }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RackView3D;
