import { getFabricGroup, getNicCount, getSwitchPortCount } from '../utils/helpers';
import { DEFAULT_RACK_U_COUNT } from '../utils/constants';
import html2canvas from 'html2canvas';

export function useExport(racks, devices, setIsFileMenuOpen, setIsExporting, rackContainerRef, showAlert) {
    const handleSaveData = () => {
        const dataToSave = { racks, devices, timestamp: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `RackPlanner-Backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click(); URL.revokeObjectURL(url); setIsFileMenuOpen(false);
    };

    const handleExportBOM = () => {
        let csv = '\uFEFF';
        csv += "機櫃名稱,位置,設備名稱,設備類型,功耗(W),解熱能力(W),報價(USD),CPU (型號*數量),DIMM (型號*數量),NS-NIC-1 (數量),NS-NIC-2 (數量),GPU (型號*數量),M.2 (型號*數量),HDD (型號*數量),54V PSU (型號*數量),12V PSU (型號*數量),Other (型號*數量)\n";

        const sortedDevices = [...devices].sort((a, b) => {
            if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
            return b.startU - a.startU;
        });

        sortedDevices.forEach(dev => {
            const rackName = racks.find(r => r.id === dev.rackId)?.name || '未知';
            const position = dev.type === 'SideCDU' ? 'SideCar' : `U${dev.startU}-U${dev.startU + dev.size - 1}`;
            const hw = dev.hardwareSpecs || {};
            const formatHw = (spec) => (spec && (spec.model || spec.qty)) ? `${spec.model || ''} *${spec.qty || 1}` : '';

            const rowData = [
                rackName, position, dev.customName || '', dev.type || '', dev.power || 0, dev.coolingCapacity || 0, dev.price || 0,
                formatHw(hw.cpu), formatHw(hw.dimm), getNicCount(dev, 'ns_nic_1'), getNicCount(dev, 'ns_nic_2'), formatHw(hw.gpu), formatHw(hw.m2),
                formatHw(hw.hdd), formatHw(hw.psu54v), formatHw(hw.psu12v), formatHw(hw.other)
            ];
            csv += rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
        });

        csv += "\n\n網路線材與光模組統計 (Cables & Transceivers)\n類型,總數量\n";
        const bomCounts = { '1G NIC cable': 0, '10G/100G cable': 0, '400G cable': 0, '800G cable': 0, 'QSFP56 transceiver': 0, '2x400G Transceiver': 0, 'CX8 Ethernet: MMA4Z00-NS-FLT Transceiver (NIC端)': 0, 'CX8 Ethernet: MMA4Z00-NS Transceiver (SW端)': 0, 'CX8 Ethernet: MFP7E10-Nxxx Cable': 0, 'CX8 InfiniBand: MCA7K10 一體化 Cable (1.6T to 2x800G)': 0 };

        devices.forEach(dev => {
            if (dev.connections) {
                Object.entries(dev.connections).forEach(([portKey, targetKey]) => {
                    if (!targetKey) return;
                    const targetDeviceId = targetKey.split('-port-')[0];
                    const targetDevice = devices.find(d => d.id === targetDeviceId);
                    if (targetDevice) {
                        if (dev.type === 'Server5U' && portKey.startsWith('cx8-')) {
                            const cx8NetworkType = dev.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';
                            if (cx8NetworkType === 'Ethernet') {
                                bomCounts['CX8 Ethernet: MMA4Z00-NS-FLT Transceiver (NIC端)'] += 1;
                                bomCounts['CX8 Ethernet: MMA4Z00-NS Transceiver (SW端)'] += 1;
                                bomCounts['CX8 Ethernet: MFP7E10-Nxxx Cable'] += 2;
                            } else if (cx8NetworkType === 'InfiniBand') {
                                bomCounts['CX8 InfiniBand: MCA7K10 一體化 Cable (1.6T to 2x800G)'] += 0.5;
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
                    if (targetKey) {
                        const firstDashIdx = targetKey.indexOf('-');
                        if (firstDashIdx !== -1) {
                            const targetDevId = targetKey.substring(0, firstDashIdx);
                            const targetPortKey = targetKey.substring(firstDashIdx + 1);
                            linkMap[`${d.id}-${localKey}`] = { devId: targetDevId, portKey: targetPortKey };
                            linkMap[targetKey] = { devId: d.id, portKey: localKey };
                        }
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
                        let formattedRemotePort = remoteInfo.portKey;
                        if (formattedRemotePort.startsWith('cx8-')) formattedRemotePort = formattedRemotePort.replace('cx8-', 'CX8 P');
                        else if (formattedRemotePort.startsWith('ns_nic_1-')) formattedRemotePort = formattedRemotePort.replace('ns_nic_1-', 'NS-NIC-1 P');
                        else if (formattedRemotePort.startsWith('ns_nic_2-')) formattedRemotePort = formattedRemotePort.replace('ns_nic_2-', 'NS-NIC-2 P');
                        else if (formattedRemotePort.startsWith('port-')) formattedRemotePort = formattedRemotePort.replace('port-', 'Port ');
                        else if (formattedRemotePort === 'bmc') formattedRemotePort = 'BMC';

                        let transceiverNic = '-'; let transceiverSw = '-'; let cableModel = '-'; let cableCount = '-';
                        if (remoteDev.type === 'Server5U' && remoteInfo.portKey.startsWith('cx8-')) {
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
                    const formattedRemotePort = remoteInfo.portKey === 'bmc' ? 'BMC' : remoteInfo.portKey.replace('port-', 'Port ');
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
        if (!rackContainerRef.current) return;
        setIsExporting(true);
        try {
            const element = rackContainerRef.current;
            const originalStyle = element.style.cssText; 
            const originalTransform = element.style.transform;
            
            element.style.transform = 'none'; 
            element.style.backgroundColor = '#020617';

            const canvas = await html2canvas(element, { 
                backgroundColor: '#020617', 
                scale: 1, 
                logging: false, 
                useCORS: true 
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
            ctx.fillText(`Inventec Confidential ${timestamp}`, 0, 0);
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

    return { handleSaveData, handleExportBOM, handleExportCableRouting, handleExportImage };
}
