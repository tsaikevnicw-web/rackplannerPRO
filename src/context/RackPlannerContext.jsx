import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from 'react';
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
    const [selectedId, setSelectedId] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({ 'General Purpose': true, 'High Density': true, 'AI 伺服器': true, 'CDU': true, '磁碟陣列': false, '網路設備': false, '其他設備': false });
    const [expandedNetGroups, setExpandedNetGroups] = useState({});

    // Menu States
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isRaMenuOpen, setIsRaMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [drawing, setDrawing] = useState(null);
    const [portCoords, setPortCoords] = useState({});
    const [showCables, setShowCables] = useState(true);

    // Modals
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '提示', type: 'info' });
    const [clearConfirm, setClearConfirm] = useState({ isOpen: false, type: '' });
    const [deleteRackConfirm, setDeleteRackConfirm] = useState({ isOpen: false, rackId: null });
    const [clearDeviceConfirm, setClearDeviceConfirm] = useState({ isOpen: false, deviceId: null });
    const [deleteDeviceConfirm, setDeleteDeviceConfirm] = useState({ isOpen: false, deviceId: null });
    const [raModalState, setRaModalState] = useState({ isOpen: false, type: '' });

    // Scaling
    const [isFitToScreen, setIsFitToScreen] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [layoutSize, setLayoutSize] = useState({ w: 1000, h: 1000 });

    const showAlert = (message, title = '提示', type = 'info') => setAlertModal({ isOpen: true, message, title, type });
    alertModalRef.current = showAlert;

    const { handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage } = useExport(racks, devices, setIsFileMenuOpen, setIsExporting, rackContainerRef, showAlert);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);
                if (parsedData.racks && Array.isArray(parsedData.devices)) {
                    setRacks(parsedData.racks); setDevices(parsedData.devices); setActiveRackId(parsedData.racks[0]?.id); setSelectedId(null); setIsFileMenuOpen(false); showAlert('專案讀取成功！', '成功', 'success');
                } else throw new Error();
            } catch { showAlert('檔案讀取失敗！', '錯誤', 'error'); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    return (
        <RackPlannerContext.Provider value={{
            racks, setRacks, devices, setDevices, activeRackId, setActiveRackId, viewMode, setViewMode, selectedId, setSelectedId,
            draggedItem, setDraggedItem, expandedGroups, setExpandedGroups, expandedNetGroups, setExpandedNetGroups,
            isFileMenuOpen, setIsFileMenuOpen, isRaMenuOpen, setIsRaMenuOpen, isExporting, setIsExporting, drawing, setDrawing, portCoords, setPortCoords,
            showCables, setShowCables, alertModal, setAlertModal, clearConfirm, setClearConfirm, deleteRackConfirm, setDeleteRackConfirm,
            clearDeviceConfirm, setClearDeviceConfirm, deleteDeviceConfirm, setDeleteDeviceConfirm, raModalState, setRaModalState, isFitToScreen, setIsFitToScreen, scaleFactor, setScaleFactor,
            isSidebarOpen, setIsSidebarOpen, layoutSize, setLayoutSize,
            rackContainerRef, mainAreaRef, fileInputRef,
            connectedPortsSet, generateId, handleUpdateRack, handleUpdateDevice, handleConnectionChange, handleDisconnectPort, handleHardwareSpecChange, handleAutoConnectGroup, handleHAAutoConnect,
            handleApplyRATemplate,
            showAlert, handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage, handleFileChange
        }}>
            {children}
        </RackPlannerContext.Provider>
    );
};

export const useRackPlanner = () => useContext(RackPlannerContext);
