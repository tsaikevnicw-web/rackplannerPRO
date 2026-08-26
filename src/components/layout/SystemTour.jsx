import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, ChevronLeft, X, Sparkles, 
    Sliders, Box, Server, Zap, CheckCircle2, FileBox
} from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const TOUR_STEPS = [
    {
        id: 'welcome',
        targetId: null,
        title: '歡迎使用 RackPlanner PRO',
        badge: '核心價值與效益',
        icon: Sparkles,
        description: '專為資料中心與 AI 運算架構師打造的一站式規劃平台，大幅縮短專案提案與工程驗證週期。',
        features: [
            '⚡ 敏捷高效的架構設計驗證 (即時模擬 U 數空間、電力負載與冷熱通道排布)',
            '📄 專業精緻的 Proposal 提案輸出 (一鍵生成高質感架構圖、BOM 清單與規格 PDF)',
            '🎯 零失誤的工程落地與精準採購 (自動防呆佈線、降低溝通成本與採購錯誤)'
        ],
        position: 'center'
    },
    {
        id: 'header',
        targetId: 'tour-header',
        title: '上方功能控制列',
        badge: '功能列 & 全局控制',
        icon: Sliders,
        description: '提供全域視圖切換、專案管理、一鍵智慧自動配線與 PDF 工程規格書匯出。',
        features: [
            '🔲 單機櫃 / 總覽 / CDC 貨櫃 / 網路拓撲 快速切換',
            '🔌 智慧自動配線與一鍵產生 PDF 施工圖'
        ],
        position: 'bottom'
    },
    {
        id: 'sidebar',
        targetId: 'tour-sidebar',
        title: '左側設備清單',
        badge: '設備庫 & 拖曳上架',
        icon: Box,
        description: '收錄標準伺服器、AI GPU 算力節點、網路交換器與 PDU 電源等完整設備庫。',
        features: [
            '🖱️ 直接滑鼠拖曳 (Drag & Drop) 即可迅速上架機櫃',
            '🔍 支援關鍵字即時搜尋與分類快速展開'
        ],
        position: 'right'
    },
    {
        id: 'canvas',
        targetId: 'tour-canvas',
        title: '中央畫布工作區',
        badge: '畫布功能 & 佈局排程',
        icon: Server,
        description: '視覺化核心操作區，支援設備精準定位、跨機櫃連線動態繪製與 CDC 冷熱通道排布。',
        features: [
            '📏 精準 1U / 0.5U 槽位定位與防重疊智慧檢查',
            '🔗 設備間實體網路線路動態曲線繪製'
        ],
        position: 'left-center'
    },
    {
        id: 'right-panel',
        targetId: 'tour-right-panel',
        title: '右側屬性與負載監控',
        badge: '即時規格 & 功耗統計',
        icon: Zap,
        description: '選取機櫃或設備後，即時呈現硬體詳細參數、連接埠配置與整櫃電力功耗與重量統計。',
        features: [
            '⚡ 全櫃總功耗 (Watts / kW) 即時計算與超載警示',
            '⚖️ 總重量累加與承重安全評估'
        ],
        position: 'left'
    },
    {
        id: 'file-actions',
        targetId: 'tour-file-actions',
        title: '截圖存檔與專案檔案管理',
        badge: '檔案 & 截圖功能',
        icon: FileBox,
        description: '支援一鍵畫面截圖，以及專案檔案 (.json) 的儲存與讀取，並可匯出 BOM 物料表與完整規格書。',
        features: [
            '📸 截圖存檔：一鍵將目前機櫃與拓撲畫面匯出為高畫質圖檔',
            '💾 儲存與讀取：將專案完整配置匯出為 .json 檔或載入既有專案',
            '📊 報表匯出：支援 BOM 物料清單 (.csv) 與 PDF 規格書列印'
        ],
        position: 'bottom-left'
    },
    {
        id: 'complete',
        targetId: null,
        title: '導覽完成，開始體驗！',
        badge: '準備就緒',
        icon: CheckCircle2,
        description: '您已掌握系統核心介面！現在可以自由體驗拖曳設備、切換視圖或匯出報告。',
        features: [
            '✨ 試試將左側設備拖曳至機櫃中',
            '✨ 點擊上方「🎬 系統導覽」隨時可重新開啟導覽'
        ],
        position: 'center'
    }
];

const SAMPLE_DEMO_SERVER = {
    id: 'dev-tour-demo-server',
    type: 'ServerAI',
    name: 'GPU Server',
    customName: 'AI GPU Server (8x H100)',
    size: 5,
    theme: 'blue',
    power: 10200,
    weight: 85,
    startU: 10,
    rackId: 'rack-1',
    price: 185000,
    serverConfig: '5U',
    hardwareSpecs: {
        cpu: { model: 'Intel Xeon Platinum 8480+ (56C)', qty: 2 },
        dimm: { model: '64GB DDR5-4800 ECC Reg', qty: 32 },
        gpu: { model: 'NVIDIA H100 80GB SXM5', qty: 8 },
        ns_nic_1: { model: 'NVIDIA ConnectX-7 400Gb/s', qty: 8, transceiver_model: '400G QSFP112 SR4', transceiver_qty: 8 },
        ocp: { model: 'NVIDIA BlueField-3 DPU 200Gb/s', qty: 1, transceiver_model: '200G QSFP56', transceiver_qty: 1 },
        m2: { model: '3.84TB NVMe PCIe Gen5 SSD', qty: 4 },
        psu54v: { model: '3300W Titanium Redundant PSU', qty: 6 },
        cooling: { host: 'AC', gpu: 'LC' }
    },
    connections: {}
};

export default function SystemTour({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);

    const { 
        devices, setDevices, racks, setActiveRackId, 
        setSelectedId, setSelectedIds,
        setIsFileMenuOpen
    } = useRackPlanner();

    const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

    const handleTourClose = () => {
        setIsFileMenuOpen(false);
        setTargetRect(null);
        setSelectedId(null);
        setSelectedIds([]);
        setDevices([]); // Reset canvas rack to pristine empty state with no devices
        onClose();
    };

    // When tour opens, always start on step 0 and ensure a sample server is loaded for demonstration
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setIsFileMenuOpen(false);
            setTargetRect(null);
            // Ensure rack-1 is active and insert sample server if devices is empty
            setActiveRackId('rack-1');
            setDevices(prev => {
                const hasServer = prev.some(d => d.id === SAMPLE_DEMO_SERVER.id || (d.type || '').includes('Server'));
                if (hasServer) return prev;
                return [...prev, SAMPLE_DEMO_SERVER];
            });
        } else {
            setIsFileMenuOpen(false);
            setTargetRect(null);
        }
    }, [isOpen]);

    // Handle step transitions and specific step setup
    useEffect(() => {
        if (!isOpen) return;

        // Step 5: Right Panel details - Select server so RightPanel opens full specs
        if (step.id === 'right-panel') {
            setIsFileMenuOpen(false);
            const serverToSelect = devices.find(d => 
                d.id === SAMPLE_DEMO_SERVER.id || 
                (d.type || '').includes('Server') || 
                (d.type || '').includes('AI')
            ) || SAMPLE_DEMO_SERVER;

            // Ensure server is in devices list
            setDevices(prev => {
                if (prev.some(d => d.id === serverToSelect.id)) return prev;
                return [...prev, serverToSelect];
            });

            setActiveRackId(serverToSelect.rackId || 'rack-1');
            setSelectedIds([serverToSelect.id]);
            setSelectedId(serverToSelect.id);
        } 
        // Step 6: File Actions - Open dropdown menu
        else if (step.id === 'file-actions') {
            setIsFileMenuOpen(true);
        } 
        // Other steps (including Step 7 complete)
        else {
            setIsFileMenuOpen(false);
            if (step.id === 'welcome' || step.id === 'sidebar' || step.id === 'canvas' || step.id === 'complete') {
                setSelectedId(null);
                setSelectedIds([]);
            }
        }
    }, [isOpen, currentStep, step.id]);

    // Measure target element position with generous padding for high visibility
    const updateTargetRect = () => {
        if (!step || !step.targetId) {
            setTargetRect(null);
            return;
        }

        // Special union bounding box calculation for Step 6 (Screenshot button + Open File Dropdown Menu)
        if (step.id === 'file-actions') {
            const fileActionsEl = document.getElementById('tour-file-actions');
            const fileDropdownEl = document.getElementById('tour-file-dropdown-menu');
            if (fileActionsEl) {
                const r1 = fileActionsEl.getBoundingClientRect();
                let top = r1.top;
                let left = r1.left;
                let right = r1.right;
                let bottom = r1.bottom;

                if (fileDropdownEl) {
                    const r2 = fileDropdownEl.getBoundingClientRect();
                    top = Math.min(top, r2.top);
                    left = Math.min(left, r2.left);
                    right = Math.max(right, r2.right);
                    bottom = Math.max(bottom, r2.bottom);
                }

                const pad = 12;
                setTargetRect({
                    top: Math.max(0, top - pad),
                    left: Math.max(0, left - pad),
                    width: (right - left) + pad * 2,
                    height: (bottom - top) + pad * 2,
                    bottom: bottom + pad,
                    right: right + pad
                });
                return;
            }
        }

        const el = document.getElementById(step.targetId) || document.querySelector(`[data-tour="${step.targetId.replace('tour-', '')}"]`);
        if (el) {
            const rect = el.getBoundingClientRect();
            const pad = 12; // Extra offset around element so bright green box is prominent and not hugging edges
            setTargetRect({
                top: Math.max(0, rect.top - pad),
                left: Math.max(0, rect.left - pad),
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
                bottom: rect.bottom + pad,
                right: rect.right + pad
            });
        } else {
            setTargetRect(null);
        }
    };

    // Update target bounds on step change, resize or scroll
    useEffect(() => {
        if (!isOpen) return;
        updateTargetRect();

        // Small delay to re-measure when dropdown finishes animation
        const t = setTimeout(() => {
            updateTargetRect();
        }, 50);

        const handleResize = () => updateTargetRect();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [currentStep, isOpen]);

    const handleNext = () => {
        if (step.id === 'file-actions') {
            setIsFileMenuOpen(false);
        }
        const nextIdx = currentStep + 1;
        if (nextIdx < TOUR_STEPS.length) {
            if (!TOUR_STEPS[nextIdx].targetId) {
                setTargetRect(null);
            }
            setCurrentStep(nextIdx);
        } else {
            handleTourClose();
        }
    };

    const handlePrev = () => {
        if (step.id === 'file-actions') {
            setIsFileMenuOpen(false);
        }
        const prevIdx = currentStep - 1;
        if (prevIdx >= 0) {
            if (!TOUR_STEPS[prevIdx].targetId) {
                setTargetRect(null);
            }
            setCurrentStep(prevIdx);
        }
    };

    if (!isOpen || !step) return null;

    const StepIcon = step.icon;

    // Determine tooltip position style - Ultra-Enlarged card box for Projector & Far Viewing
    const getTooltipStyle = () => {
        if (!targetRect || step.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '1000px',
                width: '95vw'
            };
        }

        const padding = 32;
        const windowWidth = window.innerWidth;

        if (step.position === 'bottom-left' || step.id === 'file-actions') {
            return {
                top: '110px',
                right: `${Math.max(280, windowWidth - targetRect.left + 24)}px`,
                maxWidth: '860px',
                width: '95vw'
            };
        }

        if (step.position === 'bottom') {
            return {
                top: `${Math.max(140, targetRect.bottom + padding)}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '1000px',
                width: '95vw'
            };
        }

        if (step.position === 'right') {
            return {
                top: '120px',
                left: `${Math.min(targetRect.right + padding, windowWidth - 800)}px`,
                maxWidth: '780px',
                width: '95vw'
            };
        }

        if (step.position === 'left') {
            return {
                top: '120px',
                right: `${Math.min(windowWidth - targetRect.left + padding, windowWidth - 800)}px`,
                maxWidth: '780px',
                width: '95vw'
            };
        }

        if (step.position === 'left-center') {
            return {
                top: '100px',
                left: `${Math.max(240, (targetRect.left + targetRect.width / 2) - 410)}px`,
                maxWidth: '820px',
                width: '95vw'
            };
        }

        return {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '960px',
            width: '95vw'
        };
    };

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden animate-fadeIn">
            {/* Background Dimmer / Cutout Mask */}
            {targetRect ? (
                <>
                    {/* Top Mask */}
                    <div 
                        className="absolute left-0 right-0 top-0 bg-slate-950/80 backdrop-blur-[2px] transition-all duration-300 ease-out pointer-events-none" 
                        style={{ height: `${Math.max(0, targetRect.top)}px` }} 
                    />
                    {/* Bottom Mask */}
                    <div 
                        className="absolute left-0 right-0 bottom-0 bg-slate-950/80 backdrop-blur-[2px] transition-all duration-300 ease-out pointer-events-none" 
                        style={{ top: `${Math.min(window.innerHeight, targetRect.bottom)}px` }} 
                    />
                    {/* Left Mask */}
                    <div 
                        className="absolute left-0 bg-slate-950/80 backdrop-blur-[2px] transition-all duration-300 ease-out pointer-events-none" 
                        style={{ 
                            top: `${Math.max(0, targetRect.top)}px`, 
                            height: `${targetRect.height}px`,
                            width: `${Math.max(0, targetRect.left)}px`
                        }} 
                    />
                    {/* Right Mask */}
                    <div 
                        className="absolute right-0 bg-slate-950/80 backdrop-blur-[2px] transition-all duration-300 ease-out pointer-events-none" 
                        style={{ 
                            top: `${Math.max(0, targetRect.top)}px`, 
                            height: `${targetRect.height}px`,
                            left: `${Math.min(window.innerWidth, targetRect.right)}px`
                        }} 
                    />

                    {/* Spotlight Bright Green Glowing Frame - Highest Z-index layer, Clean continuous border with no square corner patches */}
                    <div 
                        className="absolute pointer-events-none transition-all duration-300 ease-out rounded-2xl border-4 border-[#22c55e] z-[10000]"
                        style={{
                            top: `${targetRect.top}px`,
                            left: `${targetRect.left}px`,
                            width: `${targetRect.width}px`,
                            height: `${targetRect.height}px`,
                            boxShadow: '0 0 0 2px #4ade80, 0 0 45px rgba(34, 197, 94, 0.85), inset 0 0 25px rgba(34, 197, 94, 0.25)'
                        }}
                    >
                        {/* Floating Target Label Pill - Bright Green */}
                        <div className="absolute -top-10 left-6 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white text-sm font-black tracking-wider rounded-xl uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.6)] border border-emerald-300/60 z-20">
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                            {step.badge}
                        </div>
                    </div>
                </>
            ) : (
                /* Full backdrop when no specific target is isolated (Welcome & Complete steps) */
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-all duration-300 pointer-events-none" />
            )}

            {/* Tour Dialog Card - Cinema / Projector Scale Dialog Card */}
            <div 
                className="absolute z-[10001] transition-all duration-300 ease-out px-4"
                style={getTooltipStyle()}
            >
                <div className="relative bg-[#0b1523]/98 backdrop-blur-3xl border-3 border-emerald-500/60 rounded-[32px] p-9 md:p-11 shadow-[0_35px_80px_rgba(0,0,0,0.98),0_0_60px_rgba(16,185,129,0.35)] text-slate-100 overflow-hidden">
                    {/* Top Neon Glow Bar */}
                    <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500" />

                    {/* Header Row */}
                    <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-700/70">
                        <div className="flex items-center gap-5">
                            <div className="p-4 md:p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl shadow-2xl border border-emerald-300/50 shrink-0">
                                <StepIcon className="w-10 h-10 text-emerald-100" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs md:text-base font-black text-emerald-300 bg-emerald-500/25 px-3.5 py-1 rounded-xl border border-emerald-500/50">
                                        STEP {currentStep + 1} / {TOUR_STEPS.length}
                                    </span>
                                    <span className="text-base md:text-lg font-extrabold text-emerald-400 tracking-wider">
                                        {step.badge}
                                    </span>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-black text-white tracking-wide leading-tight">
                                    {step.title}
                                </h3>
                            </div>
                        </div>

                        {/* Top Right Close Button */}
                        <button 
                            onClick={handleTourClose} 
                            className="p-3.5 rounded-2xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title="關閉導覽"
                        >
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Content Section - Projector-Grade Extra-Large Font */}
                    <div className="space-y-6 my-5">
                        <p className="text-xl md:text-2xl text-slate-100 font-bold leading-relaxed">
                            {step.description}
                        </p>

                        {/* Feature Bullets */}
                        {step.features && (
                            <div className="bg-slate-900/90 rounded-3xl p-6 md:p-7 border border-slate-800 space-y-4">
                                {step.features.map((feat, idx) => (
                                    <div key={idx} className="flex items-start gap-4 text-lg md:text-xl text-slate-200 font-bold leading-relaxed">
                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shrink-0 mt-1.5 shadow-[0_0_12px_#34d399]" />
                                        <span>{feat}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800/90">
                        {/* Step Indicators */}
                        <div className="flex items-center gap-3">
                            {TOUR_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (step.id === 'file-actions' && idx !== 5) {
                                            setIsFileMenuOpen(false);
                                        }
                                        if (!TOUR_STEPS[idx].targetId) {
                                            setTargetRect(null);
                                        }
                                        setCurrentStep(idx);
                                    }}
                                    className={`h-3.5 rounded-full transition-all cursor-pointer ${
                                        idx === currentStep 
                                            ? 'w-12 bg-emerald-400 shadow-[0_0_16px_#34d399]' 
                                            : idx < currentStep 
                                                ? 'w-3.5 bg-emerald-500/60' 
                                                : 'w-3.5 bg-slate-700 hover:bg-slate-600'
                                    }`}
                                    title={`跳至步驟 ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Controls: Prev, Next */}
                        <div className="flex items-center gap-4">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                    上一步
                                </button>
                            )}

                            {currentStep < TOUR_STEPS.length - 1 ? (
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-black flex items-center gap-2.5 shadow-2xl shadow-emerald-600/40 transition-all cursor-pointer"
                                >
                                    下一步
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleTourClose}
                                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-lg font-black flex items-center gap-2.5 shadow-2xl shadow-green-600/40 transition-all cursor-pointer"
                                >
                                    開始體驗
                                    <CheckCircle2 className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
