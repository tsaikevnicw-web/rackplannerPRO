import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES, HW_SPECS_CONFIG, DEFAULT_RACK_U_COUNT } from '../../utils/constants';
import { getIconByType, getFabricGroup, getNicCount, getSwitchPortCount, getServerCategory, getServerConfig, getHighDensityNodes, getHighDensitySize, getAIServerSize } from '../../utils/helpers';
import { LayoutDashboard, X, Trash2, Info, Copy, Unplug, Cpu, Network, Link2, Server, HardDrive, Zap } from 'lucide-react';

const RightPanel = () => {
    const { 
        racks, devices, setDevices, selectedId, setSelectedId, selectedIds, setSelectedIds, handleUpdateRack, handleUpdateDevice, handleHardwareSpecChange,
        handleConnectionChange, handleAutoConnectGroup, handleHAAutoConnect, setDeleteRackConfirm, setClearDeviceConfirm, setDeleteDeviceConfirm, showAlert
    } = useRackPlanner();

    const selectedRack = racks.find(r => r.id === selectedId);
    const selectedDevice = devices.find(d => d.id === selectedId);
    
    const availableSwitches = devices.filter(d => (d.type || '').startsWith('Switch') || d.type === 'Router')
        .sort((a, b) => {
            if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
            return (a.customName || '').localeCompare(b.customName || '');
        }).map(sw => {
            const swRack = racks.find(r => r.id === sw.rackId);
            return { ...sw, rackName: swRack ? swRack.name : 'UnknownRack', portCount: getSwitchPortCount(sw) };
        });

    /* ── Input / Select shared style ── */
    const inputCls = "w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner placeholder:text-slate-600";
    const selectCls = "w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner";
    const sectionCls = "space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50";

    // ── 批次編輯面板 ──
    if (selectedIds.length > 1) {
        const selectedDevices = devices.filter(d => selectedIds.includes(d.id));
        
        const handleBatchUpdate = (fields) => {
            selectedDevices.forEach(dev => {
                handleUpdateDevice(dev.id, fields);
            });
        };

        const handleBatchCoolingUpdate = (field, value) => {
            selectedDevices.forEach(dev => {
                handleUpdateDevice(dev.id, {
                    hardwareSpecs: {
                        ...(dev.hardwareSpecs || {}),
                        cooling: {
                            ...(dev.hardwareSpecs?.cooling || {}),
                            [field]: value
                        }
                    }
                });
            });
        };

        return (
            <aside className="w-[360px] bg-[#0b1523]/95 border-l border-slate-700/40 p-6 flex flex-col overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-20 shrink-0 custom-scrollbar animate-in slide-in-from-right-8 duration-300 backdrop-blur-md">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                        <div className="p-1 bg-indigo-500/15 rounded-lg border border-indigo-500/30">
                            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        批次編輯 ({selectedIds.length} 個設備)
                    </h2>
                    <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/60" title="關閉面板">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-3 mb-6">
                    <button onClick={() => {
                        if (confirm(`確定要刪除這 ${selectedIds.length} 個設備嗎？`)) {
                            setDevices(prev => prev.filter(d => !selectedIds.includes(d.id)));
                            setSelectedIds([]);
                        }
                    }} className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 py-2.5 rounded-xl transition-colors text-sm font-medium border border-rose-500/25 shadow-sm">
                        <Trash2 className="w-4 h-4" /> 批次刪除設備
                    </button>
                </div>

                <div className="space-y-6">
                    <div className={sectionCls}>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">外觀主題 (Theme)</label>
                        <select 
                            value="" 
                            onChange={(e) => {
                                if (e.target.value) handleBatchUpdate({ theme: e.target.value });
                            }} 
                            className={selectCls}
                        >
                           <option value="">選擇主題...</option>
                           <option value="slate">Slate (深灰)</option>
                           <option value="indigo">Indigo (靛藍)</option>
                           <option value="emerald">Emerald (翡翠綠)</option>
                           <option value="amber">Amber (琥珀黃)</option>
                           <option value="rose">Rose (玫瑰紅)</option>
                           <option value="cyan">Cyan (青綠)</option>
                           <option value="violet">Violet (紫羅蘭)</option>
                        </select>
                    </div>

                    <div className={sectionCls}>
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 mb-1.5">修改拓撲群組 (Topology Group)</label>
                            <input 
                                type="text" 
                                placeholder="輸入群組名稱，按 Enter 套用..." 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleBatchUpdate({ topologyGroup: e.target.value });
                                        showAlert(`已批次修改拓撲群組為 "${e.target.value}"`, '成功', 'success');
                                    }
                                }} 
                                className={inputCls} 
                            />
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">按 Enter 鍵確認變更</p>
                        </div>
                    </div>

                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3"/> 功耗 W (Enter)</label>
                                <input 
                                    type="number" 
                                    placeholder="功耗 W" 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) {
                                                handleBatchUpdate({ power: val });
                                                showAlert(`已批次修改功耗為 ${val}W`, '成功', 'success');
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3 h-3"/> 報價 USD (Enter)</label>
                                <input 
                                    type="number" 
                                    placeholder="報價 USD" 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) {
                                                handleBatchUpdate({ price: val });
                                                showAlert(`已批次修改報價為 $${val}`, '成功', 'success');
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className={sectionCls}>
                        <label className="block text-[11px] font-bold text-cyan-400 mb-3 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                            散熱配置 (Cooling)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 font-semibold">Host Cooling</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBatchCoolingUpdate('host', e.target.value);
                                            showAlert(`已批次修改 Host 散熱為 ${e.target.value}`, '成功', 'success');
                                        }
                                    }}
                                    className={selectCls}
                                >
                                    <option value="">選擇...</option>
                                    <option value="AC">AC (Air Cooling)</option>
                                    <option value="LC">LC (Liquid Cooling)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1.5 font-semibold">GPU Cooling</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBatchCoolingUpdate('gpu', e.target.value);
                                            showAlert(`已批次修改 GPU 散熱為 ${e.target.value}`, '成功', 'success');
                                        }
                                    }}
                                    className={selectCls}
                                >
                                    <option value="">選擇...</option>
                                    <option value="AC">AC (Air Cooling)</option>
                                    <option value="LC">LC (Liquid Cooling)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        );
    }

    if (!selectedRack && !selectedDevice) {
        return null;
    }

    if (selectedRack && !selectedDevice) {
        return (
            <aside className="w-[360px] bg-[#0b1523]/95 border-l border-slate-700/40 p-6 flex flex-col overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-20 shrink-0 custom-scrollbar animate-in slide-in-from-right-8 duration-300 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                        <div className="p-1 bg-indigo-500/15 rounded-lg border border-indigo-500/30">
                            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        機櫃設定
                    </h2>
                    <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/60" title="關閉面板">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-3 mb-6">
                    <button onClick={() => setDeleteRackConfirm({ isOpen: true, rackId: selectedRack.id })} className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 py-2.5 rounded-xl transition-colors text-sm font-medium border border-rose-500/25 shadow-sm">
                        <Trash2 className="w-4 h-4" /> 刪除機櫃
                    </button>
                </div>

                <div className={sectionCls}>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">機櫃名稱 (Rack Name)</label>
                        <input type="text" value={selectedRack.name} onChange={(e) => handleUpdateRack(selectedRack.id, { name: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">機櫃類型 (Rack Type)</label>
                        <select value={selectedRack.type || 'General'} onChange={(e) => handleUpdateRack(selectedRack.id, { type: e.target.value })} className={selectCls}>
                            <option value="General">General (泛用型)</option>
                            <option value="ORv3">ORv3 (開放運算計畫)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">總 U 數 (Rack U)</label>
                        <input type="number" value={selectedRack.uCount || DEFAULT_RACK_U_COUNT} onChange={(e) => handleUpdateRack(selectedRack.id, { uCount: parseInt(e.target.value) || 1 })} disabled={selectedRack.type === 'ORv3'} className={`${inputCls} font-mono disabled:opacity-40 disabled:cursor-not-allowed`} />
                        {selectedRack.type === 'ORv3' && <p className="text-[10px] text-slate-500 mt-1">ORv3 規格固定為 44U</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            機櫃電力限制 (Power Limit - W)
                        </label>
                        <input 
                            type="number" 
                            value={selectedRack.powerLimit !== undefined ? selectedRack.powerLimit : 20000} 
                            onChange={(e) => handleUpdateRack(selectedRack.id, { powerLimit: parseInt(e.target.value) || 0 })} 
                            className={`${inputCls} font-mono`} 
                        />
                    </div>
                </div>
            </aside>
        );
    }

    const SelectedIcon = getIconByType(selectedDevice.type);
    const tStyle = THEME_STYLES[selectedDevice.theme] || THEME_STYLES.slate;
    const isSwitchOrRouter = (selectedDevice.type || '').startsWith('Switch') || selectedDevice.type === 'Router';

    const nic1Count = getNicCount(selectedDevice, 'ns_nic_1');
    const nic2Count = getNicCount(selectedDevice, 'ns_nic_2');
    const superNicMgtCount = getNicCount(selectedDevice, 'super_nic_mgt');
    const cx8NetworkType = selectedDevice.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';

    const handleDragStartClone = (e) => {
        let draggingDevice = { ...selectedDevice, name: selectedDevice.customName };
        e.dataTransfer.setData('device', JSON.stringify(draggingDevice));
        e.dataTransfer.setData('isClone', "true");
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    return (
        <aside className="w-[360px] bg-[#0b1523]/95 border-l border-slate-700/40 p-6 flex flex-col overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-20 shrink-0 custom-scrollbar animate-in slide-in-from-right-8 duration-300 backdrop-blur-md">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                    <div className="p-1 bg-slate-700/60 rounded-lg border border-slate-600/50">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    設備內容
                </h2>
                <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/60" title="關閉面板">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col gap-5 pb-8">
                {/* Device preview card */}
                <div className={`p-4 rounded-xl ${tStyle.bg} border ${tStyle.border} flex items-center gap-4 shadow-lg relative overflow-hidden`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${tStyle.led} rounded-l-xl`}></div>
                    {SelectedIcon && <SelectedIcon className={`w-9 h-9 ${tStyle.text} drop-shadow-lg shrink-0`} />}
                    <div className="relative z-10 min-w-0">
                        <div className="text-white font-bold text-base truncate">{selectedDevice.customName}</div>
                        <div className="text-slate-400 text-xs font-mono mt-0.5">{selectedDevice.type === 'SideCDU' ? 'Full Rack' : `${selectedDevice.size}U`} · {selectedDevice.type}</div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <div draggable onDragStart={handleDragStartClone}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 py-2.5 rounded-xl transition-colors text-xs font-semibold border border-indigo-500/25 cursor-grab active:cursor-grabbing shadow-sm"
                        title="按住並拖曳至機櫃以複製此設備">
                        <Copy className="w-3.5 h-3.5" /> 複製
                    </div>
                    <button onClick={() => setClearDeviceConfirm({ isOpen: true, deviceId: selectedDevice.id })}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 py-2.5 rounded-xl transition-colors text-xs font-semibold border border-amber-500/25 shadow-sm"
                        title="清除此設備的所有網路連線">
                        <Unplug className="w-3.5 h-3.5" /> 清除連線
                    </button>
                    <button onClick={() => setDeleteDeviceConfirm({ isOpen: true, deviceId: selectedDevice.id })}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 py-2.5 rounded-xl transition-colors text-xs font-semibold border border-rose-500/25 shadow-sm"
                        title="完全刪除此設備及所有設定">
                        <Trash2 className="w-3.5 h-3.5" /> 刪除設備
                    </button>
                </div>

                {/* Basic info */}
                <div className={sectionCls}>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">設備名稱</label>
                        <input type="text" value={selectedDevice.customName} onChange={(e) => handleUpdateDevice(selectedDevice.id, { customName: e.target.value })} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                        <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-emerald-400 mb-1.5">拓撲群組 (Topology Group)</label>
                            <input type="text" value={selectedDevice.topologyGroup || racks.find(r => r.id === selectedDevice.rackId)?.name || ''} onChange={(e) => handleUpdateDevice(selectedDevice.id, { topologyGroup: e.target.value })} placeholder="預設為所在機櫃名稱"
                                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner placeholder:text-slate-600" />
                        </div>
                        {isSwitchOrRouter && (
                            <>
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">網路用途 (Fabric Group)</label>
                                    <select value={getFabricGroup(selectedDevice)} onChange={(e) => handleUpdateDevice(selectedDevice.id, { fabricGroup: e.target.value })}
                                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner">
                                        <option value="East-West">East-West Fabric (東西向/運算網路)</option>
                                        <option value="North-South">North-South Fabric (南北向/融合/管理網路)</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-purple-400 mb-1.5">網路角色 (Network Role)</label>
                                    <select value={selectedDevice.networkRole || (selectedDevice.type === 'Router' || selectedDevice.type === 'Switch800G' ? 'Spine' : 'Leaf')} onChange={(e) => handleUpdateDevice(selectedDevice.id, { networkRole: e.target.value })}
                                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-inner">
                                        <option value="Spine">Spine Layer (核心骨幹層)</option>
                                        <option value="Leaf">Leaf Layer (邊緣存取層)</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="col-span-2 border-t border-slate-800/50 pt-4">
                            <label className="block text-xs font-bold text-slate-400 mb-1.5">所在實體位置</label>
                            <div className="w-full bg-slate-900/40 border border-slate-800/60 rounded-lg p-2 text-sm text-slate-500 cursor-not-allowed font-mono flex justify-between">
                                <span>{racks.find(r => r.id === selectedDevice.rackId)?.name}</span>
                                <span>{selectedDevice.type === 'SideCDU' ? 'SideCar' : `U${selectedDevice.startU}-U${selectedDevice.startU + selectedDevice.size - 1}`}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Power / Price / Ports */}
                {((selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage')) && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3"/> 設備功耗 (W)</label>
                                <input type="number" value={selectedDevice.power || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { power: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3 h-3"/> 設備報價 (USD)</label>
                                <input type="number" value={selectedDevice.price || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { price: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" />
                            </div>

                            {getServerCategory(selectedDevice) !== null && (() => {
                                const cat = getServerCategory(selectedDevice);
                                const currentConfig = getServerConfig(selectedDevice);
                                const handleServerConfigChange = (option) => {
                                    let newSize = 1;
                                    if (cat === 'General') {
                                        newSize = parseInt(option) || 1;
                                    } else if (cat === 'HighDensity') {
                                        newSize = getHighDensitySize(option);
                                    } else if (cat === 'AI') {
                                        newSize = getAIServerSize(option);
                                    }
                                    handleUpdateDevice(selectedDevice.id, {
                                        serverConfig: option,
                                        size: newSize
                                    });
                                };

                                return (
                                    <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                        <label className="block text-[11px] font-bold text-indigo-400 mb-1.5 flex items-center gap-1">
                                            <Server className="w-3 h-3"/> 伺服器設定 (Server Config)
                                        </label>
                                        <select value={currentConfig || ''} onChange={(e) => handleServerConfigChange(e.target.value)} className={selectCls}>
                                            {cat === 'General' && (
                                                <>
                                                    <option value="1U">1U</option>
                                                    <option value="2U">2U</option>
                                                    <option value="3U">3U</option>
                                                    <option value="4U">4U</option>
                                                </>
                                            )}
                                            {cat === 'HighDensity' && (
                                                <>
                                                    <option value="1U1N">1U1N</option>
                                                    <option value="1U2N">1U2N</option>
                                                    <option value="2U1N">2U1N</option>
                                                    <option value="2U2N">2U2N</option>
                                                    <option value="2U4N">2U4N</option>
                                                </>
                                            )}
                                            {cat === 'AI' && (
                                                <>
                                                    <option value="4U">4U</option>
                                                    <option value="5U">5U</option>
                                                    <option value="6U">6U</option>
                                                    <option value="10U">10U</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                );
                            })()}

                            {getServerCategory(selectedDevice) === 'AI' && (
                                <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                    <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">EW NIC Network Type</label>
                                    <select value={cx8NetworkType} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'cx8NetworkType', 'type', e.target.value)} className={selectCls}>
                                        <option value="Ethernet">Ethernet / RoCE v2 (綠線)</option>
                                        <option value="InfiniBand">InfiniBand / NDR (橘線)</option>
                                    </select>
                                </div>
                            )}

                            {(['Server5U', 'Server1U', 'Server2U', 'Storage1U', 'Storage2U', 'ServerGeneral', 'ServerHighDensity', 'ServerAI'].includes(selectedDevice.type) || getServerCategory(selectedDevice) !== null) && (() => {
                                const hostCooling = selectedDevice.hardwareSpecs?.cooling?.host || 'AC';
                                const gpuCooling  = selectedDevice.hardwareSpecs?.cooling?.gpu  || 'AC';
                                const isAI = getServerCategory(selectedDevice) === 'AI';
                                const setCooling = (field, value) => {
                                    handleUpdateDevice(selectedDevice.id, {
                                        hardwareSpecs: {
                                            ...(selectedDevice.hardwareSpecs || {}),
                                            cooling: {
                                                ...(selectedDevice.hardwareSpecs?.cooling || {}),
                                                [field]: value
                                            }
                                        }
                                    });
                                };
                                return (
                                    <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                        <label className="block text-[11px] font-bold text-cyan-400 mb-3 flex items-center gap-1.5">
                                            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                                            Cooling Configuration
                                        </label>
                                        <div className={`grid ${isAI ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                            <div>
                                                <label className="block text-[10px] text-slate-400 mb-1.5 font-semibold">Host Cooling</label>
                                                <select
                                                    value={hostCooling}
                                                    onChange={(e) => setCooling('host', e.target.value)}
                                                    className={`${selectCls} ${hostCooling === 'LC' ? 'border-blue-500/60 text-blue-300 focus:border-blue-400/80' : ''}`}
                                                >
                                                    <option value="AC">AC (Air Cooling)</option>
                                                    <option value="LC">LC (Liquid Cooling)</option>
                                                </select>
                                                {hostCooling === 'LC' && (
                                                    <p className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                                                        Water loop anchors active
                                                    </p>
                                                )}
                                            </div>
                                            {isAI && (
                                                <div>
                                                    <label className="block text-[10px] text-slate-400 mb-1.5 font-semibold">GPU Cooling</label>
                                                    <select
                                                        value={gpuCooling}
                                                        onChange={(e) => setCooling('gpu', e.target.value)}
                                                        className={`${selectCls} ${gpuCooling === 'LC' ? 'border-blue-500/60 text-blue-300 focus:border-blue-400/80' : ''}`}
                                                    >
                                                        <option value="AC">AC (Air Cooling)</option>
                                                        <option value="LC">LC (Liquid Cooling)</option>
                                                    </select>
                                                    {gpuCooling === 'LC' && (
                                                        <p className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                                                            Water loop anchors active
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {getServerCategory(selectedDevice) !== 'HighDensity' && (
                                <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                    <h3 className="block text-[11px] font-bold text-slate-400 mb-2">網路連線狀態與數量 (Network Ports)</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {getServerCategory(selectedDevice) === 'AI' && (
                                            <div className="col-span-2">
                                                <label className="block text-[10px] text-slate-500 mb-1">EW NIC 數量</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={selectedDevice.hardwareSpecs?.cx8p?.qty !== undefined ? selectedDevice.hardwareSpecs.cx8p.qty : 8}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const v = Math.max(0, isNaN(val) ? 0 : val);
                                                        handleHardwareSpecChange(selectedDevice.id, 'cx8p', 'qty', v);
                                                    }}
                                                    className="w-full bg-slate-900/80 border border-indigo-700/60 rounded-lg px-2 py-1.5 text-xs text-indigo-300 focus:border-indigo-500/60 focus:outline-none" />
                                            </div>
                                        )}
                                        <div className="col-span-2">
                                            {(() => {
                                                const isGeneral = getServerCategory(selectedDevice) === 'General';
                                                const pcieSlotQty = selectedDevice.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                                const maxSuperNicMgt = isGeneral ? pcieSlotQty : 2;
                                                return (
                                                    <>
                                                        <label className="block text-[10px] text-slate-500 mb-1">Super NIC Mgt <span className="text-slate-600">(最多 {maxSuperNicMgt})</span></label>
                                                        <input
                                                            type="number" min={0} max={maxSuperNicMgt}
                                                            value={superNicMgtCount}
                                                            onChange={(e) => {
                                                                const v = Math.min(maxSuperNicMgt, Math.max(0, parseInt(e.target.value) || 0));
                                                                handleHardwareSpecChange(selectedDevice.id, 'super_nic_mgt', 'qty', v);
                                                            }}
                                                            className="w-full bg-slate-900/80 border border-violet-700/60 rounded-lg px-2 py-1.5 text-xs text-violet-300 focus:border-violet-500/60 focus:outline-none" />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Switch Configuration */}
                {((selectedDevice.type || '').startsWith('Switch')) && (() => {
                    const occupiedPorts = new Set();
                    devices.forEach(d => {
                        if (d.connections) {
                            Object.entries(d.connections).forEach(([key, tg]) => {
                                if (tg && tg.startsWith(`${selectedDevice.id}-port-`)) {
                                    occupiedPorts.add(tg);
                                }
                            });
                        }
                    });
                    const usedPortsCount = occupiedPorts.size;
                    const totalPortsCount = getSwitchPortCount(selectedDevice);

                    return (
                        <div className={sectionCls}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3"/> 設備功耗 (W)</label>
                                    <input type="number" value={selectedDevice.power || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { power: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3 h-3"/> 設備報價 (USD)</label>
                                    <input type="number" value={selectedDevice.price || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { price: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" />
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                    <label className="block text-[11px] font-bold text-purple-400 mb-1.5 flex items-center gap-1"><Network className="w-3 h-3"/> 交換器設定 (Switch Config)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-slate-400 mb-1">機架高度 (U數)</label>
                                            <select value={selectedDevice.size || 1} onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseInt(e.target.value) })} className={selectCls}>
                                                <option value={1}>1U</option>
                                                <option value={2}>2U</option>
                                                <option value={3}>3U</option>
                                                <option value={4}>4U</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-400 mb-1">網路孔數 (Ports)</label>
                                            <select 
                                                value={getNicCount(selectedDevice, 'ports') || totalPortsCount} 
                                                onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ports', 'qty', parseInt(e.target.value) || 48)} 
                                                className={selectCls}
                                            >
                                                <option value={8}>8 埠</option>
                                                <option value={12}>12 埠</option>
                                                <option value={16}>16 埠</option>
                                                <option value={24}>24 埠</option>
                                                <option value={32}>32 埠</option>
                                                <option value={48}>48 埠</option>
                                                <option value={64}>64 埠</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-slate-400 mb-1">傳輸速率 (Speed)</label>
                                            <input type="text" placeholder="e.g. 400G, 800G" value={(selectedDevice.hardwareSpecs?.speed?.model) || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'speed', 'model', e.target.value)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                        </div>
                                        <div className="col-span-2 pt-2">
                                            <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-medium">孔位使用率 (Port Usage)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    {usedPortsCount} / {totalPortsCount} 埠 ({totalPortsCount - usedPortsCount} 空置)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Hardware Specs */}
                {((selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage')) && (() => {
                    const isServerOrStorage = (selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage');
                    return (
                        <div className={`${sectionCls} mt-0`}>
                        {getServerCategory(selectedDevice) === 'HighDensity' ? (
                            <>
                                {getHighDensityNodes(selectedDevice).map((nodeKey, idx) => {
                                    const nodeNum = idx + 1;
                                    return (
                                        <div key={nodeKey}>
                                            <label className="block text-xs font-bold text-blue-400 mt-4 mb-3">Node {nodeNum} 硬體規格</label>
                                            <div className="grid grid-cols-[64px_1fr_60px] gap-2 mb-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                                <div></div>
                                                <div>零組件 (Model)</div>
                                                <div className="text-center">數量</div>
                                            </div>
                                            {HW_SPECS_CONFIG.map(spec => {
                                                if (spec.key === 'ns_nic_1') {
                                                    const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                                                    const pcieSlotQty = selectedDevice.hardwareSpecs?.[pcieSlotQtyKey]?.qty || 2;
                                                    return (
                                                        <React.Fragment key={pcieSlotQtyKey}>
                                                            <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                                <div className="text-[10px] font-bold text-slate-400 text-right pr-2 truncate">PCIe Slots</div>
                                                                <select
                                                                    value={pcieSlotQty}
                                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, pcieSlotQtyKey, 'qty', parseInt(e.target.value))}
                                                                    className="col-span-2 bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                                                >
                                                                    {Array.from({ length: 13 }).map((_, i) => (
                                                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                                const slotIdx = i + 1;
                                                                const slotKey = `pcie_slot_${slotIdx}_${nodeKey}`;
                                                                const currentVal = (selectedDevice.hardwareSpecs || {})[slotKey] || { model: '', qty: '' };
                                                                return (
                                                                    <div key={slotKey} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                                        <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate">PCIe Slot {slotIdx}</div>
                                                                        <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'model', e.target.value)}
                                                                            className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                                                        <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'qty', parseInt(e.target.value) || '')}
                                                                            className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                                    </div>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                }
                                                if (spec.key === 'ns_nic_2') {
                                                    return null;
                                                }

                                                const nodeSpecKey = `${spec.key}_${nodeKey}`;
                                                const currentVal = (selectedDevice.hardwareSpecs || {})[nodeSpecKey] || { model: '', qty: '' };
                                                return (
                                                    <div key={nodeSpecKey} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                        <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                                        <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'model', e.target.value)}
                                                            className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                                        <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'qty', parseInt(e.target.value) || '')}
                                                            className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-bold text-slate-400 mb-3">硬體規格 (Hardware Specs)</label>
                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 mb-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                    <div></div>
                                    <div>零組件 (Model)</div>
                                    <div className="text-center">數量</div>
                                </div>
                                {HW_SPECS_CONFIG.map(spec => {
                                    if (spec.key === 'ns_nic_1' && isServerOrStorage) {
                                        const pcieSlotQty = selectedDevice.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                        return (
                                            <React.Fragment key="pcieSlotQty">
                                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                    <div className="text-[10px] font-bold text-slate-400 text-right pr-2 truncate">PCIe Slots</div>
                                                    <select
                                                        value={pcieSlotQty}
                                                        onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'pcieSlotQty', 'qty', parseInt(e.target.value))}
                                                        className="col-span-2 bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                                    >
                                                        {Array.from({ length: 13 }).map((_, i) => (
                                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {Array.from({ length: pcieSlotQty }).map((_, i) => {
                                                    const slotIdx = i + 1;
                                                    const slotKey = `pcie_slot_${slotIdx}`;
                                                    const currentVal = (selectedDevice.hardwareSpecs || {})[slotKey] || { model: '', qty: '' };
                                                    return (
                                                        <div key={slotKey} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate">PCIe Slot {slotIdx}</div>
                                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'model', e.target.value)}
                                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'qty', parseInt(e.target.value) || '')}
                                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    }
                                    if (spec.key === 'ns_nic_2' && isServerOrStorage) {
                                        return null;
                                    }

                                    const currentVal = (selectedDevice.hardwareSpecs || {})[spec.key] || { model: '', qty: '' };
                                    if (spec.key === 'gpu' && getServerCategory(selectedDevice) === 'AI') {
                                        const accelerator = selectedDevice.hardwareSpecs?.accelerator?.type || 'Nvidia';
                                        return (
                                            <React.Fragment key="accelerator_gpu">
                                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                    <div className="text-[10px] font-bold text-slate-400 text-right pr-2 truncate">Accelerator</div>
                                                    <select
                                                        value={accelerator}
                                                        onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'accelerator', 'type', e.target.value)}
                                                        className="col-span-2 bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                                    >
                                                        <option value="Nvidia">Nvidia</option>
                                                        <option value="AMD">AMD</option>
                                                        <option value="Intel">Intel</option>
                                                        <option value="Others">Others</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                    <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                                    <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'model', e.target.value)}
                                                        className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                                    <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                                        className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                </div>
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <div key={spec.key} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'model', e.target.value)}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                ); })()}
            </div>
        </aside>
    );
};

export default RightPanel;
