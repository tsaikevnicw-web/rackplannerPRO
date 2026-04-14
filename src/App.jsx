import React, { useEffect } from 'react';
import { RackPlannerProvider, useRackPlanner } from './context/RackPlannerContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import RackView from './components/rack/RackView';
import NetworkTopology from './components/network/NetworkTopology';
import { getFabricGroup } from './utils/helpers';
import { X, AlertTriangle, CheckCircle2, Info, Eraser, Trash2, Unplug } from 'lucide-react';

const AppContent = () => {
    const { 
        viewMode, racks, devices, activeRackId, isFitToScreen, scaleFactor, setScaleFactor,
        mainAreaRef, rackContainerRef, layoutSize, setLayoutSize,
        alertModal, setAlertModal, clearConfirm, setClearConfirm, deleteRackConfirm, setDeleteRackConfirm,
        clearDeviceConfirm, setClearDeviceConfirm, setDevices, setRacks, setActiveRackId, setSelectedId
    } = useRackPlanner();

    // Scale Logic
    useEffect(() => {
        if (!isFitToScreen || viewMode === 'single' || !mainAreaRef.current || !rackContainerRef.current) {
            setScaleFactor(1);
            return;
        }

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === mainAreaRef.current) {
                    const mw = entry.contentRect.width;
                    const mh = entry.contentRect.height;
                    
                    const cw = rackContainerRef.current.scrollWidth;
                    const ch = rackContainerRef.current.scrollHeight;
                    setLayoutSize({ w: cw, h: ch });

                    if (cw > 0 && ch > 0) {
                        const scaleW = mw / (cw + 64);
                        const scaleH = mh / (ch + 64);
                        setScaleFactor(Math.min(scaleW, scaleH, 1));
                    }
                }
            }
        });

        resizeObserver.observe(mainAreaRef.current);
        return () => resizeObserver.disconnect();
    }, [viewMode, racks.length, isFitToScreen]);

    // Derived states
    const racksToRender = viewMode === 'single' ? racks.filter(r => r.id === activeRackId) : racks;
    const nsDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'North-South');
    const ewSpineDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'East-West' && d.networkRole === 'Spine');
    const ewLeafDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'East-West' && d.networkRole !== 'Spine');
    const epDevs = devices.filter(d => !(d.type || '').startsWith('Switch') && d.type !== 'Router' && d.type !== 'Blank' && d.type !== 'UPS');

    const executeClear = () => {
        if (clearConfirm.type === 'single') setDevices(prev => prev.filter(d => d.rackId !== activeRackId));
        else { setRacks([{ id: 'rack-1', name: 'RACK-001', type: 'General', uCount: 48 }]); setDevices([]); setActiveRackId('rack-1'); }
        setClearConfirm({ isOpen: false, type: '' }); setSelectedId(null);
    };

    const executeDeleteRack = () => {
        setRacks(prev => prev.filter(r => r.id !== deleteRackConfirm.rackId));
        setDevices(prev => prev.filter(d => d.rackId !== deleteRackConfirm.rackId));
        if (activeRackId === deleteRackConfirm.rackId) setActiveRackId(racks.find(r => r.id !== deleteRackConfirm.rackId)?.id || null);
        setDeleteRackConfirm({ isOpen: false, rackId: null }); setSelectedId(null);
    };

    const executeClearDeviceConnections = () => {
        setDevices(prev => prev.map(dev => {
            if (dev.id === clearDeviceConfirm.deviceId) return { ...dev, connections: {} };
            const newConns = { ...(dev.connections || {}) };
            Object.keys(newConns).forEach(k => { if (newConns[k] && newConns[k].startsWith(`${clearDeviceConfirm.deviceId}-`)) delete newConns[k]; });
            return { ...dev, connections: newConns };
        }));
        setClearDeviceConfirm({ isOpen: false, deviceId: null });
    };

    return (
        <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans select-none">
            <Header />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />
                <main ref={mainAreaRef} className="flex-1 relative overflow-auto main-canvas bg-[#020617]">
                    <div 
                        className={`relative flex ${viewMode === 'overview' ? 'justify-start min-w-full w-max' : 'justify-center w-full'}`}
                        style={{ width: isFitToScreen && viewMode !== 'single' ? `${layoutSize.w * scaleFactor}px` : undefined }}
                    >
                        <div 
                            ref={rackContainerRef} 
                            className={`relative flex p-8 pb-12 ${viewMode === 'overview' ? 'gap-8 flex-row items-start justify-start w-max' : 'flex-col items-center w-full'} ${viewMode === 'network' ? 'min-w-[1800px] shrink-0' : ''}`} 
                            style={{ transform: isFitToScreen && viewMode !== 'single' ? `scale(${scaleFactor})` : 'none', transformOrigin: 'top left' }}
                        >
                             {viewMode === 'network' ? (
                                 <NetworkTopology nsDevs={nsDevs} ewSpineDevs={ewSpineDevs} ewLeafDevs={ewLeafDevs} epDevs={epDevs} />
                             ) : (
                                 <RackView racksToRender={racksToRender} />
                             )}
                        </div>
                    </div>
                </main>
                <RightPanel />
            </div>

            {/* Modals */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
                            {alertModal.type === 'error' && <X className="w-5 h-5 text-red-500" />}
                            {alertModal.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                            {alertModal.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {alertModal.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                            <h3 className="text-lg font-bold text-slate-200">{alertModal.title}</h3>
                        </div>
                        <div className="p-6 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{alertModal.message}</div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-end">
                            <button onClick={() => setAlertModal({ ...alertModal, isOpen: false })} className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/30">了解</button>
                        </div>
                    </div>
                </div>
            )}

            {clearConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700"><h3 className="text-lg font-bold text-red-400 flex items-center gap-2"><Eraser className="w-5 h-5" /> 警告：一鍵清除</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要清除{clearConfirm.type === 'single' ? '「當前機櫃」' : '「所有機櫃」'} 中的所有設備嗎？</p><p className="text-sm text-slate-500 mt-2">此操作無法復原，請確認您已經匯出存檔！</p></div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setClearConfirm({ isOpen: false, type: '' })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={executeClear} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/30">確定清除</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteRackConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700"><h3 className="text-lg font-bold text-red-400 flex items-center gap-2"><Trash2 className="w-5 h-5" /> 警告：刪除機櫃</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要刪除這個機櫃嗎？</p><p className="text-sm text-slate-500 mt-2">此機櫃內的所有設備將被一併移除，且與其相關的網路線也會被清除。此操作無法復原！</p></div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setDeleteRackConfirm({ isOpen: false, rackId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={executeDeleteRack} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/30">確定刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {clearDeviceConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700"><h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2"><Unplug className="w-5 h-5" /> 警告：清除設備連線</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要清除此設備的所有網路連線嗎？</p><p className="text-sm text-slate-500 mt-2">包含此設備主動連出的線路，以及其他設備連向此設備的線路都會被一併徹底移除。</p></div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setClearDeviceConfirm({ isOpen: false, deviceId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={executeClearDeviceConnections} className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 hover:bg-yellow-500 text-white transition-colors shadow-lg shadow-yellow-600/30">確定清除</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function App() {
    return (
        <RackPlannerProvider>
            <AppContent />
        </RackPlannerProvider>
    );
}