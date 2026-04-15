import React, { useEffect } from 'react';
import { RackPlannerProvider, useRackPlanner } from './context/RackPlannerContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import RackView from './components/rack/RackView';
import NetworkTopology from './components/network/NetworkTopology';
import CablesOverlay from './components/rack/CablesOverlay';
import { getFabricGroup } from './utils/helpers';
import { X, AlertTriangle, CheckCircle2, Info, Eraser, Trash2, Unplug, LayoutTemplate, BookOpen } from 'lucide-react';
import exampleData from './data/exampleData.json';
import example16Data from './data/example16Data.json';

const AppContent = () => {
    const { 
        viewMode, racks, devices, activeRackId, isFitToScreen, scaleFactor, setScaleFactor,
        mainAreaRef, rackContainerRef, layoutSize, setLayoutSize,
        alertModal, setAlertModal, clearConfirm, setClearConfirm, deleteRackConfirm, setDeleteRackConfirm,
        clearDeviceConfirm, setClearDeviceConfirm, deleteDeviceConfirm, setDeleteDeviceConfirm, setDevices, setRacks, setActiveRackId, setSelectedId,
        raModalState, setRaModalState, handleApplyRATemplate, setViewMode
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
                    
                    // Use standard JS scroll size logic, ignoring transforms visually
                    const cw = rackContainerRef.current.clientWidth || 100;
                    const ch = rackContainerRef.current.clientHeight || 100;
                    setLayoutSize({ w: cw, h: ch });

                    if (cw > 0) {
                        const padding = 64; // accounting for the p-8 padding
                        const scaleW = Math.max((mw - padding) / cw, 0.1);
                        setScaleFactor(scaleW);
                    }
                }
            }
        });

        resizeObserver.observe(mainAreaRef.current);
        return () => resizeObserver.disconnect();
    }, [viewMode, racks.length, isFitToScreen]);

    const handleLoadExample = (dataToLoad) => {
        if (dataToLoad && dataToLoad.racks && dataToLoad.devices) {
            setRacks(dataToLoad.racks);
            setDevices(dataToLoad.devices);
            setViewMode('overview');
            setSelectedId(null);
            setRaModalState({ isOpen: false, type: '' });
        }
    };

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

    const executeDeleteDevice = () => {
        setDevices(prev => prev.map(dev => {
            if (dev.id === deleteDeviceConfirm.deviceId) return null;
            const newConns = { ...(dev.connections || {}) };
            let modified = false;
            Object.keys(newConns).forEach(k => { 
                if (newConns[k] && newConns[k].startsWith(`${deleteDeviceConfirm.deviceId}-`)) {
                    delete newConns[k];
                    modified = true;
                }
            });
            if (!modified) return dev;
            return { ...dev, connections: newConns };
        }).filter(Boolean));
        setDeleteDeviceConfirm({ isOpen: false, deviceId: null });
        setSelectedId(null);
    };
    


    return (
        <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans select-none">
            <Header />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />
                <main ref={mainAreaRef} className="flex-1 relative overflow-auto main-canvas bg-[#020617] flex flex-col">
                    <div 
                        className={`relative flex ${viewMode === 'overview' ? 'min-h-full' : 'justify-center w-full'}`}
                        style={{ 
                            width: isFitToScreen && viewMode !== 'single' ? Math.max(layoutSize.w * scaleFactor, 100) : undefined,
                            height: isFitToScreen && viewMode !== 'single' ? Math.max(layoutSize.h * scaleFactor, 100) : undefined,
                            margin: isFitToScreen && viewMode !== 'single' ? 'auto' : undefined
                        }}
                    >
                        <div 
                            ref={rackContainerRef} 
                            className={`relative flex p-8 pb-12 ${viewMode === 'overview' ? 'gap-8 flex-row items-start justify-start' : 'flex-col items-center w-full'} ${viewMode === 'network' ? 'min-w-[1800px] shrink-0' : ''}`} 
                            style={{ 
                                transform: isFitToScreen && viewMode !== 'single' ? `scale(${scaleFactor})` : 'none', 
                                transformOrigin: 'top left',
                                width: viewMode !== 'single' ? 'max-content' : undefined,
                                height: viewMode !== 'single' ? 'max-content' : undefined
                            }}
                        >
                             <CablesOverlay />
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

            {deleteDeviceConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700"><h3 className="text-lg font-bold text-red-500 flex items-center gap-2"><Trash2 className="w-5 h-5" /> 警告：刪除設備</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要從機櫃中完全刪除這台設備嗎？</p><p className="text-sm text-slate-500 mt-2">此設備以及所有相連的網路線都將被移除，且此操作無法復原！</p></div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setDeleteDeviceConfirm({ isOpen: false, deviceId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={executeDeleteDevice} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/30">確定刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {raModalState.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mt-10 mb-10 max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                                <LayoutTemplate className="w-6 h-6" /> NVIDIA HGX B300 RA 建議配置 ({raModalState.type})
                            </h3>
                            <button onClick={() => setRaModalState({ isOpen: false, type: '' })} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 text-slate-300 overflow-y-auto space-y-6 text-sm custom-scrollbar">
                            {raModalState.type === '20台' ? (
                                <>
                                    <p className="text-sm text-slate-300">針對 20 台 NVIDIA HGX B300 伺服器的部署規劃，以下為該 Reference Architecture (RA) 解決方案中涵蓋的核心設備清單，以及它們所扮演的關鍵角色：</p>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div> 一、運算節點硬體 (Compute Nodes)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">伺服器本體 (20 台)：</span>基於 NVIDIA HGX B300 baseboard 的伺服器，負責承載龐大的 AI 模型訓練與高負載推論工作。</li>
                                            <li><span className="font-bold text-slate-100">GPU (共 160 張)：</span>每台伺服器配置 8 張 NVIDIA B300 SXM GPU，為整個叢集提供核心運算能力，單節點具備高達 64TB/s 的 GPU 聚合頻寬。</li>
                                            <li><span className="font-bold text-slate-100">CPU (共 40 顆)：</span>每台伺服器配置 2 顆 CPU (如 Intel Emerald Rapids 或 AMD Turin 等)，負責處理系統層級指令與一般運算。</li>
                                            <li><span className="font-bold text-slate-100">運算網路卡 (共 160 張)：</span>每台伺服器內建 8 張 NVIDIA ConnectX-8 SuperNIC (800 Gb/s)，專責節點間 (East-West) 的高速 GPU 叢集運算流量與 RDMA 傳輸。</li>
                                            <li><span className="font-bold text-slate-100">融合網路卡 (共 20 張)：</span>每台伺服器配置 1 張 NVIDIA BlueField-3 B3240 DPU，扮演資料中心控制平面的運算核心，負責處理節點與外部網路 (North-South) 的通訊、儲存加速及零信任安全隔離。</li>
                                            <li><span className="font-bold text-slate-100">系統記憶體與儲存：</span>單節點至少配置 2TB 系統記憶體，並搭配 NVMe 硬碟作為本機開機碟與快取空間。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 二、網路交換器與基礎架構</h4>
                                        <p className="mb-3 text-slate-400">在 20 台節點的規模下，網路架構實體上分為三個獨立的平面，以確保頻寬與管理安全性：</p>
                                        <ul className="list-none space-y-3">
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-emerald-400 mb-1">運算網路交換器 (Compute / East-West Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">設備：</span>NVIDIA SN5600 128 埠 400 GbE 交換器。</div>
                                                    <div><span className="text-slate-400">數量：</span>若採用官方建議的高可用性「雙平面」架構，需 12 台交換器 (8 台 Leaf、4 台 Spine)；單平面則需 6 台交換器。</div>
                                                    <div><span className="text-slate-400">角色：</span>專供 GPU 間的高速、低延遲通訊，利用無阻塞架構極大化 AI 訓練效能。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-yellow-400 mb-1">融合網路交換器 (Converged / North-South Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">設備：</span>NVIDIA SN5600 128 埠 400 GbE 交換器。</div>
                                                    <div><span className="text-slate-400">數量：</span>2 台。</div>
                                                    <div><span className="text-slate-400">角色：</span>連接所有節點的 DPU，處理叢集對外 (客戶端網路)、儲存設備連線以及頻內管理。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-purple-400 mb-1">頻外管理交換器 (OOB Management Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">設備：</span>NVIDIA SN2201 48 埠 1 GbE 交換器。</div>
                                                    <div><span className="text-slate-400">數量：</span>3 台。</div>
                                                    <div><span className="text-slate-400">角色：</span>連接所有伺服器與交換器的 BMC，提供獨立的底層硬體管理監控通道。</div>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div> 三、控制平面與輔助伺服器 (Control Plane)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">角色：</span>提供作業系統部署、工作負載排程、基礎設施監控與客戶端存取節點。</li>
                                            <li><span className="font-bold text-slate-100">設備配置：</span>需額外配置標準 x86 伺服器 (建議搭配 BlueField-3 B3220 DPU)，具體包含負責叢集自動化部署的 Base Command Manager 節點 (建議 2 台)、以及負責工作排程的 Slurm 節點 (建議 2 台) 或 Kubernetes 控制節點。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div> 四、核心軟體堆疊 (Software Stack)</h4>
                                        <p className="text-slate-300 italic pl-3 border-l-2 border-indigo-500 font-medium">NVIDIA AI Enterprise (NVAIE)：方案需搭配逐 GPU 授權的 NVAIE 軟體套件，提供生產級別的 AI 框架、NVIDIA NGC 容器以及 NIM 微服務，以最大化硬體效能並簡化 AI 應用的開發與部署流程。</p>
                                    </div>
                                </>
                            ) : raModalState.type === '16台' ? (
                                <>
                                    <p className="text-sm text-slate-300">針對 16 台 NVIDIA HGX B300 伺服器的部署規劃，這在 NVIDIA Reference Architecture (RA) 中剛好構成 4 個標準擴充單元 (Scalable Units, SUs)。以下為 16 台規模會用到的設備清單與角色說明：</p>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div> 一、運算節點硬體 (Compute Nodes)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">伺服器本體 (16 台)：</span>基於 NVIDIA HGX B300 的伺服器，構成 4 個 SU。</li>
                                            <li><span className="font-bold text-slate-100">GPU (共 128 張)：</span>每台配置 8 張 B300 SXM GPU，為模型訓練與推論的核心算力來源。</li>
                                            <li><span className="font-bold text-slate-100">CPU (共 32 顆)：</span>每台配置 2 顆 CPU。</li>
                                            <li><span className="font-bold text-slate-100">運算網路卡 (共 128 張)：</span>每台配置 8 張 ConnectX-8 SuperNIC，負責節點間 (East-West) 的 GPU 高速通訊。</li>
                                            <li><span className="font-bold text-slate-100">融合網路卡 (共 16 張)：</span>每台配置 1 張 BlueField-3 B3240 DPU，負責節點對外 (North-South) 的儲存連線與管理通訊。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 二、網路交換器與基礎架構 (Networking Infrastructure)</h4>
                                        <p className="mb-3 text-slate-400">針對 16 台規模，網路架構無需使用 Spine 層級交換器，僅需 Leaf 交換器即可滿足無阻塞 (Non-blocking) 傳輸需求。</p>
                                        <ul className="list-none space-y-3">
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-emerald-400 mb-1">運算網路交換器 (Compute / East-West Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">角色：</span>專供 GPU 叢集間的高速運算流量與 RDMA 傳輸。</div>
                                                    <div><span className="text-slate-400">雙平面 (Dual Plane) 架構配置：</span>需 4 台 NVIDIA SN5600 交換器。</div>
                                                    <div><span className="text-slate-400">單平面 (Single Plane) 架構配置：</span>需 2 台 NVIDIA SN5600 交換器。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-yellow-400 mb-1">融合網路交換器 (Converged / North-South Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">角色：</span>負責處理叢集對外通訊、連接客戶端網路與儲存設備。</div>
                                                    <div><span className="text-slate-400">配置：</span>需 2 台 NVIDIA SN5600 交換器。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-purple-400 mb-1">頻外管理交換器 (OOB Management Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">角色：</span>連接所有設備的 BMC (Baseboard Management Controller)，提供底層硬體管理通道。</div>
                                                    <div><span className="text-slate-400">配置：</span>需 2 台 NVIDIA SN2201 交換器。</div>
                                                    <div className="text-[11px] text-slate-500 mt-1">(註：若採用雙平面架構，整體共需 6 台 SN5600 與 2 台 SN2201；單平面架構則共需 4 台 SN5600 與 2 台 SN2201。)</div>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div> 三、控制平面與輔助伺服器 (Control Plane / Support Servers)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">角色：</span>提供作業系統部署、工作負載排程與客戶端存取點。</li>
                                            <li><span className="font-bold text-slate-100">數量與配置：</span>網路設計最高可支援 8 台輔助伺服器。標準建議至少配置 2 台 Base Command Manager 節點 (具備 HA 高可用性)，以及 2 台 Slurm 排程節點或 3 台 Kubernetes 控制節點。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div> 四、核心軟體堆疊 (Software Stack)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">NVIDIA AI Enterprise (NVAIE)：</span>需配合 128 張 GPU 採購 128 個軟體授權。</li>
                                            <li><span className="font-bold text-slate-100">軟體內容：</span>包含負責叢集配置的 Base Command Manager、提供最佳化 AI 模型的 NGC 容器，以及簡化部署流程的 NIM 微服務。</li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <p className="text-slate-400 italic text-center py-10">此 {raModalState.type} 節點規模的詳細架構配置說明尚在建置中。</p>
                            )}
                        </div>
                        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                            {raModalState.type === '20台' ? (
                                <button
                                    onClick={() => handleLoadExample(exampleData)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                                >
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : raModalState.type === '16台' ? (
                                <button
                                    onClick={() => handleLoadExample(example16Data)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                                >
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : (
                                <div></div>
                            )}
                            <button 
                                onClick={() => setRaModalState({ isOpen: false, type: '' })} 
                                className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/30"
                            >
                                了解
                            </button>
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