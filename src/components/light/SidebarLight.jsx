import React from 'react';
import { ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, LayoutTemplate, Box, Server, Droplets, HardDrive, Network, Zap, LayoutGrid, Layers, Cpu } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { DEVICE_TEMPLATES, CONTAINER_INFRA_TEMPLATES } from '../../utils/constants';

const SidebarLight = () => {
    const { isSidebarOpen, setIsSidebarOpen, expandedGroups, setExpandedGroups, viewMode, containers, setContainers } = useRackPlanner();

    const handleDragStart = (e, deviceTemplate, isClone = false) => {
        let draggingDevice = { ...deviceTemplate };
        if (!isClone) draggingDevice.customName = draggingDevice.name;
        e.dataTransfer.setData('device', JSON.stringify(draggingDevice));
        e.dataTransfer.setData('isClone', isClone);
        e.dataTransfer.effectAllowed = 'copyMove';

        const dragGhost = e.target.cloneNode(true);
        dragGhost.style.opacity = '0.9'; 
        dragGhost.style.position = 'absolute'; 
        dragGhost.style.top = '-1000px'; 
        dragGhost.id = 'drag-ghost';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 20, 20);
        setTimeout(() => { const ghost = document.getElementById('drag-ghost'); if (ghost) document.body.removeChild(ghost); }, 0);
    };

    if (!isSidebarOpen) {
        return (
            <div className="w-11 bg-white border-r border-slate-200 flex flex-col items-center py-3 shrink-0 z-20 shadow-xs">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors" title="展開元件庫">
                    <PanelLeft className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xs">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <h2 className="text-xs font-semibold text-slate-800 tracking-tight">
                        {viewMode === 'container' ? '貨櫃設施模組' : '硬體設備元件庫 (Hardware Library)'}
                    </h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-200" title="收起側邊欄">
                    <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto light-scrollbar p-2.5 space-y-1.5 bg-slate-50/50">
                {viewMode === 'container' ? (
                    <div className="space-y-2">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">貨櫃尺寸規格 (拖曳至畫布)</div>
                            <div className="grid grid-cols-1 gap-1">
                                {[
                                    { type: '20ft', label: '20 呎貨櫃 (10 格機架)' },
                                    { type: '40ft', label: '40 呎貨櫃 (20 格機架)' },
                                    { type: 'custom', label: '自訂長度貨櫃' },
                                ].map(c => (
                                    <div
                                        key={c.type}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('newContainerType', c.type);
                                            e.dataTransfer.effectAllowed = 'copyMove';
                                        }}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-grab active:cursor-grabbing text-xs font-medium text-slate-700 flex items-center gap-2 transition-colors shadow-2xs hover:border-slate-300"
                                    >
                                        <Box className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{c.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">基礎設施機櫃模組</div>
                        {CONTAINER_INFRA_TEMPLATES.map((item, idx) => {
                            const ItemIcon = item.icon;
                            
                            const handleContainerDragStart = (e) => {
                                const payload = {
                                    isCabinet: true,
                                    cabinetType: item.type,
                                    name: item.name,
                                    theme: item.theme,
                                    uCount: item.uCount || 48,
                                    powerLimit: item.powerLimit || 24000,
                                    coolingCapacity: item.coolingCapacity,
                                    powerCapacity: item.powerCapacity,
                                    batteryCapacity: item.batteryCapacity,
                                    power: item.power || 0,
                                    weight: item.weight || 200,
                                    isZone: item.isZone
                                };
                                e.dataTransfer.setData('cabinet', JSON.stringify(payload));
                                e.dataTransfer.effectAllowed = 'copyMove';
                            };

                            return (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={handleContainerDragStart}
                                    className="p-2 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2.5 cursor-grab active:cursor-grabbing transition-colors shadow-2xs hover:border-slate-300 group"
                                >
                                    <div className="p-1.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                        <ItemIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-slate-800 truncate">{item.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                            {item.type === 'General' || item.type === 'ORv3' ? `${item.uCount}U IT機櫃` : ''}
                                            {item.type === 'Cooling' ? `解熱: ${(item.coolingCapacity/1000).toFixed(0)}kW` : ''}
                                            {item.type === 'UPS' ? `容量: ${(item.powerCapacity/1000).toFixed(0)}kW` : ''}
                                            {item.type === 'Battery' ? `電能: ${(item.batteryCapacity/1000).toFixed(0)}kWh` : ''}
                                            {item.type === 'Switchboard' ? '電網配電總櫃' : ''}
                                            {` · ${item.weight}kg`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    DEVICE_TEMPLATES.map((group, idx) => {
                        const isOpen = group.isGroup ? expandedGroups[group.name] : false;
                        const GroupIcon = group.icon;

                        if (group.isGroup) {
                            return (
                                <div key={idx} className="mb-0.5">
                                    <button
                                        onClick={() => setExpandedGroups({ ...expandedGroups, [group.name]: !isOpen })}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <GroupIcon className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{group.name}</span>
                                        </div>
                                        {isOpen
                                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        }
                                    </button>

                                    {isOpen && (
                                        <div className="mt-0.5 ml-2 space-y-1 border-l border-slate-200 pl-2 py-0.5">
                                            {group.subItems.map((item, itemIdx) => {
                                                const ItemIcon = item.icon;
                                                return (
                                                    <div
                                                        key={itemIdx}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, item)}
                                                        className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-colors shadow-2xs hover:border-slate-300 group"
                                                    >
                                                        <div className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                                            <ItemIcon className="w-3 h-3" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs font-medium text-slate-800 truncate">{item.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{item.size}U · {item.power}W</div>
                                                        </div>
                                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                                            {item.size}U
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            const ItemIcon = group.icon;
                            return (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, group)}
                                    className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 cursor-grab active:cursor-grabbing mb-1 transition-colors shadow-2xs hover:border-slate-300 group"
                                >
                                    <div className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                        <ItemIcon className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-slate-800 truncate">{group.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{group.size}U · {group.power}W</div>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                        {group.size}U
                                    </span>
                                </div>
                            );
                        }
                    })
                )}
            </div>

            {/* Footer Status */}
            <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center font-mono">
                <span>Inventec Enterprise</span>
                <span className="text-slate-400">v2.4 CAD</span>
            </div>
        </aside>
    );
};

export default SidebarLight;
