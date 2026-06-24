import React, { useState } from 'react';
import { Server, Settings, FileBox, Save, Download, DownloadCloud, Monitor, LayoutDashboard, Share2, Minimize, Maximize, Eraser, Eye, EyeOff, LayoutTemplate, BookOpen, Undo, Redo, Flame, Box, Printer, Bug, Cable, Plus, Minus, Info, X } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const Header = () => {
    const { 
        devices,
        viewMode, setViewMode, racks, setRacks, setDevices, activeRackId, setActiveRackId, setSelectedId,
        setSelectedIds, selectedIds,
        isFitToScreen, setIsFitToScreen, showCables, setShowCables, showHeatmap, setShowHeatmap, hideNonItCabinets, setHideNonItCabinets,
        isCableRoutingOptimized, setIsCableRoutingOptimized,
        isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen,
        isUserManualOpen, setIsUserManualOpen,
        isBugTrackerOpen, setIsBugTrackerOpen,
        isExporting, fileInputRef,
        handleFileChange, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage, handlePrintPDF,
        setClearConfirm, setRaModalState, generateId, showAlert,
        undo, redo, canUndo, canRedo,
        deviceSearchTerm, setDeviceSearchTerm,
        projectName, setProjectName,
        containers, setContainers,
        projectInfo, setProjectInfo
    } = useRackPlanner();

    const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);

    const handleSelectSearchDevice = (dev) => {
        setActiveRackId(dev.rackId);
        setSelectedIds([dev.id]);
        setDeviceSearchTerm('');
        setTimeout(() => {
            const element = document.getElementById(`device-${dev.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    // 計算貨櫃層級統計指標
    const calculateContainerStats = () => {
        let totalWeight = 0;
        let totalItPower = 0;
        let totalCoolingPower = 0;
        let totalWeightLimit = 0;
        let totalPowerLimit = 0;
        
        containers.forEach(container => {
            totalWeightLimit += container.weightLimit;
            totalPowerLimit += container.powerLimit;
            
            const selfW = container.selfWeight !== undefined ? container.selfWeight : (container.type === '20ft' ? 2200 : (container.type === '40ft' ? 3800 : (container.customLength ? container.customLength * 190 : 3800)));
            totalWeight += selfW;
            
            const maxSlots = container.type === '20ft' ? 10 : (container.type === '40ft' ? 20 : Math.floor((container.customLength || 40) / 2));
            const activeRacks = racks.filter(r => {
                const cId = r.containerId || 'container-1';
                return cId === container.id && r.slotIndex !== null && r.slotIndex !== undefined && r.slotIndex < maxSlots;
            });
            
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
            pue: Math.max(1.15, pue),
            totalWeightLimit,
            totalPowerLimit
        };
    };

    const containerStats = calculateContainerStats();

    const totalSpace = devices.filter(d => d.type !== 'SideCDU').reduce((sum, dev) => sum + (dev.size || 0), 0);
    const totalPower = devices.reduce((sum, dev) => sum + (dev.power || 0), 0);
    const totalPrice = devices.reduce((sum, dev) => sum + (dev.price || 0), 0);

    const handleClearAllClick = () => {
        if (viewMode === 'single') setClearConfirm({ isOpen: true, type: 'single' });
        else setClearConfirm({ isOpen: true, type: 'all' });
    };

    const handleAddRackClick = () => {
        const newId = `rack-${Date.now()}`;
        const itRacks = racks.filter(r => r.type === 'General' || r.type === 'ORv3');
        let maxNum = 0;
        itRacks.forEach(r => {
            const match = r.name.match(/^RACK-(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const nextNum = Math.max(maxNum + 1, itRacks.length + 1);
        const newName = `RACK-${String(nextNum).padStart(3, '0')}`;

        setRacks([...racks, { id: newId, name: newName, type: 'General', uCount: 48 }]);
        setActiveRackId(newId);
        setSelectedId(newId);
        if (viewMode === 'network') setViewMode('overview');
    };

    const handleAddContainerClick = () => {
        const nextLetter = String.fromCharCode(65 + containers.length);
        const newContainer = {
            id: `container-${Date.now()}`,
            name: `貨櫃-${nextLetter}`,
            type: '40ft',
            powerLimit: 500000,
            weightLimit: 30000,
            pueBase: 1.15
        };
        setContainers([...containers, newContainer]);
        showAlert(`已新增一個可規畫的 40呎 貨櫃 (貨櫃-${nextLetter})！`, '新增成功', 'success');
    };

    return (
        <header className="bg-[#0b1523] border-b border-slate-700/40 flex flex-col shrink-0 relative z-[150] shadow-2xl">
            {/* Top Row: Logo + File Controls */}
            <div className="h-14 w-full flex items-center justify-between px-6 border-b border-slate-700/25">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-lg shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                        <Server className="w-4 h-4 text-[#D71422]" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-200 tracking-wide font-mono">
                        RACK<span className="text-[#D71422]">PLANNER</span> <span className="text-[10px] text-slate-400 align-top">PRO</span>
                    </h1>
                </div>

                {/* Project Name Input & Info Button */}
                <div className="flex items-center gap-3 flex-1 max-w-lg mx-8">
                    <div className="flex-1 relative flex items-center bg-[#09111c] rounded-xl border-2 border-indigo-500/50 hover:border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all px-4 py-2 gap-3">
                        <span className="text-xs font-bold text-indigo-400 select-none uppercase tracking-widest whitespace-nowrap bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">專案名稱</span>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="請輸入專案名稱..."
                            className="w-full bg-transparent border-none outline-none text-base font-bold text-slate-100 placeholder-slate-600 focus:ring-0 p-0"
                        />
                    </div>
                    <button
                        onClick={() => setIsProjectInfoOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#14233c] hover:bg-[#1b2f50] border border-slate-700/60 rounded-xl transition-all shadow-md text-sm font-semibold whitespace-nowrap text-slate-200 hover:text-white"
                        title="編輯專案詳細資訊"
                    >
                        <Info className="w-4 h-4 text-indigo-400 animate-pulse" />
                        專案資訊
                    </button>
                </div>

                <div className="flex items-center gap-2">

                    <button
                        onClick={handleExportImage}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/50 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Monitor className="w-4 h-4" /> 截圖存檔
                    </button>

                    <div className="w-px h-5 bg-slate-700/60"></div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all border ${
                                isFileMenuOpen
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25'
                                    : 'border-slate-600/50 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 hover:text-white hover:border-slate-500/60'
                            } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FileBox className="w-4 h-4" /> 檔案
                        </button>

                        {isFileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-58 bg-[#0d1b2e] rounded-xl shadow-2xl border border-slate-600/50 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 tracking-widest uppercase">專案存檔</div>
                                    <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-500/15 hover:text-indigo-300 cursor-pointer text-sm text-slate-300 transition-colors mx-1 rounded-lg">
                                        <DownloadCloud className="w-4 h-4" /> 讀取專案檔 (.json)
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                    </label>
                                    <button onClick={handleSaveData} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-500/15 hover:text-indigo-300 text-sm text-slate-300 transition-colors mx-1 rounded-lg text-left">
                                        <Save className="w-4 h-4" /> 儲存目前專案 (.json)
                                    </button>
                                    <div className="h-px bg-slate-700/50 my-2 mx-3"></div>
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 tracking-widest uppercase">報表與圖檔</div>
                                    <button onClick={handleExportBOM} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-500/15 hover:text-emerald-300 text-sm text-slate-300 transition-colors mx-1 rounded-lg text-left">
                                        <Download className="w-4 h-4" /> 匯出 BOM 表 (.csv)
                                    </button>
                                    <button onClick={handleExportCableRouting} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-500/15 hover:text-purple-300 text-sm text-slate-300 transition-colors mx-1 rounded-lg text-left">
                                        <Share2 className="w-4 h-4" /> 匯出網路線路表 (.csv)
                                    </button>
                                    <button onClick={handlePrintPDF} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-500/15 hover:text-amber-300 text-sm text-slate-300 transition-colors mx-1 rounded-lg text-left">
                                        <Printer className="w-4 h-4 text-amber-500 animate-pulse" /> 列印 PDF 規格書
                                    </button>
                                    <div className="h-px bg-slate-700/50 my-2 mx-3"></div>
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 tracking-widest uppercase">系統說明</div>
                                    <button onClick={() => { setIsUserManualOpen(true); setIsFileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-500/15 hover:text-indigo-300 text-sm text-slate-300 transition-colors mx-1 rounded-lg text-left">
                                        <BookOpen className="w-4 h-4" /> 系統使用手冊
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Stats + Toolbar */}
            <div className="h-12 w-full flex items-center justify-between px-6">
                <div className="flex items-center gap-3 shrink-0">
                    {/* Stats */}
                    {viewMode === 'container' ? (
                        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40 shadow-inner">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold text-xs tracking-wide whitespace-nowrap">
                                <span className="text-emerald-600 font-medium">PUE 估算</span>{containerStats.pue.toFixed(2)}
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-xs tracking-wide whitespace-nowrap transition-colors ${
                                containerStats.totalWeight > containerStats.totalWeightLimit
                                    ? 'bg-red-500/15 text-red-400 border-red-500/35 animate-pulse'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                                <span className={containerStats.totalWeight > containerStats.totalWeightLimit ? 'text-red-500 font-extrabold' : 'text-amber-600 font-medium'}>總重</span>
                                {containerStats.totalWeight.toLocaleString()} / {containerStats.totalWeightLimit.toLocaleString()} kg
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-xs tracking-wide whitespace-nowrap ${
                                containerStats.totalPower > containerStats.totalPowerLimit
                                    ? 'bg-red-500/15 text-red-400 border-red-500/35'
                                    : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            }`}>
                                <span className="text-sky-600 font-medium">總功耗</span>
                                {(containerStats.totalPower / 1000).toFixed(1)} / {(containerStats.totalPowerLimit / 1000).toFixed(0)} kW
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40 shadow-inner">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold text-xs tracking-wide whitespace-nowrap">
                                <span className="text-emerald-600 font-medium">空間</span>{totalSpace} U
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 font-bold text-xs tracking-wide whitespace-nowrap">
                                <span className="text-amber-600 font-medium">功耗</span>{totalPower.toLocaleString()} W
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 font-bold text-xs tracking-wide whitespace-nowrap">
                                <span className="text-sky-600 font-medium">報價</span>{totalPrice.toLocaleString()} USD
                            </div>
                        </div>
                    )}

                    {/* Rack selector */}
                    {viewMode === 'single' && (
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40">
                            <span className="text-xs text-slate-400 font-semibold px-2">當前機櫃</span>
                            <select
                                value={activeRackId}
                                onChange={(e) => { setActiveRackId(e.target.value); setSelectedId(e.target.value); }}
                                className="bg-slate-800/80 border-none text-sm text-white focus:ring-0 cursor-pointer outline-none pl-2 pr-6 py-1 rounded-lg"
                            >
                                {racks
                                    .filter(r => r.type === 'General' || r.type === 'ORv3')
                                    .map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                                }
                            </select>
                            <button
                                onClick={handleAddRackClick}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap ml-1 mr-1"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    )}
                    {viewMode === 'container' ? (
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40">
                            <button
                                onClick={handleAddContainerClick}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                            >
                                + 新增貨櫃
                            </button>
                        </div>
                    ) : viewMode === 'overview' ? (
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40">
                            <button
                                onClick={handleAddRackClick}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {/* 搜尋欄位 */}
                    {viewMode !== 'container' && (
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="搜尋設備名稱..."
                                value={deviceSearchTerm}
                                onChange={(e) => setDeviceSearchTerm(e.target.value)}
                                className="bg-slate-800/80 border border-slate-700/50 text-xs text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none px-2.5 py-1.5 rounded-lg w-40 hover:border-slate-600 transition-all focus:w-48"
                            />
                            {deviceSearchTerm && (
                                <button 
                                    onClick={() => setDeviceSearchTerm('')}
                                    className="absolute right-2 text-slate-400 hover:text-white text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                            {deviceSearchTerm && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-[#0d1b2e] rounded-xl shadow-2xl border border-slate-600/50 py-1.5 z-50 max-h-60 overflow-y-auto">
                                    {devices.filter(d => 
                                        (d.customName || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
                                        (d.type || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
                                    ).length > 0 ? (
                                        devices.filter(d => 
                                            (d.customName || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
                                            (d.type || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
                                        ).map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => handleSelectSearchDevice(d)}
                                                className="w-full text-left px-3 py-2 hover:bg-indigo-500/15 transition-colors text-xs font-medium text-slate-200 hover:text-indigo-300 rounded-lg flex justify-between items-center"
                                            >
                                                <span className="truncate">{d.customName || d.type}</span>
                                                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 shrink-0 ml-2">
                                                    {racks.find(r => r.id === d.rackId)?.name || '未指定'}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-slate-400 text-center">無匹配的設備</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 復原/重做 */}
                    <div className="flex bg-[#060c16] rounded-lg p-0.5 border border-slate-700/50 shadow-inner items-center gap-0.5">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-1.5 rounded-md transition-all ${
                                canUndo 
                                    ? 'text-slate-300 hover:bg-slate-700/60 hover:text-white' 
                                    : 'text-slate-600 cursor-not-allowed opacity-50'
                            }`}
                            title="復原 (Ctrl+Z)"
                        >
                            <Undo className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-1.5 rounded-md transition-all ${
                                canRedo 
                                    ? 'text-slate-300 hover:bg-slate-700/60 hover:text-white' 
                                    : 'text-slate-600 cursor-not-allowed opacity-50'
                            }`}
                            title="重做 (Ctrl+Y)"
                        >
                            <Redo className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {viewMode !== 'container' && (
                        <>
                            <div className="w-px h-5 bg-slate-700/60 mx-1"></div>
                            
                            {/* RA 建議配置 */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsRaMenuOpen(!isRaMenuOpen)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                        isRaMenuOpen
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25'
                                            : 'bg-slate-700/40 text-slate-300 border-slate-600/50 hover:bg-slate-700/60 hover:text-white'
                                    }`}
                                    title="建議配置資訊"
                                >
                                    <LayoutTemplate className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">建議配置</span>
                                </button>

                                {isRaMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsRaMenuOpen(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-[#0d1b2e] rounded-xl shadow-2xl border border-slate-600/50 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                            {['20台', '16台', '4台', '2台'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => { setRaModalState({ isOpen: true, type: t }); setIsRaMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-500/15 transition-colors text-sm font-semibold text-slate-200 hover:text-indigo-300 rounded-lg"
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* 一鍵清除 */}
                    <button
                        onClick={handleClearAllClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                        title="清空設備"
                    >
                        <Eraser className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">一鍵清除</span>
                    </button>

                    {/* 顯示/隱藏線路 & 最佳化走線 */}
                    {viewMode !== 'container' && (
                        <>
                            <button
                                onClick={() => setShowCables(!showCables)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                    showCables
                                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/35 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                                        : 'bg-slate-700/40 text-slate-500 border-slate-600/50 hover:text-slate-300 hover:bg-slate-700/60'
                                }`}
                            >
                                {showCables ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span className="whitespace-nowrap">{showCables ? '顯示線路' : '隱藏線路'}</span>
                            </button>

                            {/* 最佳化走線 */}
                            {showCables && viewMode !== 'network' && (
                                <button
                                    onClick={() => setIsCableRoutingOptimized(!isCableRoutingOptimized)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                        isCableRoutingOptimized
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold'
                                            : 'bg-slate-700/40 text-slate-500 border-slate-600/50 hover:text-slate-300 hover:bg-slate-700/60'
                                    }`}
                                    title="切換線路路徑為走線槽最佳化路徑或直接連接"
                                >
                                    <Cable className="w-3.5 h-3.5" />
                                    <span className="whitespace-nowrap">{isCableRoutingOptimized ? '最佳化走線' : '直連走線'}</span>
                                </button>
                            )}
                        </>
                    )}



                    {/* 隱藏基礎設施 */}
                    {projectInfo?.isCdcProject && viewMode === 'overview' && (
                        <button
                            onClick={() => setHideNonItCabinets(!hideNonItCabinets)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                hideNonItCabinets
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)] font-bold'
                                    : 'bg-slate-700/40 text-slate-300 border-slate-600/50 hover:bg-slate-700/60 hover:text-white'
                            }`}
                            title="隱藏/顯示 CDU、列間空調、不斷電系統、鋰電池等非 IT 機櫃"
                        >
                            {hideNonItCabinets ? <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> : <Eye className="w-3.5 h-3.5" />}
                            <span className="whitespace-nowrap">{hideNonItCabinets ? '顯示全部' : '隱藏基礎設施'}</span>
                        </button>
                    )}

                    {/* 視圖切換 Segmented Control */}
                    <div className="flex bg-[#060c16] rounded-xl p-1 border border-slate-700/50 shadow-inner items-center">
                        {(viewMode === 'overview' || viewMode === 'network') && (
                            <>
                                <button
                                    onClick={() => setIsFitToScreen(!isFitToScreen)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                        isFitToScreen
                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                                            : 'border-transparent text-slate-500 hover:text-slate-200'
                                    }`}
                                    title={isFitToScreen ? "恢復原始比例" : "自適應縮放至符合螢幕大小"}
                                >
                                    {isFitToScreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                                    <span className="whitespace-nowrap">{isFitToScreen ? '原始比例' : '自適應'}</span>
                                </button>
                                <div className="h-4 w-px bg-slate-700/60 mx-1"></div>
                            </>
                        )}
                        <button
                            onClick={() => setViewMode('single')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'single' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Monitor className="w-3.5 h-3.5" /> 單櫃
                        </button>
                        {projectInfo?.isCdcProject && (
                            <button
                                onClick={() => { setViewMode('container'); setSelectedId(null); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                    viewMode === 'container' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <LayoutTemplate className="w-3.5 h-3.5" /> 貨櫃佈局
                            </button>
                        )}
                        <button
                            onClick={() => { setViewMode('overview'); setSelectedId(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" /> 總覽
                        </button>

                        <button
                            onClick={() => { setViewMode('network'); setSelectedId(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'network' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Share2 className="w-3.5 h-3.5" /> 網路拓撲
                        </button>
                    </div>
                </div>
            </div>

            {isProjectInfoOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-[#111e2e]">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                                    <Info className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-100">專案詳細資訊</h3>
                                    <p className="text-xs text-slate-400">填寫與維護此專案的相關背景資料</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsProjectInfoOpen(false)}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/60 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar bg-[#0d1b2e] text-slate-300 text-sm">
                            {/* CDC Project Toggle */}
                            <div className="flex items-center justify-between p-4 bg-[#14233c]/40 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all">
                                <div className="flex flex-col gap-0.5 pr-4">
                                    <span className="text-sm font-bold text-slate-200">是否為 CDC (貨櫃資料中心) 專案</span>
                                    <span className="text-xs text-slate-400">啟用後，總覽頁面將會以貨櫃為單位進行切換與篩選，且支援貨櫃層級的指標估算。</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={projectInfo?.isCdcProject || false}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setProjectInfo({ ...projectInfo, isCdcProject: isChecked });
                                            if (!isChecked && viewMode === 'container') {
                                                setViewMode('overview');
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650"></div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Client Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">客戶名稱</label>
                                    <input
                                        type="text"
                                        value={projectInfo?.clientName || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, clientName: e.target.value })}
                                        placeholder="請輸入客戶公司或名稱..."
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Project Manager */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">專案負責人</label>
                                    <input
                                        type="text"
                                        value={projectInfo?.projectManager || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, projectManager: e.target.value })}
                                        placeholder="請輸入專案負責人..."
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Installation Location */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">裝機地點</label>
                                    <input
                                        type="text"
                                        value={projectInfo?.location || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                                        placeholder="例如: 台北大園 IDC / 台南科學園區"
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Estimated Delivery Date */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">預計交付日期</label>
                                    <input
                                        type="date"
                                        value={projectInfo?.deliveryDate || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, deliveryDate: e.target.value })}
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Contract ID / Project Code */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">合約編號 / 專案代碼</label>
                                    <input
                                        type="text"
                                        value={projectInfo?.contractId || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, contractId: e.target.value })}
                                        placeholder="請輸入合約或專案編號..."
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Budget/Est Power Grid */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">預估總電力限制 (kW)</label>
                                    <input
                                        type="number"
                                        value={projectInfo?.estimatedPowerKw || ''}
                                        onChange={(e) => setProjectInfo({ ...projectInfo, estimatedPowerKw: e.target.value })}
                                        placeholder="請輸入配電容量限制..."
                                        className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Partners Dynamic List */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">合作廠商</label>
                                <div className="space-y-2">
                                    {(projectInfo?.partners || ['']).map((partner, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={partner}
                                                onChange={(e) => {
                                                    const newPartners = [...(projectInfo?.partners || [''])];
                                                    newPartners[index] = e.target.value;
                                                    setProjectInfo({ ...projectInfo, partners: newPartners });
                                                }}
                                                placeholder={`請輸入合作廠商名稱 #${index + 1}...`}
                                                className="flex-1 bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {((projectInfo?.partners || []).length > 1 || partner !== '') && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        let newPartners = (projectInfo?.partners || []).filter((_, i) => i !== index);
                                                        if (newPartners.length === 0) newPartners = [''];
                                                        setProjectInfo({ ...projectInfo, partners: newPartners });
                                                    }}
                                                    className="p-2 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-400 rounded-lg transition-colors bg-slate-800/40"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setProjectInfo({ ...projectInfo, partners: [...(projectInfo?.partners || ['']), ''] })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        新增合作廠商
                                    </button>
                                </div>
                            </div>

                            {/* Project Notes */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">專案備註 / 說明</label>
                                <textarea
                                    value={projectInfo?.notes || ''}
                                    onChange={(e) => setProjectInfo({ ...projectInfo, notes: e.target.value })}
                                    placeholder="填寫其他附屬資訊或備忘錄..."
                                    rows={3}
                                    className="w-full bg-[#09111c] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#111e2e] border-t border-slate-700/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setIsProjectInfoOpen(false)}
                                className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/25"
                            >
                                儲存並關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
