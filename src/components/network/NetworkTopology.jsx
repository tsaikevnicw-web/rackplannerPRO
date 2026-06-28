import React, { useMemo } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES } from '../../utils/constants';
import { getIconByType, getGroupedDevices, getNicCount, getSwitchPortCount, getSwitchPortLayout, getServerCategory, getServerConfig, getHighDensityNodes, getHighDensitySize, getAIServerSize, getPcieSlotInfo } from '../../utils/helpers';
import { ChevronRight, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';

const NetworkTopology = ({ nsSpineDevs, nsLeafDevs, ewSpineDevs, ewLeafDevs, epDevs }) => {
    const { racks, devices, selectedId, setSelectedId, selectedIds, setSelectedIds, deviceSearchTerm, expandedNetGroups, setExpandedNetGroups, connectedPortsSet, drawing, setDrawing, handleDisconnectPort } = useRackPlanner();

    const connectedToSelectedSet = useMemo(() => {
        if (!selectedId || (selectedIds && selectedIds.length > 1)) return null;
        const set = new Set();
        devices.forEach(d => {
            if (d.connections) {
                Object.entries(d.connections).forEach(([localKey, targetKey]) => {
                    if (targetKey) {
                        const localFullId = `${d.id}-${localKey}`;
                        const targetDevId = targetKey.includes('-') ? targetKey.substring(0, targetKey.indexOf('-')) : targetKey;
                        if (d.id === selectedId || targetDevId === selectedId) {
                            set.add(localFullId);
                            set.add(targetKey);
                        }
                    }
                });
            }
        });
        return set;
    }, [devices, selectedId, selectedIds]);

    const getGroupKeys = (devs, prefix) => getGroupedDevices(devs, racks).map(g => `${prefix}-${g.name}`);

    const isSectionCollapsed = (prefixes) => {
        const relevantGroups = [];
        if (prefixes.includes('NS-Spine')) relevantGroups.push(...getGroupKeys(nsSpineDevs, 'NS-Spine'));
        if (prefixes.includes('NS-Leaf')) relevantGroups.push(...getGroupKeys(nsLeafDevs, 'NS-Leaf'));
        if (prefixes.includes('Spine')) relevantGroups.push(...getGroupKeys(ewSpineDevs, 'Spine'));
        if (prefixes.includes('Leaf')) relevantGroups.push(...getGroupKeys(ewLeafDevs, 'Leaf'));
        if (prefixes.includes('EP')) relevantGroups.push(...getGroupKeys(epDevs, 'EP'));
        
        if (relevantGroups.length === 0) return false;
        return relevantGroups.every(g => expandedNetGroups[g] === false);
    };

    const toggleSection = (prefixes) => {
        const relevantGroups = [];
        if (prefixes.includes('NS-Spine')) relevantGroups.push(...getGroupKeys(nsSpineDevs, 'NS-Spine'));
        if (prefixes.includes('NS-Leaf')) relevantGroups.push(...getGroupKeys(nsLeafDevs, 'NS-Leaf'));
        if (prefixes.includes('Spine')) relevantGroups.push(...getGroupKeys(ewSpineDevs, 'Spine'));
        if (prefixes.includes('Leaf')) relevantGroups.push(...getGroupKeys(ewLeafDevs, 'Leaf'));
        if (prefixes.includes('EP')) relevantGroups.push(...getGroupKeys(epDevs, 'EP'));

        const allCollapsed = isSectionCollapsed(prefixes);
        const newState = { ...expandedNetGroups };
        relevantGroups.forEach(g => {
            newState[g] = allCollapsed ? true : false;
        });
        setExpandedNetGroups(newState);
    };

    const renderPortAnchor = (dev, portKey, label, hoverClass, sizeClass = "w-2.5 h-2.5 shrink-0", colorOverride = null) => {
        const fullId = `${dev.id}-${portKey}`;
        const isConnected = connectedPortsSet.has(fullId);
        const isSwitchOrRouter = (dev.type || '').startsWith('Switch') || dev.type === 'Router';

        let effectiveConnected = isConnected;
        if (connectedToSelectedSet !== null && isSwitchOrRouter) {
            effectiveConnected = connectedToSelectedSet.has(fullId);
        }
        
        const connectedColorStr = 'bg-green-400 shadow-[0_0_8px_#4ade80]'; 
        const defaultBorder = effectiveConnected ? 'border-green-200' : 'border-slate-500';

        const bgClass = colorOverride ? colorOverride : (effectiveConnected ? connectedColorStr : 'bg-slate-700 opacity-60');

        return (
            <div
                key={portKey}
                data-port-id={fullId}
                className={`rounded-[2px] ${sizeClass} border ${defaultBorder} transition-all duration-200 cursor-crosshair shrink-0 relative group z-50 hover:brightness-150 hover:scale-150 ${hoverClass} ${bgClass}`}
                title={label}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isConnected) handleDisconnectPort(fullId);
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.target.getBoundingClientRect();
                    const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement || document.querySelector('.main-canvas > div > div');
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
                {isConnected && !colorOverride && <div className="absolute inset-0 m-auto w-[60%] h-[60%] bg-white rounded-sm opacity-80"></div>}
            </div>
        );
    };

    const renderCompactLogicalDeviceCard = (dev, bgClass) => {
        const isSelected = selectedIds.includes(dev.id);
        const Icon = getIconByType(dev.type);
        const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;
        
        const isHighDensity = getServerCategory(dev) === 'HighDensity';
        const hdNodes = isHighDensity ? getHighDensityNodes(dev) : [];
        const ocpCount = isHighDensity 
            ? hdNodes.reduce((sum, node) => sum + getNicCount(dev, `ocp_${node}`), 0)
            : getNicCount(dev, 'ocp');
        const portCount = getSwitchPortCount(dev);
        const superNicMgtCount = getNicCount(dev, 'super_nic_mgt');
        const portLayout = ((dev.type || '').startsWith('Switch') || dev.type === 'Router') ? getSwitchPortLayout(portCount, dev.size) : null;

        // 計算 Switch 佔用埠數與總埠數
        let usedPortsCount = 0;
        let totalPortsCount = portCount;
        if (portLayout) {
            const occupiedPorts = new Set();
            devices.forEach(d => {
                if (d.connections) {
                    Object.entries(d.connections).forEach(([key, tg]) => {
                        if (tg && tg.startsWith(`${dev.id}-port-`)) {
                            occupiedPorts.add(tg);
                        }
                    });
                }
            });
            usedPortsCount = occupiedPorts.size;
        }

        const isSearchMatch = deviceSearchTerm && (
            (dev.customName || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
            (dev.type || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
        );

        let cardWidthClass = "w-[320px]";
        if (portLayout) {
            if (portLayout.cols > 16) cardWidthClass = "w-[400px]";
            else if (portLayout.cols > 12) cardWidthClass = "w-[340px]";
        } else if (getServerCategory(dev) === 'AI') {
            cardWidthClass = "w-[360px]"; // AI servers might also need a bit more space for CX8 + NICs
        } else if (getServerCategory(dev) === 'HighDensity') {
            cardWidthClass = "w-[380px]";
        }

        return (
            <div
                key={dev.id}
                onMouseUp={(e) => {
                    if (drawing && drawing.sourceId !== dev.id) {
                        e.stopPropagation();
                        const event = new CustomEvent('rackplanner-connect', { 
                            detail: { targetDevId: dev.id, targetPortKey: null, drawing }
                        });
                        window.dispatchEvent(event);
                        setDrawing(null);
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey || e.ctrlKey) {
                        setSelectedIds(prev => prev.includes(dev.id) ? prev.filter(id => id !== dev.id) : [...prev, dev.id]);
                    } else {
                        setSelectedIds([dev.id]);
                    }
                }}
                className={`relative rounded-xl border cursor-pointer transition-all ${cardWidthClass} shrink-0 flex flex-col ${tStyle.bg} ${isSelected ? 'ring-2 ring-white z-30 brightness-125 shadow-xl' : 'hover:brightness-110 z-20 shadow-md'} ${isSearchMatch ? 'ring-2 ring-yellow-400 animate-pulse border-yellow-400 shadow-[0_0_12px_#facc15] z-30' : 'border-slate-700'} overflow-hidden group mx-auto`}
            >
                {/* Header Area */}
                <div className={`p-2 flex items-center justify-center gap-2 relative bg-black/20 border-b border-slate-700`}>
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${bgClass} border border-black/50 z-10`}></div>
                    <Icon className={`w-5 h-5 opacity-90 ${tStyle.text}`} />
                    <div className="min-w-0 flex flex-col items-center">
                        <div className="text-sm font-bold text-slate-200 truncate">{dev.customName}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1.5 justify-center">
                            <span>[{racks.find(r => r.id === dev.rackId)?.name}]</span>
                            {portLayout && (
                                <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 font-semibold">
                                    {usedPortsCount} / {totalPortsCount} 埠
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ports Area */}
                <div className="p-3 flex flex-col gap-2 bg-slate-900/40">
                    {portLayout ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1 items-center justify-center">
                                {Array.from({ length: portLayout.rows }).map((_, rowIndex) => (
                                    <div key={rowIndex} className="flex gap-1 justify-center flex-nowrap">
                                        {Array.from({ length: portLayout.cols }).map((_, colIndex) => {
                                            const portNum = rowIndex * portLayout.cols + colIndex + 1;
                                            if (portNum > portCount) return null;
                                            return renderPortAnchor(dev, `port-${portNum}`, `Port ${portNum}`, 'hover:border-blue-400 hover:bg-blue-500/50');
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center border-t border-slate-700 pt-2 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>
                                    {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                </div>
                            </div>
                        </div>
                    ) : getServerCategory(dev) === 'HighDensity' ? (() => {
                        const nodes = getHighDensityNodes(dev);
                        const config = getServerConfig(dev);
                        const is2U4N = config === '2U4N';
                        return (
                            <div className={is2U4N ? "grid grid-cols-2 gap-x-4 gap-y-2 w-full px-2" : "flex flex-col gap-2 w-full px-2"}>
                                {nodes.map((nodeKey, idx) => {
                                    const nodeNum = idx + 1;
                                    const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                                    const pcieSlotQty = dev.hardwareSpecs?.[pcieSlotQtyKey]?.qty || 2;
                                    const ocpCountVal = getNicCount(dev, `ocp_${nodeKey}`);
                                    const isLast = idx === nodes.length - 1;

                                    let cellClass = "";
                                    if (is2U4N) {
                                        if (idx === 0) cellClass = "border-b border-r border-slate-700/50 pb-2 pr-4";
                                        else if (idx === 1) cellClass = "border-b border-slate-700/50 pb-2 pl-4";
                                        else if (idx === 2) cellClass = "border-r border-slate-700/50 pt-2 pr-4";
                                        else if (idx === 3) cellClass = "pt-2 pl-4";
                                    } else {
                                        cellClass = !isLast ? 'border-b border-slate-700/50 pb-2' : 'pt-1';
                                    }

                                    return (
                                        <div key={nodeKey} className={`flex flex-wrap items-center justify-end gap-3 ${cellClass}`}>
                                            <div className="text-[11px] font-bold text-slate-400 mr-auto flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> N{nodeNum}
                                            </div>
                                            {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                const slotIdx = i + 1;
                                                const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx, nodeKey);
                                                if (slotPortCount <= 0) return null;
                                                return (
                                                    <div key={slotIdx} className="flex items-center gap-1.5">
                                                        <div className="text-[10px] font-bold font-mono text-slate-400">{model}</div>
                                                        <div className="flex gap-1.5">
                                                            {Array.from({ length: slotPortCount }).map((_, pIdx) =>
                                                                renderPortAnchor(
                                                                    dev,
                                                                    `pcie_slot_${slotIdx}_${nodeKey}-${pIdx + 1}`,
                                                                    `N${nodeNum} ${model} P${pIdx + 1}`,
                                                                    'hover:border-emerald-400 hover:bg-emerald-500/50'
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {ocpCountVal > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">OCP</div><div className="flex gap-1.5">{Array.from({ length: ocpCountVal }).map((_, i) => renderPortAnchor(dev, `ocp_${nodeKey}-${i + 1}`, `N${nodeNum} OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}</div></div>}
                                            <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>{renderPortAnchor(dev, `bmc_${nodeKey}`, `N${nodeNum} BMC`, 'hover:border-red-400 hover:bg-red-500/50')}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })() : getServerCategory(dev) === 'AI' ? (() => {
                        const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                        const ewNicCount = dev.hardwareSpecs?.cx8p?.qty !== undefined ? dev.hardwareSpecs.cx8p.qty : 8;
                        return (
                            <div className="flex flex-col gap-2">
                                {ewNicCount > 0 && (
                                    <div className="flex justify-center">
                                        <span className="text-[10px] font-bold font-mono text-slate-400 mr-2 mt-0.5">EW NIC</span>
                                        <div className="flex flex-wrap justify-center gap-1 max-w-[200px]">
                                            {Array.from({ length: ewNicCount }).map((_, i) => renderPortAnchor(dev, `cx8-${i + 1}`, `EW NIC P${i + 1}`, 'hover:border-blue-400 hover:bg-blue-500/50'))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap justify-center gap-4 border-t border-slate-700 pt-2 mt-1">
                                    {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                        const slotIdx = i + 1;
                                        const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx);
                                        if (slotPortCount <= 0) return null;
                                        return (
                                            <div key={slotIdx} className="flex items-center gap-1.5">
                                                <div className="text-[10px] font-bold font-mono text-slate-400">{model}</div>
                                                <div className="flex gap-1.5">
                                                    {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}-${pIdx + 1}`, `P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {ocpCount > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">{dev.hardwareSpecs?.ocp?.model || 'OCP'}</div><div className="flex gap-1.5">{Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp-${i + 1}`, `OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}</div></div>}
                                    {superNicMgtCount > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-[10px] font-bold font-mono text-violet-400/80 leading-normal pb-0.5">S-NIC-M</div>
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: superNicMgtCount }).map((_, i) => renderPortAnchor(dev, `super_nic_mgt-${i + 1}`, `Super NIC Mgt Port ${i + 1}`, 'hover:border-violet-400 hover:bg-violet-500/50'))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>{renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}</div>
                                </div>
                            </div>
                        );
                    })() : dev.type === 'CDU4U' ? (() => {
                        return (
                            <div className="flex flex-wrap justify-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="text-[10px] font-bold font-mono text-white/60 leading-normal pb-0.5">BMC</div>
                                    {renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}
                                </div>
                            </div>
                        );
                    })() : (() => {
                        const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                        return (
                            <div className="flex flex-wrap justify-center gap-4">
                                {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                    const slotIdx = i + 1;
                                    const { model, qty: slotPortCount } = getPcieSlotInfo(dev, slotIdx);
                                    if (slotPortCount <= 0) return null;
                                    return (
                                        <div key={slotIdx} className="flex items-center gap-1.5">
                                            <div className="text-[10px] font-bold font-mono text-slate-400">{model}</div>
                                            <div className="flex gap-1.5">
                                                {Array.from({ length: slotPortCount }).map((_, pIdx) => renderPortAnchor(dev, `pcie_slot_${slotIdx}-${pIdx + 1}`, `P${pIdx + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {ocpCount > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">{dev.hardwareSpecs?.ocp?.model || 'OCP'}</div><div className="flex gap-1.5">{Array.from({ length: ocpCount }).map((_, i) => renderPortAnchor(dev, `ocp-${i + 1}`, `OCP P${i + 1}`, 'hover:border-amber-400 hover:bg-amber-500/50'))}</div></div>}
                                {superNicMgtCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="text-[10px] font-bold font-mono text-violet-400/80 leading-normal pb-0.5">S-NIC-M</div>
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: superNicMgtCount }).map((_, i) => renderPortAnchor(dev, `super_nic_mgt-${i + 1}`, `Super NIC Mgt Port ${i + 1}`, 'hover:border-violet-400 hover:bg-violet-500/50'))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>{renderPortAnchor(dev, 'bmc', 'BMC', 'hover:border-red-400 hover:bg-red-500/50')}</div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    const renderTreeSection = (devList, bgClass, labelPrefix, isRow = false) => {
        const groups = getGroupedDevices(devList, racks);
        if (groups.length === 0) return <div className="text-slate-500 text-sm py-4 italic border border-dashed border-slate-700/50 rounded-lg w-full text-center">無設備</div>;

        const isEP = labelPrefix === 'EP';
        const groupWidthClass = isEP ? 'w-[420px]' : 'min-w-[220px]';
        const collapsedWidthClass = isEP ? 'w-[420px]' : 'min-w-[260px]';

        return (
            <div className={`flex ${isRow ? 'flex-nowrap justify-center min-w-max' : 'flex-wrap justify-center'} gap-8 w-full z-10 p-4 pb-6`}>
                {groups.map(group => {
                    const isOpen = expandedNetGroups[`${labelPrefix}-${group.name}`] ?? true;
                    if (!isOpen) {
                        return (
                            <div 
                                key={group.name} 
                                data-group-anchor={`${labelPrefix}-${group.name}`}
                                onClick={(e) => { e.stopPropagation(); setExpandedNetGroups({ ...expandedNetGroups, [`${labelPrefix}-${group.name}`]: true }); }}
                                className={`relative cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center bg-slate-800/80 p-6 rounded-2xl border-2 border-slate-600 shadow-xl ${collapsedWidthClass} min-h-[140px] group ${bgClass.split(' ')[0].replace('bg-', 'hover:border-')}`}
                            >
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="w-5 h-5 text-slate-400 hover:text-white" />
                                </div>
                                <div className="text-2xl font-bold text-slate-200 tracking-wider text-center">{group.name}</div>
                                <div className="text-sm text-slate-400 mt-2 font-mono">{group.devs.length} Devices</div>
                                <div className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-20 blur-md transition-opacity pointer-events-none ${bgClass.split(' ')[0]}`}></div>
                            </div>
                        );
                    }
                    return (
                        <div key={group.name} className={`flex flex-col items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 ${groupWidthClass}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpandedNetGroups({ ...expandedNetGroups, [`${labelPrefix}-${group.name}`]: !isOpen }); }}
                                className="flex items-center gap-1.5 text-[16px] font-bold text-slate-400 tracking-wider bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors w-full justify-center shadow-sm"
                            >
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                {group.name} ({group.devs.length})
                            </button>
                            {isOpen && (
                                <div className="flex flex-col items-center gap-4 pt-2 w-full">
                                    {group.devs.map(d => renderCompactLogicalDeviceCard(d, bgClass))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // renderNSSection is removed as we now use renderTreeSection for NS Spine/Leaf

    return (
        <div className="flex flex-col gap-12 w-full items-center pt-8 pb-32 z-10 min-w-max">
            <div className="flex flex-row items-stretch justify-center gap-8 w-full px-8 min-w-max">
                <div className="flex-1 flex flex-col items-center gap-6 bg-[#0d1b2e]/80 p-8 rounded-3xl border border-slate-700/40 shadow-2xl min-w-max relative overflow-hidden">
                    <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-gradient-to-b from-cyan-500/0 via-cyan-500/60 to-cyan-500/0 rounded-full"></div>
                    <div className="border-b border-slate-700 pb-2 w-full flex items-center relative justify-center">
                        <div className="text-[20px] font-bold text-slate-400 tracking-widest">NORTH-SOUTH FABRIC</div>
                        <button 
                            onClick={() => toggleSection(['NS-Spine', 'NS-Leaf'])} 
                            className="absolute right-0 text-sm flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
                        >
                            {isSectionCollapsed(['NS-Spine', 'NS-Leaf']) ? <Maximize2 className="w-4 h-4"/> : <Minimize2 className="w-4 h-4"/>} 
                            {isSectionCollapsed(['NS-Spine', 'NS-Leaf']) ? '一鍵展開' : '一鍵收起'}
                        </button>
                    </div>
                    <div className="flex flex-col items-center w-full gap-4">
                        <div className="flex items-center gap-2 text-[18px] font-bold text-cyan-300 tracking-widest bg-cyan-500/10 border border-cyan-500/25 px-5 py-1.5 rounded-full">SPINE LAYER</div>
                        {renderTreeSection(nsSpineDevs, 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]', 'NS-Spine')}
                    </div>
                    <div className="flex flex-col items-center w-full gap-4 max-w-full">
                        <div className="flex items-center gap-2 text-[18px] font-bold text-sky-300 tracking-widest bg-sky-500/10 border border-sky-500/25 px-5 py-1.5 rounded-full">LEAF LAYER</div>
                        {renderTreeSection(nsLeafDevs, 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]', 'NS-Leaf', true)}
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-8 bg-[#0d1b2e]/80 p-8 rounded-3xl border border-slate-700/40 shadow-2xl min-w-max relative overflow-hidden">
                    <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-gradient-to-b from-purple-500/0 via-purple-500/60 to-purple-500/0 rounded-full"></div>
                    <div className="border-b border-slate-700 pb-2 w-full flex items-center relative justify-center">
                        <div className="text-[20px] font-bold text-slate-400 tracking-widest">EAST-WEST FABRIC</div>
                        <button 
                            onClick={() => toggleSection(['Spine', 'Leaf'])} 
                            className="absolute right-0 text-sm flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
                        >
                            {isSectionCollapsed(['Spine', 'Leaf']) ? <Maximize2 className="w-4 h-4"/> : <Minimize2 className="w-4 h-4"/>} 
                            {isSectionCollapsed(['Spine', 'Leaf']) ? '一鍵展開' : '一鍵收起'}
                        </button>
                    </div>
                    <div className="flex flex-col items-center w-full gap-4">
                        <div className="flex items-center gap-2 text-[18px] font-bold text-purple-300 tracking-widest bg-purple-500/10 border border-purple-500/25 px-5 py-1.5 rounded-full">SPINE LAYER</div>
                        {renderTreeSection(ewSpineDevs, 'bg-purple-500 shadow-[0_0_8px_#a855f7]', 'Spine')}
                    </div>
                    <div className="flex flex-col items-center w-full gap-4 max-w-full">
                        <div className="flex items-center gap-2 text-[18px] font-bold text-emerald-300 tracking-widest bg-emerald-500/10 border border-emerald-500/25 px-5 py-1.5 rounded-full">LEAF LAYER</div>
                        {renderTreeSection(ewLeafDevs, 'bg-emerald-500 shadow-[0_0_8px_#10b981]', 'Leaf', true)}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center w-full gap-6 px-8 mt-6 bg-[#0d1b2e]/60 py-8 rounded-3xl border border-slate-700/40 shadow-2xl relative overflow-hidden min-w-max">
                <div className="absolute top-0 left-6 right-6 h-[3px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 rounded-full"></div>
                <div className="border-b border-slate-700 pb-2 mb-2 w-full max-w-2xl flex items-center relative justify-center">
                        <div className="text-[20px] font-bold text-slate-400 tracking-widest">ENDPOINT LAYER</div>
                        <button 
                            onClick={() => toggleSection(['EP'])} 
                            className="absolute right-0 text-sm flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
                        >
                            {isSectionCollapsed(['EP']) ? <Maximize2 className="w-4 h-4"/> : <Minimize2 className="w-4 h-4"/>} 
                            {isSectionCollapsed(['EP']) ? '一鍵展開' : '一鍵收起'}
                        </button>
                </div>
                {renderTreeSection(epDevs, 'bg-blue-500 shadow-[0_0_8px_#3b82f6]', 'EP')}
            </div>
        </div>
    );
};

export default NetworkTopology;
