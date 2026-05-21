import React from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { getServerCategory, getFabricGroup, getHighDensityNodes, getNicCount, getSwitchPortCount } from '../../utils/helpers';

const PrintLayout = () => {
    const { racks, devices, rackScreenshots, topoScreenshot, printTimestamp } = useRackPlanner();

    const totalSpace = devices.filter(d => d.type !== 'SideCDU').reduce((sum, dev) => sum + (dev.size || 0), 0);
    const totalPower = devices.reduce((sum, dev) => sum + (dev.power || 0), 0);
    const totalPrice = devices.reduce((sum, dev) => sum + (dev.price || 0), 0);

    const sortedDevices = [...devices].sort((a, b) => {
        if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
        return b.startU - a.startU;
    });

    const formatRemotePortPrint = (portKey) => {
        if (!portKey) return '-';
        const pcieNodeMatch = portKey.match(/^pcie_slot_(\d+)_([nN]\d+)-(\d+)$/);
        if (pcieNodeMatch) {
            const [, slotIdx, nodeKey, portIdx] = pcieNodeMatch;
            return `${nodeKey.toUpperCase()} Slot ${slotIdx} P${portIdx}`;
        }
        const pcieMatch = portKey.match(/^pcie_slot_(\d+)-(\d+)$/);
        if (pcieMatch) {
            const [, slotIdx, portIdx] = pcieMatch;
            return `Slot ${slotIdx} P${portIdx}`;
        }
        if (portKey.startsWith('cx8-')) return portKey.replace('cx8-', 'EW NIC P');
        if (portKey.startsWith('ocp-')) return portKey.replace('ocp-', 'OCP P');
        if (portKey.startsWith('port-')) return portKey.replace('port-', 'Port ');
        if (portKey === 'bmc') return 'BMC';
        return portKey;
    };

    const getDeviceSpecsSummary = (dev) => {
        if (!dev) return '-';
        
        const hw = dev.hardwareSpecs || {};
        const type = dev.type || '';

        // 1. CDU
        if (type === 'CDU4U' || type === 'SideCDU') {
            const defaultCapacity = type === 'CDU4U' ? 80000 : 150000;
            const capVal = dev.coolingCapacity || defaultCapacity;
            const capacity = capVal ? `${capVal.toLocaleString()}W` : '';
            const power = dev.power ? `${dev.power}W` : '';
            return [
                capacity ? `解熱能力: ${capacity}` : '',
                power ? `功耗: ${power}` : ''
            ].filter(Boolean).join(', ') || 'CDU 液冷分配單元';
        }

        // 2. Switch
        if (type.startsWith('Switch')) {
            const defaultPorts = type === 'Switch1G' ? 48 : (type === 'Switch800G' ? 64 : 32);
            const ports = getNicCount(dev, 'ports') || getSwitchPortCount(dev) || defaultPorts;
            
            let defaultSpeed = '10Gbps';
            if (type === 'Switch1G') defaultSpeed = '1Gbps';
            else if (type === 'Switch10G') defaultSpeed = '10Gbps';
            else if (type === 'Switch400G1U' || type === 'Switch400G') defaultSpeed = '400Gbps';
            else if (type === 'Switch800G') defaultSpeed = '800Gbps';
            const speed = hw.speed?.model || defaultSpeed;
            
            const role = dev.networkRole || (type === 'Switch800G' ? 'Spine' : 'Leaf');
            return `${ports} 埠交換器 (速率: ${speed}), 角色: ${role}`;
        }

        // 3. Router
        if (type === 'Router') {
            const ports = hw.ports?.qty || getSwitchPortCount(dev) || 24;
            const speed = hw.speed?.model || '10Gbps';
            const role = dev.networkRole || 'Spine';
            return `${ports} 埠路由器 (速率: ${speed}), 角色: ${role}`;
        }

        // 4. UPS
        if (type === 'UPS') {
            const power = dev.power || 2000;
            return `不斷電系統, 額定容量/功耗: ${power}W`;
        }

        // 5. Blank panel
        if (type === 'Blank') {
            return `空白機櫃擋板 (${dev.size || 1}U)`;
        }

        // 6. Servers and Storages
        const isHighDensity = getServerCategory(dev) === 'HighDensity';
        const isServerOrStorage = type.startsWith('Server') || type.startsWith('Storage');

        if (!isServerOrStorage) {
            return '-';
        }

        const formatPart = (part) => {
            if (!part) return null;
            if (part.model || part.qty) {
                return `${part.model || '標準元件'} *${part.qty !== undefined ? part.qty : 1}`;
            }
            return null;
        };

        const isConfigured = (part) => {
            return part && (part.model || part.qty);
        };

        if (isHighDensity) {
            const hdNodes = getHighDensityNodes(dev); // e.g., ['n1', 'n2']
            const nodeSummaries = hdNodes.map((nodeKey, idx) => {
                const nodeNum = idx + 1;
                const parts = [];
                
                const cpu = hw[`cpu_${nodeKey}`];
                const dimm = hw[`dimm_${nodeKey}`];
                const ocp = hw[`ocp_${nodeKey}`];
                const nic1 = hw[`ns_nic_1_${nodeKey}`];
                const gpu = hw[`gpu_${nodeKey}`];
                const m2 = hw[`m2_${nodeKey}`];
                const hdd = hw[`hdd_${nodeKey}`];

                if (isConfigured(cpu)) parts.push(`CPU: ${formatPart(cpu)}`);
                if (isConfigured(dimm)) parts.push(`DIMM: ${formatPart(dimm)}`);
                if (isConfigured(ocp)) parts.push(`OCP: ${formatPart(ocp)}`);
                if (isConfigured(nic1)) parts.push(`NIC1: ${formatPart(nic1)}`);
                if (isConfigured(gpu)) parts.push(`GPU: ${formatPart(gpu)}`);
                if (isConfigured(m2)) parts.push(`M.2: ${formatPart(m2)}`);
                if (isConfigured(hdd)) parts.push(`HDD: ${formatPart(hdd)}`);

                // PCIe slots for node
                const pcieSlotQtyKey = `pcieSlotQty_${nodeKey}`;
                const pcieSlotQty = hw[pcieSlotQtyKey]?.qty || 2;
                const slots = [];
                for (let s = 1; s <= pcieSlotQty; s++) {
                    const slotKey = `pcie_slot_${s}_${nodeKey}`;
                    const slotVal = hw[slotKey];
                    if (isConfigured(slotVal)) {
                        slots.push(`Slot ${s}: ${formatPart(slotVal)}`);
                    }
                }
                if (slots.length > 0) {
                    parts.push(`PCIe [${slots.join(', ')}]`);
                }

                return parts.length > 0 ? `Node ${nodeNum}: (${parts.join('; ')})` : '';
            }).filter(Boolean);

            return nodeSummaries.join(' | ') || `高密度伺服器 (${hdNodes.length}節點, 未設定詳細規格)`;
        } else {
            // General or AI Server or Storage
            const parts = [];
            if (isConfigured(hw.cpu)) parts.push(`CPU: ${formatPart(hw.cpu)}`);
            if (isConfigured(hw.dimm)) parts.push(`DIMM: ${formatPart(hw.dimm)}`);
            
            // NICs / OCP
            if (isConfigured(hw.ns_nic_1)) parts.push(`NIC1: ${formatPart(hw.ns_nic_1)}`);
            if (isConfigured(hw.ns_nic_2)) parts.push(`NIC2: ${formatPart(hw.ns_nic_2)}`);
            if (isConfigured(hw.ocp)) parts.push(`OCP: ${formatPart(hw.ocp)}`);

            // GPU / Accelerator
            if (getServerCategory(dev) === 'AI') {
                const accel = hw.accelerator?.type || 'Nvidia';
                if (isConfigured(hw.gpu)) {
                    parts.push(`GPU: ${accel} ${formatPart(hw.gpu)}`);
                }
            } else if (isConfigured(hw.gpu)) {
                parts.push(`GPU: ${formatPart(hw.gpu)}`);
            }

            // Storage / PSU / Cooling
            if (isConfigured(hw.m2)) parts.push(`M.2: ${formatPart(hw.m2)}`);
            if (isConfigured(hw.hdd)) parts.push(`HDD: ${formatPart(hw.hdd)}`);
            if (isConfigured(hw.psu54v)) parts.push(`54V PSU: ${formatPart(hw.psu54v)}`);
            if (isConfigured(hw.psu12v)) parts.push(`12V PSU: ${formatPart(hw.psu12v)}`);
            
            // PCIe slots
            const pcieSlotQty = hw.pcieSlotQty?.qty || 2;
            const slots = [];
            for (let s = 1; s <= pcieSlotQty; s++) {
                const slotKey = `pcie_slot_${s}`;
                const slotVal = hw[slotKey];
                if (isConfigured(slotVal)) {
                    slots.push(`Slot ${s}: ${formatPart(slotVal)}`);
                }
            }
            if (slots.length > 0) {
                parts.push(`PCIe [${slots.join(', ')}]`);
            }

            if (hw.cooling?.host || hw.cooling?.gpu) {
                const hostCool = hw.cooling.host || 'AC';
                const gpuCool = hw.cooling.gpu || 'AC';
                parts.push(`冷卻: 主機 ${hostCool} / GPU ${gpuCool}`);
            }

            if (isConfigured(hw.other)) parts.push(`其他: ${formatPart(hw.other)}`);

            if (parts.length > 0) {
                return parts.join(', ');
            }

            // Default fallbacks for unconfigured servers/storages
            if (getServerCategory(dev) === 'AI') {
                return `AI 加速伺服器 (${dev.size || 5}U)`;
            } else if (type.startsWith('Storage')) {
                return `高容量儲存伺服器 (${dev.size || 2}U)`;
            }
            return `通用運算伺服器 (${dev.size || 1}U)`;
        }
    };


    return (
        <div className="hidden print:block print-layout bg-white text-slate-900 p-8 font-sans w-full max-w-[800px] mx-auto relative">
            {/* Print Watermark */}
            <div className="print-watermark hidden print:flex">
                <div className="print-watermark-wrapper">
                    <div className="print-watermark-text">Inventec Confidential</div>
                    <div className="print-watermark-time">{printTimestamp}</div>
                </div>
            </div>

            {/* ── PAGE 1: Cover Header + Summary + First Rack ── */}

            {/* Full Report Header (Page 1 only) */}
            <div className="border-b-4 border-[#D71422] pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                        RACK<span className="text-[#D71422]">PLANNER</span> PRO
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1">機櫃拓撲與規格設計報告書 (Rack Architecture & Spec Report)</p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                    <p>報告產生日期: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Project Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 block mb-1">空間佔用</span>
                    <span className="text-xl font-extrabold text-slate-800">{totalSpace} U</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 block mb-1">預估功耗</span>
                    <span className="text-xl font-extrabold text-slate-800">{totalPower.toLocaleString()} W</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 block mb-1">估計報價</span>
                    <span className="text-xl font-extrabold text-[#D71422]">${totalPrice.toLocaleString()} USD</span>
                </div>
            </div>

            {/* Section 1 heading + first rack on page 1 */}
            <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                機櫃配置示意圖 (Rack Configurations)
            </h2>

            {racks.length > 0 && (() => {
                const rack0 = racks[0];
                const shot0 = rackScreenshots[rack0.id];
                return (
                    <div className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm w-full" style={{ pageBreakInside: 'avoid' }}>
                        <div className="text-xs font-bold text-slate-800 font-mono mb-2">{rack0.name}</div>
                        {shot0
                            ? <img src={shot0} alt={rack0.name} className="max-h-[480px] w-auto rounded border border-slate-700 object-contain shadow-md" />
                            : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取機櫃圖...</div>
                        }
                    </div>
                );
            })()}

            {/* ── SUBSEQUENT RACK PAGES: mini-header + 2 racks per page ── */}
            {(() => {
                const remainingRacks = racks.slice(1);
                if (remainingRacks.length === 0) return null;

                // Group remaining racks in pairs
                const pages = [];
                for (let i = 0; i < remainingRacks.length; i += 2) {
                    pages.push(remainingRacks.slice(i, i + 2));
                }

                return pages.map((pair, pageIdx) => (
                    <div key={pageIdx} style={{ pageBreakBefore: 'always' }}>
                        {/* Mini header — no date */}
                        <div className="border-b-2 border-[#D71422] pb-2 mb-4 flex items-center justify-between">
                            <div>
                                <span className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                                    RACK<span className="text-[#D71422]">PLANNER</span> PRO
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 ml-3">機櫃拓撲與規格設計報告書</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">機櫃配置示意圖 (Rack Configurations)</span>
                        </div>

                        <div className="flex flex-col gap-6">
                            {pair.map(rack => {
                                const shot = rackScreenshots[rack.id];
                                return (
                                    <div key={rack.id} className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm w-full" style={{ pageBreakInside: 'avoid' }}>
                                        <div className="text-xs font-bold text-slate-800 font-mono mb-2">{rack.name}</div>
                                        {shot
                                            ? <img src={shot} alt={rack.name} className="max-h-[390px] w-auto rounded border border-slate-700 object-contain shadow-md" />
                                            : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取機櫃圖...</div>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ));
            })()}

            {/* ── SECTION 2: Network Topology ── */}
            <div style={{ pageBreakBefore: 'always' }}>
                {/* Mini header */}
                <div className="border-b-2 border-[#D71422] pb-2 mb-4 flex items-center justify-between">
                    <div>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                            RACK<span className="text-[#D71422]">PLANNER</span> PRO
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-3">機櫃拓撲與規格設計報告書</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">網路拓撲示意圖 (Network Topology)</span>
                </div>
                <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                    網路拓撲示意圖 (Network Topology)
                </h2>
                <div className="flex flex-col items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 shadow-sm max-w-full">
                    {topoScreenshot
                        ? <img src={topoScreenshot} alt="Network Topology" className="max-w-full h-auto rounded border border-slate-700 shadow-md" />
                        : <div className="text-slate-400 text-xs py-10 font-medium">正在擷取網路拓撲圖...</div>
                    }
                </div>
            </div>

            {/* ── SECTION 3: BOM Table ── */}
            <div className="mb-10" style={{ pageBreakBefore: 'always' }}>
                {/* Mini header */}
                <div className="border-b-2 border-[#D71422] pb-2 mb-4 flex items-center justify-between">
                    <div>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                            RACK<span className="text-[#D71422]">PLANNER</span> PRO
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-3">機櫃拓撲與規格設計報告書</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">設備清單與規格 (BOM)</span>
                </div>
                <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                    設備清單與規格 (BOM Spec Specifications)
                </h2>
                <table className="w-full border-collapse text-[10px] text-left">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                            <th className="p-2 border border-slate-200">機櫃</th>
                            <th className="p-2 border border-slate-200">位置</th>
                            <th className="p-2 border border-slate-200">設備名稱</th>
                            <th className="p-2 border border-slate-200">類型</th>
                            <th className="p-2 border border-slate-200 text-right">功耗(W)</th>
                            <th className="p-2 border border-slate-200 text-right">估價(USD)</th>
                            <th className="p-2 border border-slate-200">硬體規格摘要</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedDevices.map((dev, idx) => {
                            const rackName = racks.find(r => r.id === dev.rackId)?.name || '未知';
                            const position = dev.type === 'SideCDU' ? 'SideCar' : `U${dev.startU}-U${dev.startU + dev.size - 1}`;

                            return (
                                <tr key={dev.id} className={`${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200`}>
                                    <td className="p-2 border border-slate-200 font-mono font-bold">{rackName}</td>
                                    <td className="p-2 border border-slate-200 font-mono text-slate-600">{position}</td>
                                    <td className="p-2 border border-slate-200 font-bold text-slate-800">{dev.customName}</td>
                                    <td className="p-2 border border-slate-200 text-slate-500">{dev.type}</td>
                                    <td className="p-2 border border-slate-200 text-right font-mono">{dev.power?.toLocaleString() || 0}</td>
                                    <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">${dev.price?.toLocaleString() || 0}</td>
                                    <td className="p-2 border border-slate-200 text-slate-500 font-sans text-[9.5px] leading-relaxed max-w-[320px]">{getDeviceSpecsSummary(dev)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── SECTION 4: Connection Cables ── */}
            <div style={{ pageBreakBefore: 'always' }}>
                {/* Mini header */}
                <div className="border-b-2 border-[#D71422] pb-2 mb-4 flex items-center justify-between">
                    <div>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                            RACK<span className="text-[#D71422]">PLANNER</span> PRO
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-3">機櫃拓撲與規格設計報告書</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">線路對接規格表 (Connection Specifications)</span>
                </div>
                <h2 className="text-md font-bold border-b border-slate-300 pb-1.5 mb-4 text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 bg-[#D71422] rounded-full mr-2"></span>
                    線路對接規格表 (Connection Specifications)
                </h2>
                <table className="w-full border-collapse text-[10px] text-left">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                            <th className="p-2 border border-slate-200">來源設備</th>
                            <th className="p-2 border border-slate-200">來源端口</th>
                            <th className="p-2 border border-slate-200">目的設備</th>
                            <th className="p-2 border border-slate-200">目的端口</th>
                            <th className="p-2 border border-slate-200">所屬網路</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            let rows = [];
                            devices.forEach(dev => {
                                if (dev.connections) {
                                    Object.entries(dev.connections).forEach(([localKey, targetKey]) => {
                                        if (!targetKey) return;
                                        const firstDashIdx = targetKey.indexOf('-');
                                        if (firstDashIdx === -1) return;
                                        const targetDevId = targetKey.substring(0, firstDashIdx);
                                        const targetPortKey = targetKey.substring(firstDashIdx + 1);
                                        const targetDev = devices.find(d => d.id === targetDevId);
                                        if (targetDev) {
                                            const isSwitch = (d) => (d.type || '').startsWith('Switch') || d.type === 'Router';
                                            let cableRole = 'General';
                                            if (isSwitch(targetDev)) {
                                                cableRole = getFabricGroup(targetDev);
                                            } else if (isSwitch(dev)) {
                                                cableRole = getFabricGroup(dev);
                                            } else {
                                                const srcBase = localKey.replace(/__\d+$/, '');
                                                const tgtBase = targetPortKey.replace(/__\d+$/, '');
                                                const isBmc = srcBase === 'bmc' || tgtBase === 'bmc' || srcBase.startsWith('bmc') || tgtBase.startsWith('bmc');
                                                const isNsPort = srcBase.startsWith('ns_nic_') || tgtBase.startsWith('ns_nic_') || srcBase.startsWith('ocp-') || tgtBase.startsWith('ocp-');
                                                if (isBmc || isNsPort) {
                                                    cableRole = 'North-South';
                                                } else {
                                                    cableRole = 'East-West';
                                                }
                                            }

                                            rows.push({
                                                src: dev.customName,
                                                srcPort: formatRemotePortPrint(localKey),
                                                dst: targetDev.customName,
                                                dstPort: formatRemotePortPrint(targetPortKey),
                                                role: cableRole
                                            });
                                        }
                                    });
                                }
                            });
                            
                            if (rows.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan="5" className="p-4 text-center text-slate-400">當前專案未規劃任何實體連接線路。</td>
                                    </tr>
                                );
                            }

                            return rows.map((row, idx) => (
                                <tr key={idx} className={`${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200`}>
                                    <td className="p-2 border border-slate-200 font-bold text-slate-800">{row.src}</td>
                                    <td className="p-2 border border-slate-200 font-mono text-slate-600">{row.srcPort}</td>
                                    <td className="p-2 border border-slate-200 font-bold text-slate-800">{row.dst}</td>
                                    <td className="p-2 border border-slate-200 font-mono text-slate-600">{row.dstPort}</td>
                                    <td className="p-2 border border-slate-200 text-slate-500">{row.role}</td>
                                </tr>
                            ));
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PrintLayout;
