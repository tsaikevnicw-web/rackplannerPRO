import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES, HW_SPECS_CONFIG, DEFAULT_RACK_U_COUNT } from '../../utils/constants';
import { getIconByType, getFabricGroup, getNicCount, getSwitchPortCount } from '../../utils/helpers';
import { LayoutDashboard, X, Trash2, Info, Copy, Unplug, Cpu, Network, Link2, Server, HardDrive, Zap } from 'lucide-react';

const RightPanel = () => {
    const { 
        racks, devices, selectedId, setSelectedId, handleUpdateRack, handleUpdateDevice, handleHardwareSpecChange,
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

    if (!selectedRack && !selectedDevice) return null;

    /* ── Input / Select shared style ── */
    const inputCls = "w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner placeholder:text-slate-600";
    const selectCls = "w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner";
    const sectionCls = "space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50";

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
                </div>
            </aside>
        );
    }

    const SelectedIcon = getIconByType(selectedDevice.type);
    const tStyle = THEME_STYLES[selectedDevice.theme] || THEME_STYLES.slate;
    const isSwitchOrRouter = (selectedDevice.type || '').startsWith('Switch') || selectedDevice.type === 'Router';

    const nic1Count = getNicCount(selectedDevice, 'ns_nic_1');
    const nic2Count = getNicCount(selectedDevice, 'ns_nic_2');
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
                                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-inner disabled:opacity-40"
                                        disabled={getFabricGroup(selectedDevice) === 'North-South'}>
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

                            {selectedDevice.type === 'Server5U' && (
                                <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                    <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">CX8 Network Type</label>
                                    <select value={cx8NetworkType} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'cx8NetworkType', 'type', e.target.value)} className={selectCls}>
                                        <option value="Ethernet">Ethernet / RoCE v2 (綠線)</option>
                                        <option value="InfiniBand">InfiniBand / NDR (橘線)</option>
                                    </select>
                                </div>
                            )}

                            <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                <h3 className="block text-[11px] font-bold text-slate-400 mb-2">網路連線狀態與數量 (Network Ports)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedDevice.type === 'Server5U' && (
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">CX8 孔數</label>
                                            <input type="number" value={getNicCount(selectedDevice, 'cx8p') || 8} disabled className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 opacity-50 cursor-not-allowed" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">BMC 孔數</label>
                                        <input type="number" value={getNicCount(selectedDevice, 'bmc') || 1} disabled className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 opacity-50 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">NS-NIC-1</label>
                                        <input type="number" value={nic1Count} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_1', 'qty', parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">NS-NIC-2</label>
                                        <input type="number" value={nic2Count} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_2', 'qty', parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hardware Specs */}
                {((selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage')) && (
                    <div className={`${sectionCls} mt-0`}>
                        <label className="block text-xs font-bold text-slate-400 mb-3">硬體規格 (Hardware Specs)</label>
                        <div className="grid grid-cols-[64px_1fr_60px] gap-2 mb-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                            <div></div>
                            <div>零組件 (Model)</div>
                            <div className="text-center">數量</div>
                        </div>
                        {HW_SPECS_CONFIG.map(spec => {
                            const currentVal = (selectedDevice.hardwareSpecs || {})[spec.key] || { model: '', qty: '' };
                            return (
                                <div key={spec.key} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                    <div className="text-[10px] font-mono text-slate-500 text-right pr-2">{spec.label}</div>
                                    <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'model', e.target.value)}
                                        className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                    <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                        className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default RightPanel;
