import React from 'react';
import { Server, Settings, FileBox, Save, Download, DownloadCloud, Monitor, LayoutDashboard, Share2, Minimize, Maximize, Eraser, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const Header = () => {
    const { 
        devices,
        viewMode, setViewMode, racks, setRacks, setDevices, activeRackId, setActiveRackId, setSelectedId,
        isFitToScreen, setIsFitToScreen, showCables, setShowCables,
        isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen,
        isExporting, fileInputRef,
        handleFileChange, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage,
        setClearConfirm, setRaModalState, generateId, showAlert 
    } = useRackPlanner();

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
        <header className="bg-slate-900 border-b border-slate-700/80 flex flex-col shrink-0 relative z-30 shadow-md">
            {/* Top Row: Logo (left) and File / Screenshot (right) */}
            <div className="h-14 w-full flex items-center justify-between px-6 border-b border-slate-700/40">
                <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-500" />
                    <h1 className="text-xl font-bold text-slate-100 tracking-wide font-mono">
                        RACK<span className="text-blue-500">PLANNER</span> <span className="text-[10px] text-slate-500 align-top">PRO</span>
                    </h1>
                </div>

                <div className="flex bg-slate-950/80 p-0.5 rounded-md border border-slate-700 shadow-inner gap-1">
                    <button
                        onClick={handleExportImage}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all text-orange-400 hover:bg-slate-800 hover:text-orange-300 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Monitor className="w-4 h-4" /> 截圖存檔
                    </button>
                    
                    <div className="h-4 w-px bg-slate-700 mx-1 self-center hidden sm:block"></div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
                                isFileMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FileBox className="w-4 h-4" /> 檔案
                        </button>

                        {isFileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-600 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
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
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Stats and Toolbar */}
            <div className="h-12 w-full flex items-center justify-between px-6 bg-slate-900 border-b-2 border-slate-950 overflow-x-auto">
                <div className="flex items-center gap-4 text-xs font-bold tracking-wide shrink-0">
                    <div className="text-emerald-400 px-3 py-1 rounded border border-emerald-500/20 shadow-inner group whitespace-nowrap">
                        機房總空間：{totalSpace} U
                    </div>
                    <div className="text-orange-400 px-3 py-1 rounded border border-orange-500/20 shadow-inner group whitespace-nowrap">
                        機房總功耗：{totalPower.toLocaleString()} W
                    </div>
                    <div className="text-blue-400 px-3 py-1 rounded border border-blue-500/20 shadow-inner group whitespace-nowrap">
                        機房總價：${totalPrice.toLocaleString()}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-6">
                    {(viewMode === 'single' || viewMode === 'overview') && (
                        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-md border border-slate-700 shadow-inner mr-2">
                            {viewMode === 'single' && (
                                <>
                                    <span className="text-xs text-slate-400 font-bold px-2">當前機櫃</span>
                                    <select
                                        value={activeRackId}
                                        onChange={(e) => { setActiveRackId(e.target.value); setSelectedId(e.target.value); }}
                                        className="bg-slate-800 border-none text-sm text-white focus:ring-0 cursor-pointer outline-none pl-2 pr-6 py-1 rounded"
                                    >
                                        {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </>
                            )}
                            <button
                                onClick={handleAddRackClick}
                                className="ml-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)] whitespace-nowrap"
                            >
                                + 新增機櫃
                            </button>
                        </div>
                    )}

                    {(viewMode === 'overview' || viewMode === 'network') && (
                        <button
                            onClick={() => setIsFitToScreen(!isFitToScreen)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all border ${
                                isFitToScreen ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                            }`}
                            title={isFitToScreen ? "恢復原始比例" : "自適應縮放至符合螢幕大小"}
                        >
                            {isFitToScreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                            <span className="whitespace-nowrap">{isFitToScreen ? '原始比例' : '自適應'}</span>
                        </button>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setIsRaMenuOpen(!isRaMenuOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all border ${
                                isRaMenuOpen ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                            title="NV RA 建議配置"
                        >
                            <LayoutTemplate className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">建議配置</span>
                        </button>

                        {isRaMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsRaMenuOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-600 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-500 tracking-wider">NVIDIA Reference Architecture</div>
                                    <button 
                                        onClick={() => { setRaModalState({ isOpen: true, type: 'GB200_NVL72' }); setIsRaMenuOpen(false); }}
                                        className="w-full flex flex-col items-start px-4 py-2 hover:bg-blue-500/20 transition-colors group"
                                    >
                                        <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400">GB200 NVL72</div>
                                        <div className="text-[10px] text-slate-500">Liquid-Cooled AI Rack (72 GPUs)</div>
                                    </button>
                                    <button 
                                        onClick={() => { setRaModalState({ isOpen: true, type: 'H100_HGX' }); setIsRaMenuOpen(false); }}
                                        className="w-full flex flex-col items-start px-4 py-2 hover:bg-blue-500/20 transition-colors group"
                                    >
                                        <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400">H100 HGX (8-GPU)</div>
                                        <div className="text-[10px] text-slate-500">Air-Cooled BasePOD Architecture</div>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleClearAllClick}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
                        title="清空設備"
                    >
                        <Eraser className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">一鍵清除</span>
                    </button>

                    <button
                        onClick={() => setShowCables(!showCables)}
                        className={`flex items-center gap-1.5 px-3 py-1 mr-2 text-xs font-medium rounded transition-all border ${
                            showCables ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                        }`}
                    >
                        {showCables ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="whitespace-nowrap">{showCables ? '顯示線路' : '隱藏線路'}</span>
                    </button>

                    <div className="flex bg-slate-900 rounded-md p-1 border border-slate-700 shadow-inner">
                        <button
                            onClick={() => setViewMode('single')}
                            className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
                                viewMode === 'single' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Monitor className="w-3.5 h-3.5" /> 單櫃
                        </button>
                        <button
                            onClick={() => { setViewMode('overview'); setSelectedId(null); }}
                            className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
                                viewMode === 'overview' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" /> 總覽
                        </button>
                        <button
                            onClick={() => { setViewMode('network'); setSelectedId(null); }}
                            className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-all ${
                                viewMode === 'network' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
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
