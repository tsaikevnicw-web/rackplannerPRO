import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES } from '../../utils/constants';
import { getIconByType, getGroupedDevices, getNicCount, getSwitchPortCount, getSwitchPortLayout } from '../../utils/helpers';
import { ChevronRight, ChevronDown } from 'lucide-react';

const NetworkTopology = ({ nsDevs, ewSpineDevs, ewLeafDevs, epDevs }) => {
    const { racks, devices, selectedId, setSelectedId, expandedNetGroups, setExpandedNetGroups, connectedPortsSet, drawing, setDrawing, handleDisconnectPort } = useRackPlanner();

    const renderPortAnchor = (dev, portKey, label, hoverClass, sizeClass = "w-2.5 h-2.5 shrink-0", colorOverride = null) => {
        const fullId = `${dev.id}-${portKey}`;
        const isConnected = connectedPortsSet.has(fullId);
        
        const connectedColorStr = 'bg-green-400 shadow-[0_0_8px_#4ade80]'; 
        const defaultBorder = isConnected ? 'border-green-200' : 'border-slate-500';

        const bgClass = colorOverride ? colorOverride : (isConnected ? connectedColorStr : 'bg-slate-700 opacity-60');

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
        const isSelected = selectedId === dev.id;
        const Icon = getIconByType(dev.type);
        const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;
        
        const nic1Count = getNicCount(dev, 'ns_nic_1');
        const nic2Count = getNicCount(dev, 'ns_nic_2');
        const portCount = getSwitchPortCount(dev);
        const portLayout = ((dev.type || '').startsWith('Switch') || dev.type === 'Router') ? getSwitchPortLayout(portCount) : null;

        return (
            <div
                key={dev.id}
                onClick={(e) => { e.stopPropagation(); setSelectedId(dev.id); }}
                className={`relative rounded-xl border border-slate-700 cursor-pointer transition-all w-[320px] shrink-0 flex flex-col ${tStyle.bg} ${isSelected ? 'ring-2 ring-white z-30 brightness-125 shadow-xl' : 'hover:brightness-110 z-20 shadow-md'} overflow-hidden group`}
            >
                {/* Header Area */}
                <div className={`p-2 flex items-center justify-center gap-2 relative bg-black/20 border-b border-slate-700`}>
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${bgClass} border border-black/50 z-10`}></div>
                    <Icon className={`w-5 h-5 opacity-90 ${tStyle.text}`} />
                    <div className="min-w-0 flex flex-col items-center">
                        <div className="text-sm font-bold text-slate-200 truncate">{dev.customName}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">[{racks.find(r => r.id === dev.rackId)?.name}]</div>
                    </div>
                </div>

                {/* Ports Area */}
                <div className="p-3 flex flex-col gap-2 bg-slate-900/40">
                    {portLayout ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1 items-center justify-center">
                                {Array.from({ length: portLayout.rows }).map((_, rowIndex) => (
                                    <div key={rowIndex} className="flex gap-1 justify-center flex-wrap">
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
                    ) : (dev.type === 'Server5U' ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-center">
                                <span className="text-[10px] font-bold font-mono text-slate-400 mr-2 mt-0.5">CX8</span>
                                <div className="flex flex-wrap justify-center gap-1 max-w-[200px]">
                                    {Array.from({ length: getNicCount(dev, 'cx8p') || 8 }).map((_, i) => renderPortAnchor(dev, `cx8-${i + 1}`, `CX8 Port ${i + 1}`, 'hover:border-blue-400 hover:bg-blue-500/50'))}
                                </div>
                            </div>
                            {(nic1Count > 0 || nic2Count > 0 || true) && (
                                <div className="flex flex-wrap justify-center gap-4 border-t border-slate-700 pt-2 mt-1">
                                    {nic1Count > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">NS-NIC-1</div><div className="flex gap-1.5">{Array.from({ length: nic1Count }).map((_, i) => renderPortAnchor(dev, `ns_nic_1-${i + 1}`, `P${i + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}</div></div>}
                                    {nic2Count > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">NS-NIC-2</div><div className="flex gap-1.5">{Array.from({ length: nic2Count }).map((_, i) => renderPortAnchor(dev, `ns_nic_2-${i + 1}`, `P${i + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}</div></div>}
                                    <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>{renderPortAnchor(dev, 'bmc', 'BMC Port', 'hover:border-red-400 hover:bg-red-500/50')}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-4">
                            {nic1Count > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">NS-NIC-1</div><div className="flex gap-1.5">{Array.from({ length: nic1Count }).map((_, i) => renderPortAnchor(dev, `ns_nic_1-${i + 1}`, `P${i + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}</div></div>}
                            {nic2Count > 0 && <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">NS-NIC-2</div><div className="flex gap-1.5">{Array.from({ length: nic2Count }).map((_, i) => renderPortAnchor(dev, `ns_nic_2-${i + 1}`, `P${i + 1}`, 'hover:border-emerald-400 hover:bg-emerald-500/50'))}</div></div>}
                            <div className="flex items-center gap-1.5"><div className="text-[10px] font-bold font-mono text-slate-400">BMC</div>{renderPortAnchor(dev, 'bmc', 'BMC', 'hover:border-red-400 hover:bg-red-500/50')}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderTreeSection = (devList, bgClass, labelPrefix) => {
        const groups = getGroupedDevices(devList, racks);
        if (groups.length === 0) return <div className="text-slate-500 text-sm py-4 italic border border-dashed border-slate-700/50 rounded-lg w-full text-center">無設備</div>;

        return (
            <div className="flex flex-wrap justify-center gap-8 w-full z-10 p-4">
                {groups.map(group => {
                    const isOpen = expandedNetGroups[`${labelPrefix}-${group.name}`] ?? true;
                    return (
                        <div key={group.name} className="flex flex-col items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 min-w-[220px]">
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpandedNetGroups({ ...expandedNetGroups, [`${labelPrefix}-${group.name}`]: !isOpen }); }}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 tracking-wider bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors w-full justify-center shadow-sm"
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

    return (
        <div className="flex flex-col gap-12 w-full items-center pt-8 pb-32 z-10 min-w-max">
            <div className="flex flex-row items-stretch justify-center gap-8 w-full px-8">
                <div className="flex-1 w-1/2 flex flex-col items-center gap-6 bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50 shadow-xl min-w-0">
                    <div className="text-sm font-bold text-slate-400 tracking-widest border-b border-slate-700 pb-2 w-full text-center">NORTH-SOUTH FABRIC</div>
                    <div className="flex flex-col justify-center h-full w-full gap-8">
                        {renderTreeSection(nsDevs, 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]', 'NS')}
                    </div>
                </div>
                <div className="flex-1 w-1/2 flex flex-col items-center gap-8 bg-slate-800/20 p-8 rounded-3xl border border-slate-700/50 shadow-xl min-w-0 overflow-hidden">
                    <div className="text-sm font-bold text-slate-400 tracking-widest border-b border-slate-700 pb-2 w-full text-center">EAST-WEST FABRIC</div>
                    <div className="flex flex-col items-center w-full gap-4">
                        <div className="text-xs font-bold text-slate-500 tracking-widest bg-slate-900/50 px-4 py-1 rounded-full">SPINE LAYER</div>
                        {renderTreeSection(ewSpineDevs, 'bg-purple-500 shadow-[0_0_8px_#a855f7]', 'Spine')}
                    </div>
                    <div className="flex flex-col items-center w-full gap-4">
                        <div className="text-xs font-bold text-slate-500 tracking-widest bg-slate-900/50 px-4 py-1 rounded-full">LEAF LAYER</div>
                        {renderTreeSection(ewLeafDevs, 'bg-emerald-500 shadow-[0_0_8px_#10b981]', 'Leaf')}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center w-full gap-6 px-8 mt-6">
                <div className="text-sm font-bold text-slate-400 tracking-widest border-b border-slate-700 pb-2 mb-2 w-1/3 text-center">ENDPOINT LAYER</div>
                {renderTreeSection(epDevs, 'bg-blue-500 shadow-[0_0_8px_#3b82f6]', 'EP')}
            </div>
        </div>
    );
};

export default NetworkTopology;
