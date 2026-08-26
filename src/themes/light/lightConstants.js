import { Server, Droplets, HardDrive, Network, Cpu, Zap, LayoutGrid, Settings, ShieldAlert, Eye, Thermometer, ArrowDown, ArrowUp } from 'lucide-react';

export const LIGHT_THEME_STYLES = {
    blue: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-blue-50/80 border-blue-600 ring-1 ring-blue-500/50 shadow-xs',
        led: 'bg-emerald-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    cyan: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-cyan-50/80 border-cyan-600 ring-1 ring-cyan-500/50 shadow-xs',
        led: 'bg-cyan-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    emerald: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-500/50 shadow-xs',
        led: 'bg-emerald-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    purple: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-purple-50/80 border-purple-600 ring-1 ring-purple-500/50 shadow-xs',
        led: 'bg-purple-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    violet: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-violet-50/80 border-violet-600 ring-1 ring-violet-500/50 shadow-xs',
        led: 'bg-violet-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    orange: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-amber-50/80 border-amber-600 ring-1 ring-amber-500/50 shadow-xs',
        led: 'bg-amber-500', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    slate: { 
        border: 'border-slate-300', 
        bg: 'bg-white hover:bg-slate-50', 
        selectedBg: 'bg-slate-100 border-slate-600 ring-1 ring-slate-500/50 shadow-xs',
        led: 'bg-slate-400', 
        text: 'text-slate-800',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    }
};

export const LIGHT_INFRA_THEMES = {
    Battery: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '鋰電池機櫃 (Battery System)'
    },
    UPS: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: 'UPS 不斷電主櫃 (Power Module)'
    },
    PowerPanel: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '低壓配電盤 (Power Distribution Panel)'
    },
    Switchboard: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '低壓配電總櫃 (Switchboard)'
    },
    FireSuppression: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '氣體消防系統 (Fire Suppression)'
    },
    Monitoring: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '環境監控主機 (Environmental Monitoring)'
    },
    EnvControl: {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        selectedBg: 'bg-slate-100 border-slate-500 ring-1 ring-slate-400',
        label: '環境控制系統 (HVAC Controller)'
    }
};
