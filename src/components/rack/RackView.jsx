import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES, U_HEIGHT, DEFAULT_RACK_U_COUNT } from '../../utils/constants';
import { getIconByType, getNicCount, getSwitchPortCount, getSwitchPortLayout, getServerCategory, getServerConfig, getHighDensityNodes, getHighDensitySize, getAIServerSize, getPcieSlotInfo } from '../../utils/helpers';
import { useRackInteractions } from '../../hooks/useRackInteractions';

const RackView = ({ racksToRender }) => {
    const { 
        devices, selectedId, setSelectedId, showCables, drawing, setDrawing, connectedPortsSet, generateId, handleDisconnectPort 
    } = useRackPlanner();
    
    const { handleDragStart, handleDrop, handleDragOver } = useRackInteractions();

    const renderPortAnchor = (dev, portKey, label, hoverClass, sizeClass = "w-2.5 h-2.5 shrink-0", colorOverride = null) => {
        const fullId = `${dev.id}-${portKey}`;
        const isConnected = connectedPortsSet.has(fullId);
        // 計算此 port 目前的連線總數（1 + __2 ~ __8）
        let connCount = 0;
        if (isConnected) {
            connCount = 1;
            for (let i = 2; i <= 8; i++) {
                if (dev.connections?.[`${portKey}__${i}`] !== undefined) connCount++;
            }
        }

        // Water cooling port color logic
        let waterConnectedColor = null;
        if (portKey === 'water_cold' || portKey === 'host_water_cold') {
            waterConnectedColor = isConnected
                ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa] border-blue-300'
                : 'bg-slate-700 border-blue-700/50 opacity-70';
        } else if (portKey === 'water_hot' || portKey === 'host_water_hot') {
            waterConnectedColor = isConnected
                ? 'bg-red-400 shadow-[0_0_10px_#f87171] border-red-300'
                : 'bg-slate-700 border-red-700/50 opacity-70';
        }
        
        const connectedColorStr = 'bg-green-400 shadow-[0_0_8px_#4ade80]'; 
        const defaultBorder = isConnected ? 'border-green-200' : 'border-slate-500';
        const borderClass = waterConnectedColor ? '' : defaultBorder;

        const bgClass = waterConnectedColor ? waterConnectedColor : (colorOverride ? colorOverride : (isConnected ? connectedColorStr : 'bg-slate-700 opacity-60'));
        const shapeClass = (portKey === 'water_cold' || portKey === 'water_hot') ? 'rounded-full' : 'rounded-[2px]';

        return (
            <div
                key={portKey}
                data-port-id={fullId}
                className={`${shapeClass} ${sizeClass} border ${borderClass} transition-all duration-200 cursor-crosshair shrink-0 relative group z-50 hover:brightness-150 hover:scale-150 ${hoverClass} ${bgClass}`}
                title={label}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isConnected) handleDisconnectPort(fullId);
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.target.getBoundingClientRect();
                    const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement;
                    const containerRect = rackContainer ? rackContainer.getBoundingClientRect() : { left: 0, top: 0 };
                    const scrollParent = document.querySelector('.main-canvas');
                    const sLeft = scrollParent ? scrollParent.scrollLeft : 0;
                    const sTop = scrollParent ? scrollParent.scrollTop : 0;

                    const startX = rect.left + rect.width / 2 - containerRect.left + sLeft;
                    const startY = rect.top + rect.height / 2 - containerRect.top + sTop;
                    setDrawing({ sourceId: dev.id, sourcePortKey: portKey, startX, startY, currentX: startX, currentY: startY });
                }}
                onMouseUp={(e) => {
                    e.stopPropagation();
                    if (drawing && drawing.sourceId !== dev.id) {
                        const event = new CustomEvent('rackplanner-connect', { detail: { targetDevId: dev.id, targetPortKey: portKey, drawing }});
                        window.dispatchEvent(event);
                    }
                    setDrawing(null);
                }}
                onMouseEnter={() => setDrawing(prev => prev ? { ...prev, isHoveringTarget: true } : prev)}
                onMouseLeave={() => setDrawing(prev => prev ? { ...prev, isHoveringTarget: false } : prev)}
            >
                {isConnected && !colorOverride && !waterConnectedColor && (
                    connCount > 1
                        ? <div className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-slate-900 leading-none">{connCount}</div>
                        : <div className="absolute inset-0 m-auto w-[60%] h-[60%] bg-white rounded-sm opacity-80"></div>
                )}
            </div>
        );
    };

    return racksToRender.map(rack => {
        const rackMaxU = rack.uCount || DEFAULT_RACK_U_COUNT;
        const isRackSelected = selectedId === rack.id;

        return (
            <div key={rack.id} className="flex items-end gap-2 shrink-0 relative">
                <div className="w-[420px] flex flex-col items-center rack-container relative">
                    
                    {/* 機櫃頂部 */}
                    <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(rack.id); }}
                        className={`bg-gradient-to-b from-slate-700 to-slate-800 w-[420px] h-12 rounded-t-xl border-t-2 border-x-2 border-slate-500 flex justify-between items-center px-6 shadow-xl z-10 relative overflow-hidden cursor-pointer transition-all duration-200 ${isRackSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 brightness-125' : 'hover:brightness-110'}`}
                    >
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#000_4px,#000_8px)] mix-blend-overlay"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e] relative z-10 border border-green-200"></div>
                        <div className="text-sm font-mono text-slate-200 font-bold tracking-widest relative z-10 drop-shadow-md truncate max-w-[280px]">{rack.name}</div>
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] relative z-10 border border-blue-200"></div>
                    </div>

                    {/* 機櫃主體 */}
                    <div className="bg-[#050811] border-x-2 border-slate-700 w-[420px] relative shadow-[0_0_40px_rgba(0,0,0,0.8)]" style={{ height: rackMaxU * U_HEIGHT }}>
                        {/* 擬真立柱 */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-800 to-slate-900 border-r border-slate-950 flex flex-col justify-around py-1 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.6)]">
                            {Array.from({ length: rackMaxU * 3 }).map((_, i) => <div key={i} className="w-2.5 h-1.5 bg-black rounded-[2px] shadow-inner border-t border-b border-white/5 ml-3"></div>)}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-800 to-slate-900 border-l border-slate-950 flex flex-col justify-around py-1 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.6)]">
                            {Array.from({ length: rackMaxU * 3 }).map((_, i) => <div key={i} className="w-2.5 h-1.5 bg-black rounded-[2px] shadow-inner border-t border-b border-white/5 mr-3"></div>)}
                        </div>

                        {/* U 數空間標示 */}
                        {Array.from({ length: rackMaxU }).map((_, idx) => {
                            const uNum = rackMaxU - idx;
                            return (
                                <div key={uNum} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, uNum, rack.id)} className="absolute w-full border-b border-slate-800/30 flex items-center group" style={{ height: U_HEIGHT, top: (rackMaxU - uNum) * U_HEIGHT, zIndex: 1 }}>
                                    <div className="absolute -left-6 text-[10px] font-mono text-slate-500 w-5 text-right select-none z-20 font-bold">{uNum}</div>
                                    <div className="absolute -right-6 text-[10px] font-mono text-slate-500 w-5 text-left select-none z-20 font-bold">{uNum}</div>
                                    <div className="hidden group-hover:block absolute left-8 right-8 h-full bg-blue-500/10 border border-blue-500/30 z-0 backdrop-blur-[1px]"></div>
                                </div>
                            );
                        })}

                        {/* 設備實體繪製 */}
                        {devices.filter(dev => dev.rackId === rack.id && dev.type !== 'SideCDU').map((dev) => {
                            const isSelected = selectedId === dev.id;
                            const Icon = getIconByType(dev.type);
                            const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;
                            const nic1Count = getNicCount(dev, 'ns_nic_1');
                            const nic2Count = getNicCount(dev, 'ns_nic_2');
                            const ocpCount = getNicCount(dev, 'ocp');
                            const portCount = getSwitchPortCount(dev);

                            const cx8NetworkType = dev.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';
                            const cx8ActiveColor = cx8NetworkType === 'Ethernet' ? 'bg-green-500 border-green-300 shadow-[0_0_8px_#22c55e]' : 'bg-orange-500 border-orange-300 shadow-[0_0_8px_#f97316]';
                            const superNicMgtCount = getNicCount(dev, 'super_nic_mgt');

                            return (
                                <div
                                    key={dev.id} draggable onDragStart={(e) => handleDragStart(e, dev, false)} onClick={(e) => { e.stopPropagation(); setSelectedId(dev.id); }}
                                    className={`absolute left-[8px] right-[8px] cursor-grab active:cursor-grabbing rounded-sm transition-all duration-200 ${tStyle.bg} ${tStyle.border} border ${isSelected ? `ring-2 ring-white z-30 brightness-125 shadow-[0_0_25px_rgba(255,255,255,0.15)]` : `hover:brightness-125 z-20 shadow-xl ${tStyle.glow}`}`}
                                    style={{ height: dev.size * U_HEIGHT - 2, bottom: (dev.startU - 1) * U_HEIGHT + 1 }}
                                >
                                    {/* 金屬掛耳 */}
                                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-b from-slate-700 to-slate-800 border-r border-slate-900 flex flex-col justify-around py-1.5 shrink-0 z-30 rounded-l-sm shadow-[1px_0_3px_rgba(0,0,0,0.5)]">
                                        <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-slate-600/50"></div>
                                        {dev.size > 1 && <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-slate-600/50"></div>}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-b from-slate-700 to-slate-800 border-l border-slate-900 flex flex-col justify-around py-1.5 shrink-0 z-30 rounded-r-sm shadow-[-1px_0_3px_rgba(0,0,0,0.5)]">
                                        <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-slate-600/50"></div>
                                        {dev.size > 1 && <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-slate-600/50"></div>}
                                    </div>

                                    {/* 設備面板與散熱格柵 */}
                                    <div className="absolute inset-y-0 left-4 right-4 flex items-center text-white overflow-hidden z-20">
                                        <div className="absolute inset-0 opacity-[0.15] bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)] mix-blend-overlay"></div>
                                        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-black/60 to-transparent pointer-events-none"></div>

                                        {/* 左側：Icon 與名稱 */}
                                        <div className="flex items-center flex-1 min-w-0 h-full relative z-10 overflow-hidden pl-3 pr-2">
                                            <Icon className={`w-4 h-4 mr-2 opacity-90 shrink-0 drop-shadow-md ${tStyle.text}`} />
                                            <div className="font-bold text-sm tracking-wide truncate drop-shadow-md">{dev.customName}</div>
                                        </div>

                                        {/* 右側：Ports 區域 */}
                                        <div className="relative z-30 flex items-center justify-end shrink-0 h-full pr-2">
                                            {(getServerCategory(dev) === 'General' || (dev.type || '').startsWith('Storage') || dev.type === 'CDU4U') && (() => {
                                                const is2U = dev.size >= 2 || dev.type === 'Storage2U';
                                                const hostCooling = dev.hardwareSpecs?.cooling?.host || 'AC';
                                                const hasLC = hostCooling === 'LC';

                                                const renderWaterAnchors = (label = 'Host') => (
                                                    <div className="flex items-center gap-0.5">
                                                        <div className="text-[9px] font-bold font-mono text-cyan-400/70 leading-normal mr-0.5">{label}</div>
                                                        <div className="text-[9px] font-bold font-mono text-blue-300/80 leading-normal ml-0.5">C</div>
                                                        {renderPortAnchor(dev, 'host_water_cold', `${label} Cold Water Inlet`, 'hover:border-blue-300 hover:bg-blue-500/40', 'w-3 h-3 shrink-0')}
                                                        <div className="text-[9px] font-bold font-mono text-red-300/80 leading-normal ml-0.5">H</div>
                                                        {renderPortAnchor(dev, 'host_water_hot', `${label} Hot Water Return`, 'hover:border-red-300 hover:bg-red-500/40', 'w-3 h-3 shrink-0')}
                                                    </div>
                                                );

                                                if (is2U) {
                                                    return (
                                                        <div className="flex flex-col justify-center gap-1 border-l border-white/20 pl-3 shrink-0 h-full">
                                                            {/* Row 1: PCIe slots & OCP */}
                                                            <div className="flex items-center justify-end gap-2 w-full">
                                                                {(() => {
                                                                    const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                                                    return Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                        const slotIdx = i + 1;
                                                                        const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx);
                                                                        if (slotPortCount <= 0) return null;
                                                                        return (
                                                                            <div key={slotIdx} className="flex items-center gap-1.5">
                                                                                <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{model}</div>
                                                                                <div className="flex gap-0.5">
                                                                                    {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}-${pIdx + 1}`, `P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                                {ocpCount > 0 && (
                                                                    <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-white/10">
                                                                        <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{dev.hardwareSpecs?.ocp?.model || 'OCP'}</div>
                                                                        <div className="flex gap-0.5">
                                                                            {Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp-${i + 1}`, `OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Row 2: BMC, S-NIC-M, Water */}
                                                            <div className="flex items-center justify-end gap-2 w-full">
                                                                {superNicMgtCount > 0 && (
                                                                    <>
                                                                        <div className="text-[10px] font-bold font-mono text-violet-400/80 leading-normal pb-0.5">S-NIC-M</div>
                                                                        <div className="flex gap-0.5">
                                                                            {Array.from({ length: superNicMgtCount }).map((_, i) => renderPortAnchor(dev, `super_nic_mgt-${i + 1}`, `Super NIC Mgt Port ${i + 1}`, 'hover:border-violet-400 hover:bg-violet-500/50', 'w-2.5 h-2.5 shrink-0', null))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">BMC</div>
                                                                <div className="flex gap-0.5">
                                                                    {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                                                </div>
                                                                {hasLC && (
                                                                    <div className="ml-1 pl-1 border-l border-cyan-900/50">
                                                                        {renderWaterAnchors()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Default (1U, Storage, CDU) layout
                                                return (
                                                    <div className="flex items-center justify-end gap-3 border-l border-white/20 pl-3 shrink-0 h-full">
                                                        {((dev.type || '').startsWith('Server') || (dev.type || '').startsWith('Storage')) && (
                                                            <>
                                                                {(() => {
                                                                    const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                                                    return Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                        const slotIdx = i + 1;
                                                                        const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx);
                                                                        if (slotPortCount <= 0) return null;
                                                                        return (
                                                                            <div key={slotIdx} className="flex items-center gap-1.5">
                                                                                <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{model}</div>
                                                                                <div className="flex gap-0.5 flex-wrap max-w-[50px] justify-end">
                                                                                    {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}-${pIdx + 1}`, `P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                                {ocpCount > 0 && (
                                                                    <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-white/10">
                                                                        <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{dev.hardwareSpecs?.ocp?.model || 'OCP'}</div>
                                                                        <div className="flex gap-0.5 flex-wrap max-w-[50px] justify-end">
                                                                            {Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp-${i + 1}`, `OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        {superNicMgtCount > 0 && ((dev.type || '').startsWith('Server') || (dev.type || '').startsWith('Storage')) && (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="text-[10px] font-bold font-mono text-violet-400/80 leading-normal pb-0.5">S-NIC-M</div>
                                                                <div className="flex gap-0.5 flex-wrap max-w-[50px] justify-end">
                                                                    {Array.from({ length: superNicMgtCount }).map((_, i) => renderPortAnchor(dev, `super_nic_mgt-${i + 1}`, `Super NIC Mgt Port ${i + 1}`, 'hover:border-violet-400 hover:bg-violet-500/50'))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {dev.type === 'CDU4U' && (
                                                            <>
                                                                <div className="flex items-center gap-1">
                                                                    <div className="text-[10px] font-bold font-mono text-blue-300/80 leading-normal pb-0.5">Cold</div>
                                                                    {renderPortAnchor(dev, 'water_cold', 'Cold Water Inlet', 'hover:border-blue-300 hover:bg-blue-500/40', 'w-3 h-3 shrink-0')}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <div className="text-[10px] font-bold font-mono text-red-300/80 leading-normal pb-0.5">Hot</div>
                                                                    {renderPortAnchor(dev, 'water_hot', 'Hot Water Return', 'hover:border-red-300 hover:bg-red-500/40', 'w-3 h-3 shrink-0')}
                                                                </div>
                                                            </>
                                                        )}
                                                        {dev.type !== 'CDU4U' && hasLC && (
                                                            <div className="border-l border-cyan-900/50 pl-2">
                                                                {renderWaterAnchors()}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">BMC</div>
                                                            <div className="flex gap-0.5">
                                                                {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {getServerCategory(dev) === 'AI' && (() => {
                                                const hostCooling = dev.hardwareSpecs?.cooling?.host || 'AC';
                                                const gpuCooling  = dev.hardwareSpecs?.cooling?.gpu  || 'AC';
                                                const hasLC = hostCooling === 'LC' || gpuCooling === 'LC';
                                                const ewNicCount = dev.hardwareSpecs?.cx8p?.qty !== undefined ? dev.hardwareSpecs.cx8p.qty : 8;
                                                return (
                                                    <div className="flex flex-col justify-center gap-1 border-l border-white/20 pl-3 shrink-0 h-full w-full">
                                                        {ewNicCount > 0 && (
                                                            <div className="flex items-center justify-end gap-2 w-full">
                                                                <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">EW NIC</div>
                                                                <div className="flex gap-0.5 flex-wrap max-w-[120px] justify-end">
                                                                    {Array.from({ length: ewNicCount }).map((_, i) => renderPortAnchor(dev, `cx8-${i + 1}`, `EW NIC P${i + 1}`, 'hover:border-blue-400 hover:bg-blue-500/50'))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(() => {
                                                            const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                                            return Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                const slotIdx = i + 1;
                                                                const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx);
                                                                if (slotPortCount <= 0) return null;
                                                                return (
                                                                    <div key={slotIdx} className="flex items-center justify-end gap-2 w-full">
                                                                        <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{model}</div>
                                                                        <div className="flex gap-0.5">
                                                                            {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}-${pIdx + 1}`, `P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                        {ocpCount > 0 && (
                                                            <div className="flex items-center justify-end gap-2 w-full">
                                                                <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">{dev.hardwareSpecs?.ocp?.model || 'OCP'}</div>
                                                                <div className="flex gap-0.5">
                                                                    {Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp-${i + 1}`, `OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* BMC + S-NIC-M on same row */}
                                                        <div className="flex items-center justify-end gap-2 w-full">
                                                            {superNicMgtCount > 0 && (
                                                                <>
                                                                    <div className="text-[10px] font-bold font-mono text-violet-400/80 leading-normal pb-0.5">S-NIC-M</div>
                                                                    <div className="flex gap-0.5">
                                                                        {Array.from({ length: superNicMgtCount }).map((_, i) => renderPortAnchor(dev, `super_nic_mgt-${i + 1}`, `Super NIC Mgt Port ${i + 1}`, 'hover:border-violet-400 hover:bg-violet-500/50', 'w-2.5 h-2.5 shrink-0', null))}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">BMC</div>
                                                            <div className="flex gap-0.5">
                                                                {renderPortAnchor(dev, 'bmc', 'BMC', 'hover:border-red-400 hover:bg-red-500/50')}
                                                            </div>
                                                        </div>
                                                        {/* Water cooling anchors — GPU and/or Host, always one row */}
                                                        {hasLC && (
                                                            <div className="flex items-center justify-end gap-2 w-full border-t border-cyan-900/50 pt-1 mt-0.5">
                                                                {gpuCooling === 'LC' && (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <div className="text-[9px] font-bold font-mono text-cyan-400/70 leading-normal">GPU</div>
                                                                        <div className="text-[9px] font-bold font-mono text-blue-300/80 leading-normal ml-0.5">C</div>
                                                                        {renderPortAnchor(dev, 'water_cold', 'GPU Cold Water Inlet', 'hover:border-blue-300 hover:bg-blue-500/40', 'w-3 h-3 shrink-0')}
                                                                        <div className="text-[9px] font-bold font-mono text-red-300/80 leading-normal ml-0.5">H</div>
                                                                        {renderPortAnchor(dev, 'water_hot', 'GPU Hot Water Return', 'hover:border-red-300 hover:bg-red-500/40', 'w-3 h-3 shrink-0')}
                                                                    </div>
                                                                )}
                                                                {hostCooling === 'LC' && (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <div className="text-[9px] font-bold font-mono text-cyan-400/70 leading-normal">Host</div>
                                                                        <div className="text-[9px] font-bold font-mono text-blue-300/80 leading-normal ml-0.5">C</div>
                                                                        {renderPortAnchor(dev, 'host_water_cold', 'Host Cold Water Inlet', 'hover:border-blue-300 hover:bg-blue-500/40', 'w-3 h-3 shrink-0')}
                                                                        <div className="text-[9px] font-bold font-mono text-red-300/80 leading-normal ml-0.5">H</div>
                                                                        {renderPortAnchor(dev, 'host_water_hot', 'Host Hot Water Return', 'hover:border-red-300 hover:bg-red-500/40', 'w-3 h-3 shrink-0')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {getServerCategory(dev) === 'HighDensity' && (() => {
                                                const nodes = getHighDensityNodes(dev);
                                                const config = getServerConfig(dev);
                                                const is2U4N = config === '2U4N';
                                                
                                                if (is2U4N) {
                                                    return (
                                                        <div className="grid grid-cols-2 grid-rows-2 border-l border-white/20 h-full w-full">
                                                            {nodes.map((nodeKey, idx) => {
                                                                const nodeNum = idx + 1;
                                                                const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                                                                const pcieSlotQty = dev.hardwareSpecs?.[pcieSlotQtyKey]?.qty || 2;
                                                                const ocpCount = getNicCount(dev, `ocp_${nodeKey}`);
                                                                
                                                                // Add borders between grid cells
                                                                const borderClasses = `${idx < 2 ? 'border-b' : ''} ${idx % 2 === 0 ? 'border-r' : ''} border-white/10`;
                                                                
                                                                return (
                                                                    <div key={nodeKey} className={`flex items-center justify-end gap-1 px-1.5 py-0.5 w-full ${borderClasses}`}>
                                                                        {/* Node Label */}
                                                                        <div className="text-[8px] font-bold text-slate-400 mr-auto flex items-center gap-0.5">
                                                                            <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0"></div>
                                                                            <span>N{nodeNum}</span>
                                                                        </div>
                                                                        
                                                                        {/* PCIe Slots */}
                                                                        {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                            const slotIdx = i + 1;
                                                                            const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx, nodeKey);
                                                                            if (slotPortCount <= 0) return null;
                                                                            return (
                                                                                <div key={slotIdx} className="flex items-center gap-0.5 shrink-0">
                                                                                    <span className="text-[7px] font-bold font-mono text-white/50 leading-none">S{slotIdx}</span>
                                                                                    <div className="flex gap-0.5">
                                                                                        {Array.from({ length: slotPortCount }).map((_, pIdx) => 
                                                                                            renderPortAnchor(
                                                                                                dev, 
                                                                                                `pcie_slot_${slotIdx}_${nodeKey}-${pIdx + 1}`, 
                                                                                                `N${nodeNum} ${model} P${pIdx + 1}`, 
                                                                                                'hover:border-emerald-400 hover:bg-emerald-500/50', 
                                                                                                'w-1.5 h-1.5 shrink-0'
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        
                                                                        {/* OCP */}
                                                                        {ocpCount > 0 && (
                                                                            <div className="flex items-center gap-0.5 pl-0.5 border-l border-white/10 shrink-0">
                                                                                <span className="text-[7px] font-bold font-mono text-white/50 leading-none">O</span>
                                                                                <div className="flex gap-0.5">
                                                                                    {Array.from({ length: ocpCount }).map((_, i) => 
                                                                                        renderPortAnchor(
                                                                                            dev, 
                                                                                            `ocp_${nodeKey}-${i + 1}`, 
                                                                                            `N${nodeNum} OCP P${i + 1}`, 
                                                                                            'hover:border-amber-400 hover:bg-amber-500/50', 
                                                                                            'w-1.5 h-1.5 shrink-0'
                                                                                        )
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* BMC */}
                                                                        <div className="flex items-center gap-0.5 pl-0.5 border-l border-white/10 shrink-0">
                                                                            <span className="text-[7px] font-bold font-mono text-white/50 leading-none">B</span>
                                                                            <div className="flex gap-0.5">
                                                                                {renderPortAnchor(
                                                                                    dev, 
                                                                                    `bmc_${nodeKey}`, 
                                                                                    `N${nodeNum} BMC Port`, 
                                                                                    'hover:border-red-400 hover:bg-red-500/50', 
                                                                                    'w-1.5 h-1.5 shrink-0'
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                const is1U2N = config === '1U2N';
                                                const isTight = (nodes.length / dev.size > 1.1) || is1U2N;
                                                const portSizeClass = is1U2N ? "w-1.5 h-1.5 shrink-0" : (isTight ? "w-2 h-2 shrink-0" : "w-2.5 h-2.5 shrink-0");
                                                const labelClass = is1U2N ? "text-[8px]" : (isTight ? "text-[9px]" : "text-[11px]");
                                                const dotClass = is1U2N ? "w-1 h-1" : (isTight ? "w-1 h-1" : "w-1.5 h-1.5");
                                                const portLabelClass = is1U2N ? "text-[7px]" : (isTight ? "text-[8px]" : "text-[10px]");
                                                const rowGapClass = is1U2N ? "gap-1 px-1.5 py-0.5" : (isTight ? "gap-1.5 px-2" : "gap-3 px-3");

                                                return (
                                                    <div className={`flex ${is1U2N ? 'flex-row' : 'flex-col'} justify-center border-l border-white/20 shrink-0 h-full w-full`}>
                                                        {nodes.map((nodeKey, idx) => {
                                                            const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                                                            const pcieSlotQty = dev.hardwareSpecs?.[pcieSlotQtyKey]?.qty || 2;
                                                            const ocpCount = getNicCount(dev, `ocp_${nodeKey}`);
                                                            const nodeNum = idx + 1;
                                                            const isLast = idx === nodes.length - 1;
                                                            const layoutSizeClass = is1U2N ? 'h-full' : 'w-full';
                                                            const borderClass = is1U2N
                                                                ? (!isLast ? 'border-r border-white/10' : '')
                                                                : (!isLast ? 'border-b border-white/10' : '');

                                                            return (
                                                                <div key={nodeKey} className={`flex-1 flex items-center justify-end ${rowGapClass} ${layoutSizeClass} ${borderClass}`}>
                                                                    <div className={`${labelClass} font-bold text-slate-400 mr-auto flex items-center gap-0.5`}>
                                                                        <div className={`${dotClass} rounded-full bg-blue-500 shrink-0`}></div> N{nodeNum}
                                                                    </div>
                                                                    {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                        const slotIdx = i + 1;
                                                                        const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx, nodeKey);
                                                                        if (slotPortCount <= 0) return null;
                                                                        const slotLabel = is1U2N ? `S${slotIdx}` : model;
                                                                        return (
                                                                            <div key={slotIdx} className="flex items-center gap-1 shrink-0">
                                                                                <div className={`${portLabelClass} font-bold font-mono text-white/60 leading-none`}>{slotLabel}</div>
                                                                                <div className="flex gap-0.5">
                                                                                    {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}_${nodeKey}-${pIdx + 1}`, `N${nodeNum} ${model} P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50', portSizeClass))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {ocpCount > 0 && (
                                                                        <div className="flex items-center gap-1 ml-0.5 pl-0.5 border-l border-white/10 shrink-0">
                                                                            <div className={`${portLabelClass} font-bold font-mono text-white/60 leading-none`}>{is1U2N ? 'O' : 'OCP'}</div>
                                                                            <div className="flex gap-0.5">
                                                                                {Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp_${nodeKey}-${i + 1}`, `N${nodeNum} OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50', portSizeClass))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1 ml-0.5 pl-0.5 border-l border-white/10 shrink-0">
                                                                        <div className={`${portLabelClass} font-bold font-mono text-white/60 leading-none`}>{is1U2N ? 'B' : 'BMC'}</div>
                                                                        <div className="flex gap-0.5">
                                                                            {renderPortAnchor(dev, `bmc_${nodeKey}`, `N${nodeNum} BMC Port`, 'hover:border-red-400 hover:bg-red-500/50', portSizeClass)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                            {((dev.type || '').startsWith('Switch') || dev.type === 'Router') && (
                                                <div className="flex items-center justify-end gap-3 border-l border-white/20 pl-3 shrink-0 h-full">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">BMC</div>
                                                        <div className="flex gap-0.5">
                                                            {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-center bg-slate-900/90 rounded-md border border-slate-700/80 shadow-[0_4px_15px_rgba(0,0,0,0.6)] shrink-0 p-1">
                                                        {(() => {
                                                            const { rows, cols } = getSwitchPortLayout(portCount, dev.size);
                                                            const portSizeClass = "w-1.5 h-1.5 shrink-0";
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    {Array.from({ length: rows }).map((_, rIdx) => (
                                                                        <div key={rIdx} className="flex gap-0.5">
                                                                            {Array.from({ length: cols }).map((_, cIdx) => {
                                                                                const portNum = rIdx * cols + cIdx + 1;
                                                                                if (portNum > portCount) return <div key={cIdx} className={portSizeClass} />;
                                                                                return renderPortAnchor(dev, `port-${portNum}`, `Port ${portNum}`, 'hover:border-purple-400 hover:bg-purple-500/30', portSizeClass);
                                                                            })}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 機櫃底部 */}
                    <div className="bg-slate-800 w-[420px] h-8 rounded-b-md border-b-4 border-x-4 border-slate-600 shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative z-10 flex justify-center items-start">
                        <div className="w-2/3 h-2 bg-slate-900/60 rounded-b-sm border-b border-white/5"></div>
                    </div>
                    <div className="flex justify-between px-8 -mt-1 w-[420px]">
                        <div className="w-8 h-5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md border border-slate-600 shadow-lg"></div>
                        <div className="w-8 h-5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md border border-slate-600 shadow-lg"></div>
                    </div>
                </div>

                {/* 側掛設備 (SideCDU) */}
                {devices.filter(dev => dev.rackId === rack.id && dev.type === 'SideCDU').map(dev => {
                    const isSelected = selectedId === dev.id;
                    const Icon = getIconByType(dev.type);
                    const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;

                    return (
                        <div key={dev.id} draggable onDragStart={(e) => handleDragStart(e, dev, false)} onClick={(e) => { e.stopPropagation(); setSelectedId(dev.id); }} className={`w-[210px] shrink-0 flex flex-col items-center side-cdu-container relative cursor-grab active:cursor-grabbing transition-all duration-200 ${isSelected ? 'ring-2 ring-white brightness-125' : 'hover:brightness-125'}`}>
                            <div className="bg-gradient-to-b from-cyan-900 to-slate-800 w-full h-12 rounded-t-xl border-t-2 border-x-2 border-cyan-700 flex justify-center items-center shadow-xl relative overflow-hidden">
                                <div className="text-[10px] font-mono text-cyan-300 font-bold drop-shadow-md tracking-wider">LIQUID TO AIR CDU</div>
                            </div>
                            <div className={`w-full relative shadow-[0_0_40px_rgba(0,0,0,0.8)] border-x-2 border-slate-700 ${tStyle.bg} flex flex-col items-center py-6`} style={{ height: rackMaxU * U_HEIGHT }}>
                                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_4px,#000_4px,#000_8px)] mix-blend-overlay"></div>
                                <Icon className="w-14 h-14 text-cyan-400 opacity-90 mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                                <div className="text-cyan-100 font-bold text-center px-4 leading-relaxed z-10">{dev.customName}</div>
                                <div className="text-cyan-500/70 text-xs mt-2 font-mono z-10">{dev.coolingCapacity?.toLocaleString()} W</div>
                                
                                <div className="flex-1 w-full flex flex-col gap-4 items-center justify-center opacity-40 py-8 z-10">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="w-24 h-24 rounded-full border-4 border-slate-700 bg-slate-900/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                                            <div className="absolute inset-0 border-4 border-dashed border-slate-800/80 rounded-full animate-[spin_4s_linear_infinite]"></div>
                                            <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto mb-4 flex flex-col items-center gap-3 z-20 w-full px-4">
                                    {/* Water Cooling Anchors */}
                                    <div className="w-full bg-slate-900/90 rounded-xl border border-cyan-800/60 shadow-[0_0_20px_rgba(34,211,238,0.1)] p-3 flex flex-col gap-2.5">
                                        <div className="text-[9px] font-mono text-cyan-400/70 text-center tracking-widest uppercase mb-1">Water Loop</div>
                                        {/* Cold Port */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]"></div>
                                                <span className="text-[10px] font-bold font-mono text-blue-300 tracking-wide">Cold</span>
                                            </div>
                                            {renderPortAnchor(dev, 'water_cold', 'Cold Water Inlet', 'hover:border-blue-300 hover:bg-blue-500/40', 'w-3.5 h-3.5 shrink-0')}
                                        </div>
                                        {/* Hot Port */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]"></div>
                                                <span className="text-[10px] font-bold font-mono text-red-300 tracking-wide">Hot</span>
                                            </div>
                                            {renderPortAnchor(dev, 'water_hot', 'Hot Water Return', 'hover:border-red-300 hover:bg-red-500/40', 'w-3.5 h-3.5 shrink-0')}
                                        </div>
                                    </div>
                                    {/* BMC Anchor */}
                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700 shadow-xl flex flex-col items-center gap-1.5">
                                        <div className="text-[10px] font-mono text-white/80">BMC</div>
                                        {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800 w-full h-8 rounded-b-md border-b-4 border-x-4 border-slate-600 shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative flex justify-center items-start"></div>
                            <div className="flex justify-center px-4 -mt-1 w-full">
                                <div className="w-12 h-5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md border border-slate-600 shadow-lg"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    });
};

export default RackView;
