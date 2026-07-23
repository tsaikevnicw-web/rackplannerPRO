import { Server, Droplets, HardDrive, Network, Cpu, Zap, LayoutGrid, Settings, ShieldAlert, Eye, Thermometer } from 'lucide-react';

export const DEFAULT_RACK_U_COUNT = 48;
export const U_HEIGHT = 24;

export const THEME_STYLES = {
    blue: { border: 'border-blue-500/50', bg: 'bg-[#0f172a]', glow: 'shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]', led: 'bg-blue-500', text: 'text-blue-400' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-[#081b23]', glow: 'shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]', led: 'bg-cyan-500', text: 'text-cyan-400' },
    emerald: { border: 'border-emerald-500/50', bg: 'bg-[#061e14]', glow: 'shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]', led: 'bg-emerald-500', text: 'text-emerald-400' },
    purple: { border: 'border-purple-500/50', bg: 'bg-[#150e24]', glow: 'shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]', led: 'bg-purple-500', text: 'text-purple-400' },
    violet: { border: 'border-violet-500/50', bg: 'bg-[#120a1f]', glow: 'shadow-[inset_0_0_20px_rgba(139,92,246,0.15)]', led: 'bg-violet-500', text: 'text-violet-400' },
    orange: { border: 'border-orange-500/50', bg: 'bg-[#201008]', glow: 'shadow-[inset_0_0_20px_rgba(249,115,22,0.15)]', led: 'bg-orange-500', text: 'text-orange-400' },
    slate: { border: 'border-slate-600/50', bg: 'bg-[#111827]', glow: 'shadow-[inset_0_0_20px_rgba(100,116,139,0.15)]', led: 'bg-slate-400', text: 'text-slate-300' }
};

export const HW_SPECS_CONFIG = [
    { key: 'cpu', label: 'CPU' },
    { key: 'dimm', label: 'DIMM' },
    { key: 'ns_nic_1', label: 'NS-NIC-1' },
    { key: 'ns_nic_2', label: 'NS-NIC-2' },
    { key: 'ocp', label: 'OCP' },
    { key: 'gpu', label: 'GPU' },
    { key: 'm2', label: 'M.2' },
    { key: 'hdd', label: 'HDD' },
    { key: 'psu54v', label: '54V PSU' },
    { key: 'psu12v', label: '12V PSU' },
    { key: 'other', label: 'Other' },
];

export const DEVICE_TEMPLATES = [
    {
        isGroup: true, name: '伺服器', icon: Server, theme: 'blue',
        subItems: [
            { type: 'ServerGeneral', name: 'General Purpose', size: 1, icon: Server, theme: 'blue', power: 300, serverConfig: '1U' },
            { type: 'ServerHighDensity', name: 'High Density', size: 1, icon: Server, theme: 'blue', power: 800, serverConfig: '1U1N' },
            { type: 'ServerAI', name: 'AI Server', size: 5, icon: Server, theme: 'blue', power: 1500, serverConfig: '5U' },
        ]
    },
    {
        isGroup: true, name: 'CDU', icon: Droplets, theme: 'cyan',
        subItems: [
            { type: 'CDU4U', name: 'In Rack CDU', size: 4, icon: Droplets, theme: 'cyan', power: 800, coolingCapacity: 80000 },
            { type: 'SideCDU', name: 'Liquid to Air CDU', size: 48, icon: Droplets, theme: 'cyan', power: 2500, coolingCapacity: 150000 },
        ]
    },
    {
        isGroup: true, name: '磁碟陣列', icon: HardDrive, theme: 'emerald',
        subItems: [
            { type: 'StorageServer', name: 'Storage Server', size: 2, icon: HardDrive, theme: 'emerald', power: 400, storageConfig: '2U' },
            { type: 'StorageJBOD', name: 'JBOD', size: 4, icon: HardDrive, theme: 'emerald', power: 400, storageConfig: '4U' },
            { type: 'StorageJBOF', name: 'JBOF', size: 2, icon: HardDrive, theme: 'emerald', power: 400, storageConfig: '2U' }
        ]
    },
    {
        isGroup: true, name: '網路設備', icon: Network, theme: 'purple',
        subItems: [
            { type: 'Switch', name: '交換器', size: 1, icon: Network, theme: 'purple', power: 150 },
            { type: 'Router', name: '路由器', size: 1, icon: Cpu, theme: 'violet', power: 100 },
        ]
    },
    {
        isGroup: true, name: 'Power Device', icon: Zap, theme: 'orange',
        subItems: [
            { type: 'PowerShelf', name: 'Power Shelf', size: 1, icon: Zap, theme: 'orange', power: 0, weight: 15 },
            { type: 'PDU', name: 'PDU', size: 1, icon: Zap, theme: 'orange', power: 0, weight: 5 },
            { type: 'UPS', name: '不斷電系統', size: 2, icon: Zap, theme: 'orange', power: 0, weight: 30 }
        ]
    },
    {
        isGroup: true, name: '其他設備', icon: LayoutGrid, theme: 'slate',
        subItems: [
            { type: 'Blank', name: '空白擋板', size: 1, icon: LayoutGrid, theme: 'slate', power: 0 },
        ]
    }
];

export const CONTAINER_INFRA_TEMPLATES = [
    { type: 'General', name: 'IT 機櫃', icon: Server, theme: 'blue', uCount: 48, powerLimit: 24000, weight: 150 },
    { type: 'CDU', name: '水冷分配單元 (CDU)', icon: Droplets, theme: 'cyan', coolingCapacity: 150000, power: 2500, weight: 350 },
    { type: 'Cooling', name: '列間空調 (In-Row)', icon: Droplets, theme: 'emerald', coolingCapacity: 75000, power: 4500, weight: 320 },
    { type: 'UPS', name: 'UPS 動力主櫃', icon: Zap, theme: 'orange', powerCapacity: 120000, weight: 850 },
    { type: 'Battery', name: '鋰電池機櫃', icon: LayoutGrid, theme: 'purple', batteryCapacity: 100000, weight: 1200 },
    { type: 'Switchboard', name: '低壓配電總櫃', icon: Settings, theme: 'slate', weight: 420 },
    { type: 'PowerPanel', name: '分配電盤', icon: Zap, theme: 'orange', weight: 120 },
    { type: 'FireSuppression', name: '氣體消防系統', icon: ShieldAlert, theme: 'orange', weight: 250 },
    { type: 'Monitoring', name: '監控中心主櫃', icon: Eye, theme: 'blue', weight: 180 },
    { type: 'EnvControl', name: '環境控制系統', icon: Thermometer, theme: 'emerald', weight: 150 }
];
