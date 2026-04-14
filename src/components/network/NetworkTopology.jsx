import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES } from '../../utils/constants';
import { getIconByType, getGroupedDevices } from '../../utils/helpers';
import { ChevronRight, ChevronDown } from 'lucide-react';

const NetworkTopology = ({ nsDevs, ewSpineDevs, ewLeafDevs, epDevs }) => {
    const { racks, devices, selectedId, setSelectedId, expandedNetGroups, setExpandedNetGroups, portCoords, setPortCoords } = useRackPlanner();

    const renderCompactLogicalDeviceCard = (dev, bgClass) => {
        const isSelected = selectedId === dev.id;
        const Icon = getIconByType(dev.type);
        const tStyle = THEME_STYLES[dev.theme] || THEME_STYLES.slate;
        
        return (
            <div
                key={dev.id}
                onClick={(e) => { e.stopPropagation(); setSelectedId(dev.id); }}
                className={`relative p-3 rounded-xl border border-slate-700 cursor-pointer transition-all w-48 shrink-0 flex flex-col gap-2 ${tStyle.bg} ${isSelected ? 'ring-2 ring-white z-30 brightness-125 shadow-xl' : 'hover:brightness-125 z-20 shadow-md'} overflow-visible group`}
            >
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${bgClass} border border-black/50 z-10`}></div>
                <div className="flex items-center gap-2 relative z-10">
                    <Icon className={`w-5 h-5 opacity-90 ${tStyle.text}`} />
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-200 truncate">{dev.customName}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">[{racks.find(r => r.id === dev.rackId)?.name}]</div>
                    </div>
                </div>

                <div 
                    className="absolute bottom-[-16px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-800 border-2 border-slate-600 rounded-full cursor-crosshair hover:bg-white hover:scale-125 transition-all z-20 shadow-md"
                    title="連線錨點"
                    ref={(el) => {
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            const scrollParent = document.querySelector('.main-canvas');
                            const canvasContainer = document.querySelector('.rack-container')?.parentElement?.parentElement;
                            const containerRect = canvasContainer ? canvasContainer.getBoundingClientRect() : { left: 0, top: 0 };
                            const sLeft = scrollParent ? scrollParent.scrollLeft : 0;
                            const sTop = scrollParent ? scrollParent.scrollTop : 0;
                            const x = rect.left + rect.width / 2 - containerRect.left + sLeft;
                            const y = rect.top + rect.height / 2 - containerRect.top + sTop;

                            const fullId = `${dev.id}-topology-anchor`;
                            setPortCoords(prev => {
                                if (!prev[fullId] || Math.abs(prev[fullId].x - x) > 1 || Math.abs(prev[fullId].y - y) > 1) {
                                    return { ...prev, [fullId]: { x, y } };
                                }
                                return prev;
                            });
                        }
                    }}
                ></div>
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
                                <div className="flex flex-wrap justify-center gap-4 pt-2">
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
