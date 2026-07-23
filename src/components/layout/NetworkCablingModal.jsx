import React from 'react';
import { X, Share2, FileText, Download } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getServerCategory, getHighDensityNodes } from '../../utils/helpers';
import { toCanvas } from 'html-to-image';

// Retrieve all configured transceiver and cable details for a given device
const getCabledSpecsForDevice = (dev) => {
    const specs = [];
    const hw = dev.hardwareSpecs || {};

    const addSpec = (interfaceLabel, data, specKey) => {
        if (data.transceiver_model || data.transceiver_qty || data.sw_transceiver_model || data.sw_transceiver_qty || data.cable_model || data.cable_qty) {
            specs.push({
                interface: interfaceLabel,
                specKey: specKey,
                nicTransceiverModel: data.transceiver_model || '-',
                nicTransceiverQty: data.transceiver_qty || 0,
                swTransceiverModel: data.sw_transceiver_model || '-',
                swTransceiverQty: data.sw_transceiver_qty || 0,
                cableModel: data.cable_model || '-',
                cableQty: data.cable_qty || 0,
            });
        }
    };

    // 0. BMC (all cabled devices: general servers, AI servers, switches, routers, CDUs, storage)
    const cat = getServerCategory(dev);
    if (cat === 'HighDensity') {
        const nodes = getHighDensityNodes(dev);
        nodes.forEach(nodeKey => {
            const nodeLabel = nodeKey.toUpperCase();
            const nodeBmcKey = `bmc_${nodeKey}`;
            if (hw[nodeBmcKey]) {
                addSpec(`BMC (${nodeLabel})`, hw[nodeBmcKey], nodeBmcKey);
            }
        });
    } else {
        if (hw.bmc && (dev.type !== 'PowerShelf' && dev.type !== 'PDU' || hw.bmc.qty === 1)) {
            addSpec('BMC', hw.bmc, 'bmc');
        }
    }

    // 1. EW NIC (AI Server only)
    if (hw.cx8p) {
        addSpec('EW NIC', hw.cx8p, 'cx8p');
    }

    // 2. Super NIC Mgt
    if (hw.super_nic_mgt) {
        addSpec('Super NIC Mgt', hw.super_nic_mgt, 'super_nic_mgt');
    }

    // 3. OCP
    if (cat === 'HighDensity') {
        const nodes = getHighDensityNodes(dev);
        nodes.forEach(nodeKey => {
            const nodeLabel = nodeKey.toUpperCase();
            const ocpKey = `ocp_${nodeKey}`;
            if (hw[ocpKey]) {
                addSpec(`OCP (${nodeLabel})`, hw[ocpKey], ocpKey);
            }
        });
    } else {
        if (hw.ocp) {
            addSpec('OCP', hw.ocp, 'ocp');
        }
    }

    // 4. PCIe Slots
    if (cat === 'HighDensity') {
        const nodes = getHighDensityNodes(dev);
        nodes.forEach(nodeKey => {
            const nodeLabel = nodeKey.toUpperCase();
            const pcieSlotQty = hw[`pcieSlotQty_${nodeKey}`]?.qty || 2;
            for (let i = 1; i <= pcieSlotQty; i++) {
                const slotKey = `pcie_slot_${i}_${nodeKey}`;
                if (hw[slotKey]) {
                    addSpec(`PCIe Slot ${i} (${nodeLabel})`, hw[slotKey], slotKey);
                }
            }
        });
    } else {
        const pcieSlotQty = hw.pcieSlotQty?.qty || 2;
        for (let i = 1; i <= pcieSlotQty; i++) {
            const slotKey = `pcie_slot_${i}`;
            if (hw[slotKey]) {
                addSpec(`PCIe Slot ${i}`, hw[slotKey], slotKey);
            }
        }
    }

    return specs;
};

// Find active connection target switch for a cabling interface key
const findConnectedSwitch = (dev, specKey, devices) => {
    if (!dev || !dev.connections) return null;

    let possiblePortKeys = [];

    if (specKey === 'bmc') {
        possiblePortKeys = ['bmc'];
    } else if (specKey.startsWith('bmc_')) {
        possiblePortKeys = [specKey];
    } else if (specKey === 'cx8p') {
        possiblePortKeys = ['cx8-1', 'cx8-2', 'cx8-3', 'cx8-4', 'cx8-5', 'cx8-6', 'cx8-7', 'cx8-8'];
    } else if (specKey === 'super_nic_mgt') {
        possiblePortKeys = ['super_nic_mgt-1', 'super_nic_mgt-2'];
    } else if (specKey === 'ocp') {
        possiblePortKeys = ['ocp-1', 'ocp-2'];
    } else if (specKey.startsWith('ocp_')) {
        possiblePortKeys = [`${specKey}-1`, `${specKey}-2`];
    } else if (specKey.startsWith('pcie_slot_')) {
        possiblePortKeys = [`${specKey}-1`, `${specKey}-2`, `${specKey}-3`, `${specKey}-4`];
    }

    for (const pk of possiblePortKeys) {
        const suffixes = ['', '__2', '__3', '__4', '__5', '__6', '__7', '__8'];
        for (const suffix of suffixes) {
            const connValue = dev.connections[`${pk}${suffix}`];
            if (connValue) {
                const targetSwitch = devices.find(d => connValue.startsWith(`${d.id}-port-`));
                if (targetSwitch) {
                    return targetSwitch;
                }
            }
        }
    }

    return null;
};

// Calculate real rack routing distance in meters (includes buffer)
const calculateCableLength = (dev, sw, racks = []) => {
    if (!dev || !sw) return null;
    const U_HEIGHT_M = 0.04445; // 1.75 inches
    const horizontalRun = 1.0;  // horizontal run inside cabinet
    const buffer = 1.0;          // service loop buffer
    
    if (dev.rackId === sw.rackId) {
        const verticalDistance = Math.abs((dev.startU || 1) - (sw.startU || 1)) * U_HEIGHT_M;
        return Math.round((verticalDistance + horizontalRun + buffer) * 10) / 10;
    } else {
        const indexA = racks.findIndex(r => r.id === dev.rackId);
        const indexB = racks.findIndex(r => r.id === sw.rackId);
        const rackSpans = (indexA !== -1 && indexB !== -1) ? Math.abs(indexA - indexB) : 1;
        const overheadRun = rackSpans * 0.6; // 0.6m standard rack width for side-by-side layout
        
        const rackHeightU = 42;
        const rackA_vertical = (rackHeightU - (dev.startU || 1)) * U_HEIGHT_M;
        const rackB_vertical = (rackHeightU - (sw.startU || 1)) * U_HEIGHT_M;
        return Math.round((rackA_vertical + rackB_vertical + overheadRun + horizontalRun + buffer) * 10) / 10;
    }
};

// Aggregate specs for the summary table
const aggregateSpecs = (devicesInRack) => {
    const nicTransceivers = {};
    const swTransceivers = {};
    const cables = {};

    devicesInRack.forEach(dev => {
        const specs = getCabledSpecsForDevice(dev);
        specs.forEach(s => {
            // NIC Transceivers
            if (s.nicTransceiverModel && s.nicTransceiverModel !== '-' && s.nicTransceiverQty > 0) {
                const key = s.nicTransceiverModel.trim();
                nicTransceivers[key] = (nicTransceivers[key] || 0) + s.nicTransceiverQty;
            }
            // SW Transceivers
            if (s.swTransceiverModel && s.swTransceiverModel !== '-' && s.swTransceiverQty > 0) {
                const key = s.swTransceiverModel.trim();
                swTransceivers[key] = (swTransceivers[key] || 0) + s.swTransceiverQty;
            }
            // Cables
            if (s.cableModel && s.cableModel !== '-' && s.cableQty > 0) {
                const key = s.cableModel.trim();
                cables[key] = (cables[key] || 0) + s.cableQty;
            }
        });
    });

    return { nicTransceivers, swTransceivers, cables };
};

const NetworkCablingModal = () => {
    const { 
        isNetworkCablingOpen, setIsNetworkCablingOpen, 
        isGeneratingCablePDF, setIsGeneratingCablePDF,
        devices, racks, activeRackId, projectName, viewMode
    } = useRackPlanner();

    if (!isNetworkCablingOpen) return null;

    const isOverview = viewMode === 'overview' || viewMode === 'container' || viewMode === 'network';

    const activeRack = racks.find(r => r.id === activeRackId);
    const activeRackName = activeRack ? activeRack.name : '未知機櫃';
    
    // Choose devices to analyze: active rack or all racks
    const devicesToAnalyze = isOverview ? devices : devices.filter(d => d.rackId === activeRackId);
    
    // Sort devices: by rack name alphabetically first (if overview), then U-height descending
    const sortedDevices = [...devicesToAnalyze].sort((a, b) => {
        if (isOverview && a.rackId !== b.rackId) {
            const rackA = racks.find(r => r.id === a.rackId)?.name || '';
            const rackB = racks.find(r => r.id === b.rackId)?.name || '';
            return rackA.localeCompare(rackB);
        }
        return (b.startU || 0) - (a.startU || 0);
    });

    // Get all devices that have cabling specifications
    const cabledDevices = sortedDevices.map(dev => {
        const specs = getCabledSpecsForDevice(dev);
        return { dev, specs };
    }).filter(item => item.specs.length > 0);

    // Aggregate summary
    const { nicTransceivers, swTransceivers, cables } = aggregateSpecs(devicesToAnalyze);
    const hasAnySummary = Object.keys(nicTransceivers).length > 0 || Object.keys(swTransceivers).length > 0 || Object.keys(cables).length > 0;

    const handleGenerateSpecPDF = async () => {
        setIsGeneratingCablePDF(true);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(500); // wait for render in DOM

        const element = document.getElementById('pdf-cable-print-area');
        if (element) {
            try {
                const pages = element.querySelectorAll('.pdf-page');
                if (pages.length > 0) {
                    const { jsPDF } = await import('jspdf');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = 210;
                    const pdfHeight = 297;

                    for (let i = 0; i < pages.length; i++) {
                        const pageEl = pages[i];
                        const canvas = await toCanvas(pageEl, {
                            backgroundColor: '#ffffff',
                            pixelRatio: 2,
                        });
                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                        if (i > 0) {
                            pdf.addPage();
                        }
                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                    }
                    pdf.save(`RackPlanner-NetworkCablingSpec-${projectName || 'Project'}-${new Date().toISOString().slice(0, 10)}.pdf`);
                }
            } catch (err) {
                console.error("Error generating cabling spec PDF:", err);
            }
        }
        setIsGeneratingCablePDF(false);
    };

    // Split devices for PDF pages to avoid overflow (5 devices per page)
    const devicesPerPage = 5;
    const chunkedDevices = [];
    for (let i = 0; i < cabledDevices.length; i += devicesPerPage) {
        chunkedDevices.push(cabledDevices.slice(i, i + devicesPerPage));
    }

    const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('zh-TW', { hour12: false });

    return (
        <>
            {/* Modal Dialog */}
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-8 animate-fade-in animate-duration-200">
                {/* Modal Body */}
                <div className="bg-[#0b1424] border border-slate-700/60 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0e192c]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                                <Share2 className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-200">
                                    機櫃網路線路與規格表 {isOverview && <span className="text-indigo-400 font-bold ml-2">(全機櫃總覽)</span>}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isOverview 
                                        ? "顯示目前專案所有機櫃設備的收發器與線路統計資料" 
                                        : `顯示目前機櫃 ${activeRackName} 的設備收發器與線路統計資料`}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {hasAnySummary && (
                                <button
                                    onClick={handleGenerateSpecPDF}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    <FileText className="w-3.5 h-3.5" /> 製作網路規格書 (PDF)
                                </button>
                            )}
                            <button 
                                onClick={() => setIsNetworkCablingOpen(false)}
                                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        
                        {/* 1. Summary Section (總表) */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                                {isOverview ? "全專案規格彙總表 (All Cabinets Summary)" : "機櫃規格彙總表 (Active Cabinet Summary)"}
                            </h4>
                            
                            {!hasAnySummary ? (
                                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-6 text-center text-xs text-slate-500">
                                    目前無設定任何連線規格數據。請先在右側編輯面板輸入設備的收發器或線路資訊。
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* NIC Transceivers Summary */}
                                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                                        <div className="text-xs font-bold text-slate-400">NIC端 收發器 (Device End)</div>
                                        <div className="divide-y divide-slate-800/60 flex-1">
                                            {Object.keys(nicTransceivers).length === 0 ? (
                                                <div className="text-xs text-slate-600 py-1.5">-</div>
                                            ) : (
                                                Object.entries(nicTransceivers).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center py-2 text-xs font-mono">
                                                        <span className="text-slate-300 truncate pr-2" title={model}>{model}</span>
                                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-bold">{count} 個</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    {/* SW Transceivers Summary */}
                                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                                        <div className="text-xs font-bold text-slate-400">Switch端 收發器 (Switch End)</div>
                                        <div className="divide-y divide-slate-800/60 flex-1">
                                            {Object.keys(swTransceivers).length === 0 ? (
                                                <div className="text-xs text-slate-600 py-1.5">-</div>
                                            ) : (
                                                Object.entries(swTransceivers).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center py-2 text-xs font-mono">
                                                        <span className="text-slate-300 truncate pr-2" title={model}>{model}</span>
                                                        <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded font-bold">{count} 個</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    {/* Cable Summary */}
                                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                                        <div className="text-xs font-bold text-slate-400">線路型號 (Cable Specs)</div>
                                        <div className="divide-y divide-slate-800/60 flex-1">
                                            {Object.keys(cables).length === 0 ? (
                                                <div className="text-xs text-slate-600 py-1.5">-</div>
                                            ) : (
                                                Object.entries(cables).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center py-2 text-xs font-mono">
                                                        <span className="text-slate-300 truncate pr-2" title={model}>{model}</span>
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold">{count} 條</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Cabling Details (明細表) */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                                {isOverview ? "所有機櫃設備規格明細表 (All Devices Cabling Details)" : "設備規格明細表 (Device Cabling Details)"}
                            </h4>

                            {cabledDevices.length === 0 ? (
                                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                                    <p className="text-sm font-semibold text-slate-400">目前無設定任何線路規格資訊</p>
                                    <p className="text-xs text-slate-500">請在右側面板為各設備（如 BMC、PCIe 插槽、OCP、EW NIC）填寫 Transceiver 型號及 Cable 數量。</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cabledDevices.map(({ dev, specs }) => {
                                        const devRack = racks.find(r => r.id === dev.rackId);
                                        const devRackName = devRack ? devRack.name : '未知機櫃';
                                        return (
                                            <div key={dev.id} className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                                                {/* Device Header */}
                                                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-200 font-mono">
                                                        {isOverview ? `[${devRackName}] ` : ''}{dev.customName} <span className="text-slate-500 font-normal">({dev.type})</span>
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-850 text-slate-400 border border-slate-800 rounded font-bold">U{dev.startU} - U{dev.startU + dev.size - 1}</span>
                                                </div>
                                                {/* Device Specs Table */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse text-left text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-950/30 text-slate-500 font-bold border-b border-slate-800 text-[10px] uppercase">
                                                                <th className="px-4 py-2 w-[12%]">介面 (Interface)</th>
                                                                <th className="px-4 py-2 w-[22%]">NIC端 收發器</th>
                                                                <th className="px-4 py-2 w-[8%] text-center">數量</th>
                                                                <th className="px-4 py-2 w-[22%]">Switch端 收發器</th>
                                                                <th className="px-4 py-2 w-[8%] text-center">數量</th>
                                                                <th className="px-4 py-2 w-[22%]">線路型號</th>
                                                                <th className="px-4 py-2 w-[8%] text-center">數量</th>
                                                                <th className="px-4 py-2 w-[8%] text-center">長度 (Est)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                                                            {specs.map((s, idx) => {
                                                                const connectedSwitch = findConnectedSwitch(dev, s.specKey, devices);
                                                                const cableLength = calculateCableLength(dev, connectedSwitch, racks);
                                                                const lengthStr = cableLength ? `${cableLength} m` : '-';
                                                                return (
                                                                    <tr key={idx} className="hover:bg-slate-850/20 text-slate-300">
                                                                        <td className="px-4 py-2 font-semibold text-indigo-400/90">{s.interface}</td>
                                                                        <td className="px-4 py-2">{s.nicTransceiverModel}</td>
                                                                        <td className="px-4 py-2 text-center text-indigo-300">{s.nicTransceiverQty}</td>
                                                                        <td className="px-4 py-2">{s.swTransceiverModel}</td>
                                                                        <td className="px-4 py-2 text-center text-violet-300">{s.swTransceiverQty}</td>
                                                                        <td className="px-4 py-2">{s.cableModel}</td>
                                                                        <td className="px-4 py-2 text-center text-emerald-300">{s.cableQty}</td>
                                                                        <td className="px-4 py-2 text-center text-amber-400 font-bold">{lengthStr}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Printable Area */}
            {isGeneratingCablePDF && (
                <div id="pdf-cable-print-area" style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', background: '#ffffff', color: '#0d1b2e' }}>
                    
                    {/* Page 1: Summary Sheet */}
                    <div className="pdf-page bg-white p-12 flex flex-col justify-between" style={{ width: '794px', height: '1123px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
                        <div>
                            {/* Watermark/Branding Header */}
                            <div className="flex justify-between items-center border-b-2 border-[#D71422] pb-4 mb-8">
                                <span className="text-xl font-black text-slate-800 tracking-wider">INVENTEC</span>
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest border border-red-200 px-2 py-0.5 rounded">Confidential</span>
                            </div>

                            {/* Title */}
                            <div className="space-y-2 mb-10">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">專案網路規格書 / Network Cabling Specification</h1>
                                <p className="text-xs text-slate-500">此文件載明指定機櫃內的連線設備收發器及對接線路明細規格。</p>
                            </div>

                            {/* Project Information */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 text-xs text-slate-600">
                                <div>
                                    <div className="mb-1.5"><span className="font-bold text-slate-800">專案名稱：</span>{projectName || '未命名專案'}</div>
                                    <div><span className="font-bold text-slate-800">機櫃範圍：</span>{isOverview ? '所有機櫃 (All Cabinets)' : activeRackName}</div>
                                </div>
                                <div>
                                    <div className="mb-1.5"><span className="font-bold text-slate-800">產出時間：</span>{todayStr}</div>
                                    <div><span className="font-bold text-slate-800">分析設備總數：</span>{devicesToAnalyze.length} 台</div>
                                </div>
                            </div>

                            {/* Cabling Summary */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2">機櫃規格彙總表 (Aggregate Summary)</h3>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {/* NIC Transceivers Summary */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="text-[11px] font-bold text-slate-500 mb-2 pb-1 border-b border-slate-200">NIC端 收發器 (Device)</div>
                                        <div className="space-y-1.5">
                                            {Object.keys(nicTransceivers).length === 0 ? (
                                                <div className="text-xs text-slate-400">-</div>
                                            ) : (
                                                Object.entries(nicTransceivers).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-700 font-semibold truncate pr-1" style={{ maxWidth: '140px' }}>{model}</span>
                                                        <span className="font-bold text-slate-900 whitespace-nowrap">{count} 個</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    {/* SW Transceivers Summary */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="text-[11px] font-bold text-slate-500 mb-2 pb-1 border-b border-slate-200">Switch端 收發器 (Switch)</div>
                                        <div className="space-y-1.5">
                                            {Object.keys(swTransceivers).length === 0 ? (
                                                <div className="text-xs text-slate-400">-</div>
                                            ) : (
                                                Object.entries(swTransceivers).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-700 font-semibold truncate pr-1" style={{ maxWidth: '140px' }}>{model}</span>
                                                        <span className="font-bold text-slate-900 whitespace-nowrap">{count} 個</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    {/* Cable Summary */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="text-[11px] font-bold text-slate-500 mb-2 pb-1 border-b border-slate-200">線路 (Cable)</div>
                                        <div className="space-y-1.5">
                                            {Object.keys(cables).length === 0 ? (
                                                <div className="text-xs text-slate-400">-</div>
                                            ) : (
                                                Object.entries(cables).map(([model, count]) => (
                                                    <div key={model} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-700 font-semibold truncate pr-1" style={{ maxWidth: '140px' }}>{model}</span>
                                                        <span className="font-bold text-slate-900 whitespace-nowrap">{count} 條</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Page Footer */}
                        <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Inventec Corporation</span>
                            <span>頁次 1 / {chunkedDevices.length + 1}</span>
                        </div>
                    </div>

                    {/* Page 2+: Cabling Details Sheets */}
                    {chunkedDevices.map((chunk, pIdx) => {
                        const pageNum = pIdx + 2;
                        return (
                            <div key={pIdx} className="pdf-page bg-white p-12 flex flex-col justify-between" style={{ width: '794px', height: '1123px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
                                <div>
                                    {/* Page Header */}
                                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-6">
                                        <span className="text-xs font-black text-slate-500 tracking-wider">INVENTEC - CABLING SPECIFICATION</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {isOverview ? '所有機櫃' : activeRackName} - 明細頁
                                        </span>
                                    </div>

                                    {/* Page Title */}
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2 mb-6">
                                        機櫃設備線路明細 (Cabling Details - Page {pIdx + 1})
                                    </h3>

                                    {/* Device Specifications List */}
                                    <div className="space-y-6">
                                        {chunk.map(({ dev, specs }) => {
                                            const devRack = racks.find(r => r.id === dev.rackId);
                                            const devRackName = devRack ? devRack.name : '未知機櫃';
                                            return (
                                                <div key={dev.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                                    <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex justify-between items-center text-[10px] font-bold text-slate-700">
                                                        <span>{isOverview ? `[${devRackName}] ` : ''}{dev.customName} ({dev.type})</span>
                                                        <span>U{dev.startU} - U{dev.startU + dev.size - 1}</span>
                                                    </div>
                                                    <table className="w-full border-collapse text-left text-[9px]">
                                                        <thead>
                                                            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase">
                                                                <th className="px-3 py-1.5 w-[12%]">介面 (IF)</th>
                                                                <th className="px-3 py-1.5 w-[22%]">NIC 收發器</th>
                                                                <th className="px-3 py-1.5 w-[8%] text-center">數量</th>
                                                                <th className="px-3 py-1.5 w-[22%]">SW 收發器</th>
                                                                <th className="px-3 py-1.5 w-[8%] text-center">數量</th>
                                                                <th className="px-3 py-1.5 w-[22%]">線路型號</th>
                                                                <th className="px-3 py-1.5 w-[8%] text-center">數量</th>
                                                                <th className="px-3 py-1.5 w-[8%] text-center">長度</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 font-mono">
                                                            {specs.map((s, idx) => {
                                                                const connectedSwitch = findConnectedSwitch(dev, s.specKey, devices);
                                                                const cableLength = calculateCableLength(dev, connectedSwitch, racks);
                                                                const lengthStr = cableLength ? `${cableLength} m` : '-';
                                                                return (
                                                                    <tr key={idx} className="text-slate-700">
                                                                        <td className="px-3 py-1.5 font-bold text-indigo-700">{s.interface}</td>
                                                                        <td className="px-3 py-1.5">{s.nicTransceiverModel}</td>
                                                                        <td className="px-3 py-1.5 text-center">{s.nicTransceiverQty}</td>
                                                                        <td className="px-3 py-1.5">{s.swTransceiverModel}</td>
                                                                        <td className="px-3 py-1.5 text-center">{s.swTransceiverQty}</td>
                                                                        <td className="px-3 py-1.5">{s.cableModel}</td>
                                                                        <td className="px-3 py-1.5 text-center">{s.cableQty}</td>
                                                                        <td className="px-3 py-1.5 text-center text-amber-600 font-bold">{lengthStr}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Page Footer */}
                                <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <span>Inventec Corporation</span>
                                    <span>頁次 {pageNum} / {chunkedDevices.length + 1}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default NetworkCablingModal;
