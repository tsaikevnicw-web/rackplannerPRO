import React, { useEffect, useRef } from 'react';
import { RackPlannerProvider, useRackPlanner } from '../../context/RackPlannerContext';
import HeaderLight from './HeaderLight';
import SidebarLight from './SidebarLight';
import RightPanelLight from './RightPanelLight';
import RackViewLight from './RackViewLight';
import ContainerViewLight from './ContainerViewLight';
import NetworkTopologyLight from './NetworkTopologyLight';
import CablesOverlayLight from './CablesOverlayLight';
import PrintLayout from '../layout/PrintLayout';
import UserManualModal from '../layout/UserManualModal';
import IssueTrackerModal from '../layout/IssueTrackerModal';
import NetworkCablingModal from '../layout/NetworkCablingModal';
import { getFabricGroup } from '../../utils/helpers';
import { X, AlertTriangle, CheckCircle2, Info, Eraser, Trash2, Unplug, LayoutTemplate, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import exampleData from '../../data/exampleData.json';
import example16Data from '../../data/example16Data.json';
import example4Data from '../../data/example4Data.json';
import example2Data from '../../data/example2Data.json';
import '../../themes/light/lightTheme.css';

const AppLightContent = () => {
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
    const activeCid = activeOverviewContainerId || containers?.[0]?.id || 'container-1';

    useEffect(() => {
        if (containers?.length > 0 && !containers.some(c => c.id === activeOverviewContainerId)) {
            setActiveOverviewContainerId(containers[0]?.id);
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
                    const cw = rackContainerRef.current.scrollWidth || 100;
                    const ch = rackContainerRef.current.scrollHeight || 100;
                    setLayoutSize({ w: cw, h: ch });

                    if (cw > 0) {
                        const padding = 64;
                        const scaleW = Math.max((mw - padding) / cw, 0.1);
                        setScaleFactor(scaleW);
                    }
                }
            }
        });

        resizeObserver.observe(mainAreaRef.current);
        return () => resizeObserver.disconnect();
    }, [viewMode, racks.length, isFitToScreen]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName;
            const inForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inForm) {
                e.preventDefault();
                undo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !inForm) {
                e.preventDefault();
                redo();
                return;
            }
            if (e.key === 'Delete' && !inForm) {
                e.preventDefault();
                if (selectedIds.length > 1) {
                    if (confirm(`確定要刪除選取的 ${selectedIds.length} 個設備嗎？`)) {
                        setDevices(prev => prev.filter(d => !selectedIds.includes(d.id)));
                        setSelectedIds([]);
                    }
                } else if (selectedId) {
                    const dev = devices.find(d => d.id === selectedId);
                    if (dev) {
                        setDeleteDeviceConfirm({ isOpen: true, deviceId: dev.id, deviceName: dev.customName || dev.name });
                    }
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, selectedIds, devices, racks]);

    const activeRack = racks.find(r => r.id === activeRackId);

    // Network topologies
    const nsSpineDevs = devices.filter(d => getFabricGroup(d) === 'NS-Spine');
    const nsLeafDevs = devices.filter(d => getFabricGroup(d) === 'NS-Leaf');
    const ewSpineDevs = devices.filter(d => getFabricGroup(d) === 'Spine');
    const ewLeafDevs = devices.filter(d => getFabricGroup(d) === 'Leaf');
    const epDevs = devices.filter(d => getFabricGroup(d) === 'EP');

    return (
        <div className="light-theme flex flex-col h-screen w-screen bg-[#ECEFF2] text-slate-900 overflow-hidden select-none">
            {/* Top Workspace Bar */}
            <div className="bg-slate-900 text-slate-300 px-4 py-1 text-xs flex justify-between items-center z-[200]">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold text-slate-100">【企業級專業 CAD 介面預覽 · Enterprise Precision CAD】</span>
                    <span className="text-slate-400 text-[11px] hidden md:inline">原版暗黑網頁 100% 維持不變，可隨時點右側連結切換</span>
                </div>
                <a 
                    href="/rackplannerPRO/" 
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded border border-slate-700 transition-colors"
                >
                    <ExternalLink className="w-3 h-3" /> 切換回原版暗黑設計
                </a>
            </div>

            {/* Header */}
            <HeaderLight />

            {/* Main Content Body */}
            <div className="flex flex-1 overflow-hidden relative">
                <SidebarLight />

                {/* Main CAD Canvas */}
                <main 
                    ref={mainAreaRef} 
                    className="flex-1 overflow-auto light-scrollbar light-canvas-bg relative flex flex-col p-6 main-canvas"
                    onClick={() => {
                        setSelectedId(null);
                        setSelectedIds([]);
                    }}
                >
                    {/* View Modes */}
                    {viewMode === 'single' && (
                        <div className="flex-1 flex items-center justify-center min-w-max p-4">
                            {activeRack ? (
                                <div ref={rackContainerRef} className="flex gap-8 items-end relative">
                                    <RackViewLight racksToRender={[activeRack]} />
                                    <CablesOverlayLight />
                                </div>
                            ) : (
                                <div className="text-slate-400 text-xs flex flex-col items-center gap-2 font-medium">
                                    <p>請先選擇或建立機櫃</p>
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'overview' && (
                        <div className="flex-1 flex flex-col items-center justify-start min-w-max p-4">
                            {projectInfo?.isCdcProject && containers?.length > 1 && (
                                <div className="mb-4 flex items-center gap-1.5 bg-white p-1 rounded-md border border-slate-200 shadow-2xs">
                                    {containers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={(e) => { e.stopPropagation(); setActiveOverviewContainerId(c.id); }}
                                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                                activeCid === c.id 
                                                    ? 'bg-slate-900 text-white' 
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div 
                                ref={rackContainerRef} 
                                className="flex gap-6 items-end relative"
                                style={{
                                    transform: isFitToScreen && scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
                                    transformOrigin: 'top center'
                                }}
                            >
                                <RackViewLight 
                                    racksToRender={
                                        projectInfo?.isCdcProject
                                            ? racks.filter(r => {
                                                const matchesContainer = (r.containerId || 'container-1') === activeCid;
                                                if (!matchesContainer) return false;
                                                if (hideNonItCabinets) return r.type === 'General' || r.type === 'ORv3';
                                                return true;
                                            })
                                            : racks
                                    } 
                                />
                                <CablesOverlayLight />
                            </div>
                        </div>
                    )}

                    {viewMode === 'container' && (
                        <div className="flex-1 flex flex-col min-w-max p-2">
                            <ContainerViewLight />
                        </div>
                    )}

                    {viewMode === 'network' && (
                        <div className="flex-1 flex flex-col items-center min-w-max p-4 relative">
                            <div 
                                ref={rackContainerRef}
                                className="w-full max-w-6xl relative"
                                style={{
                                    transform: isFitToScreen && scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
                                    transformOrigin: 'top center'
                                }}
                            >
                                <NetworkTopologyLight
                                    nsSpineDevs={nsSpineDevs}
                                    nsLeafDevs={nsLeafDevs}
                                    ewSpineDevs={ewSpineDevs}
                                    ewLeafDevs={ewLeafDevs}
                                    epDevs={epDevs}
                                />
                                <CablesOverlayLight />
                            </div>
                        </div>
                    )}
                </main>

                <RightPanelLight />
            </div>

            {/* Print Layout */}
            <PrintLayout />
            <UserManualModal />
            <IssueTrackerModal />
            <NetworkCablingModal />

            {/* Enterprise Modals */}
            {alertModal?.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-xl animate-in zoom-in-95 duration-120">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-700">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">{alertModal.title}</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">{alertModal.message}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setAlertModal(null)}
                                className="cad-btn-primary px-4 py-1.5 text-xs font-semibold rounded"
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {clearConfirm?.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-xl animate-in zoom-in-95 duration-120">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-700">
                                <Eraser className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                {clearConfirm.type === 'single' ? '清空當前機櫃' : '清空所有機櫃設備'}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                            {clearConfirm.type === 'single' 
                                ? '確定要清除當前機櫃內的所有設備與線路配置嗎？此操作可隨時按 Ctrl+Z 復原。' 
                                : '確定要清除所有機櫃中的設備與連線嗎？'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setClearConfirm(null)}
                                className="cad-btn px-3 py-1.5 text-xs"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => {
                                    if (clearConfirm.type === 'single') {
                                        setDevices(prev => prev.filter(d => d.rackId !== activeRackId));
                                    } else {
                                        setDevices([]);
                                    }
                                    setClearConfirm(null);
                                }}
                                className="cad-btn-danger px-4 py-1.5 text-xs font-semibold"
                            >
                                確認清空
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RA Template Modal */}
            {raModalState?.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-5 shadow-xl animate-in zoom-in-95 duration-120">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-700">
                                <LayoutTemplate className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">套用標準建議架構 ({raModalState.type})</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                            此操作將會載入標準的機櫃配置與硬體模組架構（{raModalState.type} 範本）。
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setRaModalState(null)}
                                className="cad-btn px-3.5 py-1.5 text-xs"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => {
                                    let templateToApply = example2Data;
                                    if (raModalState.type === '20台') templateToApply = exampleData;
                                    else if (raModalState.type === '16台') templateToApply = example16Data;
                                    else if (raModalState.type === '4台') templateToApply = example4Data;
                                    else if (raModalState.type === '2台') templateToApply = example2Data;
                                    
                                    handleApplyRATemplate(templateToApply);
                                    setRaModalState(null);
                                }}
                                className="cad-btn-primary px-4 py-1.5 text-xs font-semibold"
                            >
                                載入範本
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AppLight = () => {
    return (
        <RackPlannerProvider>
            <AppLightContent />
        </RackPlannerProvider>
    );
};

export default AppLight;
