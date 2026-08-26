import React, { useMemo } from 'react';
import { useRackPlanner } from '../../context/RackPlannerContext';
import { U_HEIGHT, DEFAULT_RACK_U_COUNT } from '../../utils/constants';
import { LIGHT_THEME_STYLES, LIGHT_INFRA_THEMES } from '../../themes/light/lightConstants';
import { getIconByType, getNicCount, getSwitchPortCount, getSwitchPortLayout, getServerCategory, getServerConfig, getHighDensityNodes, getHighDensitySize, getAIServerSize, getPcieSlotInfo, checkHighGravityWarning, getDeviceWeight } from '../../utils/helpers';
import { useRackInteractions } from '../../hooks/useRackInteractions';
import { Droplets, Zap, LayoutGrid, Settings, ShieldAlert, Eye, Thermometer, Fan, Server, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

const getInfraIcon = (type) => {
    switch (type) {
        case 'CDU':
        case 'Cooling':
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

const RackViewLight = ({ racksToRender }) => {
    const { 
        devices, selectedId, setSelectedId, selectedIds, setSelectedIds, deviceSearchTerm, showCables, showHeatmap, drawing, setDrawing, connectedPortsSet, generateId, handleDisconnectPort,
        projectInfo
    } = useRackPlanner();
    
    const { handleDragStart, handleDrop, handleDragOver } = useRackInteractions();

    const connectedToSelectedSet = useMemo(() => {
        if (!selectedId || (selectedIds && selectedIds.length > 1)) return null;
        const set = new Set();
        devices.forEach(d => {
            if (d.connections) {
                Object.entries(d.connections).forEach(([localKey, targetKey]) => {
                    if (targetKey) {
                        const localFullId = `${d.id}-${localKey}`;
                        const targetDevId = targetKey.includes('-') ? targetKey.substring(0, targetKey.indexOf('-')) : targetKey;
                        if (d.id === selectedId || targetDevId === selectedId) {
                            set.add(localFullId);
                            set.add(targetKey);
                        }
                    }
                });
            }
        });
        return set;
    }, [devices, selectedId, selectedIds]);

    const renderPortAnchor = (dev, portKey, label, hoverClass, sizeClass = "w-2.5 h-2.5 shrink-0", colorOverride = null) => {
        const fullId = `${dev.id}-${portKey}`;
        const isConnected = connectedPortsSet.has(fullId);
        const isSwitchOrRouter = (dev.type || '').startsWith('Switch') || dev.type === 'Router';

        let effectiveConnected = isConnected;
        if (connectedToSelectedSet !== null && isSwitchOrRouter) {
            effectiveConnected = connectedToSelectedSet.has(fullId);
        }

        let connCount = 0;
        if (isConnected) {
            connCount = 1;
            for (let i = 2; i <= 8; i++) {
                if (dev.connections?.[`${portKey}__${i}`] !== undefined) connCount++;
            }
        }

        // Industrial Water Cooling Port Styling
        let waterConnectedColor = null;
        if (portKey === 'water_cold' || portKey === 'host_water_cold') {
            waterConnectedColor = effectiveConnected
                ? 'bg-blue-500 border-blue-600 shadow-2xs'
                : 'bg-blue-100 border-blue-300';
        } else if (portKey === 'water_hot' || portKey === 'host_water_hot') {
            waterConnectedColor = effectiveConnected
                ? 'bg-rose-500 border-rose-600 shadow-2xs'
                : 'bg-rose-100 border-rose-300';
        }
        
        const connectedColorStr = 'bg-emerald-500 border-emerald-600 shadow-2xs'; 
        const defaultBorder = effectiveConnected ? 'border-emerald-600' : 'border-slate-300';
        const borderClass = waterConnectedColor ? '' : defaultBorder;

        const bgClass = waterConnectedColor ? waterConnectedColor : (colorOverride ? colorOverride : (effectiveConnected ? connectedColorStr : 'bg-slate-200 hover:bg-slate-300'));
        const shapeClass = (portKey === 'water_cold' || portKey === 'water_hot') ? 'rounded-full' : 'rounded-[2px]';

        return (
            <div
                key={portKey}
                data-port-id={fullId}
                className={`${shapeClass} ${sizeClass} border ${borderClass} transition-all duration-100 cursor-crosshair shrink-0 relative group z-50 hover:scale-125 ${hoverClass} ${bgClass}`}
                title={label}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isConnected) handleDisconnectPort(fullId);
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.target.getBoundingClientRect();
                    const rackContainer = document.querySelector('.rack-container')?.parentElement?.parentElement;
                    const containerRect = rackContainer ? rackContainer.getBoundingClientRect() : { left: 0, top: 0 };
                    const scrollParent = document.querySelector('.main-canvas');
                    const sLeft = scrollParent ? scrollParent.scrollLeft : 0;
                    const sTop = scrollParent ? scrollParent.scrollTop : 0;

                    const startX = rect.left + rect.width / 2 - containerRect.left + sLeft;
                    const startY = rect.top + rect.height / 2 - containerRect.top + sTop;
                    setDrawing({ sourceId: dev.id, sourcePortKey: portKey, startX, startY, currentX: startX, currentY: startY });
                }}
                onMouseUp={(e) => {
                    e.stopPropagation();
                    if (drawing && drawing.sourceId !== dev.id) {
                        const event = new CustomEvent('rackplanner-connect', { detail: { targetDevId: dev.id, targetPortKey: portKey, drawing }});
                        window.dispatchEvent(event);
                    }
                    setDrawing(null);
                }}
                onMouseEnter={() => setDrawing(prev => prev ? { ...prev, isHoveringTarget: true } : prev)}
                onMouseLeave={() => setDrawing(prev => prev ? { ...prev, isHoveringTarget: false } : prev)}
            >
                {isConnected && !colorOverride && !waterConnectedColor && (
                    connCount > 1
                        ? <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white leading-none font-mono">{connCount}</div>
                        : <div className="absolute inset-0 m-auto w-[50%] h-[50%] bg-white rounded-xs opacity-90"></div>
                )}
            </div>
        );
    };

    return racksToRender.map(rack => {
        const rackMaxU = rack.uCount || DEFAULT_RACK_U_COUNT;
        const isRackSelected = selectedId === rack.id;
        const rackDevices = devices.filter(d => d.rackId === rack.id);
        const totalRackPower = rackDevices.reduce((sum, d) => sum + (d.power || 0), 0);
        const limit = rack.powerLimit || 20000;
        const isPowerOverloaded = totalRackPower > limit;
        const isPowerWarning = totalRackPower >= limit * 0.9 && !isPowerOverloaded;

        if (projectInfo?.isCdcProject && (rack.type === 'CDU' || rack.type === 'Cooling')) {
            const isCDU = rack.type === 'CDU';
            return (
                <div key={rack.id} className="flex items-end gap-2 shrink-0 relative">
                    <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(rack.id); }}
                        className={`w-[420px] rounded-lg border flex flex-col justify-between p-5 shadow-xs relative overflow-hidden cursor-pointer transition-all duration-150 ${
                            isRackSelected 
                                ? 'border-blue-600 ring-1 ring-blue-500/50 bg-white' 
                                : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                        style={{ height: rackMaxU * U_HEIGHT + 48 }}
                    >
                        {/* Status bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${isCDU ? 'bg-cyan-600' : 'bg-emerald-600'}`}></div>

                        <div className="flex justify-between items-center relative z-10">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                                {isCDU ? 'CDU COOLING MODULE' : 'IN-ROW HVAC MODULE'}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                {isCDU ? 'CDU 水冷分配單元' : '列間空調'}
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 my-4 relative z-10 gap-2">
                            <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                                <Droplets className={`w-8 h-8 ${isCDU ? 'text-cyan-600' : 'text-emerald-600'}`} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-slate-900">{rack.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isCDU ? 'Liquid to Air CDU 散熱單元' : 'In-Row 高效列間精密空調'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex justify-between items-center text-xs font-mono relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 uppercase font-sans font-medium">散熱容量 (Capacity)</span>
                                <span className="text-slate-900 font-bold">
                                    {((rack.coolingCapacity || (isCDU ? 150000 : 75000)) / 1000).toFixed(0)} kW
                                </span>
                            </div>
                            <div className="h-5 w-px bg-slate-200"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-slate-400 uppercase font-sans font-medium">設備自重 (Weight)</span>
                                <span className="text-slate-900 font-bold">
                                    {(rack.weight || (isCDU ? 350 : 320)).toLocaleString()} kg
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const infraTheme = projectInfo?.isCdcProject ? LIGHT_INFRA_THEMES[rack.type] : null;
        if (infraTheme) {
            const SelectedIcon = getInfraIcon(rack.type);
            let capacityText = '-';
            if (rack.type === 'UPS') capacityText = `額定容量: ${(rack.powerCapacity/1000).toFixed(0)} kW`;
            else if (rack.type === 'Battery') capacityText = `儲能容量: ${(rack.batteryCapacity/1000).toFixed(0)} kWh`;
            
            return (
                <div key={rack.id} className="flex items-end gap-2 shrink-0 relative">
                    <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(rack.id); }}
                        className={`w-[420px] rounded-lg border flex flex-col justify-between p-5 shadow-xs relative overflow-hidden cursor-pointer transition-all duration-150 ${
                            isRackSelected 
                                ? 'border-blue-600 ring-1 ring-blue-500/50 bg-white' 
                                : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                        style={{ height: rackMaxU * U_HEIGHT + 48 }}
                    >
                        <div className="flex justify-between items-center relative z-10">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                                INFRASTRUCTURE MODULE
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                {rack.type}
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 my-4 relative z-10 gap-2">
                            <div className="p-3.5 rounded-full bg-slate-50 border border-slate-200 shadow-inner">
                                <SelectedIcon className="w-8 h-8 text-slate-700" />
                            </div>
                            <div className="text-center px-4">
                                <h3 className="text-sm font-bold text-slate-900 font-mono">{rack.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {infraTheme.label}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex justify-between items-center text-xs font-mono relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 uppercase font-sans font-medium">模組規格 (Specs)</span>
                                <span className="text-slate-900 font-bold">{capacityText}</span>
                            </div>
                            <div className="h-5 w-px bg-slate-200"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-slate-400 uppercase font-sans font-medium">總重 (Weight)</span>
                                <span className="text-slate-900 font-bold">
                                    {(rack.weight || 0).toLocaleString()} kg
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={rack.id} className="flex items-end gap-2 shrink-0 relative">
                <div data-rack-id={rack.id} className="w-[420px] flex flex-col items-center rack-container relative">
                    
                    {/* Industrial Extruded Aluminum Top Header */}
                    <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(rack.id); }}
                        className={`bg-[#1E293B] w-[420px] h-10 rounded-t border-t border-x border-slate-800 flex justify-between items-center px-3.5 shadow-sm z-10 relative cursor-pointer transition-all duration-150 ${isRackSelected ? 'ring-2 ring-blue-500 brightness-110' : 'hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-2 max-w-[220px]">
                            {/* Power health status LED */}
                            <div 
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                    isPowerOverloaded 
                                        ? 'bg-rose-500 ring-2 ring-rose-400/40' 
                                        : isPowerWarning
                                            ? 'bg-amber-500 ring-2 ring-amber-400/40'
                                            : 'bg-emerald-500'
                                }`}
                                title={isPowerOverloaded 
                                    ? `超載！目前功耗 ${totalRackPower}W 已超過上限 ${limit}W` 
                                    : `電力正常 (${totalRackPower}W / ${limit}W)`
                                }
                            ></div>
                            <div className="text-xs font-mono font-bold text-slate-100 tracking-wider truncate">
                                {rack.name}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.2 rounded border border-slate-700">
                                {rackMaxU}U
                            </span>
                        </div>

                        {/* Power Load Linear Bar */}
                        <div 
                            className="w-32 h-3.5 bg-slate-800 border border-slate-700 rounded-full relative overflow-hidden flex items-center justify-center z-10"
                            title={`負載: ${totalRackPower}W / 上限: ${limit}W (${Math.round((totalRackPower / limit) * 100)}%)`}
                        >
                            <div 
                                className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                                    isPowerOverloaded ? 'bg-rose-500' : isPowerWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, (totalRackPower / limit) * 100))}%` }}
                            ></div>
                            <span className="text-[9px] font-mono font-bold text-slate-100 z-10 select-none tracking-tight">
                                {totalRackPower} / {limit} W
                            </span>
                        </div>
                    </div>

                    {/* 機櫃主體 (Precision CAD Chassis) */}
                    <div 
                        className={`bg-[#F8FAFC] border-x border-slate-300 w-[420px] relative shadow-xs transition-all ${
                            isPowerOverloaded ? 'ring-2 ring-rose-500' : ''
                        }`} 
                        style={{ height: rackMaxU * U_HEIGHT }}
                    >
                        {/* Precision Dark Steel Mounting Rails (機軌與螺絲孔位) */}
                        <div className="absolute left-0 top-0 bottom-0 w-6 bg-[#334155] border-r border-slate-900 flex flex-col justify-around py-1 z-10">
                            {Array.from({ length: rackMaxU * 3 }).map((_, i) => (
                                <div key={i} className="w-1.5 h-1 bg-slate-950 rounded-2xs mx-auto border-t border-slate-600/40"></div>
                            ))}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-6 bg-[#334155] border-l border-slate-900 flex flex-col justify-around py-1 z-10">
                            {Array.from({ length: rackMaxU * 3 }).map((_, i) => (
                                <div key={i} className="w-1.5 h-1 bg-slate-950 rounded-2xs mx-auto border-t border-slate-600/40"></div>
                            ))}
                        </div>

                        {/* U Slot Increments (1U~48U 刻度線與編號) */}
                        {Array.from({ length: rackMaxU }).map((_, idx) => {
                            const uNum = rackMaxU - idx;
                            return (
                                <div 
                                    key={uNum} 
                                    onDragOver={handleDragOver} 
                                    onDrop={(e) => handleDrop(e, uNum, rack.id)} 
                                    className="absolute w-full border-b border-slate-200/80 flex items-center group" 
                                    style={{ height: U_HEIGHT, top: (rackMaxU - uNum) * U_HEIGHT, zIndex: 1 }}
                                >
                                    <div className="absolute -left-5 text-[9px] font-mono text-slate-400 w-4 text-right select-none z-20 font-medium">{uNum}</div>
                                    <div className="absolute -right-5 text-[9px] font-mono text-slate-400 w-4 text-left select-none z-20 font-medium">{uNum}</div>
                                    <div className="hidden group-hover:block absolute left-6 right-6 h-full bg-blue-500/10 border border-blue-400/40 z-0"></div>
                                </div>
                            );
                        })}

                        {/* 設備實體繪製 (Authentic Enterprise Server Bezels) */}
                        {devices.filter(dev => dev.rackId === rack.id && dev.type !== 'SideCDU').map((dev) => {
                            const isSelected = selectedIds.includes(dev.id);
                            const isSearchMatch = deviceSearchTerm && (
                                (dev.customName || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
                                (dev.type || '').toLowerCase().includes(deviceSearchTerm.toLowerCase())
                            );
                            const Icon = getIconByType(dev.type);
                            const nic1Count = getNicCount(dev, 'ns_nic_1');
                            const nic2Count = getNicCount(dev, 'ns_nic_2');
                            const ocpCount = getNicCount(dev, 'ocp');
                            const portCount = getSwitchPortCount(dev);

                            const isHighGravity = checkHighGravityWarning(dev, rack);
                            const devWeight = getDeviceWeight(dev);

                            const devHeight = (dev.size || 1) * U_HEIGHT - 2;
                            const devTop = (rackMaxU - (dev.uPosition + dev.size - 1)) * U_HEIGHT + 1;

                            // Form-factor color bar
                            let typeAccent = 'border-l-blue-600';
                            if (dev.type?.startsWith('Storage')) typeAccent = 'border-l-emerald-600';
                            else if (dev.type?.startsWith('Switch') || dev.type === 'Router') typeAccent = 'border-l-indigo-600';
                            else if (dev.type?.startsWith('Power') || dev.type === 'UPS') typeAccent = 'border-l-amber-600';
                            else if (dev.type?.startsWith('CDU')) typeAccent = 'border-l-cyan-600';

                            return (
                                <div
                                    key={dev.id}
                                    id={`device-${dev.id}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, dev)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (e.ctrlKey || e.metaKey) {
                                            if (selectedIds.includes(dev.id)) {
                                                setSelectedIds(selectedIds.filter(id => id !== dev.id));
                                            } else {
                                                setSelectedIds([...selectedIds, dev.id]);
                                            }
                                        } else {
                                            setSelectedIds([dev.id]);
                                            setSelectedId(dev.id);
                                        }
                                    }}
                                    className={`absolute left-6 right-6 rounded-xs transition-all duration-100 cursor-grab active:cursor-grabbing z-20 flex items-center justify-between px-2 shadow-2xs border border-l-4 ${typeAccent} ${
                                        isSelected 
                                            ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/40 shadow-xs' 
                                            : isSearchMatch
                                                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-400'
                                                : 'bg-white border-slate-300 hover:border-slate-400'
                                    }`}
                                    style={{
                                        height: devHeight,
                                        top: devTop
                                    }}
                                >
                                    {/* Left Status LED & Chassis Label */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {/* Status LED Cluster */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        </div>
                                        <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <div className="truncate flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                            <span className="truncate">{dev.customName || dev.name}</span>
                                            {dev.serverConfig && (
                                                <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                                    {dev.serverConfig}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* High Gravity Overload Badge */}
                                    {isHighGravity && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[9px] font-bold text-rose-700" title="高重心警告：此重型設備放置位置偏高">
                                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                            <span>{devWeight}kg</span>
                                        </div>
                                    )}

                                    {/* Right Connectors & Power Metric */}
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {/* Switch Port Matrix */}
                                        {dev.type?.startsWith('Switch') && portCount > 0 && (
                                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                                                {Array.from({ length: Math.min(portCount, 8) }).map((_, pIdx) => {
                                                    const pKey = `port_${pIdx + 1}`;
                                                    return renderPortAnchor(dev, pKey, `Port ${pIdx + 1}`, 'hover:border-blue-500', 'w-2 h-2');
                                                })}
                                            </div>
                                        )}

                                        {/* Server NIC Clusters */}
                                        {nic1Count > 0 && Array.from({ length: nic1Count }).map((_, i) => (
                                            renderPortAnchor(dev, `nic1_${i+1}`, `NIC-1 Port ${i+1}`, 'hover:border-indigo-500', 'w-2 h-2')
                                        ))}
                                        {nic2Count > 0 && Array.from({ length: nic2Count }).map((_, i) => (
                                            renderPortAnchor(dev, `nic2_${i+1}`, `NIC-2 Port ${i+1}`, 'hover:border-indigo-500', 'w-2 h-2')
                                        ))}

                                        {/* Power draw in Monospace */}
                                        <span className="text-[10px] font-mono text-slate-500 font-medium ml-1">
                                            {dev.power || 0}W
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Machine Floor Base (機櫃支腳底座) */}
                    <div className="w-[420px] h-3 bg-slate-300 rounded-b border-b border-x border-slate-400 flex justify-between px-6 items-center">
                        <div className="w-6 h-1.5 bg-slate-600 rounded-2xs"></div>
                        <div className="w-6 h-1.5 bg-slate-600 rounded-2xs"></div>
                    </div>
                </div>
            </div>
        );
    });
};

export default RackViewLight;
