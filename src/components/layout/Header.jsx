import React from 'react';
import { Server, Settings, FileBox, Save, Download, DownloadCloud, Monitor, LayoutDashboard, Share2, Minimize, Maximize, Eraser, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const Header = () => {
    const { 
        viewMode, setViewMode, racks, setRacks, setDevices, activeRackId, setActiveRackId, setSelectedId,
        isFitToScreen, setIsFitToScreen, showCables, setShowCables,
        isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen,
        isExporting, fileInputRef,
        handleFileChange, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage,
        setClearConfirm, generateId, showAlert 
    } = useRackPlanner();

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
        <header className="h-14 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between px-6 shrink-0 relative z-30 shadow-md">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-500" />
                    <h1 className="text-xl font-bold text-slate-100 tracking-wide font-mono">
                        RACK<span className="text-blue-500">PLANNER</span> <span className="text-[10px] text-slate-500 align-top">PRO</span>
                    </h1>
                </div>

                <div className="h-6 w-px bg-slate-700/50 hidden sm:block"></div>

                <div className="hidden sm:flex bg-slate-950/80 p-0.5 rounded-md border border-slate-700 shadow-inner">
                    <div className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                                isFileMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isExporting ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <FileBox className="w-4 h-4" />}
                            檔案
                        </button>

                        {isFileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
                                <div className="absolute left-0 top-full mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-600 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-500 tracking-wider">專案存檔</div>
                                    <label className="flex items-center gap-3 px-4 py-2 hover:bg-blue-500/20 hover:text-blue-400 cursor-pointer text-sm text-slate-300 transition-colors">
                                        <DownloadCloud className="w-4 h-4" /> 讀取專案檔 (.json)
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                    </label>
                                    <button onClick={handleSaveData} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-500/20 hover:text-blue-400 text-sm text-slate-300 transition-colors">
                                        <Save className="w-4 h-4" /> 儲存目前專案 (.json)
                                    </button>
                                    
                                    <div className="h-px bg-slate-700 my-2"></div>
                                    
                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-500 tracking-wider">報表與圖檔</div>
                                    <button onClick={handleExportBOM} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-emerald-500/20 hover:text-emerald-400 text-sm text-slate-300 transition-colors">
                                        <Download className="w-4 h-4" /> 匯出 BOM 表 (.csv)
                                    </button>
                                    <button onClick={handleExportCableRouting} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-purple-500/20 hover:text-purple-400 text-sm text-slate-300 transition-colors">
                                        <Share2 className="w-4 h-4" /> 匯出網路線路表 (.csv)
                                    </button>
                                    <button onClick={handleExportImage} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-orange-500/20 hover:text-orange-400 text-sm text-slate-300 transition-colors">
                                        <Monitor className="w-4 h-4" /> 匯出機櫃示意圖 (.png)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {viewMode === 'single' && (
                    <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-md border border-slate-700 shadow-inner mr-4">
                        <span className="text-xs text-slate-400 font-bold px-2">當前機櫃</span>
                        <select
                            value={activeRackId}
                            onChange={(e) => { setActiveRackId(e.target.value); setSelectedId(e.target.value); }}
                            className="bg-slate-800 border-none text-sm text-white focus:ring-0 cursor-pointer outline-none pl-2 pr-6 py-1 rounded"
                        >
                            {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button
                            onClick={handleAddRackClick}
                            className="ml-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                            + 新增機櫃
                        </button>
                    </div>
                )}

                {(viewMode === 'overview' || viewMode === 'network') && (
                    <button
                        onClick={() => setIsFitToScreen(!isFitToScreen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 mr-2 text-sm font-medium rounded transition-all border ${
                            isFitToScreen ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                        }`}
                        title={isFitToScreen ? "恢復原始比例" : "自適應縮放至符合螢幕大小"}
                    >
                        {isFitToScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isFitToScreen ? '原始比例' : '自適應'}</span>
                    </button>
                )}

                <button
                    onClick={handleClearAllClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 mr-2 text-sm font-medium rounded transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
                    title="清空設備"
                >
                    <Eraser className="w-4 h-4" /> <span className="hidden sm:inline">一鍵清除</span>
                </button>

                <button
                    onClick={() => setShowCables(!showCables)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 mr-4 text-sm font-medium rounded transition-all border ${
                        showCables ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                    }`}
                >
                    {showCables ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="hidden sm:inline">{showCables ? '顯示線路' : '隱藏線路'}</span>
                </button>

                <div className="flex bg-slate-900 rounded-md p-1 border border-slate-700 shadow-inner">
                    <button
                        onClick={() => setViewMode('single')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                            viewMode === 'single' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Monitor className="w-4 h-4" /> 單櫃
                    </button>
                    <button
                        onClick={() => { setViewMode('overview'); setSelectedId(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                            viewMode === 'overview' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> 總覽
                    </button>
                    <button
                        onClick={() => { setViewMode('network'); setSelectedId(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                            viewMode === 'network' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Share2 className="w-4 h-4" /> 網路拓撲
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
