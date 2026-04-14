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
            <div className="w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 shrink-0 z-20">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" title="展開側邊欄">
                    <PanelLeft className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-blue-400" />
                    設備清單
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors" title="收起側邊欄">
                    <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <div className="text-xs text-slate-500 mb-4 px-2 italic font-medium tracking-wide">
                    可用設備 (拖曳加入)
                </div>

                {DEVICE_TEMPLATES.map((group, idx) => {
                    const isOpen = group.isGroup ? expandedGroups[group.name] : false;
                    const GroupIcon = group.icon;

                    if (group.isGroup) {
                        return (
                            <div key={idx} className="mb-2">
                                <button
                                    onClick={() => setExpandedGroups({ ...expandedGroups, [group.name]: !isOpen })}
                                    className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-800/80 text-slate-300 transition-colors group"
                                >
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <GroupIcon className={`w-4 h-4 text-${group.theme}-400 drop-shadow-md group-hover:scale-110 transition-transform`} />
                                        {group.name}
                                    </div>
                                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                </button>
                                
                                {isOpen && (
                                    <div className="mt-2 ml-2 space-y-2 border-l border-slate-700/50 pl-3 py-1">
                                        {group.subItems.map((item, itemIdx) => {
                                            const ItemIcon = item.icon;
                                            const tStyle = THEME_STYLES[item.theme] || THEME_STYLES.slate;
                                            return (
                                                <div
                                                    key={itemIdx}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item)}
                                                    className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-lg
                                                        ${tStyle.bg} border-slate-700/60 hover:border-${item.theme}-500/50 group`}
                                                >
                                                    <div className={`p-1.5 rounded bg-slate-900 border ${tStyle.border} shadow-inner`}>
                                                        <ItemIcon className={`w-4 h-4 ${tStyle.text}`} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{item.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Size: {item.size}U | {item.power}W</div>
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
                                className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-grab active:cursor-grabbing mb-2 transition-all hover:-translate-y-0.5 hover:shadow-lg
                                    ${tStyle.bg} border-slate-700/60 hover:border-${group.theme}-500/50 group`}
                            >
                                <div className={`p-1.5 rounded bg-slate-900 border ${tStyle.border} shadow-inner`}>
                                    <ItemIcon className={`w-4 h-4 ${tStyle.text}`} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{group.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Size: {group.size}U | {group.power}W</div>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-500 text-center flex flex-col items-center gap-1">
                <span>Designed for AI Infrastructure</span>
                <span>Powered by I E C</span>
            </div>
        </aside>
    );
};

export default Sidebar;
