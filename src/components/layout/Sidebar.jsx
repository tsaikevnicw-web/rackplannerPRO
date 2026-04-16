import React from 'react';
import { ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, LayoutTemplate } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { DEVICE_TEMPLATES, THEME_STYLES } from '../../utils/constants';

const Sidebar = () => {
    const { isSidebarOpen, setIsSidebarOpen, expandedGroups, setExpandedGroups } = useRackPlanner();

    const handleDragStart = (e, deviceTemplate, isClone = false) => {
        let draggingDevice = { ...deviceTemplate };
        if (!isClone) draggingDevice.customName = draggingDevice.name;
        e.dataTransfer.setData('device', JSON.stringify(draggingDevice));
        e.dataTransfer.setData('isClone', isClone);
        e.dataTransfer.effectAllowed = 'copyMove';

        const dragGhost = e.target.cloneNode(true);
        dragGhost.style.opacity = '0.7'; dragGhost.style.position = 'absolute'; dragGhost.style.top = '-1000px'; dragGhost.id = 'drag-ghost';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 20, 20);
        setTimeout(() => { const ghost = document.getElementById('drag-ghost'); if (ghost) document.body.removeChild(ghost); }, 0);
    };

    if (!isSidebarOpen) {
        return (
            <div className="w-12 bg-[#0b1523] border-r border-slate-700/40 flex flex-col items-center py-4 shrink-0 z-20">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/50 transition-colors" title="展開側邊欄">
                    <PanelLeft className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <aside className="w-64 bg-[#0b1523] border-r border-slate-700/40 flex flex-col shrink-0 z-20 shadow-[6px_0_24px_rgba(0,0,0,0.4)]">
            <div className="px-4 py-3.5 border-b border-slate-700/40 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                    <div className="p-1 bg-indigo-500/15 rounded-lg border border-indigo-500/30">
                        <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    設備清單
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/50" title="收起側邊欄">
                    <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {DEVICE_TEMPLATES.map((group, idx) => {
                    const isOpen = group.isGroup ? expandedGroups[group.name] : false;
                    const GroupIcon = group.icon;

                    if (group.isGroup) {
                        return (
                            <div key={idx} className="mb-1">
                                <button
                                    onClick={() => setExpandedGroups({ ...expandedGroups, [group.name]: !isOpen })}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-700/40 text-slate-300 transition-all group"
                                >
                                    <div className="flex items-center gap-2.5 font-semibold text-sm">
                                        <GroupIcon className={`w-4 h-4 text-${group.theme}-400 drop-shadow-[0_0_6px_currentColor] group-hover:scale-110 transition-transform`} />
                                        {group.name}
                                    </div>
                                    {isOpen
                                        ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                    }
                                </button>

                                {isOpen && (
                                    <div className="mt-1.5 ml-2 space-y-1.5 border-l-2 border-slate-700/50 pl-3 py-1">
                                        {group.subItems.map((item, itemIdx) => {
                                            const ItemIcon = item.icon;
                                            const tStyle = THEME_STYLES[item.theme] || THEME_STYLES.slate;
                                            return (
                                                <div
                                                    key={itemIdx}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item)}
                                                    className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-lg ${tStyle.bg} border-slate-700/50 hover:border-${item.theme}-500/40 group`}
                                                >
                                                    <div className={`p-1.5 rounded-lg bg-slate-950/60 border ${tStyle.border} shadow-inner shrink-0`}>
                                                        <ItemIcon className={`w-3.5 h-3.5 ${tStyle.text}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{item.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{item.size}U · {item.power}W</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    } else {
                        const ItemIcon = group.icon;
                        const tStyle = THEME_STYLES[group.theme] || THEME_STYLES.slate;
                        return (
                            <div
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, group)}
                                className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-grab active:cursor-grabbing mb-1 transition-all hover:-translate-y-0.5 hover:shadow-lg ${tStyle.bg} border-slate-700/50 hover:border-${group.theme}-500/40 group`}
                            >
                                <div className={`p-1.5 rounded-lg bg-slate-950/60 border ${tStyle.border} shadow-inner shrink-0`}>
                                    <ItemIcon className={`w-3.5 h-3.5 ${tStyle.text}`} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{group.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{group.size}U · {group.power}W</div>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            <div className="px-4 py-3 border-t border-slate-700/40 text-[11px] text-slate-600 text-center flex flex-col items-center gap-0.5 font-mono">
                <span>Inventec Corp. Kevin Tsai</span>
                <span className="text-slate-700">Tsai.KevinC.W@inventec.com</span>
            </div>
        </aside>
    );
};

export default Sidebar;
