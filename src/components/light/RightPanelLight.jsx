import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { LIGHT_THEME_STYLES } from '../../themes/light/lightConstants';
import { HW_SPECS_CONFIG, DEFAULT_RACK_U_COUNT } from '../../utils/constants';
import { getIconByType, getFabricGroup, getNicCount, getSwitchPortCount, getServerCategory, getServerConfig, getHighDensityNodes, getHighDensitySize, getAIServerSize } from '../../utils/helpers';
import { LayoutDashboard, X, Trash2, Info, Copy, Unplug, Cpu, Network, Link2, Server, HardDrive, Zap, Droplets, Weight, Plus, Compass, Thermometer } from 'lucide-react';

const RightPanelLight = () => {
    const { 
        racks, devices, setDevices, selectedId, setSelectedId, selectedIds, setSelectedIds, handleUpdateRack, handleUpdateDevice, handleHardwareSpecChange,
        handleConnectionChange, handleAutoConnectGroup, handleHAAutoConnect, setDeleteRackConfirm, setClearDeviceConfirm, setDeleteDeviceConfirm, showAlert,
        projectInfo
    } = useRackPlanner();

    const selectedRack = racks.find(r => r.id === selectedId);
    const selectedDevice = devices.find(d => d.id === selectedId);

    const formatURange = (startU, size) => {
        if (!startU) return '';
        if (size % 1 !== 0) {
            return `U${startU} (${size}U)`;
        }
        if (size === 1) {
            return `U${startU}`;
        }
        return `U${startU}-U${startU + size - 1}`;
    };

    const renderCablingSubFields = (key, currentVal) => {
        return (
            <div className="col-span-2 ml-4 pl-2 border-l border-slate-200 my-1.5 grid grid-cols-2 gap-2 text-[10px]">
                <div className="col-span-2 text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">網路規格及線路 (Cabling Specs)</div>
                
                <div>
                    <label className="block text-slate-500 mb-0.5">NIC 收發器型號</label>
                    <input type="text" placeholder="Model..." value={currentVal.transceiver_model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'transceiver_model', e.target.value)}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none placeholder:text-slate-400" />
                </div>
                <div>
                    <label className="block text-slate-500 mb-0.5">NIC 收發器數量</label>
                    <input type="number" placeholder="Qty" value={currentVal.transceiver_qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'transceiver_qty', parseInt(e.target.value) || '')}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 text-center focus:outline-none" />
                </div>

                <div>
                    <label className="block text-slate-500 mb-0.5">Switch 收發器型號</label>
                    <input type="text" placeholder="Model..." value={currentVal.sw_transceiver_model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'sw_transceiver_model', e.target.value)}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none placeholder:text-slate-400" />
                </div>
                <div>
                    <label className="block text-slate-500 mb-0.5">Switch 收發器數量</label>
                    <input type="number" placeholder="Qty" value={currentVal.sw_transceiver_qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'sw_transceiver_qty', parseInt(e.target.value) || '')}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 text-center focus:outline-none" />
                </div>

                <div>
                    <label className="block text-slate-500 mb-0.5">線路型號 (Cable Model)</label>
                    <input type="text" placeholder="Model..." value={currentVal.cable_model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'cable_model', e.target.value)}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none placeholder:text-slate-400" />
                </div>
                <div>
                    <label className="block text-slate-500 mb-0.5">線路數量 (Cable Qty)</label>
                    <input type="number" placeholder="Qty" value={currentVal.cable_qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, key, 'cable_qty', parseInt(e.target.value) || '')}
                        className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 text-center focus:outline-none" />
                </div>
            </div>
        );
    };
    
    const availableSwitches = devices.filter(d => (d.type || '').startsWith('Switch') || d.type === 'Router')
        .sort((a, b) => {
            if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
            return (a.customName || '').localeCompare(b.customName || '');
        }).map(sw => {
            const swRack = racks.find(r => r.id === sw.rackId);
            return { ...sw, rackName: swRack ? swRack.name : 'UnknownRack', portCount: getSwitchPortCount(sw) };
        });

    /* ── Input / Select shared style ── */
    const inputCls = "w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-2xs placeholder:text-slate-400 font-medium";
    const selectCls = "w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-2xs font-medium";
    const sectionCls = "space-y-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200";

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
            <aside className="w-[360px] bg-white border-l border-slate-200 p-4 flex flex-col overflow-y-auto z-20 shrink-0 light-scrollbar shadow-xs animate-in slide-in-from-right-4 duration-150">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
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
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">外觀主題 (Theme)</label>
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
                        <label className="block text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1">
                            <Network className="w-3.5 h-3.5 text-cyan-400" /> 批次變更錨點走線與顏色
                        </label>
                        <div className="space-y-3">
                            {/* EW NIC */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-emerald-400">EW NIC 走線與顏色</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableSides: { ...(dev.anchorCableSides || {}), ew_nic: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 EW NIC 走線方向`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇走線方向...</option>
                                       <option value="right">➡️ 右側走線</option>
                                       <option value="left">⬅️ 左側走線</option>
                                    </select>
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableColors: { ...(dev.anchorCableColors || {}), ew_nic: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 EW NIC 線路顏色`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇顏色...</option>
                                       <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                       <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                       <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                       <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                       <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                       <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                       <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                       <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                    </select>
                                </div>
                            </div>

                            {/* PCIe Slot */}
                            <div className="space-y-1 border-t border-slate-200 pt-2.5">
                                <label className="block text-[11px] font-semibold text-amber-400">PCIe Slot 走線與顏色</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableSides: { ...(dev.anchorCableSides || {}), pcie_slot: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 PCIe Slot 走線方向`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇走線方向...</option>
                                       <option value="right">➡️ 右側走線</option>
                                       <option value="left">⬅️ 左側走線</option>
                                    </select>
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableColors: { ...(dev.anchorCableColors || {}), pcie_slot: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 PCIe Slot 線路顏色`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇顏色...</option>
                                       <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                       <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                       <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                       <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                       <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                       <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                       <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                       <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                    </select>
                                </div>
                            </div>

                            {/* S-NIC-M */}
                            <div className="space-y-1 border-t border-slate-200 pt-2.5">
                                <label className="block text-[11px] font-semibold text-purple-400">S-NIC-M 走線與顏色</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableSides: { ...(dev.anchorCableSides || {}), s_nic_m: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 S-NIC-M 走線方向`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇走線方向...</option>
                                       <option value="right">➡️ 右側走線</option>
                                       <option value="left">⬅️ 左側走線</option>
                                    </select>
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableColors: { ...(dev.anchorCableColors || {}), s_nic_m: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 S-NIC-M 線路顏色`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇顏色...</option>
                                       <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                       <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                       <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                       <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                       <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                       <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                       <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                       <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                    </select>
                                </div>
                            </div>

                            {/* BMC */}
                            <div className="space-y-1 border-t border-slate-200 pt-2.5">
                                <label className="block text-[11px] font-semibold text-rose-400">BMC 走線與顏色</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableSides: { ...(dev.anchorCableSides || {}), bmc: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 BMC 走線方向`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇走線方向...</option>
                                       <option value="right">➡️ 右側走線</option>
                                       <option value="left">⬅️ 左側走線</option>
                                    </select>
                                    <select 
                                        value="" 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectedDevices.forEach(dev => {
                                                    handleUpdateDevice(dev.id, {
                                                        anchorCableColors: { ...(dev.anchorCableColors || {}), bmc: e.target.value }
                                                    });
                                                });
                                                showAlert(`已批次修改 BMC 線路顏色`, '成功', 'success');
                                            }
                                        }} 
                                        className={selectCls}
                                    >
                                       <option value="">選擇顏色...</option>
                                       <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                       <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                       <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                       <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                       <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                       <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                       <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                       <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                    </select>
                                </div>
                            </div>
                        </div>
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
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" 
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
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" 
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
                                <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">Host Cooling</label>
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
                                <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">GPU Cooling</label>
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
        const isAisleZone = selectedRack.isZone || selectedRack.type === 'ColdAisleZone' || selectedRack.type === 'HotAisleZone';
        const isCDUOrCooling = projectInfo?.isCdcProject && (selectedRack.type === 'CDU' || selectedRack.type === 'Cooling');
        const isOtherInfra = projectInfo?.isCdcProject && ['UPS', 'Battery', 'Switchboard', 'PowerPanel', 'FireSuppression', 'Monitoring', 'EnvControl'].includes(selectedRack.type);

        return (
            <aside className="w-[360px] bg-white border-l border-slate-200 p-6 flex flex-col overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-20 shrink-0 custom-scrollbar animate-in slide-in-from-right-8 duration-300 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
                        <div className="p-1 bg-indigo-500/15 rounded-lg border border-indigo-500/30">
                            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        {isAisleZone ? '通道設定' : '機櫃設定'}
                    </h2>
                    <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/60" title="關閉面板">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-3 mb-6">
                    <button onClick={() => setDeleteRackConfirm({ isOpen: true, rackId: selectedRack.id })} className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 py-2.5 rounded-xl transition-colors text-sm font-medium border border-rose-500/25 shadow-sm">
                        <Trash2 className="w-4 h-4" /> {isAisleZone ? '刪除通道模組' : '刪除機櫃'}
                    </button>
                </div>

                <div className={sectionCls}>
                    {isAisleZone ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">通道名稱 (Zone Name)</label>
                                <input type="text" value={selectedRack.name} onChange={(e) => handleUpdateRack(selectedRack.id, { name: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                                    風向設定 (Airflow Direction)
                                </label>
                                <select
                                    value={selectedRack.airflowMode || 'down'}
                                    onChange={(e) => handleUpdateRack(selectedRack.id, { airflowMode: e.target.value })}
                                    className={selectCls}
                                >
                                    <option value="up">⬆️ 向上 (Up)</option>
                                    <option value="down">⬇️ 向下 (Down)</option>
                                    <option value="left">⬅️ 向左 (Left)</option>
                                    <option value="right">➡️ 向右 (Right)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                                    通道溫度 (Temperature)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedRack.zoneTemp !== undefined ? selectedRack.zoneTemp : (selectedRack.type === 'ColdAisleZone' ? '22' : '35')}
                                        onChange={(e) => handleUpdateRack(selectedRack.id, { zoneTemp: e.target.value })}
                                        placeholder={selectedRack.type === 'ColdAisleZone' ? '22' : '35'}
                                        className={inputCls}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">°C</span>
                                </div>
                            </div>
                        </>
                    ) : isCDUOrCooling ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">機櫃名稱 (Rack Name)</label>
                                <input type="text" value={selectedRack.name} onChange={(e) => handleUpdateRack(selectedRack.id, { name: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                    解熱能力 (Cooling Capacity - kW)
                                </label>
                                <input 
                                    type="number" 
                                    value={selectedRack.coolingCapacity !== undefined ? selectedRack.coolingCapacity / 1000 : 0} 
                                    onChange={(e) => handleUpdateRack(selectedRack.id, { coolingCapacity: parseFloat(e.target.value) * 1000 || 0 })} 
                                    className={`${inputCls} font-mono`} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    設備重量 (Weight - KG)
                                </label>
                                <input 
                                    type="number" 
                                    value={selectedRack.weight !== undefined ? selectedRack.weight : 0} 
                                    onChange={(e) => handleUpdateRack(selectedRack.id, { weight: parseFloat(e.target.value) || 0 })} 
                                    className={`${inputCls} font-mono`} 
                                />
                            </div>
                        </>
                    ) : isOtherInfra ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">機櫃名稱 (Rack Name)</label>
                                <input type="text" value={selectedRack.name} onChange={(e) => handleUpdateRack(selectedRack.id, { name: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    設備重量 (Weight - KG)
                                </label>
                                <input 
                                    type="number" 
                                    value={selectedRack.weight !== undefined ? selectedRack.weight : 0} 
                                    onChange={(e) => handleUpdateRack(selectedRack.id, { weight: parseFloat(e.target.value) || 0 })} 
                                    className={`${inputCls} font-mono`} 
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">機櫃名稱 (Rack Name)</label>
                                <input type="text" value={selectedRack.name} onChange={(e) => handleUpdateRack(selectedRack.id, { name: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">機櫃類型 (Rack Type)</label>
                                <select value={selectedRack.type || 'General'} onChange={(e) => handleUpdateRack(selectedRack.id, { type: e.target.value })} className={selectCls}>
                                    <option value="General">General (泛用型)</option>
                                    <option value="ORv3">ORv3 (開放運算計畫)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">總 U 數 (Rack U)</label>
                                <input type="number" value={selectedRack.uCount || DEFAULT_RACK_U_COUNT} onChange={(e) => handleUpdateRack(selectedRack.id, { uCount: parseInt(e.target.value) || 1 })} disabled={selectedRack.type === 'ORv3'} className={`${inputCls} font-mono disabled:opacity-40 disabled:cursor-not-allowed`} />
                                {selectedRack.type === 'ORv3' && <p className="text-[10px] text-slate-500 mt-1">ORv3 規格固定為 44U</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
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
                            {/* Rack attachments for MSFT */}
                            {projectInfo?.designType === 'msft' && (
                                <div className="col-span-2 pt-2 border-t border-slate-200/50 mt-2">
                                    <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                        機櫃附屬設備設定 (BOM Sub-items)
                                    </label>
                                    <div className="space-y-4 bg-white/60 p-3 rounded-lg border border-slate-200">
                                        {/* Item 1 */}
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Item 1</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { key: 'rackEnclosure', label: 'Rack enclosure' },
                                                    { key: 'busbar', label: 'Busbar' },
                                                    { key: 'sidePanel', label: 'Side Panel' },
                                                    { key: 'leakManagement', label: 'Leak Management' }
                                                ].map(sub => (
                                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedRack[sub.key]}
                                                            onChange={(e) => handleUpdateRack(selectedRack.id, { [sub.key]: e.target.checked })}
                                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-slate-700">{sub.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Item 6 */}
                                        <div className="pt-2 border-t border-slate-200/40">
                                            <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Item 6</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { key: 'cableManagement', label: 'Cable Management' },
                                                    { key: 'rackNut', label: 'NUT' },
                                                    { key: 'rackScrew', label: 'SCREW' }
                                                ].map(sub => (
                                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedRack[sub.key]}
                                                            onChange={(e) => handleUpdateRack(selectedRack.id, { [sub.key]: e.target.checked })}
                                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-slate-700">{sub.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Item 8 */}
                                        <div className="pt-2 border-t border-slate-200/40">
                                            <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Item 8</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { key: 'ioCables', label: 'IO Cables' },
                                                    { key: 'cat6Rj45', label: 'CAT-6 RJ45' },
                                                    { key: 'rackGrounding', label: 'Rack Grounding' }
                                                ].map(sub => (
                                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedRack[sub.key]}
                                                            onChange={(e) => handleUpdateRack(selectedRack.id, { [sub.key]: e.target.checked })}
                                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-slate-700">{sub.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Fields List */}
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                                自訂附屬設備 (Custom Sub-items)
                                            </label>
                                            <div className="space-y-2">
                                                {(selectedRack.rackCustom || ['']).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => {
                                                                const newCustom = [...(selectedRack.rackCustom || [''])];
                                                                newCustom[idx] = e.target.value;
                                                                handleUpdateRack(selectedRack.id, { rackCustom: newCustom });
                                                            }}
                                                            placeholder="自行輸入設備名稱..."
                                                            className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = [...(selectedRack.rackCustom || ['']), ''];
                                                                    handleUpdateRack(selectedRack.id, { rackCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                                title="新增欄位"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                            {(selectedRack.rackCustom || ['']).length > 1 && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newCustom = (selectedRack.rackCustom || ['']).filter((_, i) => i !== idx);
                                                                        handleUpdateRack(selectedRack.id, { rackCustom: newCustom });
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                    title="刪除"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        );
    }

    const SelectedIcon = getIconByType(selectedDevice.type);
    const tStyle = LIGHT_THEME_STYLES[selectedDevice.theme] || LIGHT_THEME_STYLES.slate;
    const isSwitchOrRouter = (selectedDevice.type || '').startsWith('Switch') || selectedDevice.type === 'Router';

    const nic1Count = getNicCount(selectedDevice, 'ns_nic_1');
    const nic2Count = getNicCount(selectedDevice, 'ns_nic_2');
    const superNicMgtCount = getNicCount(selectedDevice, 'super_nic_mgt', projectInfo?.designType);
    const cx8NetworkType = selectedDevice.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';

    const handleDragStartClone = (e) => {
        let draggingDevice = { ...selectedDevice, name: selectedDevice.customName };
        e.dataTransfer.setData('device', JSON.stringify(draggingDevice));
        e.dataTransfer.setData('isClone', "true");
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    return (
        <aside className="w-[360px] bg-white border-l border-slate-200 p-6 flex flex-col overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.5)] z-20 shrink-0 custom-scrollbar animate-in slide-in-from-right-8 duration-300 backdrop-blur-md">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
                    <div className="p-1 bg-slate-700/60 rounded-lg border border-slate-600/50">
                        <Info className="w-3.5 h-3.5 text-slate-500" />
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
                        <div className="text-slate-500 text-xs font-mono mt-0.5">{selectedDevice.type === 'SideCDU' ? 'Full Rack' : `${selectedDevice.size}U`} · {selectedDevice.type}</div>
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
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">設備名稱</label>
                        <input type="text" value={selectedDevice.customName} onChange={(e) => handleUpdateDevice(selectedDevice.id, { customName: e.target.value })} className={inputCls} />
                    </div>
                    {selectedDevice.type === 'Blank' ? (
                        <>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5">擋板設定 (U數)</label>
                                <select
                                    value={selectedDevice.size || 1}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseFloat(e.target.value) })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-all shadow-inner font-mono"
                                >
                                    <option value={0.5}>0.5U</option>
                                    <option value={1}>1U</option>
                                    <option value={1.5}>1.5U</option>
                                    <option value={2}>2U</option>
                                    <option value={2.5}>2.5U</option>
                                    <option value={3}>3U</option>
                                    <option value={3.5}>3.5U</option>
                                    <option value={4}>4U</option>
                                </select>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">所在實體位置</label>
                                <div className="w-full bg-white/40 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 cursor-not-allowed font-mono flex justify-between">
                                    <span>{racks.find(r => r.id === selectedDevice.rackId)?.name}</span>
                                    <span>{selectedDevice.type === 'SideCDU' ? 'SideCar' : formatURange(selectedDevice.startU, selectedDevice.size)}</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1">
                                    <Weight className="w-3.5 h-3.5 text-sky-400" /> 設備重量 (Weight - KG)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.weight !== undefined ? selectedDevice.weight : 10}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all font-mono"
                                    placeholder="預設為 10 KG..."
                                />
                            </div>
                        </>
                    ) : selectedDevice.type === 'UPS' ? (
                        <>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">所在實體位置</label>
                                <div className="w-full bg-white/40 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 cursor-not-allowed font-mono flex justify-between">
                                    <span>{racks.find(r => r.id === selectedDevice.rackId)?.name}</span>
                                    <span>{formatURange(selectedDevice.startU, selectedDevice.size)}</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5">UPS 設定 (U數)</label>
                                <select
                                    value={selectedDevice.size || 2}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseInt(e.target.value) })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-all shadow-inner font-mono"
                                >
                                    <option value={1}>1U</option>
                                    <option value={2}>2U</option>
                                    <option value={3}>3U</option>
                                    <option value={4}>4U</option>
                                    <option value={5}>5U</option>
                                </select>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1">
                                    <Weight className="w-3.5 h-3.5 text-sky-400" /> 設備重量 (Weight - KG)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.weight !== undefined ? selectedDevice.weight : 30}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all font-mono"
                                    placeholder="預設為 30 KG..."
                                />
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                                    <Zap className="w-3.5 h-3.5 text-amber-400" /> 電池容量 (Battery Capacity - Wh)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.batteryCapacity !== undefined ? selectedDevice.batteryCapacity : 0}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { batteryCapacity: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                                    placeholder="請輸入電池容量 (Wh)..."
                                />
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1">
                                    <Network className="w-3.5 h-3.5 text-cyan-400" /> BMC 網路管理埠
                                </label>
                                <div className="bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedDevice.hardwareSpecs?.bmc?.qty === 1}
                                            onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'bmc', 'qty', e.target.checked ? 1 : 0)}
                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                        />
                                        <span className="text-[11px] text-slate-700">啟用 BMC 網路孔</span>
                                    </label>
                                    {selectedDevice.hardwareSpecs?.bmc?.qty === 1 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                            {renderCablingSubFields('bmc', selectedDevice.hardwareSpecs?.bmc || {})}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (selectedDevice.type === 'PowerShelf' || selectedDevice.type === 'PDU') ? (
                        <>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">所在實體位置</label>
                                <div className="w-full bg-white/40 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 cursor-not-allowed font-mono flex justify-between">
                                    <span>{racks.find(r => r.id === selectedDevice.rackId)?.name}</span>
                                    <span>{formatURange(selectedDevice.startU, selectedDevice.size)}</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5">設備設定 (U數)</label>
                                <select
                                    value={selectedDevice.size || 1}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-all shadow-inner font-mono"
                                >
                                    <option value={1}>1U</option>
                                    <option value={2}>2U</option>
                                    <option value={3}>3U</option>
                                    <option value={4}>4U</option>
                                    <option value={5}>5U</option>
                                </select>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1">
                                    <Weight className="w-3.5 h-3.5 text-sky-400" /> 設備重量 (Weight - KG)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.weight !== undefined ? selectedDevice.weight : (selectedDevice.type === 'PowerShelf' ? 15 : 5)}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all font-mono"
                                    placeholder="請輸入設備重量..."
                                />
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                                    <Zap className="w-3.5 h-3.5 text-amber-400" /> 可提供電力瓦數 (Provided Power - W)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.powerProvided !== undefined ? selectedDevice.powerProvided : (selectedDevice.power || 0)}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        handleUpdateDevice(selectedDevice.id, { powerProvided: val, power: val });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                                    placeholder="請輸入可提供電力瓦數 (W)..."
                                />
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1">
                                    <Network className="w-3.5 h-3.5 text-cyan-400" /> BMC 網路孔與 Cable 設定
                                </label>
                                <div className="bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedDevice.hardwareSpecs?.bmc?.qty === 1}
                                            onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'bmc', 'qty', e.target.checked ? 1 : 0)}
                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                        />
                                        <span className="text-[11px] text-slate-700">啟用 BMC 網路孔</span>
                                    </label>
                                    {selectedDevice.hardwareSpecs?.bmc?.qty === 1 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                            {renderCablingSubFields('bmc', selectedDevice.hardwareSpecs?.bmc || {})}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1">
                                    <Network className="w-3.5 h-3.5 text-cyan-400" /> 錨點走線通道與顏色設定
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-rose-400">BMC 走線與顏色</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={selectedDevice.anchorCableSides?.bmc || 'right'}
                                                onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                    anchorCableSides: { ...(selectedDevice.anchorCableSides || {}), bmc: e.target.value }
                                                })}
                                                className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60"
                                            >
                                                <option value="right">➡️ 右側走線</option>
                                                <option value="left">⬅️ 左側走線</option>
                                            </select>
                                            <select
                                                value={selectedDevice.anchorCableColors?.bmc || '#60a5fa'}
                                                onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                    anchorCableColors: { ...(selectedDevice.anchorCableColors || {}), bmc: e.target.value }
                                                })}
                                                className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60 font-medium"
                                                style={{ color: selectedDevice.anchorCableColors?.bmc || '#60a5fa' }}
                                            >
                                                <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                                <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                                <option value="#60a5fa" style={{ color: '#60a5fa' }}>💙 天藍色 (預設)</option>
                                                <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                                <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                                <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                                <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                                <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                                <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-4">
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-emerald-400 mb-1.5">拓撲群組 (Topology Group)</label>
                                <input type="text" value={selectedDevice.topologyGroup || racks.find(r => r.id === selectedDevice.rackId)?.name || ''} onChange={(e) => handleUpdateDevice(selectedDevice.id, { topologyGroup: e.target.value })} placeholder="預設為所在機櫃名稱"
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner placeholder:text-slate-400" />
                            </div>
                            {isSwitchOrRouter && (
                                <>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">網路用途 (Fabric Group)</label>
                                        {projectInfo?.designType === 'msft' ? (
                                            <div className="w-full bg-slate-50 border-slate-200 text-slate-800 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 font-semibold">
                                                North-South Fabric (南北向/融合/管理網路)
                                            </div>
                                        ) : (
                                            <select value={getFabricGroup(selectedDevice, projectInfo?.designType)} onChange={(e) => handleUpdateDevice(selectedDevice.id, { fabricGroup: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner">
                                                <option value="East-West">East-West Fabric (東西向/運算網路)</option>
                                                <option value="North-South">North-South Fabric (南北向/融合/管理網路)</option>
                                            </select>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-bold text-purple-400 mb-1.5">網路角色 (Network Role)</label>
                                        <select value={selectedDevice.networkRole || (selectedDevice.type === 'Router' || selectedDevice.type === 'Switch800G' ? 'Spine' : 'Leaf')} onChange={(e) => handleUpdateDevice(selectedDevice.id, { networkRole: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-inner">
                                            <option value="Spine">Spine Layer (核心骨幹層)</option>
                                            <option value="Leaf">Leaf Layer (邊緣存取層)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="col-span-2 border-t border-slate-200/50 pt-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">所在實體位置</label>
                                <div className="w-full bg-white/40 border border-slate-200 rounded-lg p-2 text-sm text-slate-500 cursor-not-allowed font-mono flex justify-between">
                                    <span>{racks.find(r => r.id === selectedDevice.rackId)?.name}</span>
                                    <span>{selectedDevice.type === 'SideCDU' ? 'SideCar' : formatURange(selectedDevice.startU, selectedDevice.size)}</span>
                                </div>
                            </div>
                            <div className="col-span-2 border-t border-slate-200/50 pt-4">
                                <label className="block text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1">
                                    <Weight className="w-3.5 h-3.5 text-sky-400" /> 設備重量 (Weight - KG)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedDevice.weight !== undefined ? selectedDevice.weight : 10}
                                    onChange={(e) => handleUpdateDevice(selectedDevice.id, { weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all font-mono"
                                    placeholder="預設為 10 KG..."
                                />
                            </div>
                            {(() => {
                                const hasEwNicCable = getServerCategory(selectedDevice) === 'AI' && projectInfo?.designType !== 'msft';
                                const hasPcieCable = (selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage');
                                const hasSNicCable = (selectedDevice.type || '').startsWith('Server') && projectInfo?.designType !== 'msft';
                                const hasBmcCable = (selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage') || selectedDevice.hardwareSpecs?.bmc?.qty === 1 || ['CDU4U', 'SideCDU', 'CDU', 'UPS', 'PowerShelf', 'PDU'].includes(selectedDevice.type);
                                const showAnchorSettings = hasEwNicCable || hasPcieCable || hasSNicCable || hasBmcCable;

                                if (!showAnchorSettings) return null;

                                return (
                                    <div className="col-span-2 border-t border-slate-200/50 pt-4">
                                        <label className="block text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1">
                                            <Network className="w-3.5 h-3.5 text-cyan-400" /> 錨點走線通道與顏色設定
                                        </label>
                                        <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                            {/* EW NIC - Only for GPU/AI Servers */}
                                            {hasEwNicCable && (
                                                <div className="space-y-1">
                                                    <label className="block text-[11px] font-semibold text-emerald-400">EW NIC 走線與顏色</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={selectedDevice.anchorCableSides?.ew_nic || 'right'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableSides: { ...(selectedDevice.anchorCableSides || {}), ew_nic: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60"
                                                        >
                                                            <option value="right">➡️ 右側走線</option>
                                                            <option value="left">⬅️ 左側走線</option>
                                                        </select>
                                                        <select
                                                            value={selectedDevice.anchorCableColors?.ew_nic || '#22c55e'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableColors: { ...(selectedDevice.anchorCableColors || {}), ew_nic: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60 font-medium"
                                                            style={{ color: selectedDevice.anchorCableColors?.ew_nic || '#22c55e' }}
                                                        >
                                                            <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠 (預設)</option>
                                                            <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                                            <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                                            <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                                            <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                                            <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                                            <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                                            <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* PCIe Slot - Only for Servers & Storage Devices */}
                                            {hasPcieCable && (
                                                <div className={`space-y-1 ${hasEwNicCable ? 'border-t border-slate-200 pt-2.5' : ''}`}>
                                                    <label className="block text-[11px] font-semibold text-amber-400">PCIe Slot 走線與顏色</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={selectedDevice.anchorCableSides?.pcie_slot || 'right'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableSides: { ...(selectedDevice.anchorCableSides || {}), pcie_slot: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60"
                                                        >
                                                            <option value="right">➡️ 右側走線</option>
                                                            <option value="left">⬅️ 左側走線</option>
                                                        </select>
                                                        <select
                                                            value={selectedDevice.anchorCableColors?.pcie_slot || '#facc15'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableColors: { ...(selectedDevice.anchorCableColors || {}), pcie_slot: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60 font-medium"
                                                            style={{ color: selectedDevice.anchorCableColors?.pcie_slot || '#facc15' }}
                                                        >
                                                            <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                                            <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                                            <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色 (預設)</option>
                                                            <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                                            <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                                            <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                                            <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                                            <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* S-NIC-M - Only for Servers */}
                                            {hasSNicCable && (
                                                <div className={`space-y-1 ${(hasEwNicCable || hasPcieCable) ? 'border-t border-slate-200 pt-2.5' : ''}`}>
                                                    <label className="block text-[11px] font-semibold text-purple-400">S-NIC-M 走線與顏色</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={selectedDevice.anchorCableSides?.s_nic_m || 'right'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableSides: { ...(selectedDevice.anchorCableSides || {}), s_nic_m: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60"
                                                        >
                                                            <option value="right">➡️ 右側走線</option>
                                                            <option value="left">⬅️ 左側走線</option>
                                                        </select>
                                                        <select
                                                            value={selectedDevice.anchorCableColors?.s_nic_m || '#a855f7'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableColors: { ...(selectedDevice.anchorCableColors || {}), s_nic_m: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60 font-medium"
                                                            style={{ color: selectedDevice.anchorCableColors?.s_nic_m || '#a855f7' }}
                                                        >
                                                            <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                                            <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍</option>
                                                            <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                                            <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                                            <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭 (預設)</option>
                                                            <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                                            <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                                            <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* BMC */}
                                            {hasBmcCable && (
                                                <div className={`space-y-1 ${(hasEwNicCable || hasPcieCable || hasSNicCable) ? 'border-t border-slate-200 pt-2.5' : ''}`}>
                                                    <label className="block text-[11px] font-semibold text-rose-400">BMC 走線與顏色</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={selectedDevice.anchorCableSides?.bmc || 'right'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableSides: { ...(selectedDevice.anchorCableSides || {}), bmc: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60"
                                                        >
                                                            <option value="right">➡️ 右側走線</option>
                                                            <option value="left">⬅️ 左側走線</option>
                                                        </select>
                                                        <select
                                                            value={selectedDevice.anchorCableColors?.bmc || '#60a5fa'}
                                                            onChange={(e) => handleUpdateDevice(selectedDevice.id, {
                                                                anchorCableColors: { ...(selectedDevice.anchorCableColors || {}), bmc: e.target.value }
                                                            })}
                                                            className="w-full bg-white border-slate-200 text-slate-800 border border-slate-200 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/60 font-medium"
                                                            style={{ color: selectedDevice.anchorCableColors?.bmc || '#60a5fa' }}
                                                        >
                                                            <option value="#22c55e" style={{ color: '#22c55e' }}>🟢 翡翠綠</option>
                                                            <option value="#3b82f6" style={{ color: '#3b82f6' }}>🔵 天空藍 (預設)</option>
                                                            <option value="#60a5fa" style={{ color: '#60a5fa' }}>💙 天藍色 (預設)</option>
                                                            <option value="#facc15" style={{ color: '#facc15' }}>🟡 亮黃色</option>
                                                            <option value="#ef4444" style={{ color: '#ef4444' }}>🔴 珊瑚紅</option>
                                                            <option value="#a855f7" style={{ color: '#a855f7' }}>🟣 紫羅蘭</option>
                                                            <option value="#ec4899" style={{ color: '#ec4899' }}>🌸 玫瑰粉</option>
                                                            <option value="#22d3ee" style={{ color: '#22d3ee' }}>🩵 青翠藍</option>
                                                            <option value="#f97316" style={{ color: '#f97316' }}>🟠 活力橘</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Power / Price / Ports */}
                {((selectedDevice.type || '').startsWith('Server') || (selectedDevice.type || '').startsWith('Storage')) && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3"/> 設備功耗 (W)</label>
                                <input type="number" value={selectedDevice.power || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { power: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3 h-3"/> 設備報價 (USD)</label>
                                <input type="number" value={selectedDevice.price || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { price: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" />
                            </div>

                            {(getServerCategory(selectedDevice) !== null || (selectedDevice.type || '').startsWith('Storage')) && (() => {
                                const cat = getServerCategory(selectedDevice);
                                const isStorage = (selectedDevice.type || '').startsWith('Storage');
                                const currentConfig = isStorage ? (selectedDevice.storageConfig || `${selectedDevice.size || 2}U`) : getServerConfig(selectedDevice);
                                const handleConfigChange = (option) => {
                                    if (isStorage) {
                                        const newSize = parseInt(option) || 2;
                                        handleUpdateDevice(selectedDevice.id, {
                                            storageConfig: option,
                                            size: newSize,
                                            power: newSize === 1 ? 200 : (newSize === 2 ? 400 : 800)
                                        });
                                    } else {
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
                                    }
                                };

                                return (
                                    <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                        <label className="block text-[11px] font-bold text-indigo-400 mb-1.5 flex items-center gap-1">
                                            {isStorage ? <HardDrive className="w-3 h-3"/> : <Server className="w-3 h-3"/>}
                                            {isStorage ? '儲存伺服器設定 (Storage Config)' : '伺服器設定 (Server Config)'}
                                        </label>
                                        <select value={currentConfig || ''} onChange={(e) => handleConfigChange(e.target.value)} className={selectCls}>
                                            {isStorage && (
                                                <>
                                                    <option value="1U">1U</option>
                                                    <option value="2U">2U</option>
                                                    <option value="4U">4U</option>
                                                </>
                                            )}
                                            {!isStorage && cat === 'General' && (
                                                <>
                                                    <option value="1U">1U</option>
                                                    <option value="2U">2U</option>
                                                    <option value="3U">3U</option>
                                                    <option value="4U">4U</option>
                                                </>
                                            )}
                                            {!isStorage && cat === 'HighDensity' && (
                                                <>
                                                    <option value="1U1N">1U1N</option>
                                                    <option value="1U2N">1U2N</option>
                                                    <option value="2U1N">2U1N</option>
                                                    <option value="2U2N">2U2N</option>
                                                    <option value="2U4N">2U4N</option>
                                                </>
                                            )}
                                            {!isStorage && cat === 'AI' && (
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

                            {getServerCategory(selectedDevice) === 'AI' && projectInfo?.designType !== 'msft' && (
                                <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                    <label className="block text-[11px] font-bold text-indigo-400 mb-1.5">EW NIC Network Type</label>
                                    <select value={cx8NetworkType} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'cx8NetworkType', 'type', e.target.value)} className={selectCls}>
                                        <option value="Ethernet">Ethernet / RoCE v2 (綠線)</option>
                                        <option value="InfiniBand">InfiniBand / NDR (橘線)</option>
                                    </select>
                                </div>
                            )}

                            {(['Server5U', 'Server1U', 'Server2U', 'StorageServer', 'StorageJBOD', 'StorageJBOF', 'ServerGeneral', 'ServerHighDensity', 'ServerAI'].includes(selectedDevice.type) || getServerCategory(selectedDevice) !== null) && (() => {
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
                                    <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                        <label className="block text-[11px] font-bold text-cyan-400 mb-3 flex items-center gap-1.5">
                                            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                                            Cooling Configuration
                                        </label>
                                        <div className={`grid ${isAI ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">Host Cooling</label>
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
                                                    <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">GPU Cooling</label>
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
                                 <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                     <h3 className="block text-[11px] font-bold text-slate-500 mb-2">網路連線狀態與數量 (Network Ports)</h3>
                                     <div className="grid grid-cols-2 gap-3">
                                         {getServerCategory(selectedDevice) === 'AI' && projectInfo?.designType !== 'msft' && (() => {
                                             const currentVal = selectedDevice.hardwareSpecs?.cx8p || {};
                                             const qty = currentVal.qty !== undefined ? currentVal.qty : 8;
                                             return (
                                                 <div className="col-span-2 bg-white/40 p-2.5 rounded-lg border border-indigo-950/40 mt-1">
                                                     <div className="mb-2">
                                                         <label className="block text-[10px] text-slate-500 mb-1">EW NIC 數量</label>
                                                         <input
                                                             type="number"
                                                             min={0}
                                                             value={qty}
                                                             onChange={(e) => {
                                                                 const val = parseInt(e.target.value);
                                                                 const v = Math.max(0, isNaN(val) ? 0 : val);
                                                                 handleHardwareSpecChange(selectedDevice.id, 'cx8p', 'qty', v);
                                                             }}
                                                             className="w-full bg-white border border-indigo-700/60 rounded-lg px-2 py-1.5 text-xs text-indigo-300 focus:border-indigo-500/60 focus:outline-none" />
                                                     </div>
                                                     {qty > 0 && renderCablingSubFields('cx8p', currentVal)}
                                                 </div>
                                             );
                                         })()}
                                         <div className="col-span-2">
                                             {(() => {
                                                 const currentVal = selectedDevice.hardwareSpecs?.bmc || {};
                                                 return (
                                                     <div className="bg-white/40 p-2.5 rounded-lg border border-red-950/30 mt-1">
                                                         <div className="mb-2">
                                                             <label className="block text-[10px] text-slate-500 mb-1">BMC 網路孔數量 <span className="text-slate-600">(固定 1 埠)</span></label>
                                                             <input
                                                                 type="number" value={1} disabled
                                                                 className="w-full bg-slate-50 border-slate-200 text-slate-800 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-500 cursor-not-allowed focus:outline-none" />
                                                         </div>
                                                         {renderCablingSubFields('bmc', currentVal)}
                                                     </div>
                                                 );
                                             })()}
                                         </div>
                                          {projectInfo?.designType !== 'msft' && (
                                         <div className="col-span-2">
                                             {(() => {
                                                 const isGeneral = getServerCategory(selectedDevice) === 'General';
                                                 const pcieSlotQty = selectedDevice.hardwareSpecs?.pcieSlotQty?.qty || 2;
                                                 const maxSuperNicMgt = isGeneral ? pcieSlotQty : 2;
                                                 const currentVal = selectedDevice.hardwareSpecs?.super_nic_mgt || {};
                                                 return (
                                                     <div className="bg-white/40 p-2.5 rounded-lg border border-violet-950/40 mt-1">
                                                         <div className="mb-2">
                                                             <label className="block text-[10px] text-slate-500 mb-1">Super NIC Mgt <span className="text-slate-600">(最多 {maxSuperNicMgt})</span></label>
                                                             <input
                                                                 type="number" min={0} max={maxSuperNicMgt}
                                                                 value={superNicMgtCount}
                                                                 onChange={(e) => {
                                                                     const v = Math.min(maxSuperNicMgt, Math.max(0, parseInt(e.target.value) || 0));
                                                                     handleHardwareSpecChange(selectedDevice.id, 'super_nic_mgt', 'qty', v);
                                                                 }}
                                                                 className="w-full bg-white border border-violet-700/60 rounded-lg px-2 py-1.5 text-xs text-violet-300 focus:border-violet-500/60 focus:outline-none" />
                                                         </div>
                                                         {superNicMgtCount > 0 && renderCablingSubFields('super_nic_mgt', currentVal)}
                                                     </div>
                                                 );
                                             })()}
                                         </div>
                                          )}
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                )}

                {/* ServerGeneral MSFT Configuration */}
                {selectedDevice.type === 'ServerGeneral' && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    附屬設備設定 (BOM Sub-items)
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    {/* Checkbox Group */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'computeNode', label: 'Compute Node' },
                                            { key: 'slideRailForNode', label: 'Slide Rail for Node' },
                                            { key: 'screwForNodeRail', label: 'Screw for Node Rail' },
                                            { key: 'nutForNodeRail', label: 'NUT for Node Rail' }
                                        ].map(sub => (
                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                    className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-700">{sub.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Custom Fields List */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            自訂附屬設備 (Custom Sub-items)
                                        </label>
                                        <div className="space-y-2">
                                            {(selectedDevice.serverGeneralCustom || ['']).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newCustom = [...(selectedDevice.serverGeneralCustom || [''])];
                                                            newCustom[idx] = e.target.value;
                                                            handleUpdateDevice(selectedDevice.id, { serverGeneralCustom: newCustom });
                                                        }}
                                                        placeholder="自行輸入設備名稱..."
                                                        className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newCustom = [...(selectedDevice.serverGeneralCustom || ['']), ''];
                                                                handleUpdateDevice(selectedDevice.id, { serverGeneralCustom: newCustom });
                                                            }}
                                                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                            title="新增欄位"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(selectedDevice.serverGeneralCustom || ['']).length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = (selectedDevice.serverGeneralCustom || ['']).filter((_, i) => i !== idx);
                                                                    handleUpdateDevice(selectedDevice.id, { serverGeneralCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Switch MSFT Configuration */}
                {selectedDevice.type.startsWith('Switch') && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Mutually Exclusive Checkboxes for Switch Tag */}
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    交換器標籤 (Switch Tag - 二選一)
                                </label>
                                <div className="flex gap-4 bg-white/60 p-2.5 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedDevice.switchTag === 'tor'}
                                            onChange={() => handleUpdateDevice(selectedDevice.id, { switchTag: 'tor' })}
                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">TOR Switch</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedDevice.switchTag === 'mgmt'}
                                            onChange={() => handleUpdateDevice(selectedDevice.id, { switchTag: 'mgmt' })}
                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Management Switch</span>
                                    </label>
                                </div>
                            </div>

                            {/* Sub-items block depending on switchTag */}
                            {selectedDevice.switchTag && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                        附屬設備設定 (BOM Sub-items)
                                    </label>
                                    <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                        {/* Checkbox Group */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {selectedDevice.switchTag === 'tor' ? (
                                                [
                                                    { key: 'tor', label: 'TOR' },
                                                    { key: 'eiaAdapter2U', label: 'EIA 19” Adapter 2U' },
                                                    { key: 'mountingKitTor', label: 'Mounting kit for TOR' },
                                                    { key: 'powerCordTor', label: 'Power cord for TOR' },
                                                    { key: 'sleeveC13', label: 'Sleeve C13' }
                                                ].map(sub => (
                                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                            onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-slate-700">{sub.label}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                [
                                                    { key: 'managementSwitch', label: 'Management Switch' },
                                                    { key: 'eiaAdapter1U', label: 'EIA 19” Adapter 1U' },
                                                    { key: 'mountingKitMgmt', label: 'Mounting kit for MGMT' },
                                                    { key: 'powerCordMgmt', label: 'Power cord for MGMT' },
                                                    { key: 'sleeveC13', label: 'Sleeve C13' }
                                                ].map(sub => (
                                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                            onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                            className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-slate-700">{sub.label}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>

                                        {/* Custom Fields List */}
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                                自訂附屬設備 (Custom Sub-items)
                                            </label>
                                            <div className="space-y-2">
                                                {(selectedDevice.switchCustom || ['']).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => {
                                                                const newCustom = [...(selectedDevice.switchCustom || [''])];
                                                                newCustom[idx] = e.target.value;
                                                                handleUpdateDevice(selectedDevice.id, { switchCustom: newCustom });
                                                            }}
                                                            placeholder="自行輸入設備名稱..."
                                                            className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = [...(selectedDevice.switchCustom || ['']), ''];
                                                                    handleUpdateDevice(selectedDevice.id, { switchCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                                title="新增欄位"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                            {(selectedDevice.switchCustom || ['']).length > 1 && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newCustom = (selectedDevice.switchCustom || ['']).filter((_, i) => i !== idx);
                                                                        handleUpdateDevice(selectedDevice.id, { switchCustom: newCustom });
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                    title="刪除"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Power Shelf MSFT Configuration */}
                {selectedDevice.type === 'PowerShelf' && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    附屬設備設定 (BOM Sub-items)
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Item 3</div>
                                    {/* Checkbox Group */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'powerShelfKit', label: 'Power Shelf Kit' },
                                            { key: 'powerShelfEnclosure', label: 'Power Shelf Enclosure' },
                                            { key: 'powerSupplyUnit', label: 'Power Supply Unit' },
                                            { key: 'railForPowerShelf', label: 'Rail for Power shelf' },
                                            { key: 'rackScm', label: 'Rack-SCM' },
                                            { key: 'c13Module', label: 'C-13 Module' },
                                            { key: 'psuFiller', label: 'PSU filler' }
                                        ].map(sub => (
                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                    className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-700">{sub.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Custom Fields List */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            自訂附屬設備 (Custom Sub-items)
                                        </label>
                                        <div className="space-y-2">
                                            {(selectedDevice.powerShelfCustom || ['']).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newCustom = [...(selectedDevice.powerShelfCustom || [''])];
                                                            newCustom[idx] = e.target.value;
                                                            handleUpdateDevice(selectedDevice.id, { powerShelfCustom: newCustom });
                                                        }}
                                                        placeholder="自行輸入設備名稱..."
                                                        className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newCustom = [...(selectedDevice.powerShelfCustom || ['']), ''];
                                                                handleUpdateDevice(selectedDevice.id, { powerShelfCustom: newCustom });
                                                            }}
                                                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                            title="新增欄位"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(selectedDevice.powerShelfCustom || ['']).length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = (selectedDevice.powerShelfCustom || ['']).filter((_, i) => i !== idx);
                                                                    handleUpdateDevice(selectedDevice.id, { powerShelfCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Blank Spacer MSFT Configuration */}
                {selectedDevice.type === 'Blank' && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    附屬設備設定 (BOM Sub-items)
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Item 7</div>
                                    {/* Checkbox Group */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'oneOu', label: '1OU' },
                                            { key: 'ouEia', label: 'OU-EIA' }
                                        ].map(sub => (
                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                    className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-700">{sub.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Custom Fields List */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            自訂附屬設備 (Custom Sub-items)
                                        </label>
                                        <div className="space-y-2">
                                            {(selectedDevice.blankCustom || ['']).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newCustom = [...(selectedDevice.blankCustom || [''])];
                                                            newCustom[idx] = e.target.value;
                                                            handleUpdateDevice(selectedDevice.id, { blankCustom: newCustom });
                                                        }}
                                                        placeholder="自行輸入設備名稱..."
                                                        className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newCustom = [...(selectedDevice.blankCustom || ['']), ''];
                                                                handleUpdateDevice(selectedDevice.id, { blankCustom: newCustom });
                                                            }}
                                                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                            title="新增欄位"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(selectedDevice.blankCustom || ['']).length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = (selectedDevice.blankCustom || ['']).filter((_, i) => i !== idx);
                                                                    handleUpdateDevice(selectedDevice.id, { blankCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Storage JBOD MSFT Configuration */}
                {selectedDevice.type === 'StorageJBOD' && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    附屬設備設定 (BOM Sub-items)
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Item 9</div>
                                    {/* Checkbox Group */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'jbod', label: 'JBOD' },
                                            { key: 'railForJbod', label: 'Rail for JBOD' },
                                            { key: 'halfOuBlank', label: '0.5OU Blank' }
                                        ].map(sub => (
                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                    className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-700">{sub.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Custom Fields List */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            自訂附屬設備 (Custom Sub-items)
                                        </label>
                                        <div className="space-y-2">
                                            {(selectedDevice.jbodCustom || ['']).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newCustom = [...(selectedDevice.jbodCustom || [''])];
                                                            newCustom[idx] = e.target.value;
                                                            handleUpdateDevice(selectedDevice.id, { jbodCustom: newCustom });
                                                        }}
                                                        placeholder="自行輸入設備名稱..."
                                                        className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newCustom = [...(selectedDevice.jbodCustom || ['']), ''];
                                                                handleUpdateDevice(selectedDevice.id, { jbodCustom: newCustom });
                                                            }}
                                                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                            title="新增欄位"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(selectedDevice.jbodCustom || ['']).length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = (selectedDevice.jbodCustom || ['']).filter((_, i) => i !== idx);
                                                                    handleUpdateDevice(selectedDevice.id, { jbodCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Storage JBOF MSFT Configuration */}
                {selectedDevice.type === 'StorageJBOF' && projectInfo?.designType === 'msft' && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-sky-400 mb-2 flex items-center gap-1">
                                    附屬設備設定 (BOM Sub-items)
                                </label>
                                <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Item 10</div>
                                    {/* Checkbox Group */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'jbof', label: 'JBOF' },
                                            { key: 'railForJbof', label: 'Rail for JBOF' },
                                            { key: 'halfOuBlank', label: '0.5OU Blank' }
                                        ].map(sub => (
                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevice.hardwareSpecs?.[sub.key]?.qty === 1}
                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, sub.key, 'qty', e.target.checked ? 1 : 0)}
                                                    className="w-4 h-4 rounded border-slate-200 bg-white text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-700">{sub.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* Custom Fields List */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-200/40">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            自訂附屬設備 (Custom Sub-items)
                                        </label>
                                        <div className="space-y-2">
                                            {(selectedDevice.jbofCustom || ['']).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newCustom = [...(selectedDevice.jbofCustom || [''])];
                                                            newCustom[idx] = e.target.value;
                                                            handleUpdateDevice(selectedDevice.id, { jbofCustom: newCustom });
                                                        }}
                                                        placeholder="自行輸入設備名稱..."
                                                        className="flex-1 bg-white border-slate-200 text-slate-800 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const newCustom = [...(selectedDevice.jbofCustom || ['']), ''];
                                                                handleUpdateDevice(selectedDevice.id, { jbofCustom: newCustom });
                                                            }}
                                                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all border border-sky-500/20"
                                                            title="新增欄位"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(selectedDevice.jbofCustom || ['']).length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newCustom = (selectedDevice.jbofCustom || ['']).filter((_, i) => i !== idx);
                                                                    handleUpdateDevice(selectedDevice.id, { jbofCustom: newCustom });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-200"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* CDU Configuration */}
                {(selectedDevice.type === 'CDU4U' || selectedDevice.type === 'SideCDU' || selectedDevice.type === 'CDU') && (
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400"/> 設備功耗 (W)</label>
                                <input type="number" value={selectedDevice.power || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { power: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-emerald-400"/> 設備報價 (USD)</label>
                                <input type="number" value={selectedDevice.price || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { price: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" />
                            </div>
                            {selectedDevice.type === 'CDU4U' && (
                                <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                    <label className="block text-[11px] font-bold text-cyan-400 mb-1.5 flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-cyan-400"/> In Rack CDU 設定</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">機架高度 (U數)</label>
                                            <select value={selectedDevice.size || 4} onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseInt(e.target.value) })} className={selectCls}>
                                                <option value={4}>4U</option>
                                                <option value={5}>5U</option>
                                                <option value={6}>6U</option>
                                                <option value={7}>7U</option>
                                                <option value={8}>8U</option>
                                                <option value={9}>9U</option>
                                                <option value={10}>10U</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="col-span-2 pt-2 border-t border-slate-200/50 mt-2">
                                {(() => {
                                    const currentVal = selectedDevice.hardwareSpecs?.bmc || {};
                                    return (
                                        <div className="bg-white/40 p-2.5 rounded-lg border border-red-950/30 text-[10px]">
                                            <div className="mb-2">
                                                <label className="block text-[10px] text-slate-500 mb-1">BMC 網路孔數量 <span className="text-slate-600">(固定 1 埠)</span></label>
                                                <input
                                                    type="number" value={1} disabled
                                                    className="w-full bg-slate-50 border-slate-200 text-slate-800 border border-slate-900 rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed focus:outline-none" />
                                            </div>
                                            {renderCablingSubFields('bmc', currentVal)}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Switch Configuration */}
                {((selectedDevice.type || '').startsWith('Switch') || selectedDevice.type === 'Router') && (() => {
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
                                    <label className="block text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400"/> 設備功耗 (W)</label>
                                    <input type="number" value={selectedDevice.power || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { power: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-emerald-400"/> 設備報價 (USD)</label>
                                    <input type="number" value={selectedDevice.price || 0} onChange={(e) => handleUpdateDevice(selectedDevice.id, { price: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono" />
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                    <label className="block text-[11px] font-bold text-purple-400 mb-1.5 flex items-center gap-1"><Network className="w-3 h-3"/> 交換器設定 (Switch Config)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">機架高度 (U數)</label>
                                            <input type="number" min={1} value={selectedDevice.size} onChange={(e) => handleUpdateDevice(selectedDevice.id, { size: parseInt(e.target.value) || 1 })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">連接埠總量 (Ports)</label>
                                            <select
                                                value={totalPortsCount}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 48;
                                                    handleHardwareSpecChange(selectedDevice.id, 'ports', 'qty', val);
                                                    handleHardwareSpecChange(selectedDevice.id, 'portQty', 'qty', val);
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none"
                                            >
                                                <option value={8}>8 埠</option>
                                                <option value={12}>12 埠</option>
                                                <option value={16}>16 埠</option>
                                                <option value={24}>24 埠</option>
                                                <option value={32}>32 埠</option>
                                                <option value={48}>48 埠</option>
                                                <option value={64}>64 埠</option>
                                                <option value={128}>128 埠</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-slate-500 mb-1">傳輸速率 (Speed)</label>
                                            <input type="text" placeholder="e.g. 400G, 800G" value={(selectedDevice.hardwareSpecs?.speed?.model) || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'speed', 'model', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none" />
                                        </div>
                                        <div className="col-span-2 pt-2">
                                            <div className="w-full bg-white/60 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                                                <span className="text-slate-500 font-medium">孔位使用率 (Port Usage)</span>
                                                <span className="font-mono font-bold text-slate-900">
                                                    {usedPortsCount} / {totalPortsCount} 埠 ({totalPortsCount - usedPortsCount} 空置)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-slate-200/50 mt-2">
                                            {(() => {
                                                const currentVal = selectedDevice.hardwareSpecs?.bmc || {};
                                                return (
                                                    <div className="bg-white/40 p-2.5 rounded-lg border border-red-950/30 text-[10px]">
                                                        <div className="mb-2">
                                                            <label className="block text-[10px] text-slate-500 mb-1">BMC 網路孔數量 <span className="text-slate-600">(固定 1 埠)</span></label>
                                                            <input
                                                                type="number" value={1} disabled
                                                                className="w-full bg-slate-50 border-slate-200 text-slate-800 border border-slate-900 rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed focus:outline-none" />
                                                        </div>
                                                        {renderCablingSubFields('bmc', currentVal)}
                                                    </div>
                                                );
                                            })()}
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
                                            {(() => {
                                                const nodeBmcKey = `bmc_${nodeKey}`;
                                                const currentVal = (selectedDevice.hardwareSpecs || {})[nodeBmcKey] || {};
                                                return (
                                                    <div className="bg-white/40 p-2.5 rounded-lg border border-red-950/30 mb-3 text-[10px]">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <label className="block text-[10px] text-slate-500">BMC 網路孔數量 <span className="text-slate-600">(固定 1 埠)</span></label>
                                                            <input
                                                                type="number" value={1} disabled
                                                                className="w-16 bg-slate-50 border-slate-200 text-slate-800 border border-slate-900 rounded px-1.5 py-0.5 text-[10px] text-slate-500 text-center cursor-not-allowed focus:outline-none" />
                                                        </div>
                                                        {renderCablingSubFields(nodeBmcKey, currentVal)}
                                                    </div>
                                                );
                                            })()}
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
                                                                <div className="text-[10px] font-bold text-slate-500 text-right pr-2 truncate">PCIe Slots</div>
                                                                <select
                                                                    value={pcieSlotQty}
                                                                    onChange={(e) => handleHardwareSpecChange(selectedDevice.id, pcieSlotQtyKey, 'qty', parseInt(e.target.value))}
                                                                    className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
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
                                                                    <React.Fragment key={slotKey}>
                                                                        <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-1">
                                                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate">PCIe Slot {slotIdx}</div>
                                                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'model', e.target.value)}
                                                                                className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'qty', parseInt(e.target.value) || '')}
                                                                                className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                                        </div>
                                                                        {currentVal.qty > 0 && (
                                                                            <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
                                                                                <div></div>
                                                                                {renderCablingSubFields(slotKey, currentVal)}
                                                                            </div>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                }
                                                if (spec.key === 'ns_nic_2') {
                                                    return null;
                                                }
                                                if (spec.key === 'ocp') {
                                                    const nodeSpecKey = `${spec.key}_${nodeKey}`;
                                                    const ocpVal = (selectedDevice.hardwareSpecs || {})[nodeSpecKey] || { model: '', qty: '' };
                                                    return (
                                                        <React.Fragment key={nodeSpecKey}>
                                                            <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-1">
                                                                <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                                                <input type="text" placeholder="Model..." value={ocpVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'model', e.target.value)}
                                                                    className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                                <input type="number" placeholder="Qty" value={ocpVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'qty', parseInt(e.target.value) || '')}
                                                                    className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                            </div>
                                                            {ocpVal.qty > 0 && (
                                                                <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
                                                                    <div></div>
                                                                    {renderCablingSubFields(nodeSpecKey, ocpVal)}
                                                                </div>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                }

                                                const nodeSpecKey = `${spec.key}_${nodeKey}`;
                                                const currentVal = (selectedDevice.hardwareSpecs || {})[nodeSpecKey] || { model: '', qty: '' };
                                                return (
                                                    <div key={nodeSpecKey} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                                        <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                                        <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'model', e.target.value)}
                                                            className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                        <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, nodeSpecKey, 'qty', parseInt(e.target.value) || '')}
                                                            className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-bold text-slate-500 mb-3">硬體規格 (Hardware Specs)</label>
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
                                                    <div className="text-[10px] font-bold text-slate-500 text-right pr-2 truncate">PCIe Slots</div>
                                                    <select
                                                        value={pcieSlotQty}
                                                        onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'pcieSlotQty', 'qty', parseInt(e.target.value))}
                                                        className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
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
                                                        <React.Fragment key={slotKey}>
                                                            <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-1">
                                                                <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate">PCIe Slot {slotIdx}</div>
                                                                <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'model', e.target.value)}
                                                                    className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                                <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, slotKey, 'qty', parseInt(e.target.value) || '')}
                                                                    className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                            </div>
                                                            {currentVal.qty > 0 && (
                                                                <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
                                                                    <div></div>
                                                                    {renderCablingSubFields(slotKey, currentVal)}
                                                                </div>
                                                            )}
                                                        </React.Fragment>
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
                                                    <div className="text-[10px] font-bold text-slate-500 text-right pr-2 truncate">Accelerator</div>
                                                    <select
                                                        value={accelerator}
                                                        onChange={(e) => handleHardwareSpecChange(selectedDevice.id, 'accelerator', 'type', e.target.value)}
                                                        className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
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
                                                        className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                    <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                                        className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                </div>
                                            </React.Fragment>
                                        );
                                    }

                                    if (spec.key === 'ocp') {
                                        return (
                                            <React.Fragment key={spec.key}>
                                                <div className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-1">
                                                    <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                                    <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'model', e.target.value)}
                                                        className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                                    <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                                        className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
                                                </div>
                                                {currentVal.qty > 0 && (
                                                    <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
                                                        <div></div>
                                                        {renderCablingSubFields(spec.key, currentVal)}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <div key={spec.key} className="grid grid-cols-[64px_1fr_60px] gap-2 items-center mb-2">
                                            <div className="text-[10px] font-mono text-slate-500 text-right pr-2 truncate" title={spec.label}>{spec.label}</div>
                                            <input type="text" placeholder="Model..." value={currentVal.model || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'model', e.target.value)}
                                                className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none placeholder:text-slate-400" />
                                            <input type="number" placeholder="Qty" value={currentVal.qty || ''} onChange={(e) => handleHardwareSpecChange(selectedDevice.id, spec.key, 'qty', parseInt(e.target.value) || '')}
                                                className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500/60 focus:outline-none text-center" />
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

export default RightPanelLight;
