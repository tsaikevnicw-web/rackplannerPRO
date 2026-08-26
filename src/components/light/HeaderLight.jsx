import React, { useState } from 'react';
import { Server, Settings, FileBox, Save, Download, DownloadCloud, Monitor, LayoutDashboard, Share2, Minimize, Maximize, Eraser, Eye, EyeOff, LayoutTemplate, BookOpen, Undo, Redo, Flame, Box, Printer, Bug, Cable, Plus, Minus, Info, X, ChevronDown, Check } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const HeaderLight = () => {
    const { 
        devices,
        viewMode, setViewMode, racks, setRacks, setDevices, activeRackId, setActiveRackId, setSelectedId,
        setSelectedIds, selectedIds,
        isFitToScreen, setIsFitToScreen, showCables, setShowCables, showHeatmap, setShowHeatmap, hideNonItCabinets, setHideNonItCabinets,
        isCableRoutingOptimized, setIsCableRoutingOptimized,
        isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen,
        isUserManualOpen, setIsUserManualOpen,
        isBugTrackerOpen, setIsBugTrackerOpen,
        isNetworkCablingOpen, setIsNetworkCablingOpen,
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
        showAlert(`已新增一個 40呎 貨櫃 (貨櫃-${nextLetter})！`, '新增成功', 'success');
    };

    return (
        <header className="bg-white border-b border-slate-200 flex flex-col shrink-0 relative z-[150] shadow-xs">
            {/* Top Row: Enterprise Header (Brand + Document Context + Global Actions) */}
            <div className="h-12 w-full flex items-center justify-between px-5 border-b border-slate-100">
                {/* Brand & Suite Name */}
                <div className="flex items-center gap-3 shrink-0">
                    <div 
                        className="relative group flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                        title="Inventec Enterprise Solution Group"
                    >
                        <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white">
                            <Server className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 tracking-tight font-sans">
                                RackPlanner
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                PRO CAD
                            </span>
                        </div>

                        {/* Author Info Popover */}
                        <div className="absolute top-full left-0 mt-1 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[250]">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs whitespace-nowrap min-w-[240px] text-slate-700">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Enterprise Solution Lead
                                </div>
                                <div className="font-semibold text-slate-900">
                                    Inventec Corp · Kevin Tsai
                                </div>
                                <div className="text-[11px] text-blue-600 font-mono mt-0.5">
                                    Tsai.KevinC.W@inventec.com
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-slate-200"></div>

                    {/* Inline Document Name */}
                    <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 rounded px-2.5 py-1 border border-slate-200 transition-all">
                        <span className="text-[11px] font-medium text-slate-500">專案:</span>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="輸入專案名稱..."
                            className="bg-transparent border-none outline-none text-xs font-semibold text-slate-900 placeholder-slate-400 focus:ring-0 p-0 w-36 focus:w-48 transition-all"
                        />
                    </div>

                    {/* Project Spec Indicator */}
                    {(() => {
                        const designType = projectInfo?.designType || 'common';
                        let label = 'Common Design';
                        let badgeCls = 'bg-slate-50 text-slate-700 border-slate-200';

                        if (designType === 'cdc') {
                            label = 'CDC 貨櫃規格';
                            badgeCls = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        } else if (designType === 'msft') {
                            label = 'MSFT 規格';
                            badgeCls = 'bg-blue-50 text-blue-800 border-blue-200';
                        }

                        return (
                            <button
                                onClick={() => setIsProjectInfoOpen(true)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors hover:border-slate-400 ${badgeCls}`}
                                title="點擊檢視/編輯專案規格"
                            >
                                <span>{label}</span>
                                <Info className="w-3 h-3 opacity-60" />
                            </button>
                        );
                    })()}
                </div>

                {/* Right Global Action Bar */}
                <div className="flex items-center gap-1.5">
                    {/* Undo / Redo */}
                    <div className="flex items-center bg-slate-50 rounded border border-slate-200 p-0.5 mr-1">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-1 rounded transition-colors ${canUndo ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'}`}
                            title="復原 (Ctrl+Z)"
                        >
                            <Undo className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-1 rounded transition-colors ${canRedo ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'}`}
                            title="重做 (Ctrl+Y)"
                        >
                            <Redo className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <button
                        onClick={handleExportImage}
                        disabled={isExporting}
                        className="cad-btn flex items-center gap-1.5"
                    >
                        <Monitor className="w-3.5 h-3.5 text-slate-500" /> 截圖
                    </button>

                    {/* File Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            disabled={isExporting}
                            className={`cad-btn flex items-center gap-1.5 ${isFileMenuOpen ? 'bg-slate-100 border-slate-400' : ''}`}
                        >
                            <FileBox className="w-3.5 h-3.5 text-slate-600" /> 檔案
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {isFileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50 animate-in fade-in-50 duration-100 text-xs">
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">專案資料</div>
                                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
                                        <DownloadCloud className="w-3.5 h-3.5 text-slate-500" /> 讀取專案 (.json)
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                    </label>
                                    <button onClick={handleSaveData} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium text-left">
                                        <Save className="w-3.5 h-3.5 text-slate-500" /> 儲存專案 (.json)
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">工程報表</div>
                                    <button onClick={handleExportBOM} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium text-left">
                                        <Download className="w-3.5 h-3.5 text-emerald-600" /> 匯出 BOM 表 (.csv)
                                    </button>
                                    <button onClick={() => { setIsNetworkCablingOpen(true); setIsFileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium text-left">
                                        <Share2 className="w-3.5 h-3.5 text-blue-600" /> 網路線路規格表
                                    </button>
                                    <button onClick={handlePrintPDF} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium text-left">
                                        <Printer className="w-3.5 h-3.5 text-amber-600" /> 列印規格書 (PDF)
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button onClick={() => { setIsUserManualOpen(true); setIsFileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium text-left">
                                        <BookOpen className="w-3.5 h-3.5 text-slate-500" /> 系統操作手冊
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Key Engineering Metrics (一目了然) + View Switcher + Tools */}
            <div className="h-11 w-full flex items-center justify-between px-5 bg-slate-50 border-t border-slate-100 text-xs">
                {/* Clean Engineering KPI Cards */}
                <div className="flex items-center gap-2 shrink-0">
                    {viewMode === 'container' ? (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded shadow-2xs font-mono font-medium">
                                <span className="text-[11px] font-sans text-slate-500 font-normal">PUE 係數:</span>
                                <span className="font-bold text-slate-900">{containerStats.pue.toFixed(2)}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-white border rounded shadow-2xs font-mono font-medium ${
                                containerStats.totalWeight > containerStats.totalWeightLimit ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-800'
                            }`}>
                                <span className="text-[11px] font-sans text-slate-500 font-normal">總重量:</span>
                                <span className="font-bold">{containerStats.totalWeight.toLocaleString()} / {containerStats.totalWeightLimit.toLocaleString()} kg</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-white border rounded shadow-2xs font-mono font-medium ${
                                containerStats.totalPower > containerStats.totalPowerLimit ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-800'
                            }`}>
                                <span className="text-[11px] font-sans text-slate-500 font-normal">總功耗:</span>
                                <span className="font-bold">{(containerStats.totalPower / 1000).toFixed(1)} / {(containerStats.totalPowerLimit / 1000).toFixed(0)} kW</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded shadow-2xs font-mono font-medium">
                                <span className="text-[11px] font-sans text-slate-500 font-normal">已用空間:</span>
                                <span className="font-bold text-slate-900">{totalSpace} U</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded shadow-2xs font-mono font-medium">
                                <span className="text-[11px] font-sans text-slate-500 font-normal">負載功耗:</span>
                                <span className="font-bold text-slate-900">{totalPower.toLocaleString()} W</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded shadow-2xs font-mono font-medium">
                                <span className="text-[11px] font-sans text-slate-500 font-normal">BOM 總價:</span>
                                <span className="font-bold text-slate-900">${totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Active Rack / Add Rack Controls */}
                    {viewMode === 'single' && (
                        <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                            <span className="text-[11px] text-slate-500 font-medium">當前機櫃:</span>
                            <select
                                value={activeRackId}
                                onChange={(e) => { setActiveRackId(e.target.value); setSelectedId(e.target.value); }}
                                className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer outline-none pl-2 pr-6 py-0.5 rounded shadow-2xs"
                            >
                                {racks
                                    .filter(r => r.type === 'General' || r.type === 'ORv3')
                                    .map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                                }
                            </select>
                            <button
                                onClick={handleAddRackClick}
                                className="cad-btn-primary px-2.5 py-0.5 rounded text-xs"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    )}
                    {viewMode === 'container' ? (
                        <div className="ml-3 pl-3 border-l border-slate-200">
                            <button
                                onClick={handleAddContainerClick}
                                className="cad-btn-primary px-2.5 py-1 rounded text-xs"
                            >
                                + 新增貨櫃
                            </button>
                        </div>
                    ) : viewMode === 'overview' ? (
                        <div className="ml-3 pl-3 border-l border-slate-200">
                            <button
                                onClick={handleAddRackClick}
                                className="cad-btn-primary px-2.5 py-1 rounded text-xs"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Right Tool Group: Search + View Toggles + Mode Switcher */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {/* Device Search */}
                    {viewMode !== 'container' && (
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="搜尋設備/伺服器..."
                                value={deviceSearchTerm}
                                onChange={(e) => setDeviceSearchTerm(e.target.value)}
                                className="bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none px-2 py-1 rounded w-36 hover:border-slate-300 transition-all focus:w-48 shadow-2xs"
                            />
                            {deviceSearchTerm && (
                                <button 
                                    onClick={() => setDeviceSearchTerm('')}
                                    className="absolute right-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                            {deviceSearchTerm && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-60 overflow-y-auto">
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
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-800 rounded flex justify-between items-center"
                                            >
                                                <span className="truncate">{d.customName || d.type}</span>
                                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
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

                    {/* RA Templates */}
                    {viewMode !== 'container' && (
                        <div className="relative">
                            <button
                                onClick={() => setIsRaMenuOpen(!isRaMenuOpen)}
                                className={`cad-btn flex items-center gap-1 ${isRaMenuOpen ? 'bg-slate-100 border-slate-400' : ''}`}
                                title="建議架構配置範本"
                            >
                                <LayoutTemplate className="w-3.5 h-3.5 text-slate-500" />
                                <span>建議架構</span>
                            </button>

                            {isRaMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsRaMenuOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50 text-xs font-medium">
                                        {['20台', '16台', '4台', '2台'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => { setRaModalState({ isOpen: true, type: t }); setIsRaMenuOpen(false); }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                                            >
                                                標準 {t} 規格
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Clear All */}
                    <button
                        onClick={handleClearAllClick}
                        className="cad-btn-danger px-2.5 py-1 rounded text-xs flex items-center gap-1"
                        title="清空設備"
                    >
                        <Eraser className="w-3 h-3" /> <span>清空</span>
                    </button>

                    {/* Show/Hide Cables */}
                    {viewMode !== 'container' && (
                        <>
                            <button
                                onClick={() => setShowCables(!showCables)}
                                className={`cad-btn flex items-center gap-1 ${showCables ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                            >
                                {showCables ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span>{showCables ? '線路: 顯示' : '線路: 隱藏'}</span>
                            </button>

                            {showCables && viewMode !== 'network' && (
                                <button
                                    onClick={() => setIsCableRoutingOptimized(!isCableRoutingOptimized)}
                                    className={`cad-btn flex items-center gap-1 ${isCableRoutingOptimized ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : ''}`}
                                    title="走線槽最佳化路徑"
                                >
                                    <Cable className="w-3.5 h-3.5" />
                                    <span>{isCableRoutingOptimized ? '線槽走線' : '直連走線'}</span>
                                </button>
                            )}
                        </>
                    )}

                    {/* Hide Non-IT Infra */}
                    {projectInfo?.isCdcProject && viewMode === 'overview' && (
                        <button
                            onClick={() => setHideNonItCabinets(!hideNonItCabinets)}
                            className={`cad-btn flex items-center gap-1 ${hideNonItCabinets ? 'bg-slate-900 text-white' : ''}`}
                        >
                            {hideNonItCabinets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{hideNonItCabinets ? '僅顯示 IT' : '全部模組'}</span>
                        </button>
                    )}

                    {/* Modern B2B Segmented View Switcher */}
                    <div className="flex bg-slate-200/80 p-0.5 rounded-md border border-slate-200 items-center">
                        {(viewMode === 'overview' || viewMode === 'network') && (
                            <>
                                <button
                                    onClick={() => setIsFitToScreen(!isFitToScreen)}
                                    className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                                        isFitToScreen ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    title={isFitToScreen ? "恢復原始比例" : "自適應視窗"}
                                >
                                    {isFitToScreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
                                    <span>{isFitToScreen ? '100%' : '適應'}</span>
                                </button>
                                <div className="h-3 w-px bg-slate-300 mx-0.5"></div>
                            </>
                        )}
                        <button
                            onClick={() => setViewMode('single')}
                            className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${
                                viewMode === 'single' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            單櫃視圖
                        </button>
                        {projectInfo?.isCdcProject && (
                            <button
                                onClick={() => { setViewMode('container'); setSelectedId(null); }}
                                className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${
                                    viewMode === 'container' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                貨櫃佈局
                            </button>
                        )}
                        <button
                            onClick={() => { setViewMode('overview'); setSelectedId(null); }}
                            className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${
                                viewMode === 'overview' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            機房總覽
                        </button>
                        <button
                            onClick={() => { setViewMode('network'); setSelectedId(null); }}
                            className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${
                                viewMode === 'network' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            網路拓撲
                        </button>
                    </div>
                </div>
            </div>

            {/* Project Specs Modal */}
            {isProjectInfoOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[20000] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 w-full max-w-xl rounded-xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh]">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                <h3 className="text-sm font-semibold text-slate-900">專案規格與分類設定</h3>
                            </div>
                            <button
                                onClick={() => setIsProjectInfoOpen(false)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-slate-700 text-xs">
                            <div className="space-y-2">
                                <label className="block font-medium text-slate-700">設計規範分類 (System Specification)</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    {/* Common Design */}
                                    <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        (projectInfo?.designType || 'common') === 'common'
                                            ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/30'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={(projectInfo?.designType || 'common') === 'common'}
                                            onChange={() => {
                                                setProjectInfo({ ...projectInfo, designType: 'common', isCdcProject: false });
                                                if (viewMode === 'container') setViewMode('overview');
                                            }}
                                            className="hidden"
                                        />
                                        <div className="font-semibold text-slate-900">Common Design</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">標準機架系統設計規範</div>
                                    </label>

                                    {/* CDC */}
                                    <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        projectInfo?.designType === 'cdc'
                                            ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500/30'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={projectInfo?.designType === 'cdc'}
                                            onChange={() => setProjectInfo({ ...projectInfo, designType: 'cdc', isCdcProject: true })}
                                            className="hidden"
                                        />
                                        <div className="font-semibold text-slate-900">CDC 貨櫃規格</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">貨櫃式機房與電力散熱模組</div>
                                    </label>

                                    {/* MSFT */}
                                    <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        projectInfo?.designType === 'msft'
                                            ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/30'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={projectInfo?.designType === 'msft'}
                                            onChange={() => {
                                                setProjectInfo({ ...projectInfo, designType: 'msft', isCdcProject: false });
                                                if (viewMode === 'container') setViewMode('overview');
                                            }}
                                            className="hidden"
                                        />
                                        <div className="font-semibold text-slate-900">MSFT 設計規格</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">微軟資料中心參考架構</div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setIsProjectInfoOpen(false)}
                                className="cad-btn-primary px-4 py-1.5 text-xs font-semibold rounded"
                            >
                                確認完成
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default HeaderLight;
