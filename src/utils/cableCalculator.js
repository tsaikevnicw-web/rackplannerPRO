import { getFabricGroup, getServerCategory, formatRemotePort, parseTargetConnection } from './helpers';
import { DEFAULT_RACK_U_COUNT } from './constants';

// 標準商業採購線長級距 (單位: 公尺 m)
export const COMMERCIAL_CABLE_LENGTH_BINS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 7.0, 10.0, 15.0, 20.0, 30.0];

/**
 * 將預估實際物理走線長度進位至最接近的商業標準採購線長
 * @param {number} rawMeters 實際計算物理距離 (m)
 * @returns {number} 標準採購線長 (m)
 */
export const roundToCommercialLength = (rawMeters) => {
    if (!rawMeters || rawMeters <= 0) return 0.5;
    for (const bin of COMMERCIAL_CABLE_LENGTH_BINS) {
        if (rawMeters <= bin) return bin;
    }
    return Math.ceil(rawMeters / 5) * 5;
};

/**
 * 判斷設備端口的出線側 (left / right)
 */
export const getDevicePortSide = (device, portKey) => {
    if (!device || !portKey) return 'right';
    const baseKey = portKey.replace(/__\d+$/, '');
    const anchorSides = device.anchorCableSides || {};

    if (baseKey.startsWith('cx8-') || baseKey === 'cx8p') return anchorSides.ew_nic || 'right';
    if (baseKey.startsWith('pcie_slot_') || baseKey.startsWith('ns_nic_')) return anchorSides[baseKey] || anchorSides.pcie_slot || 'right';
    if (baseKey.startsWith('super_nic_mgt')) return anchorSides.s_nic_m || 'right';
    if (baseKey.startsWith('bmc')) return anchorSides.bmc || 'right';
    if (baseKey.startsWith('custom_net')) return device.hardwareSpecs?.customNetwork?.position || anchorSides.customNetwork || 'right';

    if (device.portCableSides && device.portCableSides[portKey]) {
        return device.portCableSides[portKey];
    }
    return device.cableSide || 'right';
};

/**
 * 計算兩台設備端口之間的物理走線距離 (m) 與標準採購線長 (m)
 * 符合業界 L11 (Intra-Rack 櫃內理線槽) 與 L12 (Inter-Rack 上走線架 Overhead Tray) 曼哈頓距離模型
 */
export const calculatePhysicalCableDistance = (srcDev, srcPortKey, dstDev, dstPortKey, racks = []) => {
    const srcRackIdx = racks.findIndex(r => r.id === srcDev?.rackId);
    const dstRackIdx = racks.findIndex(r => r.id === dstDev?.rackId);
    const srcRack = srcRackIdx >= 0 ? racks[srcRackIdx] : null;
    const dstRack = dstRackIdx >= 0 ? racks[dstRackIdx] : null;

    // 判斷機櫃高度單位：ORv3 為 1OU = 48mm (0.048m)，標準 EIA 19" 為 1U = 44.45mm (0.04445m)
    const isOrv3 = srcRack?.type === 'ORv3' || dstRack?.type === 'ORv3';
    const uHeightMeters = isOrv3 ? 0.048 : 0.04445;

    const srcCenterU = srcDev?.type === 'SideCDU' ? 20 : ((srcDev?.startU || 1) + ((srcDev?.size || 1) / 2));
    const dstCenterU = dstDev?.type === 'SideCDU' ? 20 : ((dstDev?.startU || 1) + ((dstDev?.size || 1) / 2));

    const isSameRack = srcDev?.rackId && srcDev?.rackId === dstDev?.rackId;

    if (isSameRack) {
        // L11 櫃內走線 (Intra-Rack):
        // 垂直距離 + 兩端進垂直理線槽水平距離 (0.25m * 2) + 兩端彎曲半徑與維護餘長 Service Loop (0.25m)
        const verticalDist = Math.abs(srcCenterU - dstCenterU) * uHeightMeters;
        const sideA = getDevicePortSide(srcDev, srcPortKey);
        const sideB = getDevicePortSide(dstDev, dstPortKey);
        // 若兩端出線方向不同 (一左一右)，需額外加上跨機櫃寬度橫向走線距離 (約 0.55m)
        const crossChannelDist = sideA !== sideB ? 0.55 : 0;
        const rawLength = Number((verticalDist + 0.50 + crossChannelDist + 0.25).toFixed(2));
        const standardLength = roundToCommercialLength(rawLength);

        return {
            scope: 'L11 (櫃內 Intra-Rack)',
            isIntraRack: true,
            rawLength,
            standardLength
        };
    } else {
        // L12 跨櫃走線 (Inter-Rack via Overhead Cable Tray):
        // 1. 來源設備上升至機櫃頂部上走線架高度
        const srcRackTotalU = srcRack?.uCount || DEFAULT_RACK_U_COUNT;
        const dstRackTotalU = dstRack?.uCount || DEFAULT_RACK_U_COUNT;
        const ascendDist = Math.max(0.2, (srcRackTotalU - srcCenterU + 1) * uHeightMeters) + 0.35; // 0.35m 機櫃頂至線槽高度
        const descendDist = Math.max(0.2, (dstRackTotalU - dstCenterU + 1) * uHeightMeters) + 0.35;

        // 2. 跨機櫃水平距離 (標準機櫃寬度 0.6m，若有 2D 座標或 slotIndex 則優先採用)
        let rackSpanCount = Math.abs((srcRackIdx >= 0 ? srcRackIdx : 0) - (dstRackIdx >= 0 ? dstRackIdx : 1));
        if (rackSpanCount === 0) rackSpanCount = 1;

        let horizontalDist = rackSpanCount * 0.65; // 含機櫃間隙與併櫃寬度 650mm
        if (srcRack && dstRack && srcRack.containerId && srcRack.containerId === dstRack.containerId) {
            if (srcRack.posX !== undefined && dstRack.posX !== undefined) {
                // 2D 畫布像素轉換為實際公尺 (約 85px = 0.6m)
                const dx = Math.abs(srcRack.posX - dstRack.posX) / 85 * 0.6;
                const dy = Math.abs((srcRack.posY || 0) - (dstRack.posY || 0)) / 85 * 0.6;
                horizontalDist = Math.max(0.65, dx + dy);
            } else if (srcRack.slotIndex !== undefined && dstRack.slotIndex !== undefined && srcRack.slotIndex !== null && dstRack.slotIndex !== null) {
                horizontalDist = Math.max(1, Math.abs(srcRack.slotIndex - dstRack.slotIndex)) * 0.65;
            }
        } else if (srcRack && dstRack && srcRack.containerId !== dstRack.containerId) {
            // 跨貨櫃走線額外增加 5m 穿管距離
            horizontalDist += 5.0;
        }

        // 3. 兩端機櫃內整線餘長 Slack (0.6m)
        const rawLength = Number((ascendDist + horizontalDist + descendDist + 0.60).toFixed(2));
        const standardLength = roundToCommercialLength(rawLength);

        return {
            scope: 'L12 (跨櫃 Inter-Rack)',
            isIntraRack: false,
            rawLength,
            standardLength
        };
    }
};

/**
 * 根據兩端設備、端口與計算出的標準線長，自動選型業界標準線材介質 (DAC / AEC / AOC / Fiber / Cat6A / QDC) 與光模組
 */
export const determineCableAndTransceivers = (srcDev, srcPortKey, dstDev, dstPortKey, standardLength, designType = 'general') => {
    const srcBase = (srcPortKey || '').replace(/__\d+$/, '');
    const dstBase = (dstPortKey || '').replace(/__\d+$/, '');

    // 1. 水冷管線 (DLC Hose)
    const isWater = ['water_cold', 'water_hot', 'host_water_cold', 'host_water_hot'].includes(srcBase) ||
                    ['water_cold', 'water_hot', 'host_water_cold', 'host_water_hot'].includes(dstBase);
    if (isWater) {
        const isCold = srcBase.includes('cold') || dstBase.includes('cold');
        return {
            category: 'DLC',
            fabricCode: 'DLC',
            fabricLabel: 'Liquid Cooling (液冷迴路)',
            mediaType: 'EPDM QDC Hose',
            cableModel: isCold ? 'DLC-HOSE-SUPPLY-BLU' : 'DLC-HOSE-RETURN-RED',
            bomCategoryName: `液冷快拆軟管 (${isCold ? '冷水供給藍管' : '熱水回流紅管'})`,
            transceiverSrc: 'QDC Blind-Mate',
            transceiverDst: 'QDC Blind-Mate',
            cableQty: 1
        };
    }

    // 2. OOB / BMC / 1G 管理網路
    const isBmcPort = srcBase === 'bmc' || srcBase.startsWith('bmc') || dstBase === 'bmc' || dstBase.startsWith('bmc');
    const types = [srcDev?.type, dstDev?.type].filter(Boolean);
    if (isBmcPort || types.includes('Switch1G')) {
        return {
            category: 'OOB',
            fabricCode: 'OOB',
            fabricLabel: 'OOB Management (帶外管理網)',
            mediaType: 'Cat6A RJ45 UTP',
            cableModel: `CAT6A-UTP-${standardLength}M`,
            bomCategoryName: '1G Cat6A RJ45 網路線',
            transceiverSrc: 'RJ45 1GBASE-T',
            transceiverDst: 'RJ45 1GBASE-T',
            cableQty: 1
        };
    }

    // 判斷哪一端是 Switch、哪一端是 Server/Endpoint
    const isSrcSwitch = (srcDev?.type || '').startsWith('Switch') || srcDev?.type === 'Router';
    const swDev = isSrcSwitch ? srcDev : dstDev;
    const epDev = isSrcSwitch ? dstDev : srcDev;
    const epPortBase = isSrcSwitch ? dstBase : srcBase;

    const fabricGroup = getFabricGroup(swDev || srcDev, designType);
    const fabricCode = fabricGroup === 'North-South' ? 'NS' : 'EW';

    // 3. AI Server CX-8 / 800G 特規光纖與銅纜判斷
    if (epDev && getServerCategory(epDev) === 'AI' && epPortBase.startsWith('cx8-')) {
        const cx8NetworkType = epDev.hardwareSpecs?.cx8NetworkType?.type || 'Ethernet';
        if (cx8NetworkType === 'InfiniBand') {
            if (standardLength <= 2.0) {
                return {
                    category: '800G-IB-DAC',
                    fabricCode: 'EW',
                    fabricLabel: 'East-West (AI IB Fabric)',
                    mediaType: 'DAC Y-Cable (Passive Copper)',
                    cableModel: `MCA7K10-N${String(standardLength).replace('.', 'P')}M`,
                    bomCategoryName: 'EW NIC InfiniBand: MCA7K10 一體化 DAC Cable (1.6T to 2x800G)',
                    transceiverSrc: '一體化 (2x 800G OSFP)',
                    transceiverDst: '一體化 (1.6T Twin-Port OSFP)',
                    cableQty: 0.5
                };
            } else {
                return {
                    category: '800G-IB-OPT',
                    fabricCode: 'EW',
                    fabricLabel: 'East-West (AI IB Fabric)',
                    mediaType: 'MPO-12 APC Single-Mode Fiber',
                    cableModel: `MFP7E10-N${String(standardLength).padStart(3, '0')}`,
                    bomCategoryName: 'EW NIC InfiniBand: MPO-12 Fiber + Twin-Port OSFP Transceiver',
                    transceiverSrc: 'MMA4Z00-NS-FLT (800G OSFP)',
                    transceiverDst: 'MMA4Z00-NS (2x400G/800G OSFP)',
                    cableQty: 1
                };
            }
        } else {
            // AI Ethernet (Spectrum-X / RoCEv2)
            return {
                category: '800G-ETH-OPT',
                fabricCode: 'EW',
                fabricLabel: 'East-West (AI RoCE Fabric)',
                mediaType: 'MPO-12 APC Fiber (Optical)',
                cableModel: `MFP7E10-N${String(standardLength).padStart(3, '0')}`,
                bomCategoryName: 'EW NIC Ethernet: MFP7E10-Nxxx Cable',
                transceiverSrc: 'MMA4Z00-NS-FLT',
                transceiverDst: 'MMA4Z00-NS',
                cableQty: 2
            };
        }
    }

    // 4. 800G Switch 對接 (Spine-Leaf ISL 或一般 800G)
    if (types.includes('Switch800G')) {
        if (standardLength <= 2.0) {
            return {
                category: '800G-DAC',
                fabricCode,
                fabricLabel: `${fabricGroup} (800G Fabric)`,
                mediaType: '800G OSFP DAC (Passive Copper)',
                cableModel: `DAC-800G-OSFP-${standardLength}M`,
                bomCategoryName: '800G OSFP DAC 銅纜 (<=2m)',
                transceiverSrc: 'DAC Direct Attach',
                transceiverDst: 'DAC Direct Attach',
                cableQty: 1
            };
        } else {
            return {
                category: '800G-OPT',
                fabricCode,
                fabricLabel: `${fabricGroup} (800G Fabric)`,
                mediaType: '800G MPO-12 Optical Fiber',
                cableModel: `MPO12-800G-DR8-${standardLength}M`,
                bomCategoryName: '800G 光纖線材 (含 2x800G OSFP DR8 光模組)',
                transceiverSrc: '800G OSFP DR8',
                transceiverDst: '800G OSFP DR8',
                cableQty: 1
            };
        }
    }

    // 5. 400G Switch 對接
    if (types.includes('Switch400G') || types.includes('Switch400G1U')) {
        if (standardLength <= 2.0) {
            return {
                category: '400G-DAC',
                fabricCode,
                fabricLabel: `${fabricGroup} (400G Fabric)`,
                mediaType: '400G QSFP112 DAC (Passive Copper)',
                cableModel: `DAC-400G-Q112-${standardLength}M`,
                bomCategoryName: '400G QSFP112 DAC 銅纜 (<=2m)',
                transceiverSrc: 'DAC Direct Attach',
                transceiverDst: 'DAC Direct Attach',
                cableQty: 1
            };
        } else if (standardLength <= 3.0) {
            return {
                category: '400G-AEC',
                fabricCode,
                fabricLabel: `${fabricGroup} (400G Fabric)`,
                mediaType: '400G QSFP112 AEC (Active Copper)',
                cableModel: `AEC-400G-Q112-${standardLength}M`,
                bomCategoryName: '400G QSFP112 AEC 主動式銅纜 (2.5m~3m)',
                transceiverSrc: 'AEC Active Plug',
                transceiverDst: 'AEC Active Plug',
                cableQty: 1
            };
        } else {
            return {
                category: '400G-OPT',
                fabricCode,
                fabricLabel: `${fabricGroup} (400G Fabric)`,
                mediaType: '400G AOC / MPO-12 Fiber',
                cableModel: `FIBER-400G-SR4-${standardLength}M`,
                bomCategoryName: '400G 光纖線材 (含 QSFP112 SR4/DR4 光模組)',
                transceiverSrc: '400G QSFP112 SR4',
                transceiverDst: '400G QSFP112 SR4',
                cableQty: 1
            };
        }
    }

    // 6. 10G / 25G / 100G Switch 或 Router
    if (types.includes('Switch10G') || types.includes('Router')) {
        if (standardLength <= 3.0) {
            return {
                category: '25G-100G-DAC',
                fabricCode,
                fabricLabel: `${fabricGroup} (10G/25G/100G)`,
                mediaType: '25G/100G SFP28/QSFP28 DAC',
                cableModel: `DAC-100G-Q28-${standardLength}M`,
                bomCategoryName: '10G/25G/100G DAC 銅纜 (<=3m)',
                transceiverSrc: 'DAC Direct Attach',
                transceiverDst: 'DAC Direct Attach',
                cableQty: 1
            };
        } else {
            return {
                category: '25G-100G-AOC',
                fabricCode,
                fabricLabel: `${fabricGroup} (10G/25G/100G)`,
                mediaType: '25G/100G AOC / LC Duplex OM4',
                cableModel: `AOC-100G-Q28-${standardLength}M`,
                bomCategoryName: '10G/25G/100G AOC 主動式光纖 (>3m)',
                transceiverSrc: '100G QSFP28 SR4',
                transceiverDst: '100G QSFP28 SR4',
                cableQty: 1
            };
        }
    }

    // Fallback
    return {
        category: 'GEN-CBL',
        fabricCode: 'GEN',
        fabricLabel: fabricGroup || 'General',
        mediaType: standardLength <= 2.5 ? 'DAC (Copper)' : 'AOC (Optical)',
        cableModel: `CBL-STD-${standardLength}M`,
        bomCategoryName: '標準高速互連纜線',
        transceiverSrc: '-',
        transceiverDst: '-',
        cableQty: 1
    };
};

/**
 * 格式化機櫃短代碼 (例如 "Rack 1" -> "R01")
 */
const formatRackShortCode = (rack, rackIndex) => {
    if (!rack) return `R${String(rackIndex + 1).padStart(2, '0')}`;
    const numMatch = (rack.name || '').match(/(\d+)/);
    if (numMatch) {
        return `R${String(numMatch[1]).padStart(2, '0')}`;
    }
    return `R${String(rackIndex + 1).padStart(2, '0')}`;
};

/**
 * 產生全系統點對點拉線施工表 (Point-to-Point Cut-Sheet) 與分長度線材 BOM 彙總
 * 自動去重雙向連線，並生成產線標準 Brady Label 線標 (Cable ID)
 */
export const generateProjectCableCutSheet = (devices = [], racks = [], projectInfo = {}) => {
    const cutSheetRows = [];
    const seenPairs = new Set();
    let seqCounter = 1;

    // 依機櫃與 U 位排序設備，使產出的 Cable ID 順序整齊一致
    const sortedDevs = [...devices].sort((a, b) => {
        const rIdxA = racks.findIndex(r => r.id === a.rackId);
        const rIdxB = racks.findIndex(r => r.id === b.rackId);
        if (rIdxA !== rIdxB) return rIdxA - rIdxB;
        return (b.startU || 0) - (a.startU || 0);
    });

    sortedDevs.forEach(dev => {
        if (!dev.connections) return;

        Object.entries(dev.connections).forEach(([localKey, targetKey]) => {
            if (!targetKey) return;
            const { targetDevId, targetPortKey } = parseTargetConnection(targetKey, devices);
            const targetDev = devices.find(d => d.id === targetDevId);
            if (!targetDev) return;

            const endpointA = `${dev.id}:${localKey.replace(/__\d+$/, '')}`;
            const endpointB = `${targetDev.id}:${targetPortKey.replace(/__\d+$/, '')}`;
            const dedupKey = [endpointA, endpointB].sort().join('<->') + `--${localKey}`;
            if (seenPairs.has(dedupKey)) return;
            seenPairs.add(dedupKey);

            // 若其中一端為 Switch/Router，習慣將 Switch 放於或是固定 Server -> Switch 順序，這裡統一將 Switch 端作為 Dst 或保持 Src(Initiator) -> Dst(Switch)
            const isDevSwitch = (dev.type || '').startsWith('Switch') || dev.type === 'Router';
            const isTargetSwitch = (targetDev.type || '').startsWith('Switch') || targetDev.type === 'Router';

            let srcDev = dev;
            let srcPortKey = localKey;
            let dstDev = targetDev;
            let dstPortKey = targetPortKey;

            // 若是由 Switch 指向非 Switch，翻轉使來源統一為 Server/Device (下層)、目的為 Switch/Spine (上層)，符合產線拉線習慣
            if (isDevSwitch && !isTargetSwitch) {
                srcDev = targetDev;
                srcPortKey = targetPortKey;
                dstDev = dev;
                dstPortKey = localKey;
            }

            const srcRackIdx = racks.findIndex(r => r.id === srcDev.rackId);
            const dstRackIdx = racks.findIndex(r => r.id === dstDev.rackId);
            const srcRack = srcRackIdx >= 0 ? racks[srcRackIdx] : null;
            const dstRack = dstRackIdx >= 0 ? racks[dstRackIdx] : null;

            const srcRackCode = formatRackShortCode(srcRack, srcRackIdx >= 0 ? srcRackIdx : 0);
            const dstRackCode = formatRackShortCode(dstRack, dstRackIdx >= 0 ? dstRackIdx : 0);

            const srcU = srcDev.type === 'SideCDU' ? 'SC' : String(srcDev.startU || 1).padStart(2, '0');
            const dstU = dstDev.type === 'SideCDU' ? 'SC' : String(dstDev.startU || 1).padStart(2, '0');

            const distInfo = calculatePhysicalCableDistance(srcDev, srcPortKey, dstDev, dstPortKey, racks);
            const specInfo = determineCableAndTransceivers(srcDev, srcPortKey, dstDev, dstPortKey, distInfo.standardLength, projectInfo?.designType);

            const seqStr = String(seqCounter++).padStart(3, '0');
            const lenCode = String(distInfo.standardLength).replace('.', 'P');
            const cableId = `CBL-${specInfo.fabricCode}-${srcRackCode}U${srcU}-${dstRackCode}U${dstU}-${seqStr}-${lenCode}M`;

            cutSheetRows.push({
                seq: seqCounter - 1,
                cableId,
                scope: distInfo.scope,
                isIntraRack: distInfo.isIntraRack,
                fabricCode: specInfo.fabricCode,
                fabricLabel: specInfo.fabricLabel,
                srcRackName: srcRack?.name || '未知機櫃',
                srcRackCode,
                srcU: srcDev.type === 'SideCDU' ? 'SideCar' : `U${srcDev.startU}`,
                srcDeviceId: srcDev.id,
                srcDeviceName: srcDev.customName || srcDev.type,
                srcDeviceType: srcDev.type,
                srcPortRaw: srcPortKey,
                srcPortFormatted: formatRemotePort(srcPortKey.replace(/__\d+$/, '')),
                dstRackName: dstRack?.name || '未知機櫃',
                dstRackCode,
                dstU: dstDev.type === 'SideCDU' ? 'SideCar' : `U${dstDev.startU}`,
                dstDeviceId: dstDev.id,
                dstDeviceName: dstDev.customName || dstDev.type,
                dstDeviceType: dstDev.type,
                dstPortRaw: dstPortKey,
                dstPortFormatted: formatRemotePort(dstPortKey.replace(/__\d+$/, '')),
                rawLength: distInfo.rawLength,
                standardLength: distInfo.standardLength,
                mediaType: specInfo.mediaType,
                cableModel: specInfo.cableModel,
                bomCategoryName: specInfo.bomCategoryName,
                transceiverSrc: specInfo.transceiverSrc,
                transceiverDst: specInfo.transceiverDst,
                cableQty: specInfo.cableQty
            });
        });
    });

    // 依分長度與型號彙總 BOM (Length-Binned Cable BOM)
    const bomByLengthMap = {};
    const transceiverMap = {};

    cutSheetRows.forEach(row => {
        const key = `${row.bomCategoryName}__${row.cableModel}__${row.mediaType}__${row.standardLength}`;
        if (!bomByLengthMap[key]) {
            bomByLengthMap[key] = {
                bomCategoryName: row.bomCategoryName,
                cableModel: row.cableModel,
                mediaType: row.mediaType,
                standardLength: row.standardLength,
                scopeBreakdown: { l11: 0, l12: 0 },
                totalQty: 0,
                totalMeters: 0
            };
        }
        bomByLengthMap[key].totalQty += row.cableQty;
        bomByLengthMap[key].totalMeters = Number((bomByLengthMap[key].totalMeters + row.standardLength * row.cableQty).toFixed(1));
        if (row.isIntraRack) {
            bomByLengthMap[key].scopeBreakdown.l11 += row.cableQty;
        } else {
            bomByLengthMap[key].scopeBreakdown.l12 += row.cableQty;
        }

        // 統計獨立光模組 (排除一體化 DAC/AEC/RJ45/QDC)
        const isOpticalTransceiver = (tr) => tr && tr !== '-' && !tr.includes('DAC') && !tr.includes('AEC') && !tr.includes('RJ45') && !tr.includes('QDC') && !tr.includes('一體化');
        if (isOpticalTransceiver(row.transceiverSrc)) {
            transceiverMap[row.transceiverSrc] = (transceiverMap[row.transceiverSrc] || 0) + 1;
        }
        if (isOpticalTransceiver(row.transceiverDst)) {
            transceiverMap[row.transceiverDst] = (transceiverMap[row.transceiverDst] || 0) + 1;
        }
    });

    const lengthBinnedBom = Object.values(bomByLengthMap).sort((a, b) => {
        if (a.bomCategoryName !== b.bomCategoryName) return a.bomCategoryName.localeCompare(b.bomCategoryName);
        return a.standardLength - b.standardLength;
    });

    const summary = {
        totalConnections: cutSheetRows.length,
        l11Count: cutSheetRows.filter(r => r.isIntraRack).length,
        l12Count: cutSheetRows.filter(r => !r.isIntraRack).length,
        totalMeters: Number(cutSheetRows.reduce((acc, r) => acc + r.standardLength * r.cableQty, 0).toFixed(1)),
        dacCount: cutSheetRows.filter(r => r.mediaType.includes('DAC') || r.mediaType.includes('AEC')).length,
        opticalCount: cutSheetRows.filter(r => r.mediaType.includes('Fiber') || r.mediaType.includes('AOC')).length,
        utpCount: cutSheetRows.filter(r => r.mediaType.includes('RJ45')).length,
        dlcCount: cutSheetRows.filter(r => r.fabricCode === 'DLC').length
    };

    return {
        cutSheetRows,
        lengthBinnedBom,
        transceiverMap,
        summary
    };
};
