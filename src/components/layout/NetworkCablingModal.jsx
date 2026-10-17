import React, { useState, useMemo } from 'react';
import { X, Share2, FileText, Download, Cable, Layers, Filter, Search, Tag, Ruler } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getServerCategory, getHighDensityNodes } from '../../utils/helpers';
import { generateProjectCableCutSheet, calculatePhysicalCableDistance } from '../../utils/cableCalculator';
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

    if (hw.cx8p) {
        addSpec('EW NIC', hw.cx8p, 'cx8p');
    }

    if (hw.super_nic_mgt) {
        addSpec('Super NIC Mgt', hw.super_nic_mgt, 'super_nic_mgt');
    }

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
                const targetSwitch = devices.find(d => connValue.startsWith(`${d.id}-port-`) || connValue.startsWith(`${d.id}-subport-`));
                if (targetSwitch) {
                    return targetSwitch;
                }
            }
        }
    }

    return null;
};

// Aggregate manual specs for the summary table
const aggregateSpecs = (devicesInRack) => {
    const nicTransceivers = {};
    const swTransceivers = {};
    const cables = {};

    devicesInRack.forEach(dev => {
        const specs = getCabledSpecsForDevice(dev);
        specs.forEach(s => {
            if (s.nicTransceiverModel && s.nicTransceiverModel !== '-' && s.nicTransceiverQty > 0) {
                const key = s.nicTransceiverModel.trim();
                nicTransceivers[key] = (nicTransceivers[key] || 0) + s.nicTransceiverQty;
            }
            if (s.swTransceiverModel && s.swTransceiverModel !== '-' && s.swTransceiverQty > 0) {
                const key = s.swTransceiverModel.trim();
                swTransceivers[key] = (swTransceivers[key] || 0) + s.swTransceiverQty;
            }
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
        devices, racks, activeRackId, projectName, viewMode, projectInfo,
        handleExportCableRouting, handleExportBOM
    } = useRackPlanner();

    const [activeTab, setActiveTab] = useState('cutsheet'); // 'cutsheet' | 'bom' | 'manual'
    const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'l11' | 'l12'
    const [fabricFilter, setFabricFilter] = useState('all'); // 'all' | 'EW' | 'NS' | 'OOB' | 'DLC'
    const [searchQuery, setSearchQuery] = useState('');

    // 自動計算全系統 L11/L12 點對點拉線施工表與分長度 BOM
    const cutSheetData = useMemo(
        () => generateProjectCableCutSheet(devices, racks, projectInfo),
        [devices, racks, projectInfo]
    );

    if (!isNetworkCablingOpen) return null;

    const isOverview = viewMode === 'overview' || viewMode === 'container' || viewMode === 'network';
    const activeRack = racks.find(r => r.id === activeRackId);
    const activeRackName = activeRack ? activeRack.name : '未知機櫃';

    const { cutSheetRows, lengthBinnedBom, transceiverMap, summary } = cutSheetData;

    const filteredCutSheetRows = cutSheetRows.filter(row => {
        if (!isOverview) {
            const inActiveRack = row.srcRackName === activeRackName || row.dstRackName === activeRackName;
            if (!inActiveRack) return false;
        }
        if (scopeFilter === 'l11' && !row.isIntraRack) return false;
        if (scopeFilter === 'l12' && row.isIntraRack) return false;
        if (fabricFilter !== 'all' && row.fabricCode !== fabricFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                row.cableId.toLowerCase().includes(q) ||
                row.srcDeviceName.toLowerCase().includes(q) ||
                row.dstDeviceName.toLowerCase().includes(q) ||
                row.srcRackName.toLowerCase().includes(q) ||
                row.dstRackName.toLowerCase().includes(q) ||
                row.cableModel.toLowerCase().includes(q) ||
                row.mediaType.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Choose devices to analyze for manual tab
    const devicesToAnalyze = isOverview ? devices : devices.filter(d => d.rackId === activeRackId);
    const sortedDevices = [...devicesToAnalyze].sort((a, b) => {
        if (isOverview && a.rackId !== b.rackId) {
            const rackA = racks.find(r => r.id === a.rackId)?.name || '';
            const rackB = racks.find(r => r.id === b.rackId)?.name || '';
            return rackA.localeCompare(rackB);
        }
        return (b.startU || 0) - (a.startU || 0);
    });

    const cabledDevices = sortedDevices.map(dev => {
        const specs = getCabledSpecsForDevice(dev);
        return { dev, specs };
    }).filter(item => item.specs.length > 0);

    const { nicTransceivers, swTransceivers, cables } = aggregateSpecs(devicesToAnalyze);
    const hasAnySummary = cutSheetRows.length > 0 || Object.keys(nicTransceivers).length > 0 || Object.keys(swTransceivers).length > 0 || Object.keys(cables).length > 0;

    const handleGenerateSpecPDF = async () => {
        setIsGeneratingCablePDF(true);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(500);

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
                    pdf.save(`RackPlanner-L11L12-CablingSpec-${projectName || 'Project'}-${new Date().toISOString().slice(0, 10)}.pdf`);
                }
            } catch (err) {
                console.error("Error generating cabling spec PDF:", err);
            }
        }
        setIsGeneratingCablePDF(false);
    };

    // Split cutSheetRows for PDF pages (22 rows per page)
    const rowsPerPage = 22;
    const chunkedCutSheet = [];
    for (let i = 0; i < cutSheetRows.length; i += rowsPerPage) {
        chunkedCutSheet.push(cutSheetRows.slice(i, i + rowsPerPage));
    }

    const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('zh-TW', { hour12: false });

    const getFabricBadgeClass = (fabricCode) => {
        switch (fabricCode) {
            case 'EW': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            case 'NS': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            case 'OOB': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
            case 'DLC': return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
            default: return 'bg-slate-800 text-slate-300 border-slate-700';
        }
    };

    return (
        <>
            {/* Modal Dialog */}
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-fade-in animate-duration-200">
                <div className="bg-[#0b1424] border border-slate-700/60 w-full max-w-6xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-[#0e192c]">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                                <Cable className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-100">
                                        L11 / L12 產線拉線施工表與線材規格中心 (Cable Cut-Sheet & BOM)
                                    </h3>
                                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                                        {isOverview ? '全機櫃叢集總覽' : `單櫃檢視: ${activeRackName}`}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    依機櫃 U 位高度與跨櫃曼哈頓距離自動計算標準採購線長 (0.5m~30m)、自動選型 DAC/AEC/AOC/光纖，並生成產線 Brady Label 線標編號
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {cutSheetRows.length > 0 && (
                                <>
                                    <button
                                        onClick={handleExportCableRouting}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                                        title="匯出包含 Cable_ID、預估線長與交換器對照表的完整 CSV"
                                    >
                                        <Download className="w-3.5 h-3.5" /> 匯出 Cut-Sheet (.CSV)
                                    </button>
                                    <button
                                        onClick={handleExportBOM}
                                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="匯出包含分米數線材統計的完整專案 BOM 表"
                                    >
                                        <Download className="w-3.5 h-3.5 text-amber-400" /> 匯出分長度 BOM (.CSV)
                                    </button>
                                </>
                            )}
                            {hasAnySummary && (
                                <button
                                    onClick={handleGenerateSpecPDF}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    <FileText className="w-3.5 h-3.5" /> 匯出施工規格書 (.PDF)
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

                    {/* Top KPI Summary Bar */}
                    <div className="px-6 py-3 bg-[#09111e] border-b border-slate-800/80 grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 font-semibold">總連線條數 (Links)</div>
                                <div className="text-base font-black text-white font-mono">{summary.totalConnections} <span className="text-xs font-normal text-slate-400">條</span></div>
                            </div>
                            <Tag className="w-4 h-4 text-indigo-400 opacity-80" />
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 font-semibold">L11 櫃內 / L12 跨櫃</div>
                                <div className="text-sm font-black font-mono">
                                    <span className="text-cyan-400">{summary.l11Count}</span>
                                    <span className="text-slate-600 mx-1">/</span>
                                    <span className="text-purple-400">{summary.l12Count}</span>
                                </div>
                            </div>
                            <Layers className="w-4 h-4 text-cyan-400 opacity-80" />
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 font-semibold">預估採購總米數</div>
                                <div className="text-base font-black text-amber-400 font-mono">{summary.totalMeters} <span className="text-xs font-normal text-slate-400">m</span></div>
                            </div>
                            <Ruler className="w-4 h-4 text-amber-400 opacity-80" />
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 font-semibold">高速銅纜 / 主動光纖</div>
                                <div className="text-sm font-black font-mono">
                                    <span className="text-emerald-400" title="DAC / AEC 銅纜">{summary.dacCount} DAC</span>
                                    <span className="text-slate-600 mx-1">/</span>
                                    <span className="text-rose-400" title="MPO 光纖 / AOC">{summary.opticalCount} 光纖</span>
                                </div>
                            </div>
                            <Share2 className="w-4 h-4 text-emerald-400 opacity-80" />
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 font-semibold">OOB 網路線 / 液冷管</div>
                                <div className="text-sm font-black font-mono">
                                    <span className="text-sky-400">{summary.utpCount} RJ45</span>
                                    <span className="text-slate-600 mx-1">/</span>
                                    <span className="text-blue-300">{summary.dlcCount} QDC</span>
                                </div>
                            </div>
                            <Filter className="w-4 h-4 text-sky-400 opacity-80" />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="px-6 pt-3 bg-[#0b1424] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('cutsheet')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'cutsheet'
                                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                }`}
                            >
                                1. 產線點對點拉線施工表 (Point-to-Point Cut-Sheet) ({filteredCutSheetRows.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('bom')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'bom'
                                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                }`}
                            >
                                2. 分米數線材與光模組採購 BOM ({lengthBinnedBom.length} 項規格)
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'manual'
                                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                }`}
                            >
                                3. 設備介面自訂收發器明細 ({cabledDevices.length})
                            </button>
                        </div>

                        {activeTab === 'cutsheet' && (
                            <div className="flex items-center gap-2 pb-2">
                                <select
                                    value={scopeFilter}
                                    onChange={(e) => setScopeFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500"
                                >
                                    <option value="all">所有層級 (L11 + L12)</option>
                                    <option value="l11">僅 L11 (櫃內 Intra-Rack)</option>
                                    <option value="l12">僅 L12 (跨櫃 Inter-Rack)</option>
                                </select>
                                <select
                                    value={fabricFilter}
                                    onChange={(e) => setFabricFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500"
                                >
                                    <option value="all">所有網路平面 (All Fabrics)</option>
                                    <option value="EW">East-West (AI 運算網)</option>
                                    <option value="NS">North-South (前端/業務網)</option>
                                    <option value="OOB">OOB (BMC 帶外管理網)</option>
                                    <option value="DLC">DLC (液冷管路)</option>
                                </select>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="搜尋線標、設備、機櫃、料號..."
                                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1 w-48 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                        {activeTab === 'cutsheet' && (
                            <div className="space-y-3">
                                {filteredCutSheetRows.length === 0 ? (
                                    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-2">
                                        <Cable className="w-8 h-8 text-slate-600 mb-1" />
                                        <p className="text-sm font-semibold text-slate-300">目前尚無符合條件的實體連線紀錄</p>
                                        <p className="text-xs text-slate-500">請在機櫃視圖或網路拓撲視圖使用「自動佈線」或手動拖拽連接埠，系統將自動計算物理線長與產線線標。</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase tracking-wider">
                                                        <th className="px-3 py-2.5 w-[4%] text-center">#</th>
                                                        <th className="px-3 py-2.5 w-[19%]">產線線標編號 (Cable_ID)</th>
                                                        <th className="px-3 py-2.5 w-[9%] text-center">層級 / 平面</th>
                                                        <th className="px-3 py-2.5 w-[21%]">來源端 (Src Rack / U / Host / Port)</th>
                                                        <th className="px-3 py-2.5 w-[21%]">目的端 (Dst Rack / U / Host / Port)</th>
                                                        <th className="px-3 py-2.5 w-[10%] text-center">預估實長 / 採購線長</th>
                                                        <th className="px-3 py-2.5 w-[16%]">自動選型介質與光模組</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                                    {filteredCutSheetRows.map((row) => (
                                                        <tr key={row.cableId} className="hover:bg-slate-800/40 transition-colors text-slate-200">
                                                            <td className="px-3 py-2 text-center text-slate-500">{row.seq}</td>
                                                            <td className="px-3 py-2">
                                                                <span className="px-2 py-0.5 bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 rounded font-bold text-[10px] select-all">
                                                                    {row.cableId}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                                                        row.isIntraRack
                                                                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                                                            : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                                                    }`}>
                                                                        {row.isIntraRack ? 'L11 櫃內' : 'L12 跨櫃'}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getFabricBadgeClass(row.fabricCode)}`}>
                                                                        {row.fabricCode}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                                                                        {row.srcRackName} · {row.srcU}
                                                                    </span>
                                                                    <span className="font-bold text-white truncate max-w-[130px]" title={row.srcDeviceName}>
                                                                        {row.srcDeviceName}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-indigo-400 mt-0.5">
                                                                    Port: {row.srcPortFormatted}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                                                                        {row.dstRackName} · {row.dstU}
                                                                    </span>
                                                                    <span className="font-bold text-white truncate max-w-[130px]" title={row.dstDeviceName}>
                                                                        {row.dstDeviceName}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-violet-400 mt-0.5">
                                                                    Port: {row.dstPortFormatted}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <div className="text-sm font-black text-amber-400">
                                                                    {row.standardLength} m
                                                                </div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    實算: {row.rawLength} m
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="font-bold text-emerald-300 text-[11px]">{row.cableModel}</div>
                                                                <div className="text-[10px] text-slate-400">{row.mediaType}</div>
                                                                {row.transceiverSrc !== '-' && !row.transceiverSrc.includes('DAC') && !row.transceiverSrc.includes('RJ45') && (
                                                                    <div className="text-[9px] text-indigo-300/80 mt-0.5 truncate" title={`${row.transceiverSrc} / ${row.transceiverDst}`}>
                                                                        光模組: {row.transceiverSrc}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'bom' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                                        分長度線材採購統計表 (Length-Binned Cable BOM)
                                    </h4>
                                    {lengthBinnedBom.length === 0 ? (
                                        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-8 text-center text-xs text-slate-500">
                                            尚無任何連線可供統計。
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                                                        <th className="px-4 py-2.5">線材類別描述</th>
                                                        <th className="px-4 py-2.5">建議採購料號 (PN)</th>
                                                        <th className="px-4 py-2.5">物理介質 (Media)</th>
                                                        <th className="px-4 py-2.5 text-center">標準長度級距</th>
                                                        <th className="px-4 py-2.5 text-center">L11 櫃內數量</th>
                                                        <th className="px-4 py-2.5 text-center">L12 跨櫃數量</th>
                                                        <th className="px-4 py-2.5 text-center">總採購數量</th>
                                                        <th className="px-4 py-2.5 text-right">總米數小計</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                                    {lengthBinnedBom.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                                                            <td className="px-4 py-2.5 font-sans font-bold text-slate-200">{item.bomCategoryName}</td>
                                                            <td className="px-4 py-2.5 font-bold text-emerald-400">{item.cableModel}</td>
                                                            <td className="px-4 py-2.5 text-slate-400">{item.mediaType}</td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-bold">
                                                                    {item.standardLength} m
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center text-cyan-400">{item.scopeBreakdown.l11}</td>
                                                            <td className="px-4 py-2.5 text-center text-purple-400">{item.scopeBreakdown.l12}</td>
                                                            <td className="px-4 py-2.5 text-center font-black text-white text-sm">{item.totalQty} 條</td>
                                                            <td className="px-4 py-2.5 text-right text-slate-300">{item.totalMeters} m</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                                        獨立光模組統計表 (Optical Transceivers BOM — 排除已含於 DAC/AEC 銅纜之埠位)
                                    </h4>
                                    {Object.keys(transceiverMap).length === 0 ? (
                                        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-6 text-center text-xs text-slate-500">
                                            目前連線全數採用銅纜 (DAC/AEC/Cat6A) 或一體化線材，無需額外採購獨立光纖收發器。
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {Object.entries(transceiverMap).map(([model, count]) => (
                                                <div key={model} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between font-mono">
                                                    <div>
                                                        <div className="text-xs font-bold text-indigo-300">{model}</div>
                                                        <div className="text-[10px] text-slate-500">Optical Transceiver Module</div>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-lg font-black text-sm">
                                                        {count} 顆
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'manual' && (
                            <div className="space-y-4">
                                {cabledDevices.length === 0 ? (
                                    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                                        <p className="text-sm font-semibold text-slate-400">目前無手動填寫之設備介面收發器明細</p>
                                        <p className="text-xs text-slate-500">您可以在右側屬性面板針對特定設備手動指定 Transceiver 型號，或直接使用上方「1. 產線點對點拉線施工表」與「2. 分米數線材採購 BOM」檢視系統自動計算結果。</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cabledDevices.map(({ dev, specs }) => {
                                            const devRack = racks.find(r => r.id === dev.rackId);
                                            const devRackName = devRack ? devRack.name : '未知機櫃';
                                            return (
                                                <div key={dev.id} className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-200 font-mono">
                                                            {isOverview ? `[${devRackName}] ` : ''}{dev.customName} <span className="text-slate-500 font-normal">({dev.type})</span>
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 bg-slate-850 text-slate-400 border border-slate-800 rounded font-bold">U{dev.startU} - U{dev.startU + dev.size - 1}</span>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border-collapse text-left text-xs">
                                                            <thead>
                                                                <tr className="bg-slate-950/30 text-slate-500 font-bold border-b border-slate-800 text-[10px] uppercase">
                                                                    <th className="px-4 py-2 w-[12%]">介面 (Interface)</th>
                                                                    <th className="px-4 py-2 w-[20%]">NIC端 收發器</th>
                                                                    <th className="px-4 py-2 w-[8%] text-center">數量</th>
                                                                    <th className="px-4 py-2 w-[20%]">Switch端 收發器</th>
                                                                    <th className="px-4 py-2 w-[8%] text-center">數量</th>
                                                                    <th className="px-4 py-2 w-[18%]">線路型號</th>
                                                                    <th className="px-4 py-2 w-[6%] text-center">數量</th>
                                                                    <th className="px-4 py-2 w-[8%] text-center">採購線長</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                                                                {specs.map((s, idx) => {
                                                                    const connectedSwitch = findConnectedSwitch(dev, s.specKey, devices);
                                                                    const dist = connectedSwitch ? calculatePhysicalCableDistance(dev, s.specKey, connectedSwitch, 'port-1', racks) : null;
                                                                    const lengthStr = dist ? `${dist.standardLength} m` : '-';
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
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden PDF Printable Area */}
            {isGeneratingCablePDF && (
                <div id="pdf-cable-print-area" style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', background: '#ffffff', color: '#0d1b2e' }}>
                    
                    {/* Page 1: L11/L12 Length-Binned BOM & Summary Sheet */}
                    <div className="pdf-page bg-white p-10 flex flex-col justify-between" style={{ width: '794px', height: '1123px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
                        <div>
                            <div className="flex justify-between items-center border-b-2 border-[#D71422] pb-3 mb-6">
                                <span className="text-xl font-black text-slate-800 tracking-wider">INVENTEC</span>
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest border border-red-200 px-2 py-0.5 rounded">Confidential · L11/L12 Engineering</span>
                            </div>

                            <div className="space-y-1.5 mb-6">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">L11 / L12 網路佈線與分米數線材採購規格書</h1>
                                <p className="text-xs text-slate-500">Point-to-Point Cable Cut-Sheet & Length-Binned Cable / Transceiver BOM</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs text-slate-600">
                                <div>
                                    <div className="mb-1"><span className="font-bold text-slate-800">專案名稱：</span>{projectName || '未命名專案'}</div>
                                    <div><span className="font-bold text-slate-800">統計範圍：</span>{isOverview ? '全機櫃叢集 (All Racks)' : activeRackName}</div>
                                </div>
                                <div>
                                    <div className="mb-1"><span className="font-bold text-slate-800">產出時間：</span>{todayStr}</div>
                                    <div><span className="font-bold text-slate-800">總連線數 / 總線長：</span>{summary.totalConnections} 條 (L11: {summary.l11Count} / L12: {summary.l12Count}) · 共 {summary.totalMeters} m</div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2">
                                    一、分長度線材採購統計表 (Length-Binned Cable BOM)
                                </h3>
                                <table className="w-full border-collapse text-left text-[9px]">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                            <th className="p-1.5 border border-slate-200">線材類別</th>
                                            <th className="p-1.5 border border-slate-200">標準料號 (PN)</th>
                                            <th className="p-1.5 border border-slate-200">物理介質</th>
                                            <th className="p-1.5 border border-slate-200 text-center">採購線長</th>
                                            <th className="p-1.5 border border-slate-200 text-center">L11 櫃內</th>
                                            <th className="p-1.5 border border-slate-200 text-center">L12 跨櫃</th>
                                            <th className="p-1.5 border border-slate-200 text-center">總數量</th>
                                            <th className="p-1.5 border border-slate-200 text-right">總米數</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-mono">
                                        {lengthBinnedBom.map((item, idx) => (
                                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                                <td className="p-1.5 border border-slate-200 font-sans font-bold text-slate-800">{item.bomCategoryName}</td>
                                                <td className="p-1.5 border border-slate-200 font-bold text-indigo-700">{item.cableModel}</td>
                                                <td className="p-1.5 border border-slate-200 text-slate-600">{item.mediaType}</td>
                                                <td className="p-1.5 border border-slate-200 text-center font-bold text-amber-700">{item.standardLength}m</td>
                                                <td className="p-1.5 border border-slate-200 text-center">{item.scopeBreakdown.l11}</td>
                                                <td className="p-1.5 border border-slate-200 text-center">{item.scopeBreakdown.l12}</td>
                                                <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-900">{item.totalQty}</td>
                                                <td className="p-1.5 border border-slate-200 text-right">{item.totalMeters}m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {Object.keys(transceiverMap).length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2">
                                        二、獨立光纖收發器統計表 (Optical Transceivers BOM)
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(transceiverMap).map(([model, count]) => (
                                            <div key={model} className="bg-slate-50 border border-slate-200 rounded p-2 flex justify-between items-center text-[10px] font-mono">
                                                <span className="font-bold text-slate-700 truncate pr-2">{model}</span>
                                                <span className="font-black text-indigo-700">{count} 顆</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Inventec Corporation · RackPlanner PRO</span>
                            <span>頁次 1 / {chunkedCutSheet.length + 1}</span>
                        </div>
                    </div>

                    {/* Page 2+: Point-to-Point Cut-Sheet Pages */}
                    {chunkedCutSheet.map((chunk, pIdx) => {
                        const pageNum = pIdx + 2;
                        return (
                            <div key={pIdx} className="pdf-page bg-white p-10 flex flex-col justify-between" style={{ width: '794px', height: '1123px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
                                <div>
                                    <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3 mb-4">
                                        <span className="text-xs font-black text-slate-500 tracking-wider">INVENTEC - L11/L12 POINT-TO-POINT CUT-SHEET</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {projectName || 'Project'} · Cut-Sheet Page {pIdx + 1}
                                        </span>
                                    </div>

                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2 mb-4">
                                        產線點對點拉線施工表 (Point-to-Point Cut-Sheet - 第 {pIdx + 1} 頁)
                                    </h3>

                                    <table className="w-full border-collapse text-left text-[8.5px]">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                                <th className="p-1.5 border border-slate-200 w-[20%]">線標編號 (Cable ID)</th>
                                                <th className="p-1.5 border border-slate-200 w-[8%] text-center">層級</th>
                                                <th className="p-1.5 border border-slate-200 w-[23%]">來源端 (機櫃 / U位 / 設備 / 埠)</th>
                                                <th className="p-1.5 border border-slate-200 w-[23%]">目的端 (機櫃 / U位 / 設備 / 埠)</th>
                                                <th className="p-1.5 border border-slate-200 w-[18%]">線材規格與介質</th>
                                                <th className="p-1.5 border border-slate-200 w-[8%] text-center">採購線長</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 font-mono">
                                            {chunk.map((row) => (
                                                <tr key={row.cableId} className="text-slate-700">
                                                    <td className="p-1.5 border border-slate-200 font-bold text-indigo-700">{row.cableId}</td>
                                                    <td className="p-1.5 border border-slate-200 text-center">{row.isIntraRack ? 'L11 櫃內' : 'L12 跨櫃'}</td>
                                                    <td className="p-1.5 border border-slate-200 font-sans">
                                                        <span className="font-mono text-slate-500">[{row.srcRackCode} {row.srcU}]</span>{' '}
                                                        <span className="font-bold">{row.srcDeviceName}</span>{' '}
                                                        <span className="font-mono text-indigo-700">({row.srcPortFormatted})</span>
                                                    </td>
                                                    <td className="p-1.5 border border-slate-200 font-sans">
                                                        <span className="font-mono text-slate-500">[{row.dstRackCode} {row.dstU}]</span>{' '}
                                                        <span className="font-bold">{row.dstDeviceName}</span>{' '}
                                                        <span className="font-mono text-indigo-700">({row.dstPortFormatted})</span>
                                                    </td>
                                                    <td className="p-1.5 border border-slate-200">
                                                        <div className="font-bold text-slate-800">{row.cableModel}</div>
                                                        <div className="text-[7.5px] text-slate-500">{row.mediaType}</div>
                                                    </td>
                                                    <td className="p-1.5 border border-slate-200 text-center font-bold text-amber-700">
                                                        {row.standardLength}m
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <span>Inventec Corporation · RackPlanner PRO</span>
                                    <span>頁次 {pageNum} / {chunkedCutSheet.length + 1}</span>
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
