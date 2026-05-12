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

                            {selectedDevice.type === 'Server5U' && (
                                <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                    <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">CX8 Network Type</label>
                                    <select value={cx8NetworkType} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'cx8NetworkType', 'type', e.target.value)} className={selectCls}>
                                        <option value="Ethernet">Ethernet / RoCE v2 (綠線)</option>
                                        <option value="InfiniBand">InfiniBand / NDR (橘線)</option>
                                    </select>
                                </div>
                            )}

                            {['Server5U', 'Server1U', 'Server2U', 'Storage1U', 'Storage2U'].includes(selectedDevice.type) && (() => {
                                const hostCooling = selectedDevice.hardwareSpecs?.cooling?.host || 'AC';
                                const gpuCooling  = selectedDevice.hardwareSpecs?.cooling?.gpu  || 'AC';
                                const is5U = selectedDevice.type === 'Server5U';
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
                                        <div className={`grid ${is5U ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
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
                                            {is5U && (
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

                            <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                <h3 className="block text-[11px] font-bold text-slate-400 mb-2">網路連線狀態與數量 (Network Ports)</h3>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">自訂 NS-NIC-1 名稱</label>
                                        <input type="text" placeholder="NS-NIC-1" value={selectedDevice.hardwareSpecs?.ns_nic_1?.customName || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_1', 'customName', e.target.value)} className={inputCls + " py-1.5 px-2 text-xs"} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1">自訂 NS-NIC-2 名稱</label>
                                        <input type="text" placeholder="NS-NIC-2" value={selectedDevice.hardwareSpecs?.ns_nic_2?.customName || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_2', 'customName', e.target.value)} className={inputCls + " py-1.5 px-2 text-xs"} />
                                    </div>
                                </div>
                                {selectedDevice.type === 'Server2U2N' ? (
                                    <div className="space-y-3">
                                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                                            <div className="text-[10px] font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-1">Node 1 (N1)</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_1?.customName || 'NS-NIC-1'} 數量</label>
                                                    <input type="number" value={getNicCount(selectedDevice, 'ns_nic_1_n1')} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_1_n1', 'qty', parseInt(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_2?.customName || 'NS-NIC-2'} 數量</label>
                                                    <input type="number" value={getNicCount(selectedDevice, 'ns_nic_2_n1')} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_2_n1', 'qty', parseInt(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">BMC 孔數</label>
                                                    <input type="number" value={1} disabled className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-400 opacity-50 cursor-not-allowed" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                                            <div className="text-[10px] font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-1">Node 2 (N2)</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_1?.customName || 'NS-NIC-1'} 數量</label>
                                                    <input type="number" value={getNicCount(selectedDevice, 'ns_nic_1_n2')} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_1_n2', 'qty', parseInt(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_2?.customName || 'NS-NIC-2'} 數量</label>
                                                    <input type="number" value={getNicCount(selectedDevice, 'ns_nic_2_n2')} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_2_n2', 'qty', parseInt(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-slate-500 mb-1">BMC 孔數</label>
                                                    <input type="number" value={1} disabled className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-400 opacity-50 cursor-not-allowed" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
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
                                            <label className="block text-[10px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_1?.customName || 'NS-NIC-1'}</label>
                                            <input type="number" value={nic1Count} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_1', 'qty', parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">{selectedDevice.hardwareSpecs?.ns_nic_2?.customName || 'NS-NIC-2'}</label>
                                            <input type="number" value={nic2Count} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ns_nic_2', 'qty', parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-slate-500 mb-1">Super NIC Mgt <span className="text-slate-600">(最多 2)</span></label>
                                            <input
                                                type="number" min={0} max={2}
                                                value={superNicMgtCount}
                                                onChange={(e) => {
                                                    const v = Math.min(2, Math.max(0, parseInt(e.target.value) || 0));
                                                    handleHardwareSpecChange(selectedDevice.id, 'super_nic_mgt', 'qty', v);
                                                }}
                                                className="w-full bg-slate-900/80 border border-violet-700/60 rounded-lg px-2 py-1.5 text-xs text-violet-300 focus:border-violet-500/60 focus:outline-none" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Switch Configuration */}
                {((selectedDevice.type || '').startsWith('Switch')) && (
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
                                        <input type="number" value={getNicCount(selectedDevice, 'ports') || 48} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'ports', 'qty', parseInt(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] text-slate-400 mb-1">傳輸速率 (Speed)</label>
                                        <input type="text" placeholder="e.g. 400G, 800G" value={(selectedDevice.hardwareSpecs?.speed?.model) || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'speed', 'model', e.target.value)} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hardware Specs */}
                {((selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage')) && (() => {
                    return (
                        <div className={`${sectionCls} mt-0`}>
                        {selectedDevice.type === 'Server2U2N' ? (
                            <>

                                <label className="block text-xs font-bold text-blue-400 mb-3">Node 1 硬體規格</label>
                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 mb-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                    <div></div>
                                    <div>零組件 (Model)</div>
                                    <div className="text-center">數量</div>
                                </div>
                                {HW_SPECS_CONFIG.map(spec => {
                                    const node1Key = `${spec.key}_n1`;
                                    const currentVal = (selectedDevice.hardwareSpecs || {})[node1Key] || { model: '', qty: '' };
                                    return (
                                        <div key={node1Key} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, node1Key, 'model', e.target.value)}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, node1Key, 'qty', parseInt(e.target.value) || '')}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
                                        </div>
                                    );
                                })}

                                <label className="block text-xs font-bold text-blue-400 mt-6 mb-3">Node 2 硬體規格</label>
                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 mb-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                    <div></div>
                                    <div>零組件 (Model)</div>
                                    <div className="text-center">數量</div>
                                </div>
                                {HW_SPECS_CONFIG.map(spec => {
                                    const node2Key = `${spec.key}_n2`;
                                    const currentVal = (selectedDevice.hardwareSpecs || {})[node2Key] || { model: '', qty: '' };
                                    return (
                                        <div key={node2Key} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, node2Key, 'model', e.target.value)}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-700" />
                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, node2Key, 'qty', parseInt(e.target.value) || '')}
                                                className="w-full min-w-0 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500/60 focus:outline-none text-center" />
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
                                    const currentVal = (selectedDevice.hardwareSpecs || {})[spec.key] || { model: '', qty: '' };
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
