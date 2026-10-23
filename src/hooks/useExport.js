import { useState } from 'react';
import { getFabricGroup, getSwitchPortCount, getSwitchSubPortCount, getServerCategory, getHighDensityNodes, getPcieSlotInfo, formatRemotePort } from '../utils/helpers';
import { getMsftRackSubItems, getMsftDeviceSubItems } from '../utils/msftBomConfig';
import { generateProjectCableCutSheet, calculatePhysicalCableDistance, determineCableAndTransceivers } from '../utils/cableCalculator';
import { DEFAULT_RACK_U_COUNT } from '../utils/constants';
import { toCanvas } from 'html-to-image';

export function useExport(
    racks, devices, setIsFileMenuOpen, setIsExporting, rackContainerRef, showAlert,
    viewMode, setViewMode, activeRackId, setActiveRackId,
    expandedNetGroups, setExpandedNetGroups, showCables, setShowCables,
    scaleFactor, setScaleFactor, isFitToScreen, setIsFitToScreen,
    projectName, projectInfo, containers
) {
    const [rackScreenshots, setRackScreenshots] = useState({});
    const [topoScreenshot, setTopoScreenshot] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [printTimestamp, setPrintTimestamp] = useState('');

    const getExportCanvasBgColor = () => {
        const mainCanvas = document.querySelector('.main-canvas');
        if (mainCanvas) {
            const bg = window.getComputedStyle(mainCanvas).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                return bg;
            }
        }
        return document.querySelector('.award-preview-root') ? '#1F2223' : '#060c16';
    };

    const handlePrintPDF = async () => {
        setIsGeneratingPDF(true);
        setIsFileMenuOpen(false);

        const exportBgColor = getExportCanvasBgColor();

        // Save original states
        const originalViewMode = viewMode;
        const originalActiveRackId = activeRackId;
        const originalExpandedNetGroups = { ...expandedNetGroups };
        const originalShowCables = showCables;
        const originalScale = scaleFactor;
        const originalFit = isFitToScreen;

        // Set formatting for screenshotting
        setIsFitToScreen(false);
        setScaleFactor(1);
        setShowCables(false);

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const screenshots = {};
        // 1. Capture each rack in single-view
        for (const rack of racks) {
            setViewMode('single');
            setActiveRackId(rack.id);
            await delay(350); // wait for render
            
            if (rackContainerRef.current) {
                try {
                    const element = rackContainerRef.current;
                    const originalStyle = element.style.cssText;
                    const originalTransform = element.style.transform;

                    element.style.transform = 'none';
                    element.style.backgroundColor = exportBgColor;
                    void element.offsetWidth;

                    const canvas = await toCanvas(element, {
                        backgroundColor: exportBgColor,
                        pixelRatio: 2,
                    });

                    element.style.cssText = originalStyle;
                    element.style.transform = originalTransform;

                    screenshots[rack.id] = canvas.toDataURL('image/png');
                } catch (err) {
                    console.error(`Error capturing rack ${rack.name}:`, err);
                }
            }
        }
        setRackScreenshots(screenshots);

        // 2. Capture topology in network-view with all collapsed
        setViewMode('network');
        setShowCables(true);
        
        // Collapse all groups
        const collapsedGroups = {};
        devices.forEach(dev => {
            const isSwitchOrRouter = (dev.type || '').startsWith('Switch') || dev.type === 'Router';
            let prefix = null;
            if (isSwitchOrRouter) {
                const fabric = getFabricGroup(dev, projectInfo?.designType);
                const isSpine = dev.networkRole === 'Spine';
                prefix = fabric === 'North-South' ? (isSpine ? 'NS-Spine' : 'NS-Leaf') : (isSpine ? 'Spine' : 'Leaf');
            } else if (dev.type !== 'Blank' && dev.type !== 'UPS' && dev.type !== 'SideCDU') {
                prefix = 'EP';
            }
            if (prefix) {
                const groupName = dev.topologyGroup || racks.find(r => r.id === dev.rackId)?.name || '未分類群組';
                collapsedGroups[`${prefix}-${groupName}`] = false;
            }
        });
        setExpandedNetGroups(collapsedGroups);
        await delay(600); // wait for lines to redraw and render fully

        let topologyImg = null;
        if (rackContainerRef.current) {
            try {
                const element = rackContainerRef.current;
                const originalStyle = element.style.cssText;
                const originalTransform = element.style.transform;

                element.style.transform = 'none';
                element.style.backgroundColor = exportBgColor;
                void element.offsetWidth;

                const canvas = await toCanvas(element, {
                    backgroundColor: exportBgColor,
                    pixelRatio: 2,
                });

                element.style.cssText = originalStyle;
                element.style.transform = originalTransform;

                topologyImg = canvas.toDataURL('image/png');
            } catch (err) {
                console.error("Error capturing topology:", err);
            }
        }
        setTopoScreenshot(topologyImg);

        // Set print timestamp matching watermarks
        const now = new Date();
        const tsStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setPrintTimestamp(tsStr);

        // Restore original states
        setViewMode(originalViewMode);
        setActiveRackId(originalActiveRackId);
        setExpandedNetGroups(originalExpandedNetGroups);
        setShowCables(originalShowCables);
        setScaleFactor(originalScale);
        setIsFitToScreen(originalFit);

        // Wait a bit for React to render the offscreen print layout
        await delay(500);

        // Retrieve offscreen PDF area element
        const element = document.getElementById('pdf-print-area');
        if (element) {
            try {
                // Find all pages inside the print container
                const pages = element.querySelectorAll('.pdf-page');
                
                if (pages.length > 0) {
                    const { jsPDF } = await import('jspdf');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = 210;
                    const pdfHeight = 297;
                    
                    for (let i = 0; i < pages.length; i++) {
                        const pageEl = pages[i];
                        // Convert each page to a canvas natively using html-to-image
                        const canvas = await toCanvas(pageEl, {
                            backgroundColor: '#ffffff',
                            pixelRatio: 2, // high-quality crisp output
                        });
                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                        
                        if (i > 0) {
                            pdf.addPage();
                        }
                        
                        // Add image fitting A4 page dimensions exactly
                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                    }
                    
                    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                    pdf.save(`${projectName || '未命名專案'}規格書_${dateStr}.pdf`);
                } else {
                    console.error("No .pdf-page elements found inside print area");
                    showAlert('PDF 規格書無內容可供產生。', '錯誤', 'error');
                }
            } catch (err) {
                console.error("PDF generation failed:", err);
                showAlert('PDF 規格書產生失敗，請重試。', '錯誤', 'error');
            }
        } else {
            console.error("pdf-print-area element not found!");
            showAlert('無法找到列印區塊，PDF 產生失敗。', '錯誤', 'error');
        }

        setIsGeneratingPDF(false);
    };

    const handleSaveData = () => {
        const dataToSave = { projectName, racks, devices, projectInfo, containers, timestamp: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; 
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `${projectName || 'RackPlanner'}-Backup-${dateStr}.json`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportBOM = () => {
        let csv = '\uFEFF';
        
        // 1. 貨櫃基礎設施與機櫃本體
        if (projectInfo?.isCdcProject) {
            csv += "貨櫃基礎設施與機櫃清單 (Cabinets & Infrastructure)\n";
            csv += "機櫃名稱,配置位置,設備類型,本體重量(kg),功耗(W),容量參數,報價(USD)\n";
        } else {
            csv += "機櫃清單 (Cabinets List)\n";
            csv += "機櫃名稱,配置位置,設備類型,本體重量(kg),功耗(W),容量參數,報價(USD)\n";
        }
        
        racks.forEach(rack => {
            const position = projectInfo?.isCdcProject
                ? (rack.slotIndex !== null && rack.slotIndex !== undefined 
                    ? `Slot ${rack.slotIndex + 1}` 
                    : "未分配")
                : "一般佈局";
                
            let capacityParam = '-';
            if (rack.type === 'Cooling') capacityParam = `解熱: ${(rack.coolingCapacity/1000).toFixed(0)}kW`;
            else if (rack.type === 'UPS') capacityParam = `容量: ${(rack.powerCapacity/1000).toFixed(0)}kW`;
            else if (rack.type === 'Battery') capacityParam = `電能: ${(rack.batteryCapacity/1000).toFixed(0)}kWh`;
            
            const rowData = [
                rack.name,
                position,
                rack.type || 'General',
                rack.weight || 150,
                rack.power || 0,
                capacityParam,
                rack.price || 0
            ];
            csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";

            if (projectInfo?.designType === 'msft') {
                getMsftRackSubItems(rack, projectInfo?.isCdcProject).forEach(sub => {
                    const subLabel = typeof sub === 'object' && sub !== null ? (sub.label || sub.type || '') : String(sub);
                    const subRow = [
                        rack.name,
                        `${position} (附屬${sub?.rackPosition ? `: ${sub.rackPosition}` : ''})`,
                        subLabel,
                        0,
                        0,
                        '-',
                        0
                    ];
                    csv += subRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                });
            }
        });
        
        csv += "\n\n機櫃內部 IT 設備清單 (Cabinet Devices List)\n";
        csv += "所屬機櫃,機櫃內位置,設備名稱,設備類型,功耗(W),解熱能力(W),報價(USD),CPU (型號*數量),DIMM (型號*數量),PCIe Slot 1 (數量),PCIe Slot 2 (數量),GPU (型號*數量),M.2 (型號*數量),HDD (型號*數量),54V PSU (型號*數量),12V PSU (型號*數量),Other (型號*數量)\n";

        const sortedDevices = [...devices].sort((a, b) => {
            if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
            return b.startU - a.startU;
        });

        sortedDevices.forEach(dev => {
            const rackName = racks.find(r => r.id === dev.rackId)?.name || '未知';
            const position = dev.type === 'SideCDU' ? 'SideCar' : `U${dev.startU}-U${dev.startU + dev.size - 1}`;
            const hw = dev.hardwareSpecs || {};
            const formatHw = (spec) => (spec && (spec.model || spec.qty)) ? `${spec.model || ''} *${spec.qty || 1}` : '';

            const isHighDensity = getServerCategory(dev) === 'HighDensity';
            const hdNodes = isHighDensity ? getHighDensityNodes(dev) : [];

            let pcieSlot1Val = 0;
            let pcieSlot2Val = 0;
            const extraSlots = [];

            if (isHighDensity) {
                hdNodes.forEach(nodeKey => {
                    const nodeNum = nodeKey.substring(1);
                    const nodePcieSlotQty = dev.hardwareSpecs?.[`pcieSlotQty_${nodeKey}`]?.qty || 2;
                    if (nodePcieSlotQty >= 1) {
                        const info = getPcieSlotInfo(dev, 1, nodeKey);
                        pcieSlot1Val += (info.qty || 0);
                    }
                    if (nodePcieSlotQty >= 2) {
                        const info = getPcieSlotInfo(dev, 2, nodeKey);
                        pcieSlot2Val += (info.qty || 0);
                    }
                    for (let s = 3; s <= nodePcieSlotQty; s++) {
                        const info = getPcieSlotInfo(dev, s, nodeKey);
                        if (info.qty > 0 || info.model) {
                            extraSlots.push(`N${nodeNum} Slot ${s} (${info.model || `PCIe Slot ${s}`}) *${info.qty || 0}`);
                        }
                    }
                });
            } else if ((dev.type || '').startsWith('Server') || (dev.type || '').startsWith('Storage')) {
                const pcieSlotQty = dev.hardwareSpecs?.pcieSlotQty?.qty || 2;
                if (pcieSlotQty >= 1) {
                    pcieSlot1Val = getPcieSlotInfo(dev, 1).qty || 0;
                }
                if (pcieSlotQty >= 2) {
                    pcieSlot2Val = getPcieSlotInfo(dev, 2).qty || 0;
                }
                for (let s = 3; s <= pcieSlotQty; s++) {
                    const info = getPcieSlotInfo(dev, s);
                    if (info.qty > 0 || info.model) {
                        extraSlots.push(`Slot ${s} (${info.model || `PCIe Slot ${s}`}) *${info.qty || 0}`);
                    }
                }
            }

            const otherHw = formatHw(hw.other);
            const otherParts = [];
            if (otherHw) otherParts.push(otherHw);
            if (extraSlots.length > 0) otherParts.push(...extraSlots);
            const otherVal = otherParts.join('; ');

            const rowData = [
                rackName, position, dev.customName || '', dev.type || '', dev.power || 0, dev.coolingCapacity || 0, dev.price || 0,
                formatHw(hw.cpu), formatHw(hw.dimm), pcieSlot1Val, pcieSlot2Val, formatHw(hw.gpu), formatHw(hw.m2),
                formatHw(hw.hdd), formatHw(hw.psu54v), formatHw(hw.psu12v), otherVal
            ];
            csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";

            if (projectInfo?.designType === 'msft') {
                getMsftDeviceSubItems(dev).forEach(sub => {
                    const subLabel = typeof sub === 'object' && sub !== null ? (sub.label || sub.type || '') : String(sub);
                    const subType = typeof sub === 'object' && sub !== null ? (sub.type || 'Sub-Device') : 'Sub-Device';
                    const subRow = [
                        rackName, `${position} (附屬)`, subLabel, subType, 0, 0, 0,
                        '', '', '', '', '', '', '', '', '', ''
                    ];
                    csv += subRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                });
            }
        });

        const { lengthBinnedBom, transceiverMap } = generateProjectCableCutSheet(devices, racks, projectInfo);

        csv += "\n\nL11/L12 網路線材分長度採購統計 (Length-Binned Cables BOM)\n線材類別,標準料號/規格,物理介質 (DAC/AOC/Fiber/UTP),標準採購長度(m),L11櫃內數量,L12跨櫃數量,總採購數量,總米數(m)\n";
        lengthBinnedBom.forEach(item => {
            const row = [
                item.bomCategoryName,
                item.cableModel,
                item.mediaType,
                `${item.standardLength}m`,
                item.scopeBreakdown.l11,
                item.scopeBreakdown.l12,
                item.totalQty,
                `${item.totalMeters}m`
            ];
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
        });

        csv += "\n\n獨立光模組採購統計 (Optical Transceivers BOM)\n光模組型號,總數量\n";
        Object.entries(transceiverMap).forEach(([model, qty]) => {
            if (qty > 0) csv += `"${model}","${qty}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `RackPlanner-BOM-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportCableRouting = () => {
        let csv = '\uFEFF';
        const { cutSheetRows } = generateProjectCableCutSheet(devices, racks, projectInfo);

        // 第一部分：產線級 L11/L12 點對點拉線施工表 (Point-to-Point Cut-Sheet with Cable_ID)
        csv += "【第一部分】L11/L12 產線點對點拉線施工表 (Point-to-Point Cable Cut-Sheet & Brady Label)\n";
        csv += "項次,線標編號 (Cable_ID),佈線層級 (Scope),網路平面 (Fabric),來源機櫃 (Src_Rack),來源U位 (Src_U),來源設備 (Src_Hostname),來源埠位 (Src_Port),目的機櫃 (Dst_Rack),目的U位 (Dst_U),目的設備 (Dst_Hostname),目的埠位 (Dst_Port),物理估算距離(m),建議採購線長(m),線材物理介質 (Media),線材型號 (Cable_PN),來源端收發器 (Src_Transceiver),目的端收發器 (Dst_Transceiver),線材數量\n";

        cutSheetRows.forEach(r => {
            const row = [
                r.seq,
                r.cableId,
                r.scope,
                r.fabricLabel,
                r.srcRackName,
                r.srcU,
                r.srcDeviceName,
                r.srcPortFormatted,
                r.dstRackName,
                r.dstU,
                r.dstDeviceName,
                r.dstPortFormatted,
                `${r.rawLength}m`,
                `${r.standardLength}m`,
                r.mediaType,
                r.cableModel,
                r.transceiverSrc,
                r.transceiverDst,
                r.cableQty
            ];
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
        });

        // 第二部分：交換器孔位視角對照表 (Switch Port Mapping)
        csv += "\n\n【第二部分】交換器埠位對照表 (Switch Port Mapping View)\n";
        csv += "交換器名稱,網路用途 (Fabric Group),網路角色 (Network Role),交換器孔位,對接機櫃名稱,對接設備U位,對接設備名稱,對接設備孔位,佈線層級,預估實長(m),採購線長(m),物理介質,Transceiver(NIC),Transceiver(SW),Cable型號,Cable數量\n";
        const switches = devices.filter(d => (d.type || '').startsWith('Switch') || d.type === 'Router');
        switches.sort((a, b) => {
            const fgA = getFabricGroup(a, projectInfo?.designType); const fgB = getFabricGroup(b, projectInfo?.designType);
            if (fgA !== fgB) return fgA.localeCompare(fgB);
            const roleA = a.networkRole || ''; const roleB = b.networkRole || '';
            if (roleA !== roleB) return roleA.localeCompare(roleB);
            return (a.customName || '').localeCompare(b.customName || '');
        });

        const linkMap = {};
        devices.forEach(d => {
            if (d.connections) {
                Object.entries(d.connections).forEach(([localKey, targetKey]) => {
                    const targetDevice = devices.find(x => targetKey.startsWith(x.id + '-'));
                    if (targetDevice) {
                        const targetDevId = targetDevice.id;
                        const targetPortKey = targetKey.substring(targetDevId.length + 1);
                        linkMap[`${d.id}-${localKey}`] = { devId: targetDevId, portKey: targetPortKey };
                        linkMap[targetKey] = { devId: d.id, portKey: localKey };
                    }
                });
            }
        });

        const buildSwitchPortRow = (sw, fabricGroup, role, swPortLabel, swPortKey, remoteInfo, isFirstRowForSwitch) => {
            const remoteDev = devices.find(d => d.id === remoteInfo.devId);
            if (!remoteDev) return null;
            const remoteRack = racks.find(r => r.id === remoteDev.rackId)?.name || '未知機櫃';
            const remoteU = remoteDev.type === 'SideCDU' ? 'SideCar' : `U${remoteDev.startU}`;
            const formattedRemotePort = formatRemotePort(remoteInfo.portKey);

            const distInfo = calculatePhysicalCableDistance(remoteDev, remoteInfo.portKey, sw, swPortKey, racks);
            const specInfo = determineCableAndTransceivers(remoteDev, remoteInfo.portKey, sw, swPortKey, distInfo.standardLength, projectInfo?.designType);

            return [
                isFirstRowForSwitch ? sw.customName : "",
                isFirstRowForSwitch ? fabricGroup : "",
                isFirstRowForSwitch ? role : "",
                swPortLabel,
                remoteRack,
                remoteU,
                remoteDev.customName,
                formattedRemotePort,
                distInfo.scope,
                `${distInfo.rawLength}m`,
                `${distInfo.standardLength}m`,
                specInfo.mediaType,
                specInfo.transceiverSrc,
                specInfo.transceiverDst,
                specInfo.cableModel,
                specInfo.cableQty
            ];
        };

        switches.forEach(sw => {
            const fabricGroup = getFabricGroup(sw, projectInfo?.designType);
            const role = sw.networkRole || (sw.type === 'Router' || sw.type === 'Switch800G' ? 'Spine' : 'Leaf');
            const portCount = getSwitchPortCount(sw);
            let isFirstRowForSwitch = true;
            let switchHasAnyConnection = false;

            for (let i = 1; i <= portCount; i++) {
                const fullLocalId = `${sw.id}-port-${i}`;
                if (linkMap[fullLocalId]) {
                    const rowData = buildSwitchPortRow(sw, fabricGroup, role, `Port ${i}`, `port-${i}`, linkMap[fullLocalId], isFirstRowForSwitch);
                    if (rowData) {
                        switchHasAnyConnection = true;
                        csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                        isFirstRowForSwitch = false;
                    }
                }
            }

            const subPortCount = getSwitchSubPortCount(sw);
            for (let i = 1; i <= subPortCount; i++) {
                const fullLocalId = `${sw.id}-subport-${i}`;
                if (linkMap[fullLocalId]) {
                    const rowData = buildSwitchPortRow(sw, fabricGroup, role, `SubPort ${i}`, `subport-${i}`, linkMap[fullLocalId], isFirstRowForSwitch);
                    if (rowData) {
                        switchHasAnyConnection = true;
                        csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                        isFirstRowForSwitch = false;
                    }
                }
            }

            const bmcLocalId = `${sw.id}-bmc`;
            if (linkMap[bmcLocalId]) {
                const rowData = buildSwitchPortRow(sw, fabricGroup, role, projectInfo?.designType === 'msft' ? 'MGMT' : 'BMC', 'bmc', linkMap[bmcLocalId], isFirstRowForSwitch);
                if (rowData) {
                    switchHasAnyConnection = true;
                    csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                    isFirstRowForSwitch = false;
                }
            }
            if (!switchHasAnyConnection) csv += `"${sw.customName}","${fabricGroup}","${role}","無接線","-","-","-","-","-","-","-","-","-","-","-","-"\n`;
            else csv += `,,,,,,,,,,,,,,,\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `RackPlanner-L11L12-CutSheet-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportImage = async () => {
        const element = viewMode === 'container'
            ? document.getElementById('container-view-canvas')
            : rackContainerRef.current;
        if (!element) return;
        setIsExporting(true);
        try {
            const exportBgColor = getExportCanvasBgColor();
            const originalStyle = element.style.cssText; 
            const originalTransform = element.style.transform;
            
            element.style.transform = 'none'; 
            element.style.backgroundColor = exportBgColor;

            // Ensure browser performs layout recalculation
            void element.offsetWidth;

            const canvas = await toCanvas(element, { 
                backgroundColor: exportBgColor, 
                pixelRatio: window.devicePixelRatio || 1,
            });
            
            element.style.cssText = originalStyle; 
            element.style.transform = originalTransform;

            const ctx = canvas.getContext('2d'); 
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            const now = new Date(); 
            const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            
            ctx.save();
            const centerX = canvas.width / 2; 
            const centerY = canvas.height / 2;
            ctx.translate(centerX, centerY); 
            ctx.rotate(-45 * Math.PI / 180);
            let fontSize = canvas.width * 0.05; 
            ctx.font = `bold ${fontSize}px sans-serif`; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'; 
            ctx.shadowBlur = Math.max(4, fontSize * 0.1); 
            ctx.shadowOffsetX = 2; 
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = 'rgba(128, 128, 128, 0.35)'; 
            ctx.fillText('Inventec Confidential', 0, -fontSize * 0.6);
            ctx.fillText(timestamp, 0, fontSize * 0.6);
            ctx.restore();

            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a'); 
            link.download = `Rack-Architecture-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = url; 
            link.click();
        } catch (error) {
            console.error("Screenshot Error:", error);
            showAlert('匯出圖片失敗，請確保畫面上沒有不支援的圖形或字體。', '錯誤', 'error');
        } finally { 
            setIsExporting(false); 
        }
    };

    return { 
        handleSaveData, 
        handleExportBOM, 
        handleExportCableRouting, 
        handleExportImage, 
        handlePrintPDF,
        rackScreenshots,
        topoScreenshot,
        isGeneratingPDF,
        printTimestamp
    };
}
