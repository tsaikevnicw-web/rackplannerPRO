import { Server, Settings, FileBox, Save, Download, DownloadCloud, Monitor, LayoutDashboard, Share2, Minimize, Maximize, Eraser, Eye, EyeOff, LayoutTemplate, BookOpen, Undo, Redo, Flame, Box, Printer, Bug } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const Header = () => {
    const { 
        devices,
        viewMode, setViewMode, racks, setRacks, setDevices, activeRackId, setActiveRackId, setSelectedId,
        setSelectedIds, selectedIds,
        isFitToScreen, setIsFitToScreen, showCables, setShowCables, showHeatmap, setShowHeatmap,
        isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen,
        isUserManualOpen, setIsUserManualOpen,
        isBugTrackerOpen, setIsBugTrackerOpen,
        isExporting, fileInputRef,
        handleFileChange, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage, handlePrintPDF,
        setClearConfirm, setRaModalState, generateId, showAlert,
        undo, redo, canUndo, canRedo,
        deviceSearchTerm, setDeviceSearchTerm,
        projectName, setProjectName
    } = useRackPlanner();

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

    const totalSpace = devices.filter(d => d.type !== 'SideCDU').reduce((sum, dev) => sum + (dev.size || 0), 0);
    const totalPower = devices.reduce((sum, dev) => sum + (dev.power || 0), 0);
    const totalPrice = devices.reduce((sum, dev) => sum + (dev.price || 0), 0);

    const handleClearAllClick = () => {
        if (viewMode === 'single') setClearConfirm({ isOpen: true, type: 'single' });
        else setClearConfirm({ isOpen: true, type: 'all' });
    };

    const handleAddRackClick = () => {
        const newId = `rack-${Date.now()}`;
        setRacks([...racks, { id: newId, name: `RACK-${String(racks.length + 1).padStart(3, '0')}`, type: 'General', uCount: 48 }]);
        setActiveRackId(newId);
        if (viewMode === 'network') setViewMode('overview');
    };

    return (
        <header className="bg-[#0b1523] border-b border-slate-700/40 flex flex-col shrink-0 relative z-30 shadow-2xl">
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

                {/* Project Name Input */}
                <div className="flex-1 max-w-sm mx-8">
                    <div className="relative flex items-center bg-slate-900/40 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all px-3 py-1.5 gap-2">
                        <span className="text-xs font-semibold text-slate-500 select-none uppercase tracking-wider whitespace-nowrap">專案名稱</span>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="請輸入專案名稱..."
                            className="w-full bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-600 focus:ring-0 p-0"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsBugTrackerOpen(true)}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Bug className="w-4 h-4" /> BUG 紀錄
                    </button>

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

                    {/* Rack selector */}
                    {(viewMode === 'single' || viewMode === 'overview') && (
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40">
                            {viewMode === 'single' && (
                                <>
                                    <span className="text-xs text-slate-400 font-semibold px-2">當前機櫃</span>
                                    <select
                                        value={activeRackId}
                                        onChange={(e) => { setActiveRackId(e.target.value); setSelectedId(e.target.value); }}
                                        className="bg-slate-800/80 border-none text-sm text-white focus:ring-0 cursor-pointer outline-none pl-2 pr-6 py-1 rounded-lg"
                                    >
                                        {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </>
                            )}
                            <button
                                onClick={handleAddRackClick}
                                className="ml-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {/* 搜尋欄位 */}
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

                    {/* 一鍵清除 */}
                    <button
                        onClick={handleClearAllClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                        title="清空設備"
                    >
                        <Eraser className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">一鍵清除</span>
                    </button>

                    {/* 顯示/隱藏線路 */}
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

                    {/* 熱圖模式 */}
                    {viewMode !== 'network' && (
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                                showHeatmap
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold'
                                    : 'bg-slate-700/40 text-slate-500 border-slate-600/50 hover:text-slate-300 hover:bg-slate-700/60'
                            }`}
                        >
                            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-bounce text-amber-500' : ''}`} />
                            <span className="whitespace-nowrap">熱圖模式</span>
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
                        <button
                            onClick={() => { setViewMode('overview'); setSelectedId(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" /> 總覽
                        </button>
                        <button
                            onClick={() => { setViewMode('3d'); setSelectedId(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                viewMode === '3d' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Box className="w-3.5 h-3.5" /> 3D 視圖
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
        </header>
    );
};

export default Header;
