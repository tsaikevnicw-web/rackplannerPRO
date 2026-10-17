export const MSFT_RACK_SUB_KEYS = [
    { key: 'rackEnclosure', label: 'Rack enclosure', type: 'RackEnclosure' },
    { key: 'busbar', label: 'Busbar', type: 'Busbar' },
    { key: 'sidePanel', label: 'Side Panel', type: 'SidePanel' },
    { key: 'leakManagement', label: 'Leak Management', type: 'LeakManagement' },
    { key: 'cableManagement', label: 'Cable Management', type: 'CableManagement' },
    { key: 'rackNut', label: 'NUT', type: 'RackNut' },
    { key: 'rackScrew', label: 'SCREW', type: 'RackScrew' },
    { key: 'ioCables', label: 'IO Cables', type: 'IoCables' },
    { key: 'cat6Rj45', label: 'CAT-6 RJ45', type: 'Cat6Rj45' },
    { key: 'rackGrounding', label: 'Rack Grounding', type: 'RackGrounding' }
];

export const MSFT_DEVICE_SUB_CONFIG = {
    PowerShelf: {
        customField: 'powerShelfCustom',
        customType: 'PowerShelfCustom',
        subKeys: [
            { key: 'powerShelfKit', label: 'Power Shelf Kit', type: 'PowerShelfKit' },
            { key: 'powerShelfEnclosure', label: 'Power Shelf Enclosure', type: 'PowerShelfEnclosure' },
            { key: 'powerSupplyUnit', label: 'Power Supply Unit', type: 'PowerSupplyUnit' },
            { key: 'railForPowerShelf', label: 'Rail for Power shelf', type: 'RailForPowerShelf' },
            { key: 'rackScm', label: 'Rack-SCM', type: 'RackScm' },
            { key: 'c13Module', label: 'C-13 Module', type: 'C13Module' },
            { key: 'psuFiller', label: 'PSU filler', type: 'PsuFiller' }
        ]
    },
    ServerGeneral: {
        customField: 'serverGeneralCustom',
        customType: 'ServerGeneralCustom',
        subKeys: [
            { key: 'computeNode', label: 'Compute Node', type: 'ComputeNode' },
            { key: 'slideRailForNode', label: 'Slide Rail for Node', type: 'SlideRailForNode' },
            { key: 'screwForNodeRail', label: 'Screw for Node Rail', type: 'ScrewForNodeRail' },
            { key: 'nutForNodeRail', label: 'NUT for Node Rail', type: 'NutForNodeRail' }
        ]
    },
    Blank: {
        customField: 'blankCustom',
        customType: 'BlankCustom',
        subKeys: [
            { key: 'oneOu', label: '1OU', type: 'OneOu' },
            { key: 'ouEia', label: 'OU-EIA', type: 'OuEia' }
        ]
    },
    StorageJBOD: {
        customField: 'jbodCustom',
        customType: 'JbodCustom',
        subKeys: [
            { key: 'jbod', label: 'JBOD', type: 'Jbod' },
            { key: 'railForJbod', label: 'Rail for JBOD', type: 'RailForJbod' },
            { key: 'halfOuBlank', label: '0.5OU Blank', type: 'HalfOuBlank' }
        ]
    },
    StorageJBOF: {
        customField: 'jbofCustom',
        customType: 'JbofCustom',
        subKeys: [
            { key: 'jbof', label: 'JBOF', type: 'Jbof' },
            { key: 'railForJbof', label: 'Rail for JBOF', type: 'RailForJbof' },
            { key: 'halfOuBlank', label: '0.5OU Blank', type: 'HalfOuBlank' }
        ]
    },
    Switch_tor: {
        customField: 'switchCustom',
        customType: 'SwitchCustom',
        subKeys: [
            { key: 'tor', label: 'TOR', type: 'Tor' },
            { key: 'eiaAdapter2U', label: 'EIA 19” Adapter 2U', type: 'EiaAdapter2U' },
            { key: 'mountingKitTor', label: 'Mounting kit for TOR', type: 'MountingKitTor' },
            { key: 'powerCordTor', label: 'Power cord for TOR', type: 'PowerCordTor' },
            { key: 'sleeveC13', label: 'Sleeve C13', type: 'SleeveC13' }
        ]
    },
    Switch_mgmt: {
        customField: 'switchCustom',
        customType: 'SwitchCustom',
        subKeys: [
            { key: 'managementSwitch', label: 'Management Switch', type: 'ManagementSwitch' },
            { key: 'eiaAdapter1U', label: 'EIA 19” Adapter 1U', type: 'EiaAdapter1U' },
            { key: 'mountingKitMgmt', label: 'Mounting kit for MGMT', type: 'MountingKitMgmt' },
            { key: 'powerCordMgmt', label: 'Power cord for MGMT', type: 'PowerCordMgmt' },
            { key: 'sleeveC13', label: 'Sleeve C13', type: 'SleeveC13' }
        ]
    }
};

/**
 * 取得指定機櫃在 MSFT 設計下的所有已勾選附屬配件
 */
export function getMsftRackSubItems(rack, isCdcProject = false) {
    if (!rack) return [];
    const rackPosition = isCdcProject
        ? (rack.slotIndex !== null && rack.slotIndex !== undefined ? `Slot ${rack.slotIndex + 1}` : '未分配')
        : '一般佈局';

    const items = [];
    MSFT_RACK_SUB_KEYS.forEach(sub => {
        if (rack[sub.key]) {
            items.push({
                id: `${rack.id}-${sub.key}`,
                type: sub.type,
                label: sub.label,
                rackPosition: `${rackPosition} (附屬)`
            });
        }
    });

    if (Array.isArray(rack.rackCustom)) {
        rack.rackCustom.forEach((customItem, cIdx) => {
            const trimmed = (customItem || '').trim();
            if (trimmed) {
                items.push({
                    id: `${rack.id}-custom-${cIdx}`,
                    type: 'RackCustom',
                    label: trimmed,
                    rackPosition: `${rackPosition} (附屬)`
                });
            }
        });
    }

    return items;
}

/**
 * 取得指定設備在 MSFT 設計下的所有已勾選附屬配件
 */
export function getMsftDeviceSubItems(dev) {
    if (!dev) return [];
    const type = dev.type || '';
    let config = null;

    if (type.startsWith('Switch')) {
        if (dev.switchTag === 'tor') config = MSFT_DEVICE_SUB_CONFIG.Switch_tor;
        else if (dev.switchTag === 'mgmt') config = MSFT_DEVICE_SUB_CONFIG.Switch_mgmt;
        else {
            // Even if switchTag is not tor/mgmt, still check switchCustom
            config = { subKeys: [], customField: 'switchCustom', customType: 'SwitchCustom' };
        }
    } else if (MSFT_DEVICE_SUB_CONFIG[type]) {
        config = MSFT_DEVICE_SUB_CONFIG[type];
    }

    if (!config) return [];

    const items = [];
    config.subKeys.forEach(sub => {
        if (dev.hardwareSpecs?.[sub.key]?.qty === 1) {
            items.push({
                id: `${dev.id}-${sub.key}`,
                type: sub.type,
                label: sub.label
            });
        }
    });

    const customList = dev[config.customField];
    if (Array.isArray(customList)) {
        customList.forEach((customItem, cIdx) => {
            const trimmed = (customItem || '').trim();
            if (trimmed) {
                items.push({
                    id: `${dev.id}-custom-${cIdx}`,
                    type: config.customType,
                    label: trimmed
                });
            }
        });
    }

    return items;
}
