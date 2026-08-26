import React, { useState, useEffect } from 'react';
import { 
    Server, Droplets, Zap, Settings, Trash2, LogOut, Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ShieldAlert, Eye, Thermometer, LayoutGrid, RotateCw, RefreshCw, Sparkles, 
    Move, Layers, Compass, Grid, Maximize2, Repeat, MoveHorizontal, MoveVertical
} from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { LIGHT_THEME_STYLES, LIGHT_INFRA_THEMES } from '../../themes/light/lightConstants';

const ContainerViewLight = () => {
    const {
        racks,
        setRacks,
        devices,
        containers,
        setContainers,
        activeRackId,
        setActiveRackId,
        setSelectedIds,
        setViewMode,
        generateId,
        showAlert
    } = useRackPlanner();

    // 檢視模式狀態：每個貨櫃各自記住 'topdown' (俯視角2D自由畫布) 或 'slot' (一維插槽)
    const [layoutModes, setLayoutModes] = useState({});
    
    // 2D 滑鼠拖拽移動與調整尺寸之狀態
    const [dragState, setDragState] = useState(null);
    const [resizeState, setResizeState] = useState(null);

    const getLayoutMode = (containerId) => layoutModes[containerId] || 'topdown';

    const toggleLayoutMode = (containerId) => {
        setLayoutModes(prev => ({
            ...prev,
            [containerId]: getLayoutMode(containerId) === 'topdown' ? 'slot' : 'topdown'
        }));
    };

    // 計算每個 slot 內機櫃的實際功耗與重量
    const getRackStats = (rack) => {
        if (!rack) return { power: 0, weight: 0 };
        if (rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone') return { power: 0, weight: 0 };
        
        if (rack.type === 'Cooling') return { power: rack.power || 4500, weight: rack.weight || 320 };
        if (rack.type === 'CDU') return { power: rack.power || 2500, weight: rack.weight || 350 };
        if (rack.type === 'UPS') return { power: 0, weight: rack.weight || 850 };
        if (rack.type === 'Battery') return { power: 0, weight: rack.weight || 1200 };
        if (rack.type === 'Switchboard') return { power: 0, weight: rack.weight || 420 };
        if (rack.type === 'PowerPanel') return { power: 0, weight: rack.weight || 120 };
        if (rack.type === 'FireSuppression') return { power: 0, weight: rack.weight || 250 };
        if (rack.type === 'Monitoring') return { power: 0, weight: rack.weight || 180 };
        if (rack.type === 'EnvControl') return { power: 0, weight: rack.weight || 150 };

        const rackDevices = devices.filter(d => d.rackId === rack.id);
        const devicePower = rackDevices.reduce((sum, d) => sum + (d.power || 0), 0);
        const deviceWeight = rackDevices.reduce((sum, d) => sum + (d.weight !== undefined && d.weight !== null ? d.weight : 10), 0);
        
        return {
            power: devicePower,
            weight: (rack.weight || 150) + deviceWeight
        };
    };

    const getSingleContainerStats = (container) => {
        const maxSlots = container.type === '20ft' ? 10 : (container.type === '40ft' ? 20 : Math.floor((container.customLength || 40) / 2));
        const activeRacks = racks.filter(r => {
            const cId = r.containerId || 'container-1';
            return cId === container.id;
        });

        const selfW = container.selfWeight !== undefined ? container.selfWeight : (container.type === '20ft' ? 2200 : (container.type === '40ft' ? 3800 : (container.customLength ? container.customLength * 95 : 3800)));
        let totalWeight = selfW;
        let totalItPower = 0;
        let totalCoolingPower = 0;

        activeRacks.forEach(rack => {
            if (rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone') return;
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

        const upsLosses = totalItPower * 0.05;
        const pue = totalItPower > 0 
            ? (totalItPower + totalCoolingPower + upsLosses) / totalItPower
            : 1.15;

        return {
            totalWeight,
            totalItPower,
            totalCoolingPower,
            totalPower: totalItPower + totalCoolingPower + upsLosses,
            pue: Math.max(1.15, pue)
        };
    };

    // 取得 2D 畫布預設座標 (當機櫃尚未設定 posX / posY 時)
    const getRack2DPos = (rack, slotIdx, maxSlots, canvasWidth = 1100) => {
        if (rack.posX !== undefined && rack.posY !== undefined) {
            return { x: rack.posX, y: rack.posY };
        }
        const startX = 40;
        const slotWidth = Math.max(85, Math.min(100, (canvasWidth - 100) / Math.max(1, maxSlots)));
        const sIdx = rack.slotIndex !== undefined && rack.slotIndex !== null ? rack.slotIndex : slotIdx;
        return {
            x: Math.round(startX + sIdx * slotWidth),
            y: 110
        };
    };

    // 2D 俯視畫布滑鼠拖拽移動機櫃處理
    const handle2DRackMouseDown = (e, rack, containerId) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setActiveRackId(rack.id);
        setSelectedIds([rack.id]);

        const innerElem = document.getElementById(`container-topdown-inner-${containerId}`);
        if (!innerElem) return;
        const rect = innerElem.getBoundingClientRect();
        const maxSlots = 20;
        const initPos = getRack2DPos(rack, rack.slotIndex || 0, maxSlots, rect.width);
        const isZone = rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone';
        const cardW = rack.customWidth || (isZone ? 450 : 80);
        const cardH = rack.customHeight || (isZone ? 60 : 105);

        setDragState({
            rackId: rack.id,
            containerId: containerId,
            startX: e.clientX,
            startY: e.clientY,
            initX: initPos.x,
            initY: initPos.y,
            cardW,
            cardH,
            containerRect: rect
        });
    };

    // 2D 俯視畫布調整機櫃尺寸 MouseDown
    const handle2DRackResizeMouseDown = (e, rack) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        setActiveRackId(rack.id);
        setSelectedIds([rack.id]);

        const innerElem = document.getElementById(`container-topdown-inner-${rack.containerId || 'container-1'}`);
        const containerRect = innerElem ? innerElem.getBoundingClientRect() : { width: 900, height: 350 };

        const isZone = rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone';
        const currentW = rack.customWidth || (isZone ? 450 : 80);
        const currentH = rack.customHeight || (isZone ? 60 : 105);
        const posX = rack.posX !== undefined ? rack.posX : 4;
        const posY = rack.posY !== undefined ? rack.posY : 4;

        setResizeState({
            rackId: rack.id,
            startX: e.clientX,
            startY: e.clientY,
            initW: currentW,
            initH: currentH,
            posX,
            posY,
            containerRect
        });
    };

    // 全局拖拽移動與調整尺寸事件監聽 (包含絕對對稱的內側貨櫃邊界鎖定)
    useEffect(() => {
        if (!dragState && !resizeState) return;

        const handleMouseMove = (e) => {
            if (dragState) {
                const deltaX = e.clientX - dragState.startX;
                const deltaY = e.clientY - dragState.startY;

                const innerW = dragState.containerRect.width;
                const innerH = dragState.containerRect.height;
                const compW = dragState.cardW || 80;
                const compH = dragState.cardH || 60;

                let rawX = dragState.initX + deltaX;
                let rawY = dragState.initY + deltaY;

                // 絕對對稱邊界：四周均預留 4px 邊界
                let minX = 4;
                let maxX = Math.max(4, Math.floor((innerW - compW - 4) / 5) * 5);
                let minY = 4;
                let maxY = Math.max(4, Math.floor((innerH - compH - 4) / 5) * 5);

                let newX = Math.max(minX, Math.min(maxX, Math.round(rawX / 5) * 5));
                let newY = Math.max(minY, Math.min(maxY, Math.round(rawY / 5) * 5));

                setRacks(prev => prev.map(r => {
                    if (r.id === dragState.rackId) {
                        return { ...r, posX: newX, posY: newY };
                    }
                    return r;
                }));
            } else if (resizeState) {
                const deltaX = e.clientX - resizeState.startX;
                const deltaY = e.clientY - resizeState.startY;

                const innerW = resizeState.containerRect.width;
                const innerH = resizeState.containerRect.height;
                const posX = resizeState.posX || 4;
                const posY = resizeState.posY || 4;

                // 絕對對稱邊界：拉伸右邊界不能超過 innerW - posX - 4，下邊界不能超過 innerH - posY - 4
                let maxAllowedW = Math.max(40, Math.floor((innerW - posX - 4) / 5) * 5);
                let maxAllowedH = Math.max(30, Math.floor((innerH - posY - 4) / 5) * 5);

                let newW = Math.max(40, Math.min(maxAllowedW, Math.round((resizeState.initW + deltaX) / 5) * 5));
                let newH = Math.max(30, Math.min(maxAllowedH, Math.round((resizeState.initH + deltaY) / 5) * 5));

                setRacks(prev => prev.map(r => {
                    if (r.id === resizeState.rackId) {
                        return { ...r, customWidth: newW, customHeight: newH };
                    }
                    return r;
                }));
            }
        };

        const handleMouseUp = () => {
            setDragState(null);
            setResizeState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, resizeState, setRacks]);

    // 滿寬設定：將通道模組寬度自動拉伸至與內側貨櫃畫布完全同寬
    const handleFitFullWidth = (rackId, containerId, e) => {
        if (e) e.stopPropagation();
        const innerElem = document.getElementById(`container-topdown-inner-${containerId}`);
        if (innerElem) {
            const rect = innerElem.getBoundingClientRect();
            const fitW = Math.floor((rect.width - 8) / 5) * 5;
            setRacks(prev => prev.map(r => {
                if (r.id === rackId) {
                    return { ...r, posX: 4, customWidth: fitW };
                }
                return r;
            }));
        }
    };

    // 滿高設定：將通道模組高度自動拉伸至與內側貨櫃畫布完全同高
    const handleFitFullHeight = (rackId, containerId, e) => {
        if (e) e.stopPropagation();
        const innerElem = document.getElementById(`container-topdown-inner-${containerId}`);
        if (innerElem) {
            const rect = innerElem.getBoundingClientRect();
            const fitH = Math.floor((rect.height - 8) / 5) * 5;
            setRacks(prev => prev.map(r => {
                if (r.id === rackId) {
                    return { ...r, posY: 4, customHeight: fitH };
                }
                return r;
            }));
        }
    };

    // 旋轉機櫃 (0°, 90°, 180°, 270°)
    const handleRotateRack = (rackId, e) => {
        if (e) e.stopPropagation();
        setRacks(prev => prev.map(r => {
            if (r.id === rackId) {
                const currentRot = r.rotation || 0;
                const nextRot = (currentRot + 90) % 360;
                return { ...r, rotation: nextRot };
            }
            return r;
        }));
    };

    // 獨立切換藍色 (進風) 區塊之箭頭方向 (180度翻轉)
    const handleToggleBlueArrow = (rackId, e) => {
        if (e) e.stopPropagation();
        setRacks(prev => prev.map(r => {
            if (r.id === rackId) {
                const baseMode = r.airflowMode || 'down';
                const currentDir = r.blueArrowDir || (baseMode === 'up' ? 'up' : (baseMode === 'left' ? 'left' : (baseMode === 'right' ? 'right' : 'down')));
                let nextDir = 'up';
                if (currentDir === 'down') nextDir = 'up';
                else if (currentDir === 'up') nextDir = 'down';
                else if (currentDir === 'right') nextDir = 'left';
                else if (currentDir === 'left') nextDir = 'right';
                return { ...r, blueArrowDir: nextDir };
            }
            return r;
        }));
    };

    // 獨立切換紅色 (出風) 區塊之箭頭方向 (180度翻轉)
    const handleToggleRedArrow = (rackId, e) => {
        if (e) e.stopPropagation();
        setRacks(prev => prev.map(r => {
            if (r.id === rackId) {
                const baseMode = r.airflowMode || 'down';
                const currentDir = r.redArrowDir || (baseMode === 'up' ? 'up' : (baseMode === 'left' ? 'left' : (baseMode === 'right' ? 'right' : 'down')));
                let nextDir = 'up';
                if (currentDir === 'down') nextDir = 'up';
                else if (currentDir === 'up') nextDir = 'down';
                else if (currentDir === 'right') nextDir = 'left';
                else if (currentDir === 'left') nextDir = 'right';
                return { ...r, redArrowDir: nextDir };
            }
            return r;
        }));
    };

    // 一鍵自動對齊排列機櫃
    const handleAutoAlignRacks = (containerId, maxSlots) => {
        setRacks(prev => {
            const containerRacks = prev.filter(r => (r.containerId || 'container-1') === containerId);
            const containerPhysicalRacks = containerRacks.filter(r => !r.isZone && r.type !== 'ColdAisleZone' && r.type !== 'HotAisleZone');
            return prev.map(r => {
                if ((r.containerId || 'container-1') === containerId) {
                    const isZone = r.isZone || r.type === 'ColdAisleZone' || r.type === 'HotAisleZone';
                    if (isZone) return r;
                    const idx = containerPhysicalRacks.findIndex(cr => cr.id === r.id);
                    const pos = getRack2DPos({ ...r, posX: undefined, posY: undefined, slotIndex: idx }, idx, maxSlots);
                    return {
                        ...r,
                        slotIndex: idx,
                        posX: pos.x,
                        posY: 110,
                        rotation: 0,
                        customWidth: 80,
                        customHeight: 105
                    };
                }
                return r;
            });
        });
        showAlert('已成功將該貨櫃內所有機櫃恢復為標準 2D 自動整齊排列！', '對齊成功', 'success');
    };

    // 1D Slot 拖曳開始
    const handleRackDragStart = (e, rackId) => {
        e.dataTransfer.setData('draggedRackId', rackId);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    // 2D / 1D Canvas Drop 放下處理
    const handleContainerCanvasDrop = (e, containerId, containerElement) => {
        e.preventDefault();
        
        const newContainerType = e.dataTransfer.getData('newContainerType');
        if (newContainerType) {
            handleCanvasDrop(e);
            return;
        }

        const cabinetDataStr = e.dataTransfer.getData('cabinet');
        let isZoneDrop = false;
        if (cabinetDataStr) {
            try {
                const p = JSON.parse(cabinetDataStr);
                isZoneDrop = p.isZone || p.cabinetType === 'ColdAisleZone' || p.cabinetType === 'HotAisleZone';
            } catch(err) {}
        }

        const compW = isZoneDrop ? 450 : 80;
        const compH = isZoneDrop ? 60 : 105;

        let dropX = 10;
        let dropY = 10;
        const innerElem = document.getElementById(`container-topdown-inner-${containerId}`);
        if (innerElem) {
            const rect = innerElem.getBoundingClientRect();
            const rawX = e.clientX - rect.left - (compW / 2);
            const rawY = e.clientY - rect.top - (compH / 2);
            const maxX = Math.max(4, Math.floor((rect.width - compW - 4) / 5) * 5);
            const maxY = Math.max(4, Math.floor((rect.height - compH - 4) / 5) * 5);
            dropX = Math.max(4, Math.min(maxX, Math.round(rawX / 5) * 5));
            dropY = Math.max(4, Math.min(maxY, Math.round(rawY / 5) * 5));
        }

        if (cabinetDataStr) {
            try {
                const payload = JSON.parse(cabinetDataStr);
                const isZone = payload.isZone || payload.cabinetType === 'ColdAisleZone' || payload.cabinetType === 'HotAisleZone';
                const containerRacks = racks.filter(r => (r.containerId || 'container-1') === containerId);
                const containerPhysicalRacks = containerRacks.filter(r => !r.isZone && r.type !== 'ColdAisleZone' && r.type !== 'HotAisleZone');
                const newRackId = 'rack-' + generateId();
                const newRack = {
                    id: newRackId,
                    name: isZone 
                        ? (payload.cabinetType === 'ColdAisleZone' ? '冷通道模組' : '熱通道模組') 
                        : `${payload.name.split(' ')[0]}-${racks.length + 1}`,
                    type: payload.cabinetType,
                    isZone: isZone,
                    uCount: payload.uCount,
                    powerLimit: payload.powerLimit,
                    coolingCapacity: payload.coolingCapacity,
                    powerCapacity: payload.powerCapacity,
                    batteryCapacity: payload.batteryCapacity,
                    power: payload.power,
                    weight: payload.weight,
                    slotIndex: isZone ? null : containerPhysicalRacks.length,
                    containerId: containerId,
                    posX: dropX,
                    posY: dropY,
                    rotation: 0,
                    customWidth: isZone ? 450 : 80,
                    customHeight: isZone ? 60 : 105,
                    airflowMode: 'down'
                };
                
                setRacks(prev => [...prev, newRack]);
                setActiveRackId(newRackId);
                setSelectedIds([newRackId]);
            } catch (err) {
                console.error('Failed to parse cabinet drag data', err);
            }
            return;
        }

        const draggedRackId = e.dataTransfer.getData('draggedRackId');
        if (draggedRackId) {
            setRacks(prev => prev.map(r => {
                if (r.id === draggedRackId) {
                    return { ...r, containerId: containerId, posX: dropX, posY: dropY };
                }
                return r;
            }));
            setActiveRackId(draggedRackId);
            setSelectedIds([draggedRackId]);
        }
    };

    // 1D Slot 的 Drop 處理
    const handleSlotDrop = (e, containerId, targetSlotIndex) => {
        e.preventDefault();
        
        const newContainerType = e.dataTransfer.getData('newContainerType');
        if (newContainerType) {
            handleCanvasDrop(e);
            return;
        }

        const cabinetDataStr = e.dataTransfer.getData('cabinet');
        if (cabinetDataStr) {
            try {
                const payload = JSON.parse(cabinetDataStr);
                const isZone = payload.isZone || payload.cabinetType === 'ColdAisleZone' || payload.cabinetType === 'HotAisleZone';
                if (isZone) {
                    showAlert('冷熱通道模組僅適用於俯視角 2D 畫布擺放，無法直接放入一維標準插槽中！', '提示', 'info');
                    return;
                }

                const occupiedRack = racks.find(r => (r.containerId || 'container-1') === containerId && !r.isZone && r.type !== 'ColdAisleZone' && r.type !== 'HotAisleZone' && r.slotIndex === targetSlotIndex);
                
                if (occupiedRack) {
                    showAlert('此插槽已放置機櫃！請先移開或移除現有機櫃。', '提示', 'warning');
                    return;
                }

                const newRackId = 'rack-' + generateId();
                const newRack = {
                    id: newRackId,
                    name: `${payload.name.split(' ')[0]}-${racks.length + 1}`,
                    type: payload.cabinetType,
                    uCount: payload.uCount,
                    powerLimit: payload.powerLimit,
                    coolingCapacity: payload.coolingCapacity,
                    powerCapacity: payload.powerCapacity,
                    batteryCapacity: payload.batteryCapacity,
                    power: payload.power,
                    weight: payload.weight,
                    slotIndex: targetSlotIndex,
                    containerId: containerId,
                    customWidth: 80,
                    customHeight: 105,
                    airflowMode: 'down'
                };
                
                setRacks(prev => [...prev, newRack]);
                setActiveRackId(newRackId);
                setSelectedIds([newRackId]);
            } catch (err) {
                console.error('Failed to parse cabinet drag data', err);
            }
            return;
        }

        const draggedRackId = e.dataTransfer.getData('draggedRackId');
        if (draggedRackId) {
            const targetRack = racks.find(r => r.id === draggedRackId);
            if (!targetRack) return;

            const isZone = targetRack.isZone || targetRack.type === 'ColdAisleZone' || targetRack.type === 'HotAisleZone';
            if (isZone) {
                showAlert('冷熱通道模組僅適用於俯視角 2D 畫布擺放，無法移動至一維標準插槽中！', '提示', 'info');
                return;
            }

            const occupiedRack = racks.find(r => (r.containerId || 'container-1') === containerId && !r.isZone && r.type !== 'ColdAisleZone' && r.type !== 'HotAisleZone' && r.slotIndex === targetSlotIndex);
            
            if (occupiedRack) {
                const originalSlotIndex = targetRack.slotIndex;
                const originalContainerId = targetRack.containerId || 'container-1';
                setRacks(prev => prev.map(r => {
                    if (r.id === targetRack.id) return { ...r, containerId: containerId, slotIndex: targetSlotIndex };
                    if (r.id === occupiedRack.id) return { ...r, containerId: originalContainerId, slotIndex: originalSlotIndex };
                    return r;
                }));
            } else {
                setRacks(prev => prev.map(r => {
                    if (r.id === targetRack.id) return { ...r, containerId: containerId, slotIndex: targetSlotIndex };
                    return r;
                }));
            }
            setActiveRackId(draggedRackId);
            setSelectedIds([draggedRackId]);
        }
    };

    // 拖曳規格新增貨櫃
    const handleCanvasDrop = (e) => {
        const newContainerType = e.dataTransfer.getData('newContainerType');
        if (newContainerType) {
            e.preventDefault();
            e.stopPropagation();
            const nextLetter = String.fromCharCode(65 + containers.length);
            const newContainer = {
                id: `container-${Date.now()}`,
                name: `貨櫃-${nextLetter}`,
                type: newContainerType,
                customLength: newContainerType === 'custom' ? 20 : undefined,
                powerLimit: 500000,
                weightLimit: 30000,
                pueBase: 1.15
            };
            setContainers(prev => [...prev, newContainer]);
            showAlert(`已新增一個可規畫的 ${newContainerType === '20ft' ? '20呎' : (newContainerType === '40ft' ? '40呎' : '自訂長度')} 貨櫃 (貨櫃-${nextLetter})！`, '新增成功', 'success');
        }
    };

    // 刪除貨櫃
    const handleDeleteContainer = (containerId, e) => {
        e.stopPropagation();
        if (containers.length <= 1) {
            showAlert('必須保留至少一個貨櫃！', '提示', 'warning');
            return;
        }
        if (window.confirm('確定要刪除此貨櫃嗎？其內部所有的機櫃將會被同步刪除。')) {
            setRacks(prev => prev.filter(r => {
                const cId = r.containerId || 'container-1';
                return cId !== containerId;
            }));
            setContainers(prev => prev.filter(c => c.id !== containerId));
        }
    };

    // 徹底刪除機櫃
    const handleDeleteRack = (rackId, e) => {
        e.stopPropagation();
        if (window.confirm('確定要徹底刪除此機櫃以及其內部的所有設備嗎？')) {
            setRacks(prev => prev.filter(r => r.id !== rackId));
            if (activeRackId === rackId) {
                const remaining = racks.filter(r => r.id !== rackId);
                setActiveRackId(remaining[0]?.id || null);
                setSelectedIds([]);
            }
        }
    };

    // 雙擊 IT 機櫃進行深度編輯
    const handleDoubleClickRack = (rack) => {
        if (rack.type === 'General' || rack.type === 'ORv3') {
            setActiveRackId(rack.id);
            setSelectedIds([rack.id]);
            setViewMode('single');
        } else {
            showAlert('此機櫃為基礎設施模組，無須進行單櫃內部設備編輯。', '提示', 'info');
        }
    };

    // 取得元件圖示
    const getCabinetIcon = (type) => {
        switch (type) {
            case 'Cooling':
            case 'CDU':
                return Droplets;
            case 'UPS':
            case 'PowerPanel':
                return Zap;
            case 'Battery':
                return LayoutGrid;
            case 'Switchboard':
                return Settings;
            case 'FireSuppression':
                return ShieldAlert;
            case 'Monitoring':
                return Eye;
            case 'EnvControl':
                return Thermometer;
            default:
                return Server;
        }
    };

    // 繪製紅藍進出風標示區塊與風向箭頭 (色塊位置固定：藍色區塊在頂端/左側，紅色區塊在底端/右側，點擊各區塊時僅單獨切換該區塊的箭頭方向)
    const renderAirflowBlocks = (rack) => {
        const mode = rack.airflowMode || 'down';
        const blueDir = rack.blueArrowDir || (mode === 'up' ? 'up' : (mode === 'left' ? 'left' : (mode === 'right' ? 'right' : 'down')));
        const redDir = rack.redArrowDir || (mode === 'up' ? 'up' : (mode === 'left' ? 'left' : (mode === 'right' ? 'right' : 'down')));

        // 垂直佈局 (預設)：上方固定為藍色進風區塊，下方固定為紅色出風區塊
        if (mode === 'down' || mode === 'up') {
            const isBlueUp = blueDir === 'up';
            const isRedUp = redDir === 'up';
            return (
                <>
                    {/* 上：進風 (Cold Blue) - 獨立點擊僅切換藍色箭頭 ⬇️/⬆️ */}
                    <div 
                        onClick={(e) => handleToggleBlueArrow(rack.id, e)}
                        className="absolute -top-1.5 inset-x-1 h-3.5 bg-blue-600/90 hover:bg-blue-500 rounded-t flex items-center justify-center cursor-pointer shadow-[0_0_8px_#3b82f6] transition-colors z-20 group/flow"
                        title="獨立點擊單獨翻轉藍色進風箭頭"
                    >
                        {isBlueUp ? (
                            <ArrowUp className="w-3 h-3 text-white font-extrabold animate-bounce" />
                        ) : (
                            <ArrowDown className="w-3 h-3 text-white font-extrabold animate-bounce" />
                        )}
                    </div>
                    {/* 下：出風 (Hot Red) - 獨立點擊僅切換紅色箭頭 ⬇️/⬆️ */}
                    <div 
                        onClick={(e) => handleToggleRedArrow(rack.id, e)}
                        className="absolute -bottom-1.5 inset-x-1 h-3.5 bg-red-600/90 hover:bg-red-500 rounded-b flex items-center justify-center cursor-pointer shadow-[0_0_8px_#ef4444] transition-colors z-20 group/flow"
                        title="獨立點擊單獨翻轉紅色出風箭頭"
                    >
                        {isRedUp ? (
                            <ArrowUp className="w-3 h-3 text-white font-extrabold animate-bounce" />
                        ) : (
                            <ArrowDown className="w-3 h-3 text-white font-extrabold animate-bounce" />
                        )}
                    </div>
                </>
            );
        }

        // 水平佈局：左方固定為藍色區塊，右方固定為紅色區塊
        const isBlueLeft = blueDir === 'left';
        const isRedLeft = redDir === 'left';
        return (
            <>
                {/* 左：進風 (Cold Blue) - 獨立點擊僅切換藍色箭頭 ➡️/⬅️ */}
                <div 
                    onClick={(e) => handleToggleBlueArrow(rack.id, e)}
                    className="absolute -left-1.5 inset-y-1 w-3.5 bg-blue-600/90 hover:bg-blue-500 rounded-l flex items-center justify-center cursor-pointer shadow-[0_0_8px_#3b82f6] transition-colors z-20 group/flow"
                    title="獨立點擊單獨翻轉藍色進風箭頭"
                >
                    {isBlueLeft ? (
                        <ArrowLeft className="w-3 h-3 text-white font-extrabold animate-pulse" />
                    ) : (
                        <ArrowRight className="w-3 h-3 text-white font-extrabold animate-pulse" />
                    )}
                </div>
                {/* 右：出風 (Hot Red) - 獨立點擊僅切換紅色箭頭 ➡️/⬅️ */}
                <div 
                    onClick={(e) => handleToggleRedArrow(rack.id, e)}
                    className="absolute -right-1.5 inset-y-1 w-3.5 bg-red-600/90 hover:bg-red-500 rounded-r flex items-center justify-center cursor-pointer shadow-[0_0_8px_#ef4444] transition-colors z-20 group/flow"
                    title="獨立點擊單獨翻轉紅色出風箭頭"
                >
                    {isRedLeft ? (
                        <ArrowLeft className="w-3 h-3 text-white font-extrabold animate-pulse" />
                    ) : (
                        <ArrowRight className="w-3 h-3 text-white font-extrabold animate-pulse" />
                    )}
                </div>
            </>
        );
    };

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-[#060c14] space-y-8 select-none"
        >
            {/* 樣式動畫定義 */}
            <style>{`
                @keyframes airflowDown {
                    0% { transform: translateY(-3px); opacity: 0.4; }
                    50% { opacity: 0.9; }
                    100% { transform: translateY(4px); opacity: 0.4; }
                }
                @keyframes airflowUp {
                    0% { transform: translateY(3px); opacity: 0.4; }
                    50% { opacity: 0.9; }
                    100% { transform: translateY(-4px); opacity: 0.4; }
                }
                .airflow-down {
                    animation: airflowDown 1.5s ease-in-out infinite;
                }
                .airflow-up {
                    animation: airflowUp 1.5s ease-in-out infinite;
                }
            `}</style>

            {containers.map((container) => {
                const maxSlots = container.type === '20ft' ? 10 : (container.type === '40ft' ? 20 : Math.floor((container.customLength || 40) / 2));
                const activeContainerRacks = racks.filter(r => (r.containerId || 'container-1') === container.id);
                const stats = getSingleContainerStats(container);
                const currentLayoutMode = getLayoutMode(container.id);

                return (
                    <div key={container.id} className="w-full max-w-7xl mx-auto flex flex-col items-center relative group/container">
                        
                        {/* Container Header Banner */}
                        <div className="w-full flex flex-wrap items-center justify-between bg-white/80 border border-slate-200 rounded-2xl px-6 py-3.5 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)] gap-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={container.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setContainers(prev => prev.map(c => c.id === container.id ? { ...c, name: newName } : c));
                                    }}
                                    className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900 focus:ring-0 px-1.5 py-0.5 w-32 transition-all rounded"
                                    title="按此修改貨櫃名稱"
                                />
                                <select
                                    value={container.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        let limitSlots = 20;
                                        if (newType === '20ft') limitSlots = 10;
                                        else if (newType === '40ft') limitSlots = 20;
                                        else limitSlots = Math.floor((container.customLength || 40) / 2);

                                        const hasOutofBounds = racks.some(r => (r.containerId || 'container-1') === container.id && r.slotIndex >= limitSlots);
                                        if (hasOutofBounds) {
                                            if (!window.confirm(`切換規格至該長度將會將超出 ${limitSlots} 的機櫃刪除，確定要切換嗎？`)) {
                                                return;
                                            }
                                            setRacks(prev => prev.filter(r => {
                                                const cId = r.containerId || 'container-1';
                                                return !(cId === container.id && r.slotIndex >= limitSlots);
                                            }));
                                        }
                                        setContainers(prev => prev.map(c => c.id === container.id ? { ...c, type: newType, customLength: newType === 'custom' ? (c.customLength || 40) : undefined } : c));
                                    }}
                                    className="bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold rounded px-2.5 py-1 outline-none cursor-pointer hover:bg-indigo-900/40 hover:border-indigo-400/50 transition-colors"
                                >
                                    <option value="20ft" className="bg-white text-slate-700">20呎 (10格)</option>
                                    <option value="40ft" className="bg-white text-slate-700">40呎 (20格)</option>
                                    <option value="custom" className="bg-white text-slate-700">自訂長度</option>
                                </select>
                                
                                {container.type === 'custom' && (
                                    <div className="flex items-center gap-1.5 bg-slate-100/60 border border-slate-200/60 rounded-lg px-2 py-0.5 shadow-inner" title="自訂貨櫃長度 (呎)">
                                        <span className="text-[10px] font-bold text-slate-500 select-none uppercase tracking-wider">長度</span>
                                        <input
                                            type="number"
                                            min={2}
                                            max={200}
                                            step={2}
                                            value={container.customLength || 40}
                                            onChange={(e) => {
                                                const newFeet = Math.max(2, parseInt(e.target.value) || 2);
                                                const newSlots = Math.floor(newFeet / 2);
                                                const hasOutofBounds = racks.some(r => (r.containerId || 'container-1') === container.id && r.slotIndex >= newSlots);
                                                if (hasOutofBounds) {
                                                    if (!window.confirm(`縮減長度至 ${newFeet} 呎 (${newSlots} 格) 將會把超出範圍的機櫃刪除，確定嗎？`)) {
                                                        return;
                                                    }
                                                    setRacks(prev => prev.filter(r => {
                                                        const cId = r.containerId || 'container-1';
                                                        return !(cId === container.id && r.slotIndex >= newSlots);
                                                    }));
                                                }
                                                setContainers(prev => prev.map(c => c.id === container.id ? { ...c, customLength: newFeet } : c));
                                            }}
                                            className="bg-transparent border-none outline-none text-xs text-slate-900 focus:ring-0 p-0 w-12 text-center font-mono font-bold"
                                        />
                                        <span className="text-[10px] text-slate-500 font-bold select-none">呎</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-1.5 bg-slate-100/60 border border-slate-200/60 rounded-lg px-2 py-0.5 shadow-inner" title="貨櫃自重 (Tare Weight)">
                                    <span className="text-[10px] font-bold text-slate-500 select-none uppercase tracking-wider">自重</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={container.selfWeight !== undefined ? container.selfWeight : (container.type === '20ft' ? 2200 : 3800)}
                                        onChange={(e) => {
                                            const selfW = parseFloat(e.target.value) || 0;
                                            setContainers(prev => prev.map(c => c.id === container.id ? { ...c, selfWeight: selfW } : c));
                                        }}
                                        className="bg-transparent border-none outline-none text-xs text-slate-900 focus:ring-0 p-0 w-16 text-center font-mono font-bold"
                                        placeholder={container.type === '20ft' ? '2200' : '3800'}
                                    />
                                    <span className="text-[10px] text-slate-500 font-bold select-none">kg</span>
                                </div>
                            </div>

                            {/* 中間：檢視模式切換器 & 自動對齊按鈕 */}
                            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => toggleLayoutMode(container.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        currentLayoutMode === 'topdown'
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-800/50'
                                    }`}
                                    title="切換至貨櫃俯視角 2D 自由平面佈局"
                                >
                                    <Compass className="w-3.5 h-3.5" />
                                    <span>俯視角 2D 畫布</span>
                                </button>
                                <button
                                    onClick={() => toggleLayoutMode(container.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        currentLayoutMode === 'slot'
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-800/50'
                                    }`}
                                    title="切換至一維標準插槽清單"
                                >
                                    <Grid className="w-3.5 h-3.5" />
                                    <span>標準插槽 (1D)</span>
                                </button>

                                {currentLayoutMode === 'topdown' && (
                                    <button
                                        onClick={() => handleAutoAlignRacks(container.id, maxSlots)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-800 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors ml-1"
                                        title="一鍵自動將機櫃整齊對齊排列"
                                    >
                                        <RefreshCw className="w-3 h-3 text-indigo-400" />
                                        <span>自動對齊</span>
                                    </button>
                                )}
                            </div>
                            
                            {/* Right Mini Stats */}
                            <div className="flex items-center gap-3 text-xs font-mono">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold">
                                    <span className="text-emerald-600 font-medium">PUE</span>{stats.pue.toFixed(2)}
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold transition-colors ${
                                    stats.totalWeight > container.weightLimit
                                        ? 'bg-red-500/15 text-red-400 border-red-500/35 animate-pulse'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                    <span className={stats.totalWeight > container.weightLimit ? 'text-red-500 font-extrabold' : 'text-amber-600 font-medium'}>重</span>
                                    {stats.totalWeight.toLocaleString()} / {container.weightLimit.toLocaleString()} kg
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
                                    stats.totalPower > container.powerLimit
                                        ? 'bg-red-500/15 text-red-400 border-red-500/35'
                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                }`}>
                                    <span className="text-sky-600 font-medium">功耗</span>
                                    {(stats.totalPower / 1000).toFixed(1)} / {(container.powerLimit / 1000).toFixed(0)} kW
                                </div>
                                {containers.length > 1 && (
                                    <button
                                        onClick={(e) => handleDeleteContainer(container.id, e)}
                                        className="ml-2 p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/60 rounded-lg text-red-400 hover:text-red-200 transition-colors"
                                        title="刪除此貨櫃"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Container Canvas Frame */}
                        {currentLayoutMode === 'topdown' ? (
                            /* ═════════════════════════════════════════════════════════════════
                                 俯視角 2D 自由平面畫布 (Top-Down 2D Floor Plan Canvas)
                               ═════════════════════════════════════════════════════════════════ */
                            <div 
                                id={`container-topdown-canvas-${container.id}`} 
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const elem = document.getElementById(`container-topdown-canvas-${container.id}`);
                                    handleContainerCanvasDrop(e, container.id, elem);
                                }}
                                className="relative w-full min-h-[420px] bg-[#09111e] border-[6px] border-slate-200/80 rounded-3xl p-6 shadow-[0_24px_50px_rgba(0,0,0,0.7)] overflow-hidden mb-8 group/canvas"
                            >
                                {/* 貨櫃俯視對稱金屬外框與雙開門細節 */}
                                <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 border-r border-slate-950 flex flex-col justify-around py-4 z-10">
                                    <div className="w-full h-12 bg-white rounded-r border-y border-slate-600"></div>
                                    <div className="w-full h-12 bg-white rounded-r border-y border-slate-600"></div>
                                </div>
                                <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-slate-700 via-slate-800 to-slate-900 border-l border-slate-950 flex flex-col justify-around py-4 z-10">
                                    <div className="w-full h-12 bg-white rounded-l border-y border-slate-600"></div>
                                    <div className="w-full h-12 bg-white rounded-l border-y border-slate-600"></div>
                                </div>
                                <div 
                                    className="absolute inset-x-4 inset-y-0 opacity-25 pointer-events-none"
                                    style={{
                                        backgroundImage: `
                                            linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px),
                                            linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)
                                        `,
                                        backgroundSize: '20px 20px'
                                    }}
                                />

                                 {/* 中間 2D 俯視自由擺放畫布主區域 (帶 container-topdown-inner 獨立邊界與 overflow-hidden 實體防超頁) */}
                                <div 
                                    id={`container-topdown-inner-${container.id}`}
                                    className="relative min-h-[360px] w-full border border-slate-200/80 rounded-2xl bg-white p-4 overflow-hidden"
                                >

                                    {/* 機櫃與通道模組於 2D 俯視畫布上的絕對定位列表 (支援可移動、雙向拉伸自由控制大小、旋轉、手動獨立箭頭與實時風流特效) */}
                                    {activeContainerRacks.map((rack, idx) => {
                                        const isZone = rack.isZone || rack.type === 'ColdAisleZone' || rack.type === 'HotAisleZone';
                                        const pos = getRack2DPos(rack, idx, maxSlots);
                                        const stats = getRackStats(rack);
                                        const isActive = rack.id === activeRackId;
                                        const rot = rack.rotation || 0;
                                        const cardW = rack.customWidth || (isZone ? 450 : 80);
                                        const cardH = rack.customHeight || (isZone ? 60 : 105);

                                        // 若為「冷通道」或「熱通道」畫布組件
                                        if (isZone) {
                                            const isCold = rack.type === 'ColdAisleZone';
                                            const windDir = rack.airflowMode || (isCold ? 'down' : 'up');
                                            const rawTemp = rack.zoneTemp !== undefined ? rack.zoneTemp : (isCold ? '22' : '35');
                                            const displayTemp = (typeof rawTemp === 'number' || (!isNaN(Number(rawTemp)) && String(rawTemp).trim() !== '')) ? `${rawTemp}°C` : rawTemp;

                                            let WindIcon = ArrowDown;
                                            if (windDir === 'up') WindIcon = ArrowUp;
                                            if (windDir === 'left') WindIcon = ArrowLeft;
                                            if (windDir === 'right') WindIcon = ArrowRight;

                                            const windAnimClass = 
                                                windDir === 'left' ? 'animate-wind-left' :
                                                windDir === 'right' ? 'animate-wind-right' :
                                                windDir === 'up' ? 'animate-wind-up' : 'animate-wind-down';

                                            return (
                                                <div
                                                    key={rack.id}
                                                    onMouseDown={(e) => {
                                                        const elem = document.getElementById(`container-topdown-canvas-${container.id}`);
                                                        handle2DRackMouseDown(e, rack, container.id, elem);
                                                    }}
                                                    style={{
                                                        left: `${pos.x}px`,
                                                        top: `${pos.y}px`,
                                                        width: `${cardW}px`,
                                                        height: `${cardH}px`,
                                                        transform: `rotate(${rot}deg)`,
                                                        transformOrigin: 'center center'
                                                    }}
                                                    className={`absolute rounded-2xl border-2 flex items-center justify-between px-4 py-2 transition-shadow cursor-grab active:cursor-grabbing group/rack z-10 select-none overflow-hidden ${
                                                        isCold
                                                            ? 'bg-gradient-to-r from-blue-950/90 via-blue-900/65 to-blue-950/90 border-blue-500/80 shadow-[0_0_24px_rgba(59,130,246,0.35)] text-blue-300'
                                                            : 'bg-gradient-to-r from-red-950/90 via-red-900/65 to-red-950/90 border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.35)] text-red-300'
                                                    } ${isActive ? 'ring-4 ring-indigo-500/40' : ''}`}
                                                >
                                                    {/* 動態風流特效背景 Overlay (根據風向即時向左/右/上/下流動) */}
                                                    <div className="absolute inset-0 pointer-events-none z-0 opacity-45 flex items-center justify-around overflow-hidden">
                                                        <div className={`absolute inset-0 ${
                                                            isCold ? 'bg-blue-500/10' : 'bg-red-500/10'
                                                        }`} />
                                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                                            <div 
                                                                key={i} 
                                                                className={`flex items-center justify-center ${
                                                                    isCold ? 'text-blue-400' : 'text-red-400'
                                                                } ${windAnimClass}`}
                                                                style={{ animationDelay: `${(i - 1) * 0.2}s` }}
                                                            >
                                                                <WindIcon className="w-5 h-5 opacity-70" />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* 通道圖示與名稱 */}
                                                    <div className="relative z-10 flex items-center gap-2.5 font-extrabold text-xs tracking-wider">
                                                        <WindIcon className={`w-4 h-4 shrink-0 ${
                                                            isCold ? 'text-blue-400' : 'text-red-400'
                                                        } ${(windDir === 'left' || windDir === 'right') ? 'animate-pulse' : 'animate-bounce'}`} />
                                                        <span className="truncate">{rack.name || (isCold ? '冷通道模組' : '熱通道模組')}</span>
                                                    </div>

                                                    {/* 實時溫度與風向數據標籤 */}
                                                    <div className="relative z-10 flex items-center gap-3 text-[10px] font-mono font-bold shrink-0">
                                                        <span className={`flex items-center gap-1.5 ${isCold ? 'text-blue-300' : 'text-red-300'}`}>
                                                            <span className={`w-2 h-2 rounded-full inline-block animate-ping ${isCold ? 'bg-blue-400' : 'bg-red-400'}`}></span>
                                                            {displayTemp}
                                                        </span>
                                                    </div>

                                                    {/* 右下角拖拽調整通道尺寸 Handle */}
                                                    <div
                                                        onMouseDown={(e) => handle2DRackResizeMouseDown(e, rack)}
                                                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-tl cursor-nwse-resize flex items-center justify-center z-30 shadow-md group-hover/rack:opacity-100 opacity-70 transition-opacity ${
                                                            isCold ? 'bg-blue-600 hover:bg-blue-400' : 'bg-red-600 hover:bg-red-400'
                                                        }`}
                                                        title="拖拽調整此通道區塊之長度與寬度"
                                                    >
                                                        <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-white"></div>
                                                    </div>

                                                    {/* Hover 懸浮工具列 (旋轉 / 刪除) */}
                                                    <div 
                                                        className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/rack:flex items-center gap-1 z-30 bg-slate-50/95 p-1 rounded-lg border border-slate-200 shadow-xl whitespace-nowrap"
                                                        style={{ transform: `rotate(${-rot}deg)` }}
                                                    >
                                                        <button
                                                            onClick={(e) => handleFitFullWidth(rack.id, container.id, e)}
                                                            className="px-1.5 py-0.5 bg-blue-950 hover:bg-blue-800 border border-blue-700 rounded text-[10px] font-bold text-blue-300 hover:text-white transition-colors flex items-center gap-1"
                                                            title="一鍵將通道寬度拉伸至與貨櫃同寬 (Full Width)"
                                                        >
                                                            <MoveHorizontal className="w-3 h-3" />
                                                            <span>同寬</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleFitFullHeight(rack.id, container.id, e)}
                                                            className="px-1.5 py-0.5 bg-purple-950 hover:bg-purple-800 border border-purple-700 rounded text-[10px] font-bold text-purple-300 hover:text-white transition-colors flex items-center gap-1"
                                                            title="一鍵將通道高度拉伸至與貨櫃同高 (Full Height)"
                                                        >
                                                            <MoveVertical className="w-3 h-3" />
                                                            <span>同高</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleRotateRack(rack.id, e)}
                                                            className="p-1 bg-indigo-950 hover:bg-indigo-800 border border-indigo-700 rounded text-indigo-300 hover:text-white transition-colors"
                                                            title="旋轉角度 (+90°)"
                                                        >
                                                            <RotateCw className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteRack(rack.id, e)}
                                                            className="p-1 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-red-400 hover:text-red-200 transition-colors"
                                                            title="刪除此通道模組"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const Icon = getCabinetIcon(rack.type);
                                        const theme = LIGHT_THEME_STYLES[
                                            (rack.type === 'Cooling' || rack.type === 'CDU' || rack.type === 'EnvControl') ? 'emerald' :
                                            (rack.type === 'UPS' || rack.type === 'PowerPanel' || rack.type === 'FireSuppression') ? 'orange' :
                                            rack.type === 'Battery' ? 'purple' :
                                            rack.type === 'Switchboard' ? 'slate' : 'blue'
                                        ] || LIGHT_THEME_STYLES.blue;

                                        return (
                                            <div
                                                key={rack.id}
                                                onMouseDown={(e) => {
                                                    const elem = document.getElementById(`container-topdown-canvas-${container.id}`);
                                                    handle2DRackMouseDown(e, rack, container.id, elem);
                                                }}
                                                onDoubleClick={() => handleDoubleClickRack(rack)}
                                                style={{
                                                    left: `${pos.x}px`,
                                                    top: `${pos.y}px`,
                                                    width: `${cardW}px`,
                                                    height: `${cardH}px`,
                                                    transform: `rotate(${rot}deg)`,
                                                    transformOrigin: 'center center'
                                                }}
                                                className={`absolute rounded-xl border-2 flex flex-col justify-between p-2 transition-shadow cursor-grab active:cursor-grabbing group/rack z-10 select-none ${
                                                    isActive 
                                                        ? 'border-indigo-400 bg-slate-100/95 ring-4 ring-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                                                        : 'border-slate-200 bg-slate-100/90 hover:border-indigo-500/70 hover:shadow-lg'
                                                }`}
                                            >
                                                {/* 紅藍進風 / 出風區塊與手動切換箭頭 */}
                                                {renderAirflowBlocks(rack)}

                                                {/* 卡片頂部狀態號碼與圖示 */}
                                                <div className="flex justify-between items-center w-full pt-1">
                                                    <span className="text-[8px] font-mono text-slate-500 font-bold truncate max-w-[30px]">
                                                        #{rack.slotIndex !== undefined && rack.slotIndex !== null ? rack.slotIndex + 1 : idx + 1}
                                                    </span>
                                                    <div className={`p-0.5 rounded bg-slate-50 border ${theme.border} text-slate-700`}>
                                                        <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
                                                    </div>
                                                </div>

                                                {/* 名稱與類型 */}
                                                <div className="flex flex-col items-center justify-center my-0.5 w-full text-center">
                                                    <span className="text-[9.5px] font-extrabold text-slate-100 truncate w-full">{rack.name}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono scale-90 truncate max-w-full">{rack.type}</span>
                                                </div>

                                                {/* 功耗與重量 */}
                                                <div className="text-[8px] font-mono text-slate-500 border-t border-slate-200 pt-0.5 text-center truncate">
                                                    {(stats.power / 1000).toFixed(0)}kW | {stats.weight}k
                                                </div>

                                                {/* 右下角拖拽調整尺寸 Handle (Resize Handle) */}
                                                <div
                                                    onMouseDown={(e) => handle2DRackResizeMouseDown(e, rack)}
                                                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 hover:bg-indigo-400 rounded-tl cursor-nwse-resize flex items-center justify-center z-30 shadow-md group-hover/rack:opacity-100 opacity-60 transition-opacity"
                                                    title="拖拽調整此元件寬度與高度"
                                                >
                                                    <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-white"></div>
                                                </div>

                                                {/* Hover / Active 懸浮工具列 (旋轉 / 風向切換 / 刪除 / 進入機櫃) */}
                                                <div 
                                                    className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/rack:flex items-center gap-1 z-30 bg-slate-50/95 p-1 rounded-lg border border-slate-200 shadow-xl whitespace-nowrap"
                                                    style={{ transform: `rotate(${-rot}deg)` }}
                                                >
                                                    <button
                                                        onClick={(e) => handleRotateRack(rack.id, e)}
                                                        className="p-1 bg-indigo-950 hover:bg-indigo-800 border border-indigo-700 rounded text-indigo-300 hover:text-white transition-colors"
                                                        title="旋轉角度 (+90°)"
                                                    >
                                                        <RotateCw className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleToggleAirflowDirection(rack.id, e)}
                                                        className="p-1 bg-sky-950 hover:bg-sky-800 border border-sky-700 rounded text-sky-300 hover:text-white transition-colors"
                                                        title="手動切換進風/出風箭頭方向 (上下左右)"
                                                    >
                                                        <Repeat className="w-3 h-3" />
                                                    </button>
                                                    {(rack.type === 'General' || rack.type === 'ORv3') && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDoubleClickRack(rack);
                                                            }}
                                                            className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-900 transition-colors"
                                                            title="進入內部單櫃編輯"
                                                        >
                                                            <Maximize2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDeleteRack(rack.id, e)}
                                                        className="p-1 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-red-400 hover:text-red-200 transition-colors"
                                                        title="徹底刪除"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {activeContainerRacks.length === 0 && (
                                        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-slate-500 space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                                            <Move className="w-8 h-8 text-indigo-400/50 animate-bounce" />
                                            <div className="text-xs font-bold text-slate-500">目前貨櫃尚無放置任何機櫃或基礎設施</div>
                                            <div className="text-[10px] text-slate-600">從左側邊欄拖拽組件放至畫布任意位置開始規畫 2D 佈局</div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ) : (
                            /* ═════════════════════════════════════════════════════════════════
                                 標準一維插槽檢視 (1D Linear Slot Grid View)
                               ═════════════════════════════════════════════════════════════════ */
                            <div id={`container-canvas-${container.id}`} className="relative w-full bg-[#0d1527]/90 border-[6px] border-slate-600 rounded-3xl p-8 shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden mb-8">
                                
                                {/* 貨櫃左右門片裝飾 */}
                                <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-slate-700 to-slate-800 border-r border-slate-900 flex flex-col justify-around py-8">
                                    <div className="w-full h-8 bg-slate-100/40 rounded-r"></div>
                                    <div className="w-full h-8 bg-slate-100/40 rounded-r"></div>
                                </div>
                                <div className="absolute top-0 right-0 bottom-0 w-3 bg-gradient-to-l from-slate-700 to-slate-800 border-l border-slate-900 flex flex-col justify-around py-8">
                                    <div className="w-full h-8 bg-slate-100/40 rounded-l"></div>
                                    <div className="w-full h-8 bg-slate-100/40 rounded-l"></div>
                                </div>

                                {/* 頂部：冷通道 (Cold Aisle) */}
                                <div className="mb-6 flex justify-around items-center bg-blue-500/5 border border-blue-500/10 rounded-xl py-2 px-4">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowDown className="w-3.5 h-3.5 animate-bounce" /> 冷通道 Cold Aisle (進風面)
                                    </div>
                                    <div className="flex gap-8 text-[9px] text-blue-500/60 font-mono">
                                        <span>冷風溫度: 22°C</span>
                                        <span>送風量: Auto</span>
                                    </div>
                                </div>

                                {/* 中間：機櫃插槽網格 */}
                                <div className="relative py-8 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                    
                                    {/* 網格插槽容器 */}
                                    <div className="grid gap-1.5 pb-2 pt-4 w-full" style={{ gridTemplateColumns: `repeat(${maxSlots}, minmax(0, 1fr))` }}>
                                        {Array.from({ length: maxSlots }).map((_, idx) => {
                                            const rack = racks.find(r => (r.containerId || 'container-1') === container.id && !r.isZone && r.type !== 'ColdAisleZone' && r.type !== 'HotAisleZone' && r.slotIndex === idx);
                                            const stats = getRackStats(rack);
                                            const isActive = rack && rack.id === activeRackId;
                                            
                                            return (
                                                <div
                                                    key={idx}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnter={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleSlotDrop(e, container.id, idx)}
                                                    onClick={() => {
                                                        if (rack) {
                                                            setActiveRackId(rack.id);
                                                            setSelectedIds([rack.id]);
                                                        }
                                                    }}
                                                    onDoubleClick={() => rack && handleDoubleClickRack(rack)}
                                                    className={`h-40 w-full rounded-xl border-2 flex flex-col justify-between p-1.5 md:p-2 relative transition-all duration-200 group ${
                                                        rack 
                                                            ? `${isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10' : 'border-slate-200 hover:border-slate-500'} bg-slate-100/95 cursor-grab active:cursor-grabbing`
                                                            : 'border-dashed border-slate-200 hover:border-indigo-500/50 bg-slate-50/20 text-slate-700 hover:text-slate-500 hover:bg-slate-100/10 cursor-pointer'
                                                    }`}
                                                    draggable={!!rack}
                                                    onDragStart={(e) => rack && handleRackDragStart(e, rack.id)}
                                                >
                                                    {rack ? (
                                                        <>
                                                            <div className="flex justify-between items-center w-full">
                                                                <span className="text-[8px] font-mono text-slate-500 truncate max-w-[28px]">#{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                                        rack.type === 'Cooling' || rack.type === 'CDU' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
                                                                        rack.type === 'UPS' || rack.type === 'PowerPanel' ? 'bg-orange-500 shadow-[0_0_6px_#f97316]' :
                                                                        rack.type === 'Battery' ? 'bg-purple-500 shadow-[0_0_6px_#a855f7]' :
                                                                        rack.type === 'Switchboard' ? 'bg-slate-400 shadow-[0_0_6px_#94a3b8]' :
                                                                        rack.type === 'FireSuppression' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' :
                                                                        rack.type === 'Monitoring' ? 'bg-blue-400 shadow-[0_0_6px_#60a5fa]' :
                                                                        rack.type === 'EnvControl' ? 'bg-teal-500 shadow-[0_0_6px_#14b8a6]' :
                                                                        'bg-blue-500 shadow-[0_0_6px_#3b82f6]'
                                                                    }`}></div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center justify-center flex-1 my-1">
                                                                {(() => {
                                                                    const Icon = getCabinetIcon(rack.type);
                                                                    const theme = LIGHT_THEME_STYLES[
                                                                        (rack.type === 'Cooling' || rack.type === 'CDU' || rack.type === 'EnvControl') ? 'emerald' :
                                                                        (rack.type === 'UPS' || rack.type === 'PowerPanel' || rack.type === 'FireSuppression') ? 'orange' :
                                                                        rack.type === 'Battery' ? 'purple' :
                                                                        rack.type === 'Switchboard' ? 'slate' : 'blue'
                                                                    ] || LIGHT_THEME_STYLES.blue;
                                                                    return (
                                                                        <div className={`p-1 rounded bg-slate-50 border ${theme.border} text-slate-700 mb-0.5 shrink-0`}>
                                                                            <Icon className={`w-4 h-4 ${theme.text}`} />
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <span className="text-[8px] md:text-[9px] font-bold text-slate-900 truncate w-full text-center">{rack.name}</span>
                                                                <span className="text-[8px] text-slate-500 font-mono scale-90 truncate max-w-full">{rack.type}</span>
                                                            </div>

                                                            <div className="text-[8px] font-mono text-slate-500 border-t border-slate-200/80 pt-1 text-center truncate space-y-0.5 w-full">
                                                                <div className="truncate scale-95">{(stats.power / 1000).toFixed(0)}kW | {stats.weight}kg</div>
                                                            </div>

                                                            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-10 bg-slate-50/90 p-0.5 rounded border border-slate-200">
                                                                <button
                                                                    onClick={(e) => handleDeleteRack(rack.id, e)}
                                                                    className="p-1 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded text-red-400 hover:text-red-200"
                                                                    title="徹底刪除"
                                                                >
                                                                    <Trash2 className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-0.5 py-4 w-full">
                                                            <span className="text-[8px] md:text-[9px] font-bold text-slate-700 uppercase">Slot {idx + 1}</span>
                                                            <span className="text-[8px] text-slate-800 scale-95">可拖放</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>

                                {/* 底部：熱通道 (Hot Aisle) */}
                                <div className="mt-6 flex justify-around items-center bg-red-500/5 border border-red-500/10 rounded-xl py-2 px-4">
                                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowUp className="w-3.5 h-3.5 animate-bounce" /> 熱通道 Hot Aisle (排風面)
                                    </div>
                                    <div className="flex gap-8 text-[9px] text-red-500/60 font-mono">
                                        <span>排風溫度: 35°C</span>
                                        <span>熱回收: N/A</span>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ContainerViewLight;
