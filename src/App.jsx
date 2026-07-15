import React, { useEffect, useRef } from 'react';
import { RackPlannerProvider, useRackPlanner } from './context/RackPlannerContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import RackView from './components/rack/RackView';

import ContainerView from './components/rack/ContainerView';
import NetworkTopology from './components/network/NetworkTopology';
import CablesOverlay from './components/rack/CablesOverlay';
import PrintLayout from './components/layout/PrintLayout';
import { getFabricGroup } from './utils/helpers';
import { X, AlertTriangle, CheckCircle2, Info, Eraser, Trash2, Unplug, LayoutTemplate, BookOpen } from 'lucide-react';
import UserManualModal from './components/layout/UserManualModal';
import IssueTrackerModal from './components/layout/IssueTrackerModal';
import NetworkCablingModal from './components/layout/NetworkCablingModal';
import exampleData from './data/exampleData.json';
import example16Data from './data/example16Data.json';
import example4Data from './data/example4Data.json';
import example2Data from './data/example2Data.json';


const AppContent = () => {
    const { 
        viewMode, racks, devices, activeRackId, isFitToScreen, scaleFactor, setScaleFactor,
        mainAreaRef, rackContainerRef, layoutSize, setLayoutSize,
        alertModal, setAlertModal, clearConfirm, setClearConfirm, deleteRackConfirm, setDeleteRackConfirm,
        clearDeviceConfirm, setClearDeviceConfirm, deleteDeviceConfirm, setDeleteDeviceConfirm, setDevices, setRacks, setActiveRackId, setSelectedId,
        selectedId, selectedIds, setSelectedIds, undo, redo,
        generateId, showAlert,
        raModalState, setRaModalState, handleApplyRATemplate, setViewMode, isGeneratingPDF, isGeneratingCablePDF, containers,
        projectInfo, hideNonItCabinets
    } = useRackPlanner();

    const [activeOverviewContainerId, setActiveOverviewContainerId] = React.useState(null);

    const activeCid = activeOverviewContainerId || containers[0]?.id || 'container-1';

    useEffect(() => {
        if (containers.length > 0 && !containers.some(c => c.id === activeOverviewContainerId)) {
            setActiveOverviewContainerId(containers[0].id);
        }
    }, [containers, activeOverviewContainerId]);

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
                    const cw = rackContainerRef.current.scrollWidth || 100;
                    const ch = rackContainerRef.current.scrollHeight || 100;
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

    // 若視圖模式切換 setViewMode ─ clipboardRef 用于儲存被複製的設備
    const clipboardRef = useRef(null);

    // 鍵盤快捷鍵：del / ctrl+c / ctrl+v / ctrl+z / ctrl+y
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 若焦點在表單元素上，不攔截任何按鍵
            const tag = document.activeElement?.tagName;
            const inForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            // ── Ctrl+Z：復原 ──
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inForm) {
                e.preventDefault();
                undo();
                return;
            }

            // ── Ctrl+Y：重做 ──
            if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !inForm) {
                e.preventDefault();
                redo();
                return;
            }

            // ── Del：刪除選中設備或機櫃 ──
            if (e.key === 'Delete' && !inForm) {
                if (selectedIds.length === 0) return;
                
                const hasSelectedRacks = racks.some(r => selectedIds.includes(r.id));
                
                if (hasSelectedRacks) {
                    // 刪除選中的機櫃與其內的所有設備
                    setRacks(prev => prev.filter(r => !selectedIds.includes(r.id)));
                    setDevices(prev => prev.filter(d => !selectedIds.includes(d.rackId)));
                    if (selectedIds.includes(activeRackId)) {
                        const remaining = racks.filter(r => !selectedIds.includes(r.id));
                        setActiveRackId(remaining[0]?.id || null);
                    }
                } else {
                    // 原本的刪除設備邏輯
                    setDevices(prev => prev.map(dev => {
                        if (selectedIds.includes(dev.id)) return null;
                        const newConns = { ...(dev.connections || {}) };
                        let modified = false;
                        Object.keys(newConns).forEach(k => { 
                            if (newConns[k]) {
                                const matchedId = selectedIds.find(id => newConns[k].startsWith(id + '-'));
                                if (matchedId) {
                                    delete newConns[k];
                                    modified = true;
                                }
                            }
                        });
                        if (!modified) return dev;
                        return { ...dev, connections: newConns };
                    }).filter(Boolean));
                }
                setSelectedIds([]);
                return;
            }

            // ── Ctrl+C：複製選中設備或機櫃 ──
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !inForm) {
                const selectedDevice = devices.find(d => d.id === selectedId);
                if (selectedDevice) {
                    clipboardRef.current = { type: 'device', data: selectedDevice };
                    return;
                }
                const selectedRack = racks.find(r => r.id === selectedId);
                if (selectedRack) {
                    clipboardRef.current = { 
                        type: 'rack', 
                        data: selectedRack, 
                        devices: devices.filter(d => d.rackId === selectedRack.id) 
                    };
                    return;
                }
                return;
            }

            // ── Ctrl+V：貼上複製的設備或機櫃 ──
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !inForm) {
                e.preventDefault();
                const clipboard = clipboardRef.current;
                if (!clipboard) return;

                const getIncrementedName = (originalName, existingItems, fieldName = 'customName') => {
                    if (!originalName) return originalName;
                    const match = originalName.match(/^(.*?)(-?)(\d+)$/);
                    if (!match) return `${originalName} (Copy)`;
                    
                    const base = match[1];
                    const sep = match[2];
                    const numStr = match[3];
                    const numLen = numStr.length;
                    
                    let maxNum = parseInt(numStr, 10);
                    
                    existingItems.forEach(item => {
                        const itemName = item[fieldName];
                        if (itemName) {
                            const itemMatch = itemName.match(/^(.*?)(-?)(\d+)$/);
                            if (itemMatch && itemMatch[1] === base && itemMatch[2] === sep) {
                                const itemNum = parseInt(itemMatch[3], 10);
                                if (itemNum > maxNum) maxNum = itemNum;
                            }
                        }
                    });
                    
                    const nextNum = maxNum + 1;
                    let nextNumStr = nextNum.toString();
                    if (numStr.startsWith('0')) {
                        nextNumStr = nextNumStr.padStart(numLen, '0');
                    }
                    return `${base}${sep}${nextNumStr}`;
                };

                if (clipboard.type === 'device') {
                    const src = clipboard.data;
                    const targetRackId = src.rackId;
                    const targetRack = racks.find(r => r.id === targetRackId);
                    if (!targetRack) { showAlert('目標機櫃不存在。', '提示', 'info'); return; }

                    const rackMaxU = targetRack.uCount || 48;
                    const devSize = src.size || 1;
                    const rackDevices = devices.filter(d => d.rackId === targetRackId && d.type !== 'SideCDU');

                    let foundU = null;
                    for (let u = 1; u <= rackMaxU - devSize + 1; u++) {
                        const overlaps = rackDevices.some(
                            d => !(u + devSize - 1 < d.startU || u > d.startU + d.size - 1)
                        );
                        if (!overlaps) { foundU = u; break; }
                    }

                    if (foundU === null) {
                        showAlert('機櫃空間不足，無法貼上設備！', '錯誤', 'error');
                        return;
                    }

                    const newName = getIncrementedName(src.customName, devices, 'customName');
                    const newDev = { ...src, id: generateId(), rackId: targetRackId, startU: foundU, customName: newName, connections: {} };
                    setDevices(prev => [...prev, newDev]);
                } else if (clipboard.type === 'rack') {
                    const srcRack = clipboard.data;
                    const srcDevices = clipboard.devices;

                    let targetSlotIndex = null;
                    let targetContainerId = null;
                    if (viewMode === 'container') {
                        for (const container of containers) {
                            const maxSlots = container.type === '20ft' ? 10 : (container.type === '40ft' ? 20 : Math.floor((container.customLength || 40) / 2));
                            for (let i = 0; i < maxSlots; i++) {
                                if (!racks.some(r => (r.containerId || 'container-1') === container.id && r.slotIndex === i)) {
                                    targetSlotIndex = i;
                                    targetContainerId = container.id;
                                    break;
                                }
                            }
                            if (targetSlotIndex !== null) break;
                        }
                        if (targetSlotIndex === null) {
                            showAlert('所有貨櫃插槽已滿，無法貼上機櫃！', '警告', 'warning');
                            return;
                        }
                    }

                    const newRackName = getIncrementedName(srcRack.name, racks, 'name');
                    const newRackId = generateId();
                    const newRack = { 
                        ...srcRack, 
                        id: newRackId, 
                        name: newRackName, 
                        slotIndex: targetSlotIndex,
                        containerId: targetContainerId || (containers[0]?.id || 'container-1')
                    };
                    
                    setRacks(prev => [...prev, newRack]);
                    
                    setDevices(prev => {
                        const currentDevices = [...prev];
                        for (const dev of srcDevices) {
                            const newDevName = getIncrementedName(dev.customName, currentDevices, 'customName');
                            const newDev = { ...dev, id: generateId(), rackId: newRackId, customName: newDevName, connections: {} };
                            currentDevices.push(newDev);
                        }
                        return currentDevices;
                    });
                    
                    setActiveRackId(newRackId);
                    setSelectedIds([newRackId]);
                    showAlert(`成功複製機櫃為 ${newRackName}`, '提示', 'success');
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, selectedIds, devices, racks, activeRackId, generateId, showAlert, setDevices, setSelectedIds, undo, redo, viewMode, containers, setRacks, setActiveRackId]);

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
    let tempRacks = viewMode === 'single' 
        ? racks.filter(r => r.id === activeRackId) 
        : (projectInfo?.isCdcProject && viewMode === 'overview')
            ? racks.filter(r => (r.containerId || 'container-1') === activeCid && r.slotIndex !== null && r.slotIndex !== undefined)
            : (viewMode === 'overview' && !projectInfo?.isCdcProject)
                ? racks.filter(r => r.type === 'General' || r.type === 'ORv3' || !r.type)
                : racks;

    if (hideNonItCabinets && viewMode === 'overview') {
        tempRacks = tempRacks.filter(r => r.type === 'General' || !r.type);
    }
    const racksToRender = tempRacks;
    const nsSpineDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'North-South' && d.networkRole === 'Spine');
    const nsLeafDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'North-South' && d.networkRole !== 'Spine');
    const ewSpineDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'East-West' && d.networkRole === 'Spine');
    const ewLeafDevs = devices.filter(d => ((d.type || '').startsWith('Switch') || d.type === 'Router') && getFabricGroup(d) === 'East-West' && d.networkRole !== 'Spine');
    const epDevs = devices.filter(d => !(d.type || '').startsWith('Switch') && d.type !== 'Router' && d.type !== 'Blank' && d.type !== 'UPS');

    const executeClear = () => {
        if (clearConfirm.type === 'single') setDevices(prev => prev.filter(d => d.rackId !== activeRackId));
        else { setRacks([{ id: 'rack-1', name: 'RACK-001', type: 'General', uCount: 48 }]); setDevices([]); setActiveRackId('rack-1'); }
        setClearConfirm({ isOpen: false, type: '' }); setSelectedId(null);
    };

    const executeDeleteRack = () => {
        const remaining = racks.filter(r => r.id !== deleteRackConfirm.rackId);
        if (remaining.length === 0) {
            const defaultRack = { id: 'rack-1', name: 'RACK-001', type: 'General', uCount: 48, powerLimit: 24000, slotIndex: null, weight: 150 };
            setRacks([defaultRack]);
            setDevices([]);
            setActiveRackId(defaultRack.id);
            showAlert('已自動重設並保留預設機櫃 RACK-001！', '提示', 'info');
        } else {
            setRacks(remaining);
            setDevices(prev => prev.filter(d => d.rackId !== deleteRackConfirm.rackId));
            if (activeRackId === deleteRackConfirm.rackId) {
                setActiveRackId(remaining[0].id);
            }
        }
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
        <>
            <div className="screen-layout flex flex-col h-screen bg-[#060c16] text-slate-200 overflow-hidden font-sans select-none">
                <Header />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />
                <main ref={mainAreaRef} className="flex-1 relative overflow-auto main-canvas bg-[#060c16] flex flex-col">
                    {viewMode === 'container' ? (
                        <ContainerView />
                    ) : (
                        <>
                            {projectInfo?.isCdcProject && viewMode === 'overview' && (
                                <div className="bg-[#0b1523]/90 backdrop-blur-md px-6 py-3 border-b border-slate-700/30 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">貨櫃總覽</span>
                                        <h3 className="text-sm font-bold text-slate-200">
                                            當前顯示貨櫃：
                                            <span className="text-indigo-400 font-mono ml-1 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                                {containers.find(c => c.id === activeCid)?.name || '未選擇貨櫃'}
                                            </span>
                                        </h3>
                                    </div>
                                    <div className="flex bg-[#060c16] rounded-xl p-1 border border-slate-700/50 shadow-inner gap-1">
                                        {containers.map((container) => (
                                            <button
                                                key={container.id}
                                                onClick={() => setActiveOverviewContainerId(container.id)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                                    activeCid === container.id
                                                        ? 'bg-indigo-600 text-white shadow-lg'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                                }`}
                                            >
                                                {container.name} ({container.type === '20ft' ? '20呎' : (container.type === '40ft' ? '40呎' : `自訂 ${container.customLength || 20}格`)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div 
                            className={`relative flex ${viewMode === 'overview' ? 'min-h-full' : (isFitToScreen && viewMode !== 'single' ? 'justify-start' : 'justify-center w-full')}`}
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
                                     <NetworkTopology nsSpineDevs={nsSpineDevs} nsLeafDevs={nsLeafDevs} ewSpineDevs={ewSpineDevs} ewLeafDevs={ewLeafDevs} epDevs={epDevs} />
                                 ) : (
                                     <RackView racksToRender={racksToRender} />
                                 )}
                            </div>
                        </div>
                    </>
                )}
            </main>
                <RightPanel />
            </div>

            {/* Modals */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2.5 bg-[#111e2e]">
                            {alertModal.type === 'error' && <X className="w-5 h-5 text-rose-400" />}
                            {alertModal.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                            {alertModal.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {alertModal.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
                            <h3 className="text-base font-bold text-slate-100">{alertModal.title}</h3>
                        </div>
                        <div className="p-6 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{alertModal.message}</div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-end">
                            <button onClick={() => setAlertModal({ ...alertModal, isOpen: false })} className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/25">了解</button>
                        </div>
                    </div>
                </div>
            )}

            {clearConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700/50 bg-[#111e2e]"><h3 className="text-base font-bold text-rose-400 flex items-center gap-2"><Eraser className="w-5 h-5" /> 警告：一鍵清除</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要清除{clearConfirm.type === 'single' ? '「當前機櫃」' : '「所有機櫃」'} 中的所有設備嗎？</p><p className="text-sm text-slate-500 mt-2">此操作無法復原，請確認您已經匯出存檔！</p></div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setClearConfirm({ isOpen: false, type: '' })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/60 transition-colors">取消</button>
                            <button onClick={executeClear} className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/25">確定清除</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteRackConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700/50 bg-[#111e2e]"><h3 className="text-base font-bold text-rose-400 flex items-center gap-2"><Trash2 className="w-5 h-5" /> 警告：刪除機櫃</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要刪除這個機櫃嗎？</p><p className="text-sm text-slate-500 mt-2">此機櫃內的所有設備將被一併移除，且與其相關的網路線也會被清除。此操作無法復原！</p></div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setDeleteRackConfirm({ isOpen: false, rackId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/60 transition-colors">取消</button>
                            <button onClick={executeDeleteRack} className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/25">確定刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {clearDeviceConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700/50 bg-[#111e2e]"><h3 className="text-base font-bold text-amber-400 flex items-center gap-2"><Unplug className="w-5 h-5" /> 警告：清除設備連線</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要清除此設備的所有網路連線嗎？</p><p className="text-sm text-slate-500 mt-2">包含此設備主動連出的線路，以及其他設備連向此設備的線路都會被一併徹底移除。</p></div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setClearDeviceConfirm({ isOpen: false, deviceId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/60 transition-colors">取消</button>
                            <button onClick={executeClearDeviceConnections} className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg shadow-amber-600/25">確定清除</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteDeviceConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-700/50 bg-[#111e2e]"><h3 className="text-base font-bold text-rose-400 flex items-center gap-2"><Trash2 className="w-5 h-5" /> 警告：刪除設備</h3></div>
                        <div className="p-6 text-slate-300"><p>確定要從機櫃中完全刪除這台設備嗎？</p><p className="text-sm text-slate-500 mt-2">此設備以及所有相連的網路線都將被移除，且此操作無法復原！</p></div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setDeleteDeviceConfirm({ isOpen: false, deviceId: null })} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/60 transition-colors">取消</button>
                            <button onClick={executeDeleteDevice} className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/25">確定刪除</button>
                        </div>
                    </div>
                </div>
            )}

            {raModalState.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
                    <div className="bg-[#0d1b2e] border border-slate-600/60 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mt-10 mb-10 max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-[#111e2e]">
                            <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5" /> NVIDIA HGX B300 RA 建議配置 ({raModalState.type})
                            </h3>
                            <button onClick={() => setRaModalState({ isOpen: false, type: '' })} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors"><X className="w-5 h-5" /></button>
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
                            ) : raModalState.type === '4台' ? (
                                <>
                                    <p className="text-sm text-slate-300">針對 4 台 NVIDIA HGX B300 伺服器的部署規劃，這在 NVIDIA 架構中正好代表 1 個標準擴充單元 (Scalable Unit, SU)。以下為 4 台規模會用到的設備清單與角色說明：</p>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div> 一、運算節點硬體 (Compute Nodes)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">伺服器本體 (4 台)：</span>基於 NVIDIA HGX B300 的伺服器，構成 1 個 SU。</li>
                                            <li><span className="font-bold text-slate-100">GPU (共 32 張)：</span>每台配置 8 張 B300 SXM GPU。</li>
                                            <li><span className="font-bold text-slate-100">CPU (共 8 顆)：</span>每台配置 2 顆 CPU。</li>
                                            <li><span className="font-bold text-slate-100">運算網路卡 (共 32 張)：</span>每台配置 8 張 ConnectX-8 SuperNIC，負責節點間 (East-West) 的 GPU 高速通訊。</li>
                                            <li><span className="font-bold text-slate-100">融合網路卡 (共 4 張)：</span>每台配置 1 張 BlueField-3 B3240 DPU，負責節點對外的連線與通訊。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 二、網路交換器與基礎架構 (Networking Infrastructure)</h4>
                                        <p className="mb-3 text-slate-400">在 4 台節點的規模下，網路架構極度簡化，完全不需要 Spine 層級交換器。</p>
                                        <ul className="list-none space-y-3">
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-emerald-400 mb-1">運算網路交換器 (Compute / East-West Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">角色：</span>專供 GPU 叢集間的高速運算流量與 RDMA 傳輸。</div>
                                                    <div><span className="text-slate-400">雙平面 (Dual Plane) 架構配置：</span>需 4 台 NVIDIA SN5600 Leaf 交換器。</div>
                                                    <div><span className="text-slate-400">單平面 (Single Plane) 架構配置：</span>需 2 台 NVIDIA SN5600 Leaf 交換器。</div>
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
                                                    <div><span className="text-slate-400">角色：</span>連接所有設備的 BMC，提供底層硬體管理通道。</div>
                                                    <div><span className="text-slate-400">配置：</span>需 2 台 NVIDIA SN2201 交換器。</div>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div> 三、控制平面與輔助伺服器 (Control Plane / Support Servers)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">角色：</span>提供作業系統部署、工作負載排程與客戶端存取點。</li>
                                            <li><span className="font-bold text-slate-100">數量與配置：</span>根據架構規範，4 台節點的叢集建議配置 4 台輔助伺服器。標準配置通常包含 2 台 Base Command Manager 節點 (具備 HA 高可用性)，以及 2 台 Slurm 排程節點。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div> 四、核心軟體堆疊 (Software Stack)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">NVIDIA AI Enterprise (NVAIE)：</span>軟體為逐 GPU 授權，因此需配合 32 張 GPU 採購 32 個軟體授權。</li>
                                            <li><span className="font-bold text-slate-100">軟體內容：</span>包含負責叢集配置的 Base Command Manager、提供 AI 框架的 NGC 容器，以及簡化部署流程的 NIM 微服務等。</li>
                                        </ul>
                                    </div>
                                </>
                            ) : raModalState.type === '2台' ? (
                                <>
                                    <p className="text-sm text-slate-300">若您基於早期開發或測試需求，實務上僅建置 2 台伺服器，依照單一節點的硬體規格推算，並為了維持 RA 架構的高可用性 (HA) 精神，您所需的設備清單與規劃如下：</p>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-500 rounded-full"></div> 一、運算節點硬體 (Compute Nodes)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">伺服器本體 (2 台)：</span>基於 HGX B300 平台的伺服器。</li>
                                            <li><span className="font-bold text-slate-100">GPU (共 16 張)：</span>每台配置 8 張 B300 SXM GPU，提供運算核心能力。</li>
                                            <li><span className="font-bold text-slate-100">CPU (共 4 顆)：</span>每台配置 2 顆 CPU。</li>
                                            <li><span className="font-bold text-slate-100">運算網路卡 (共 16 張)：</span>每台內建 8 張 ConnectX-8 SuperNIC，負責 GPU 間的高速運算通訊。</li>
                                            <li><span className="font-bold text-slate-100">融合網路卡 (共 2 張)：</span>每台配置 1 張 BlueField-3 B3240 DPU，負責儲存與對外網路通訊。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 二、網路交換器與基礎架構 (Networking Infrastructure)</h4>
                                        <p className="mb-3 text-slate-400">即使只有 2 台運算節點，若要建構符合 NVIDIA 規範的獨立平面與高可用性網路，您仍需採用與 4 台 (1 個 SU) 相同的最少交換器數量 (連接埠會有大量閒置)：</p>
                                        <ul className="list-none space-y-3">
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-emerald-400 mb-1">運算網路交換器 (Compute / East-West Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">單平面 (Single Plane) 架構：</span>最少需 2 台 NVIDIA SN5600 交換器。</div>
                                                    <div><span className="text-slate-400">雙平面 (Dual Plane) 架構：</span>最少需 4 台 NVIDIA SN5600 交換器。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-yellow-400 mb-1">融合網路交換器 (Converged / North-South Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">配置：</span>需 2 台 NVIDIA SN5600 交換器，處理節點對外與儲存連線。</div>
                                                </div>
                                            </li>
                                            <li className="bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className="font-bold text-purple-400 mb-1">頻外管理交換器 (OOB Management Fabric)</div>
                                                <div className="pl-2 space-y-1">
                                                    <div><span className="text-slate-400">配置：</span>需 2 台 NVIDIA SN2201 交換器，提供底層硬體管理通道。</div>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded-full"></div> 三、控制平面與輔助伺服器 (Control Plane / Support Servers)</h4>
                                        <p className="mb-2 text-slate-400">為了部署 OS 與管理這 2 台伺服器，您依然需要建置獨立的控制平面。</p>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">建議配置：</span>2 台 Base Command Manager 節點 (具備 HA)，以及負責工作排程的伺服器 (如 2 台 Slurm 或 3 台 K8s 節點)。</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                        <h4 className="text-blue-300 font-bold mb-3 text-base flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div> 四、核心軟體堆疊 (Software Stack)</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                            <li><span className="font-bold text-slate-100">NVIDIA AI Enterprise (NVAIE)：</span>軟體為逐 GPU 授權，2 台伺服器共需採購 16 個軟體授權。</li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <p className="text-slate-400 italic text-center py-10">此 {raModalState.type} 節點規模的詳細架構配置說明尚在建置中。</p>
                            )}
                        </div>
                        <div className="bg-[#0d1b2e] border-t border-slate-700/50 px-6 py-4 flex justify-between items-center">
                            {raModalState.type === '20台' ? (
                                <button onClick={() => handleLoadExample(exampleData)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : raModalState.type === '16台' ? (
                                <button onClick={() => handleLoadExample(example16Data)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : raModalState.type === '4台' ? (
                                <button onClick={() => handleLoadExample(example4Data)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : raModalState.type === '2台' ? (
                                <button onClick={() => handleLoadExample(example2Data)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
                                    <BookOpen className="w-4 h-4" /> 載入此範例專案
                                </button>
                            ) : (
                                <div></div>
                            )}
                            <button 
                                onClick={() => setRaModalState({ isOpen: false, type: '' })} 
                                className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/25"
                            >
                                了解
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <UserManualModal />
            <IssueTrackerModal />
            <NetworkCablingModal />
            {isGeneratingCablePDF && (
                <div className="fixed inset-0 bg-[#020617]/85 backdrop-blur-md z-[10000] flex flex-col items-center justify-center text-white select-none">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-2xl">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-lg font-bold tracking-wider mt-2">正在產生網路規格書 PDF</div>
                        <div className="text-xs text-slate-400">正在處理機櫃設備線路明細與統計圖表，請稍候...</div>
                    </div>
                </div>
            )}
            {isGeneratingPDF && (
                <div className="fixed inset-0 bg-[#020617]/85 backdrop-blur-md z-[10000] flex flex-col items-center justify-center text-white select-none">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-2xl">
                        <div className="w-12 h-12 border-4 border-[#D71422] border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-lg font-bold tracking-wider mt-2">正在產生 PDF 規格書</div>
                        <div className="text-xs text-slate-400">正在自動擷取機櫃與網路拓撲圖，請稍候...</div>
                    </div>
                </div>
            )}
            </div>
            <PrintLayout />
            {isGeneratingPDF && (
                <div id="pdf-print-area" style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', background: '#ffffff', color: '#0d1b2e' }}>
                    <PrintLayout isForDownload={true} />
                </div>
            )}
        </>
    );
};

export default function App() {
    return (
        <RackPlannerProvider>
            <AppContent />
        </RackPlannerProvider>
    );
}