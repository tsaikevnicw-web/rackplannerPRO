import React, { createContext, useContext, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useRackData } from '../hooks/useRackData';
import { useExport } from '../hooks/useExport';

const RackPlannerContext = createContext({});

export const RackPlannerProvider = ({ children }) => {
    // Refs
    const rackContainerRef = useRef(null);
    const mainAreaRef = useRef(null);
    const fileInputRef = useRef(null);
    const alertModalRef = useRef(null);

    // Context Hooks Data
    const { 
        racks, setRacks, devices, setDevices, connectedPortsSet, generateId, 
        handleUpdateRack, handleUpdateDevice, handleConnectionChange, handleDisconnectPort, 
        handleHardwareSpecChange, handleAutoConnectGroup, handleHAAutoConnect, handleApplyRATemplate 
    } = useRackData(alertModalRef);

    // UI States
    const [activeRackId, setActiveRackId] = useState('rack-1');
    const [viewMode, setViewMode] = useState('single');
    const [containers, setContainers] = useState([
        { id: 'container-1', name: '貨櫃-A', type: '40ft', powerLimit: 500000, weightLimit: 30000, pueBase: 1.15 }
    ]);
    const [projectInfo, setProjectInfo] = useState({
        partners: [''],
        designType: 'common',
        isCdcProject: false,
        location: '',
        deliveryDate: '',
        projectManager: '',
        clientName: '',
        notes: ''
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
    const setSelectedId = (id) => setSelectedIds(id ? [id] : []);
    const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
    const [projectName, setProjectName] = useState('未命名專案');

    // History (Undo / Redo) States
    const [historyState, setHistoryState] = useState({ history: [], index: -1 });
    const isUndoRedoAction = useRef(false);

    useEffect(() => {
        setHistoryState({
            history: [{ racks, devices }],
            index: 0
        });
    }, []);

    useEffect(() => {
        if (isUndoRedoAction.current) {
            isUndoRedoAction.current = false;
            return;
        }

        setHistoryState(prev => {
            if (prev.index === -1) {
                return {
                    history: [{ racks, devices }],
                    index: 0
                };
            }
            const sliced = prev.history.slice(0, prev.index + 1);
            const last = sliced[sliced.length - 1];
            if (last && last.racks === racks && last.devices === devices) {
                return prev;
            }
            const newHistory = [...sliced, { racks, devices }];
            if (newHistory.length > 50) {
                newHistory.shift();
            }
            return {
                history: newHistory,
                index: newHistory.length - 1
            };
        });
    }, [racks, devices]);

    // 當切換到單櫃編輯模式時，若目前選中的是基礎設施櫃 (Cooling, UPS 等)，自動切換至第一個 IT 機櫃 (General 或 ORv3)
    useEffect(() => {
        if (viewMode === 'single') {
            const activeRack = racks.find(r => r.id === activeRackId);
            if (activeRack && activeRack.type !== 'General' && activeRack.type !== 'ORv3') {
                const firstItRack = racks.find(r => r.type === 'General' || r.type === 'ORv3');
                if (firstItRack) {
                    setActiveRackId(firstItRack.id);
                    setSelectedIds([firstItRack.id]);
                }
            }
        }
    }, [viewMode, activeRackId, racks]);

    const undo = useCallback(() => {
        if (historyState.index > 0) {
            isUndoRedoAction.current = true;
            const nextIdx = historyState.index - 1;
            const snapshot = historyState.history[nextIdx];
            setRacks(snapshot.racks);
            setDevices(snapshot.devices);
            setHistoryState(prev => ({ ...prev, index: nextIdx }));
        }
    }, [historyState, setRacks, setDevices]);

    const redo = useCallback(() => {
        if (historyState.index < historyState.history.length - 1) {
            isUndoRedoAction.current = true;
            const nextIdx = historyState.index + 1;
            const snapshot = historyState.history[nextIdx];
            setRacks(snapshot.racks);
            setDevices(snapshot.devices);
            setHistoryState(prev => ({ ...prev, index: nextIdx }));
        }
    }, [historyState, setRacks, setDevices]);

    const canUndo = historyState.index > 0;
    const canRedo = historyState.index < historyState.history.length - 1;

    const [draggedItem, setDraggedItem] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({ '伺服器': true, 'CDU': true, '磁碟陣列': false, '網路設備': false, 'Power Device': false, '其他設備': false });
    const [expandedNetGroups, setExpandedNetGroups] = useState({});

    // Menu States
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isRaMenuOpen, setIsRaMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [drawing, setDrawing] = useState(null);
    const [portCoords, setPortCoords] = useState({});
    const [showCables, setShowCables] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [hideNonItCabinets, setHideNonItCabinets] = useState(false);
    const [isCableRoutingOptimized, setIsCableRoutingOptimized] = useState(true);

    // Modals
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '提示', type: 'info' });
    const [clearConfirm, setClearConfirm] = useState({ isOpen: false, type: '' });
    const [deleteRackConfirm, setDeleteRackConfirm] = useState({ isOpen: false, rackId: null });
    const [clearDeviceConfirm, setClearDeviceConfirm] = useState({ isOpen: false, deviceId: null });
    const [deleteDeviceConfirm, setDeleteDeviceConfirm] = useState({ isOpen: false, deviceId: null });
    const [raModalState, setRaModalState] = useState({ isOpen: false, type: '' });
    const [isUserManualOpen, setIsUserManualOpen] = useState(false);
    const [isBugTrackerOpen, setIsBugTrackerOpen] = useState(false);
    const [isNetworkCablingOpen, setIsNetworkCablingOpen] = useState(false);
    const [isGeneratingCablePDF, setIsGeneratingCablePDF] = useState(false);

    // Scaling
    const [isFitToScreen, setIsFitToScreen] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [layoutSize, setLayoutSize] = useState({ w: 1000, h: 1000 });

    const showAlert = (message, title = '提示', type = 'info') => setAlertModal({ isOpen: true, message, title, type });
    alertModalRef.current = showAlert;

    const { 
        handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage, handlePrintPDF,
        rackScreenshots, topoScreenshot, isGeneratingPDF, printTimestamp 
    } = useExport(
        racks, devices, setIsFileMenuOpen, setIsExporting, rackContainerRef, showAlert,
        viewMode, setViewMode, activeRackId, setActiveRackId,
        expandedNetGroups, setExpandedNetGroups, showCables, setShowCables,
        scaleFactor, setScaleFactor, isFitToScreen, setIsFitToScreen,
        projectName, projectInfo, containers
    );

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);
                if (parsedData.racks && Array.isArray(parsedData.devices)) {
                    setRacks(parsedData.racks); 
                    setDevices(parsedData.devices); 
                    if (parsedData.projectName !== undefined) {
                        setProjectName(parsedData.projectName);
                    }
                    if (parsedData.projectInfo !== undefined) {
                        const loadedInfo = { ...parsedData.projectInfo };
                        if (!loadedInfo.designType) {
                            loadedInfo.designType = loadedInfo.isCdcProject ? 'cdc' : 'common';
                        }
                        setProjectInfo(loadedInfo);
                    }
                    if (parsedData.containers !== undefined) {
                        setContainers(parsedData.containers);
                    }
                    setActiveRackId(parsedData.racks[0]?.id); 
                    setSelectedId(null); 
                    setIsFileMenuOpen(false); 
                    showAlert('專案讀取成功！', '成功', 'success');
                } else throw new Error();
            } catch { showAlert('檔案讀取失敗！', '錯誤', 'error'); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    return (
        <RackPlannerContext.Provider value={{
            racks, setRacks, devices, setDevices, activeRackId, setActiveRackId, viewMode, setViewMode, selectedId, setSelectedId,
            selectedIds, setSelectedIds, deviceSearchTerm, setDeviceSearchTerm,
            projectName, setProjectName,
            projectInfo, setProjectInfo,
            undo, redo, canUndo, canRedo,
            draggedItem, setDraggedItem, expandedGroups, setExpandedGroups, expandedNetGroups, setExpandedNetGroups,
            isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen, isExporting, setIsExporting, drawing, setDrawing, portCoords, setPortCoords,
            showCables, setShowCables, showHeatmap, setShowHeatmap, hideNonItCabinets, setHideNonItCabinets, isCableRoutingOptimized, setIsCableRoutingOptimized, containers, setContainers, alertModal, setAlertModal, clearConfirm, setClearConfirm, deleteRackConfirm, setDeleteRackConfirm,
            clearDeviceConfirm, setClearDeviceConfirm, deleteDeviceConfirm, setDeleteDeviceConfirm, raModalState, setRaModalState,
            isUserManualOpen, setIsUserManualOpen,
            isBugTrackerOpen, setIsBugTrackerOpen,
            isNetworkCablingOpen, setIsNetworkCablingOpen,
            isGeneratingCablePDF, setIsGeneratingCablePDF,
            isFitToScreen, setIsFitToScreen, scaleFactor, setScaleFactor,
            isSidebarOpen, setIsSidebarOpen, layoutSize, setLayoutSize,
            rackContainerRef, mainAreaRef, fileInputRef,
            connectedPortsSet, generateId, handleUpdateRack, handleUpdateDevice, handleConnectionChange, handleDisconnectPort, handleHardwareSpecChange, handleAutoConnectGroup, handleHAAutoConnect,
            handleApplyRATemplate,
            showAlert, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage, handleFileChange,
            handlePrintPDF, rackScreenshots, topoScreenshot, isGeneratingPDF, printTimestamp
        }}>
            {children}
        </RackPlannerContext.Provider>
    );
};

export const useRackPlanner = () => useContext(RackPlannerContext);
