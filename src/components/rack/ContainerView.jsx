import React from 'react';
import { Server, Droplets, Zap, Settings, Trash2, LogOut, Info, ArrowUp, ArrowDown, ShieldAlert, Eye, Thermometer, LayoutGrid } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { THEME_STYLES } from '../../utils/constants';

const ContainerView = () => {
    const {
        racks,
        setRacks,
        devices,
        containers,
        setContainers,
        activeRackId,
        setActiveRackId,
        setSelectedIds,
        setViewMode,
        generateId,
        showAlert
    } = useRackPlanner();

    // 計算每個 slot 內機櫃的實際功耗與重量
    const getRackStats = (rack) => {
        if (!rack) return { power: 0, weight: 0 };
        
        // 基礎設施機櫃，使用其預設值或 spec
        if (rack.type === 'Cooling') return { power: rack.power || 4500, weight: rack.weight || 320 };
        if (rack.type === 'CDU') return { power: rack.power || 2500, weight: rack.weight || 350 };
        if (rack.type === 'UPS') return { power: 0, weight: rack.weight || 850 };
        if (rack.type === 'Battery') return { power: 0, weight: rack.weight || 1200 };
        if (rack.type === 'Switchboard') return { power: 0, weight: rack.weight || 420 };
        if (rack.type === 'PowerPanel') return { power: 0, weight: rack.weight || 120 };
        if (rack.type === 'FireSuppression') return { power: 0, weight: rack.weight || 250 };
        if (rack.type === 'Monitoring') return { power: 0, weight: rack.weight || 180 };
        if (rack.type === 'EnvControl') return { power: 0, weight: rack.weight || 150 };

        // IT 機櫃：加總內部所有設備
        const rackDevices = devices.filter(d => d.rackId === rack.id);
        const devicePower = rackDevices.reduce((sum, d) => sum + (d.power || 0), 0);
        const deviceWeight = rackDevices.reduce((sum, d) => sum + (d.weight !== undefined && d.weight !== null ? d.weight : 10), 0); // 每個設備 10kg
        
        return {
            power: devicePower,
            weight: (rack.weight || 150) + deviceWeight
        };
    };

    const getSingleContainerStats = (container) => {
        const maxSlots = container.type === '20ft' ? 10 : 20;
        const activeRacks = racks.filter(r => {
            const cId = r.containerId || 'container-1';
            return cId === container.id && r.slotIndex !== null && r.slotIndex !== undefined && r.slotIndex < maxSlots;
        });

        const selfW = container.selfWeight !== undefined ? container.selfWeight : (container.type === '20ft' ? 2200 : 3800);
        let totalWeight = selfW;
        let totalItPower = 0;
        let totalCoolingPower = 0;

        activeRacks.forEach(rack => {
            if (rack.type === 'Cooling') {
                totalWeight += (rack.weight || 320);
                totalCoolingPower += (rack.power || 4500);
            } else if (rack.type === 'CDU') {
                totalWeight += (rack.weight || 350);
                totalCoolingPower += (rack.power || 2500);
            } else if (rack.type === 'UPS') {
                totalWeight += (rack.weight || 850);
            } else if (rack.type === 'Battery') {
                totalWeight += (rack.weight || 1200);
            } else if (rack.type === 'Switchboard') {
                totalWeight += (rack.weight || 420);
            } else if (rack.type === 'PowerPanel') {
                totalWeight += (rack.weight || 120);
            } else if (rack.type === 'FireSuppression') {
                totalWeight += (rack.weight || 250);
            } else if (rack.type === 'Monitoring') {
                totalWeight += (rack.weight || 180);
            } else if (rack.type === 'EnvControl') {
                totalWeight += (rack.weight || 150);
            } else {
                const rackDevices = devices.filter(d => d.rackId === rack.id);
                const devicePower = rackDevices.reduce((sum, d) => sum + (d.power || 0), 0);
                const deviceWeight = rackDevices.reduce((sum, d) => sum + (d.weight !== undefined && d.weight !== null ? d.weight : 10), 0);
                totalItPower += devicePower;
                totalWeight += (rack.weight || 150) + deviceWeight;
            }
        });

        const upsLosses = totalItPower * 0.05;
        const pue = totalItPower > 0 
            ? (totalItPower + totalCoolingPower + upsLosses) / totalItPower
            : 1.15;

        return {
            totalWeight,
            totalItPower,
            totalCoolingPower,
            totalPower: totalItPower + totalCoolingPower + upsLosses,
            pue: Math.max(1.15, pue)
        };
    };

    // 拖曳開始
    const handleRackDragStart = (e, rackId) => {
        e.dataTransfer.setData('draggedRackId', rackId);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    // 拖放處理
    const handleDrop = (e, containerId, targetSlotIndex) => {
        e.preventDefault();
        
        // 1. 檢查是否是拖曳規格新增貨櫃
        const newContainerType = e.dataTransfer.getData('newContainerType');
        if (newContainerType) {
            handleCanvasDrop(e);
            return;
        }

        // 2. 檢查是否是側邊欄拖進來的新機櫃
        const cabinetDataStr = e.dataTransfer.getData('cabinet');
        if (cabinetDataStr) {
            try {
                const payload = JSON.parse(cabinetDataStr);
                const occupiedRack = racks.find(r => (r.containerId || 'container-1') === containerId && r.slotIndex === targetSlotIndex);
                
                if (occupiedRack) {
                    showAlert('此插槽已放置機櫃！請先移開或移除現有机櫃。', '提示', 'warning');
                    return;
                }

                // 建立新機櫃
                const newRackId = 'rack-' + generateId();
                const newRack = {
                    id: newRackId,
                    name: `${payload.name.split(' ')[0]}-${racks.length + 1}`,
                    type: payload.cabinetType,
                    uCount: payload.uCount,
                    powerLimit: payload.powerLimit,
                    coolingCapacity: payload.coolingCapacity,
                    powerCapacity: payload.powerCapacity,
                    batteryCapacity: payload.batteryCapacity,
                    power: payload.power,
                    weight: payload.weight,
                    slotIndex: targetSlotIndex,
                    containerId: containerId
                };
                
                setRacks(prev => [...prev, newRack]);
                setActiveRackId(newRackId);
                setSelectedIds([newRackId]);
            } catch (err) {
                console.error('Failed to parse cabinet drag data', err);
            }
            return;
        }

        // 3. 檢查是否是已有機櫃移位或交換
        const draggedRackId = e.dataTransfer.getData('draggedRackId');
        if (draggedRackId) {
            const targetRack = racks.find(r => r.id === draggedRackId);
            if (!targetRack) return;

            const occupiedRack = racks.find(r => (r.containerId || 'container-1') === containerId && r.slotIndex === targetSlotIndex);
            
            if (occupiedRack) {
                // 交換位置
                const originalSlotIndex = targetRack.slotIndex;
                const originalContainerId = targetRack.containerId || 'container-1';
                setRacks(prev => prev.map(r => {
                    if (r.id === targetRack.id) return { ...r, containerId: containerId, slotIndex: targetSlotIndex };
                    if (r.id === occupiedRack.id) return { ...r, containerId: originalContainerId, slotIndex: originalSlotIndex };
                    return r;
                }));
            } else {
                // 直接移動到空位
                setRacks(prev => prev.map(r => {
                    if (r.id === targetRack.id) return { ...r, containerId: containerId, slotIndex: targetSlotIndex };
                    return r;
                }));
            }
            setActiveRackId(draggedRackId);
            setSelectedIds([draggedRackId]);
        }
    };

    // 拖曳規格新增貨櫃
    const handleCanvasDrop = (e) => {
        const newContainerType = e.dataTransfer.getData('newContainerType');
        if (newContainerType) {
            e.preventDefault();
            e.stopPropagation();
            const nextLetter = String.fromCharCode(65 + containers.length);
            const newContainer = {
                id: `container-${Date.now()}`,
                name: `貨櫃-${nextLetter}`,
                type: newContainerType,
                powerLimit: 500000,
                weightLimit: 30000,
                pueBase: 1.15
            };
            setContainers(prev => [...prev, newContainer]);
            showAlert(`已新增一個可規畫的 ${newContainerType === '20ft' ? '20呎' : '40呎'} 貨櫃 (貨櫃-${nextLetter})！`, '新增成功', 'success');
        }
    };

    // 刪除貨櫃
    const handleDeleteContainer = (containerId, e) => {
        e.stopPropagation();
        if (containers.length <= 1) {
            showAlert('必須保留至少一個貨櫃！', '提示', 'warning');
            return;
        }
        if (window.confirm('確定要刪除此貨櫃嗎？其內部的所有機櫃將會移回未分配區。')) {
            setRacks(prev => prev.map(r => {
                const cId = r.containerId || 'container-1';
                if (cId === containerId) {
                    return { ...r, containerId: null, slotIndex: null };
                }
                return r;
            }));
            setContainers(prev => prev.filter(c => c.id !== containerId));
        }
    };

    // 移除機櫃的 slotIndex (移至未分配區)
    const handleUnassignRack = (rackId) => {
        setRacks(prev => prev.map(r => r.id === rackId ? { ...r, containerId: null, slotIndex: null } : r));
    };

    // 徹底刪除機櫃
    const handleDeleteRack = (rackId, e) => {
        e.stopPropagation();
        if (window.confirm('確定要徹底刪除此機櫃以及其內部的所有設備嗎？')) {
            setRacks(prev => prev.filter(r => r.id !== rackId));
            if (activeRackId === rackId) {
                const remaining = racks.filter(r => r.id !== rackId);
                setActiveRackId(remaining[0]?.id || null);
                setSelectedIds([]);
            }
        }
    };

    // 雙擊 IT 機櫃進行深度編輯
    const handleDoubleClickRack = (rack) => {
        if (rack.type === 'General' || rack.type === 'ORv3') {
            setActiveRackId(rack.id);
            setSelectedIds([rack.id]);
            setViewMode('single');
        } else {
            showAlert('此機櫃為基礎設施模組，無須進行單櫃內部設備編輯。', '提示', 'info');
        }
    };

    // 分類機櫃 - 未分配機櫃
    const activeContainerIds = new Set(containers.map(c => c.id));
    const unassignedRacks = racks.filter(r => {
        const cId = r.containerId || 'container-1';
        const inActiveContainer = activeContainerIds.has(cId);
        const hasSlot = r.slotIndex !== null && r.slotIndex !== undefined;
        
        if (!inActiveContainer || !hasSlot) return true;
        
        const container = containers.find(c => c.id === cId);
        const maxSlots = container.type === '20ft' ? 10 : 20;
        return r.slotIndex >= maxSlots;
    });

    // 取得元件圖示
    const getCabinetIcon = (type) => {
        switch (type) {
            case 'Cooling':
            case 'CDU':
                return Droplets;
            case 'UPS':
            case 'PowerPanel':
                return Zap;
            case 'Battery':
                return LayoutGrid;
            case 'Switchboard':
                return Settings;
            case 'FireSuppression':
                return ShieldAlert;
            case 'Monitoring':
                return Eye;
            case 'EnvControl':
                return Thermometer;
            default:
                return Server;
        }
    };

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-[#060c14] space-y-8 select-none"
        >
            {/* 動態管線與冷熱通道樣式定義 */}
            <style>{`
                @keyframes pipeFlow {
                    to { stroke-dashoffset: -20; }
                }
                .pipe-animate {
                    stroke-dasharray: 6, 4;
                    animation: pipeFlow 1s linear infinite;
                }
            `}</style>

            {containers.map((container, cIdx) => {
                const maxSlots = container.type === '20ft' ? 10 : 20;
                
                const containerRacks = Array.from({ length: maxSlots }).map((_, idx) => {
                    return racks.find(r => (r.containerId || 'container-1') === container.id && r.slotIndex === idx) || null;
                });

                const stats = getSingleContainerStats(container);
                
                return (
                    <div key={container.id} className="w-full max-w-7xl mx-auto flex flex-col items-center relative group/container">
                        {/* Container Header Banner */}
                        <div className="w-full flex items-center justify-between bg-[#0b1523]/80 border border-slate-700/40 rounded-2xl px-6 py-3.5 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={container.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setContainers(prev => prev.map(c => c.id === container.id ? { ...c, name: newName } : c));
                                    }}
                                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none text-sm font-bold text-slate-200 focus:ring-0 px-1.5 py-0.5 w-32 transition-all rounded"
                                    title="按此修改貨櫃名稱"
                                />
                                <select
                                    value={container.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        if (newType === '20ft') {
                                            const hasOutofBounds = racks.some(r => (r.containerId || 'container-1') === container.id && r.slotIndex >= 10);
                                            if (hasOutofBounds) {
                                                if (!window.confirm('此貨櫃中索引 10 以上的插槽已有放置設備，切換至 20呎 將會將這些設備移至未分配區，確定要切換嗎？')) {
                                                    return;
                                                }
                                                setRacks(prev => prev.map(r => {
                                                    const cId = r.containerId || 'container-1';
                                                    if (cId === container.id && r.slotIndex >= 10) {
                                                        return { ...r, containerId: null, slotIndex: null };
                                                    }
                                                    return r;
                                                }));
                                            }
                                        }
                                        setContainers(prev => prev.map(c => c.id === container.id ? { ...c, type: newType } : c));
                                    }}
                                    className="bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold rounded px-2.5 py-0.5 outline-none cursor-pointer hover:bg-indigo-900/40 hover:border-indigo-400/50 transition-colors"
                                >
                                    <option value="20ft" className="bg-[#0b1523] text-slate-300">20呎 (10格)</option>
                                    <option value="40ft" className="bg-[#0b1523] text-slate-300">40呎 (20格)</option>
                                </select>
                                
                                <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg px-2 py-0.5 shadow-inner" title="貨櫃自重 (Tare Weight)">
                                    <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-wider">自重</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={container.selfWeight !== undefined ? container.selfWeight : (container.type === '20ft' ? 2200 : 3800)}
                                        onChange={(e) => {
                                            const selfW = parseFloat(e.target.value) || 0;
                                            setContainers(prev => prev.map(c => c.id === container.id ? { ...c, selfWeight: selfW } : c));
                                        }}
                                        className="bg-transparent border-none outline-none text-xs text-slate-200 focus:ring-0 p-0 w-16 text-center font-mono font-bold"
                                        placeholder={container.type === '20ft' ? '2200' : '3800'}
                                    />
                                    <span className="text-[10px] text-slate-500 font-bold select-none">kg</span>
                                </div>
                            </div>
                            
                            {/* Single Container Mini Stats */}
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold">
                                    <span className="text-emerald-600 font-medium">PUE</span>{stats.pue.toFixed(2)}
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold transition-colors ${
                                    stats.totalWeight > container.weightLimit
                                        ? 'bg-red-500/15 text-red-400 border-red-500/35 animate-pulse'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                    <span className={stats.totalWeight > container.weightLimit ? 'text-red-500 font-extrabold' : 'text-amber-600 font-medium'}>重</span>
                                    {stats.totalWeight.toLocaleString()} / {container.weightLimit.toLocaleString()} kg
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
                                    stats.totalPower > container.powerLimit
                                        ? 'bg-red-500/15 text-red-400 border-red-500/35'
                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                }`}>
                                    <span className="text-sky-600 font-medium">功耗</span>
                                    {(stats.totalPower / 1000).toFixed(1)} / {(container.powerLimit / 1000).toFixed(0)} kW
                                </div>
                                {containers.length > 1 && (
                                    <button
                                        onClick={(e) => handleDeleteContainer(container.id, e)}
                                        className="ml-2 p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/60 rounded-lg text-red-400 hover:text-red-200 transition-colors"
                                        title="刪除此貨櫃"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Container Metal Frame Canvas */}
                        <div id={`container-canvas-${container.id}`} className="relative w-full bg-[#0d1527]/90 border-[6px] border-slate-600 rounded-3xl p-8 shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden mb-8">
                            
                            {/* 貨櫃左右門片裝飾 */}
                            <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-slate-700 to-slate-800 border-r border-slate-900 flex flex-col justify-around py-8">
                                <div className="w-full h-8 bg-slate-900/40 rounded-r"></div>
                                <div className="w-full h-8 bg-slate-900/40 rounded-r"></div>
                            </div>
                            <div className="absolute top-0 right-0 bottom-0 w-3 bg-gradient-to-l from-slate-700 to-slate-800 border-l border-slate-900 flex flex-col justify-around py-8">
                                <div className="w-full h-8 bg-slate-900/40 rounded-l"></div>
                                <div className="w-full h-8 bg-slate-900/40 rounded-l"></div>
                            </div>

                            {/* 頂部：冷通道 (Cold Aisle) */}
                            <div className="mb-6 flex justify-around items-center bg-blue-500/5 border border-blue-500/10 rounded-xl py-2 px-4">
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <ArrowDown className="w-3.5 h-3.5 animate-bounce" /> 冷通道 Cold Aisle (進風面)
                                </div>
                                <div className="flex gap-8 text-[9px] text-blue-500/60 font-mono">
                                    <span>冷風溫度: 22°C</span>
                                    <span>送風量: Auto</span>
                                </div>
                            </div>

                            {/* 中間：動態管線與機櫃插槽網格 */}
                            <div className="relative py-8 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                                
                                {/* SVG 動態水管與電軌 Overlays (自適應寬度百分比) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                                    {/* Chilled Water Main Piping */}
                                    <line x1="2%" y1="20" x2="98%" y2="20" stroke="#2563eb" strokeWidth="3" opacity="0.8" />
                                    <line x1="2%" y1="26" x2="98%" y2="26" stroke="#dc2626" strokeWidth="3" opacity="0.8" />
                                    
                                    {/* Power Busway */}
                                    <line x1="2%" y1="110" x2="98%" y2="110" stroke="#d97706" strokeWidth="4" opacity="0.8" />

                                    {/* 動態流動虛線 */}
                                    <line x1="2%" y1="20" x2="98%" y2="20" stroke="#60a5fa" strokeWidth="3" className="pipe-animate" />
                                    <line x1="2%" y1="26" x2="98%" y2="26" stroke="#f87171" strokeWidth="3" className="pipe-animate" />
                                    <line x1="2%" y1="110" x2="98%" y2="110" stroke="#fbbf24" strokeWidth="4" className="pipe-animate" />

                                    {/* 各插槽垂直分支連接 */}
                                    {containerRacks.map((rack, idx) => {
                                        if (!rack) return null;
                                        const pct = ((idx + 0.5) / maxSlots) * 100;
                                        
                                        const isCooling = rack.type === 'Cooling' || rack.type === 'CDU';
                                        const isPower = ['Switchboard', 'UPS', 'Battery', 'PowerPanel'].includes(rack.type);
                                        const isIT = ['General', 'ORv3'].includes(rack.type);

                                        return (
                                            <g key={rack.id}>
                                                {/* 水冷管路分支連接 (針對 Cooling/CDU 與 IT 機櫃) */}
                                                {(isCooling || isIT) && (
                                                    <>
                                                        <line x1={`${pct}%`} y1="20" x2={`${pct}%`} y2="38" stroke="#2563eb" strokeWidth="2" />
                                                        <line x1={`${pct + 0.4}%`} y1="26" x2={`${pct + 0.4}%`} y2="38" stroke="#dc2626" strokeWidth="2" />
                                                    </>
                                                )}

                                                {/* 電力母線槽分支連接 (針對 配電, UPS, 電池, IT 機櫃) */}
                                                {(isPower || isIT) && (
                                                    <line x1={`${pct}%`} y1="94" x2={`${pct}%`} y2="110" stroke="#d97706" strokeWidth="2" />
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* 網格插槽容器 (自適應，無水平捲軸) */}
                                <div className="grid gap-1.5 pb-2 pt-10 w-full" style={{ gridTemplateColumns: `repeat(${maxSlots}, minmax(0, 1fr))` }}>
                                    {containerRacks.map((rack, idx) => {
                                        const stats = getRackStats(rack);
                                        const isActive = rack && rack.id === activeRackId;
                                        
                                        return (
                                            <div
                                                key={idx}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDragEnter={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, container.id, idx)}
                                                onClick={() => {
                                                    if (rack) {
                                                        setActiveRackId(rack.id);
                                                        setSelectedIds([rack.id]);
                                                    }
                                                }}
                                                onDoubleClick={() => rack && handleDoubleClickRack(rack)}
                                                className={`h-40 w-full rounded-xl border-2 flex flex-col justify-between p-1.5 md:p-2 relative transition-all duration-200 group ${
                                                    rack 
                                                        ? `${isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10' : 'border-slate-700 hover:border-slate-500'} bg-slate-900/95 cursor-grab active:cursor-grabbing`
                                                        : 'border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/20 text-slate-700 hover:text-slate-500 hover:bg-slate-900/10 cursor-pointer'
                                                }`}
                                                draggable={!!rack}
                                                onDragStart={(e) => rack && handleRackDragStart(e, rack.id)}
                                            >
                                                {rack ? (
                                                    <>
                                                        {/* 機櫃頂部狀態燈 */}
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="text-[8px] font-mono text-slate-500 truncate max-w-[28px]">#{idx + 1}</span>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                                    rack.type === 'Cooling' || rack.type === 'CDU' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
                                                                    rack.type === 'UPS' || rack.type === 'PowerPanel' ? 'bg-orange-500 shadow-[0_0_6px_#f97316]' :
                                                                    rack.type === 'Battery' ? 'bg-purple-500 shadow-[0_0_6px_#a855f7]' :
                                                                    rack.type === 'Switchboard' ? 'bg-slate-400 shadow-[0_0_6px_#94a3b8]' :
                                                                    rack.type === 'FireSuppression' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' :
                                                                    rack.type === 'Monitoring' ? 'bg-blue-400 shadow-[0_0_6px_#60a5fa]' :
                                                                    rack.type === 'EnvControl' ? 'bg-teal-500 shadow-[0_0_6px_#14b8a6]' :
                                                                    'bg-blue-500 shadow-[0_0_6px_#3b82f6]'
                                                                }`}></div>
                                                            </div>
                                                        </div>

                                                        {/* 機櫃圖示與類型 */}
                                                        <div className="flex flex-col items-center justify-center flex-1 my-1">
                                                            {(() => {
                                                                const Icon = getCabinetIcon(rack.type);
                                                                const theme = THEME_STYLES[
                                                                    (rack.type === 'Cooling' || rack.type === 'CDU' || rack.type === 'EnvControl') ? 'emerald' :
                                                                    (rack.type === 'UPS' || rack.type === 'PowerPanel' || rack.type === 'FireSuppression') ? 'orange' :
                                                                    rack.type === 'Battery' ? 'purple' :
                                                                    rack.type === 'Switchboard' ? 'slate' : 'blue'
                                                                ] || THEME_STYLES.blue;
                                                                return (
                                                                    <div className={`p-1 rounded bg-slate-950 border ${theme.border} text-slate-300 mb-0.5 shrink-0`}>
                                                                        <Icon className={`w-4 h-4 ${theme.text}`} />
                                                                    </div>
                                                                );
                                                            })()}
                                                            <span className="text-[8px] md:text-[9px] font-bold text-slate-200 truncate w-full text-center">{rack.name}</span>
                                                            <span className="text-[8px] text-slate-500 font-mono scale-90 truncate max-w-full">{rack.type}</span>
                                                        </div>

                                                        {/* 機櫃數據彙總 */}
                                                        <div className="text-[8px] font-mono text-slate-400 border-t border-slate-800/80 pt-1 text-center truncate space-y-0.5 w-full">
                                                            <div className="truncate scale-95">{(stats.power / 1000).toFixed(0)}kW | {stats.weight}kg</div>
                                                        </div>

                                                        {/* Hover 浮出快捷選單 */}
                                                        <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-10 bg-slate-950/90 p-0.5 rounded border border-slate-700">
                                                            <button
                                                                onClick={() => handleUnassignRack(rack.id)}
                                                                className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-400 hover:text-white"
                                                                title="移出貨櫃 (保留配置)"
                                                            >
                                                                <LogOut className="w-2.5 h-2.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteRack(rack.id, e)}
                                                                className="p-1 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded text-red-400 hover:text-red-200"
                                                                title="徹底刪除"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-0.5 py-4 w-full">
                                                        <span className="text-[8px] md:text-[9px] font-bold text-slate-700 uppercase">Slot {idx + 1}</span>
                                                        <span className="text-[8px] text-slate-800 scale-95">可拖放</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>

                            {/* 底部：熱通道 (Hot Aisle) */}
                            <div className="mt-6 flex justify-around items-center bg-red-500/5 border border-red-500/10 rounded-xl py-2 px-4">
                                <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <ArrowUp className="w-3.5 h-3.5 animate-bounce" /> 熱通道 Hot Aisle (排風面)
                                </div>
                                <div className="flex gap-8 text-[9px] text-red-500/60 font-mono">
                                    <span>排風溫度: 35°C</span>
                                    <span>熱回收: N/A</span>
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })}

            {/* 貨櫃外：未分配機櫃備用區 */}
            <div className="w-full max-w-7xl mx-auto bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        機櫃備用棧板 (Unassigned Racks Bay)
                        <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 font-mono rounded-md">{unassignedRacks.length} 個未分配</span>
                    </h4>
                    <span className="text-[9px] text-slate-500">此區機櫃不會列入貨櫃的總重與 PUE 計算，拖曳即可放入貨櫃中，點選後可按 Del 鍵或 Ctrl+C 複製</span>
                </div>

                {unassignedRacks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                        沒有未分配的機櫃。可以從左側拖曳新機櫃放入貨櫃網格中。
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {unassignedRacks.map(rack => {
                            const stats = getRackStats(rack);
                            const isActive = rack.id === activeRackId;

                            return (
                                <div
                                    key={rack.id}
                                    draggable
                                    onDragStart={(e) => handleRackDragStart(e, rack.id)}
                                    onClick={() => {
                                        setActiveRackId(rack.id);
                                        setSelectedIds([rack.id]);
                                    }}
                                    onDoubleClick={() => handleDoubleClickRack(rack)}
                                    className={`w-28 p-2 rounded-xl border bg-[#0b1523]/80 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all duration-200 group relative ${
                                        isActive ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-bold text-slate-300 truncate max-w-[80px]">{rack.name}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            rack.type === 'Cooling' || rack.type === 'CDU' ? 'bg-emerald-500' :
                                            rack.type === 'UPS' || rack.type === 'PowerPanel' ? 'bg-orange-500' :
                                            rack.type === 'Battery' ? 'bg-purple-500' :
                                            rack.type === 'Switchboard' ? 'bg-slate-400' :
                                            rack.type === 'FireSuppression' ? 'bg-rose-500' :
                                            rack.type === 'Monitoring' ? 'bg-blue-400' :
                                            rack.type === 'EnvControl' ? 'bg-teal-500' :
                                            'bg-blue-500'
                                        }`}></div>
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-mono mb-2">{rack.type}</div>
                                    <div className="text-[8px] font-mono text-slate-400 flex justify-between">
                                        <span>重: {stats.weight}kg</span>
                                        <button
                                            onClick={(e) => handleDeleteRack(rack.id, e)}
                                            className="hidden group-hover:block text-red-500 hover:text-red-400 shrink-0 ml-1"
                                            title="徹底刪除"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContainerView;
