import { useState } from 'react';
import { getFabricGroup, getNicCount, getSwitchPortCount, getServerCategory, getHighDensityNodes, getPcieSlotInfo } from '../utils/helpers';
import { DEFAULT_RACK_U_COUNT } from '../utils/constants';
import { toCanvas } from 'html-to-image';

const formatRemotePort = (portKey) => {
    if (!portKey) return '-';
    
    // 1. PCIe slot with node: pcie_slot_1_n1-2 -> N1 Slot 1 P2
    const pcieNodeMatch = portKey.match(/^pcie_slot_(\d+)_([nN]\d+)-(\d+)$/);
    if (pcieNodeMatch) {
        const [, slotIdx, nodeKey, portIdx] = pcieNodeMatch;
        return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
    }
    
    // 2. PCIe slot standard: pcie_slot_1-2 -> Slot 1 P2
    const pcieMatch = portKey.match(/^pcie_slot_(\d+)-(\d+)$/);
    if (pcieMatch) {
        const [, slotIdx, portIdx] = pcieMatch;
        return `Slot ${slotIdx} P${portIdx}`;
    }
    
    // 3. BMC with node: bmc_n1 -> N1 BMC
    const bmcNodeMatch = portKey.match(/^bmc_([nN]\d+)$/);
    if (bmcNodeMatch) {
        const [, nodeKey] = bmcNodeMatch;
        return `${nodeKey.toUpperCase()} BMC`;
    }
    
    // 4. OCP with node: ocp_n1-1 -> N1 OCP P1
    const ocpNodeMatch = portKey.match(/^ocp_([nN]\d+)-(\d+)$/);
    if (ocpNodeMatch) {
        const [, nodeKey, portIdx] = ocpNodeMatch;
        return `${nodeKey.toUpperCase()} OCP P${portIdx}`;
    }

    // 5. Legacy NS-NIC with node: ns_nic_1_n1-2 -> N1 Slot 1 P2
    const legacyNicNodeMatch = portKey.match(/^ns_nic_(\d+)_([nN]\d+)-(\d+)$/);
    if (legacyNicNodeMatch) {
        const [, slotIdx, nodeKey, portIdx] = legacyNicNodeMatch;
        return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
    }

    // 6. Legacy NS-NIC standard: ns_nic_1-2 -> Slot 1 P2
    const legacyNicMatch = portKey.match(/^ns_nic_(\d+)-(\d+)$/);
    if (legacyNicMatch) {
        const [, slotIdx, portIdx] = legacyNicMatch;
        return `Slot ${slotIdx} P${portIdx}`;
    }

    // 7. General formatting
    if (portKey.startsWith('cx8-')) {
        return portKey.replace('cx8-', 'EW NIC P');
    }
    if (portKey.startsWith('ocp-')) {
        return portKey.replace('ocp-', 'OCP P');
    }
    if (portKey.startsWith('port-')) {
        return portKey.replace('port-', 'Port ');
    }
    if (portKey === 'bmc') {
        return 'BMC';
    }
    
    return portKey;
};

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

    const handlePrintPDF = async () => {
        setIsGeneratingPDF(true);
        setIsFileMenuOpen(false);

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
                    element.style.backgroundColor = '#020617';
                    void element.offsetWidth;

                    const canvas = await toCanvas(element, {
                        backgroundColor: '#020617',
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
                const fabric = getFabricGroup(dev);
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
                element.style.backgroundColor = '#020617';
                void element.offsetWidth;

                const canvas = await toCanvas(element, {
                    backgroundColor: '#020617',
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
                    : "備用棧板")
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
        });

        csv += "\n\n網路線材與光模組統計 (Cables & Transceivers)\n類型,總數量\n";
        const bomCounts = { '1G NIC cable': 0, '10G/100G cable': 0, '400G cable': 0, '800G cable': 0, 'QSFP56 transceiver': 0, '2x400G Transceiver': 0, 'EW NIC Ethernet: MMA4Z00-NS-FLT Transceiver (NIC端)': 0, 'EW NIC Ethernet: MMA4Z00-NS Transceiver (SW端)': 0, 'EW NIC Ethernet: MFP7E10-Nxxx Cable': 0, 'EW NIC InfiniBand: MCA7K10 一體化 Cable (1.6T to 2x800G)': 0 };

        devices.forEach(dev => {
            if (dev.connections) {
                Object.entries(dev.connections).forEach(([portKey, targetKey]) => {
                    if (!targetKey) return;
                    const targetDevice = devices.find(d => targetKey.startsWith(d.id + '-'));
                    if (targetDevice) {
                        if (getServerCategory(dev) === 'AI' && portKey.startsWith('cx8-')) {
                            const cx8NetworkType = dev.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';
                            if (cx8NetworkType === 'Ethernet') {
                                bomCounts['EW NIC Ethernet: MMA4Z00-NS-FLT Transceiver (NIC端)'] += 1;
                                bomCounts['EW NIC Ethernet: MMA4Z00-NS Transceiver (SW端)'] += 1;
                                bomCounts['EW NIC Ethernet: MFP7E10-Nxxx Cable'] += 2;
                            } else if (cx8NetworkType === 'InfiniBand') {
                                bomCounts['EW NIC InfiniBand: MCA7K10 一體化 Cable (1.6T to 2x800G)'] += 0.5;
                            }
                        } else {
                            if (targetDevice.type === 'Switch1G') bomCounts['1G NIC cable']++;
                            else if (targetDevice.type === 'Switch10G' || targetDevice.type === 'Router') bomCounts['10G/100G cable']++;
                            else if (targetDevice.type === 'Switch400G' || targetDevice.type === 'Switch400G1U') { bomCounts['400G cable']++; bomCounts['QSFP56 transceiver'] += 2; }
                            else if (targetDevice.type === 'Switch800G') { bomCounts['800G cable'] += 2; bomCounts['2x400G Transceiver'] += 2; }
                        }
                    }
                });
            }
        });

        Object.entries(bomCounts).forEach(([type, count]) => { if (count > 0) csv += `"${type}","${count}"\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `RackPlanner-BOM-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportCableRouting = () => {
        let csv = '\uFEFF';
        csv += "交換器名稱,網路用途 (Fabric Group),網路角色 (Network Role),交換器孔位,對接機櫃名稱,對接設備名稱,對接設備孔位,Transceiver(NIC),Transceiver(SW),Cable型號,Cable數量\n";
        const switches = devices.filter(d => (d.type || '').startsWith('Switch') || d.type === 'Router');
        switches.sort((a, b) => {
            const fgA = getFabricGroup(a); const fgB = getFabricGroup(b);
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

        switches.forEach(sw => {
            const fabricGroup = getFabricGroup(sw);
            const role = sw.networkRole || (sw.type === 'Router' || sw.type === 'Switch800G' ? 'Spine' : 'Leaf');
            const portCount = getSwitchPortCount(sw);
            let isFirstRowForSwitch = true;
            let switchHasAnyConnection = false;

            for (let i = 1; i <= portCount; i++) {
                const fullLocalId = `${sw.id}-port-${i}`;
                if (linkMap[fullLocalId]) {
                    switchHasAnyConnection = true;
                    const remoteInfo = linkMap[fullLocalId];
                    const remoteDev = devices.find(d => d.id === remoteInfo.devId);

                    if (remoteDev) {
                        const remoteRack = racks.find(r => r.id === remoteDev.rackId)?.name || '未知機櫃';
                        const formattedRemotePort = formatRemotePort(remoteInfo.portKey);

                        let transceiverNic = '-'; let transceiverSw = '-'; let cableModel = '-'; let cableCount = '-';
                        if (getServerCategory(remoteDev) === 'AI' && remoteInfo.portKey.startsWith('cx8-')) {
                            const cx8Type = remoteDev.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';
                            if (cx8Type === 'Ethernet') { transceiverNic = 'MMA4Z00-NS-FLT'; transceiverSw = 'MMA4Z00-NS'; cableModel = 'MFP7E10-Nxxx'; cableCount = '2'; }
                            else if (cx8Type === 'InfiniBand') { transceiverNic = '一體化 (2x 800G OSFP)'; transceiverSw = '一體化 (1.6TB)'; cableModel = 'MCA7K10'; cableCount = '0.5'; }
                        }
                        const rowData = [isFirstRowForSwitch ? sw.customName : "", isFirstRowForSwitch ? fabricGroup : "", isFirstRowForSwitch ? role : "", `Port ${i}`, remoteRack, remoteDev.customName, formattedRemotePort, transceiverNic, transceiverSw, cableModel, cableCount];
                        csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                        isFirstRowForSwitch = false;
                    }
                }
            }

            const bmcLocalId = `${sw.id}-bmc`;
            if (linkMap[bmcLocalId]) {
                switchHasAnyConnection = true;
                const remoteInfo = linkMap[bmcLocalId];
                const remoteDev = devices.find(d => d.id === remoteInfo.devId);
                if (remoteDev) {
                    const remoteRack = racks.find(r => r.id === remoteDev.rackId)?.name || '未知機櫃';
                    const formattedRemotePort = formatRemotePort(remoteInfo.portKey);
                    const rowData = [isFirstRowForSwitch ? sw.customName : "", isFirstRowForSwitch ? fabricGroup : "", isFirstRowForSwitch ? role : "", `BMC`, remoteRack, remoteDev.customName, formattedRemotePort, '-', '-', '-', '-'];
                    csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
                    isFirstRowForSwitch = false;
                }
            }
            if (!switchHasAnyConnection) csv += `"${sw.customName}","${fabricGroup}","${role}","無接線","-","-","-","-","-","-","-"\n`;
            else csv += `,,,,,,,,,,\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `RackPlanner-CableRouting-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportImage = async () => {
        const element = viewMode === 'container'
            ? document.getElementById('container-view-canvas')
            : rackContainerRef.current;
        if (!element) return;
        setIsExporting(true);
        try {
            const originalStyle = element.style.cssText; 
            const originalTransform = element.style.transform;
            
            element.style.transform = 'none'; 
            element.style.backgroundColor = '#020617';

            // Ensure browser performs layout recalculation
            void element.offsetWidth;

            const canvas = await toCanvas(element, { 
                backgroundColor: '#020617', 
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
