import React, { useState, useRef, useEffect } from 'react';
import { 
    X, BookOpen, ChevronRight, Search, FileText, Cpu, Droplet, 
    LayoutTemplate, HelpCircle, HardDrive, Network, Settings2, 
    Info, AlertTriangle, Lightbulb, Keyboard, Download, Link2, Monitor
} from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const UserManualModal = () => {
    const { isUserManualOpen, setIsUserManualOpen } = useRackPlanner();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    
    // For interactive PCIe Simulation inside the manual
    const [simPcieSlots, setSimPcieSlots] = useState(4);
    
    const contentRef = useRef(null);

    // Scroll to section helper
    const scrollToSection = (id, tab) => {
        setActiveTab(tab);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Close on ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isUserManualOpen) {
                setIsUserManualOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isUserManualOpen, setIsUserManualOpen]);

    if (!isUserManualOpen) return null;

    const sections = [
        { id: 'sec-intro', tab: 'overview', title: '一、 系統概述與核心架構', icon: Monitor },
        { id: 'sec-ui', tab: 'ui', title: '二、 核心操作介面說明', icon: LayoutTemplate },
        { id: 'sec-spec', tab: 'spec', title: '三、 設備分類與規格配置', icon: Cpu },
        { id: 'sec-topology', tab: 'topology', title: '四、 網路與水路拓撲管理', icon: Network },
        { id: 'sec-hotkeys', tab: 'hotkeys', title: '五、 進階快捷操作與範本', icon: Keyboard },
        { id: 'sec-export', tab: 'export', title: '六、 數據匯出與整合', icon: Download },
    ];

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-8 animate-fade-in animate-duration-200">
            <div className="bg-[#0b1424] border border-slate-700/60 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0e192c]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-[0_0_12px_rgba(255,255,255,0.15)] text-[#D71422]">
                            <BookOpen className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                RACK<span className="text-[#D71422]">PLANNER</span> PRO <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">系統使用手冊</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">規劃、配置與網路水路拓撲運維的完整操作指南</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Search input (Visual Decoration & Interactive filter indicator) */}
                        <div className="relative hidden sm:block">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="搜尋手冊關鍵字..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#070e1a] border border-slate-700 text-slate-200 placeholder-slate-500 text-xs pl-9 pr-4 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-48 transition-all"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                >
                                    清除
                                </button>
                            )}
                        </div>

                        <button 
                            onClick={() => setIsUserManualOpen(false)}
                            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Sidebar Table of Contents */}
                    <div className="w-64 bg-[#070e1a] border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">手冊目錄</div>
                        {sections.map((sec) => {
                            const Icon = sec.icon;
                            const isActive = activeTab === sec.tab;
                            return (
                                <button
                                    key={sec.id}
                                    onClick={() => scrollToSection(sec.id, sec.tab)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all border ${
                                        isActive 
                                            ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.08)]' 
                                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                        <span className="truncate">{sec.title.substring(3)}</span>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-55 transition-transform ${isActive ? 'rotate-90 text-indigo-400' : ''}`} />
                                </button>
                            );
                        })}
                        
                        <div className="mt-auto pt-6 px-2 border-t border-slate-800/60">
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                                <div className="font-semibold text-slate-300">Inventec Corp.</div>
                                <div className="text-[10px] text-slate-500 mt-1">版本: v2.1.0 (PRO)</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div 
                        ref={contentRef}
                        className="flex-1 overflow-y-auto p-6 md:p-8 space-y-12 scroll-smooth custom-scrollbar bg-[#09101d] text-slate-300"
                    >
                        
                        {/* Search Filter Warning */}
                        {searchTerm && (
                            <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-300 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                正在篩選含有 <strong>"{searchTerm}"</strong> 的關鍵內容。建議搭配目錄點選以定位閱讀。
                            </div>
                        )}

                        {/* Section 1: Intro */}
                        <section id="sec-intro" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">一、</span> 系統概述與核心架構
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">RACK PLANNER PRO 的設計理念與視圖架構</p>
                            </div>
                            
                            <p className="text-sm leading-relaxed">
                                <strong>RACK PLANNER PRO</strong> 是一套專為下一代資料中心機房量身打造的機櫃規劃與線路架構設計工具。它打破了傳統試算表紀錄與 2D 圖紙規劃的限制，將<strong>物理機櫃架構</strong>、**實體埠口佈線**、**散熱冷卻配置**與**邏輯網路拓撲**整合在同一套互動式的網頁介面中，並支援動態規格計算與報表產出。
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                                    <div className="text-indigo-400 font-bold text-sm mb-1.5 flex items-center gap-1.5">
                                        <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div> 1. 單櫃模式 (Single Rack)
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        聚焦單一機櫃內部的設備編排與細節微調。提供詳細的物理高度刻度尺 (1U ~ 48U)，並可在右側設定面板中針對機櫃名稱、機櫃類型與總高度進行修改。
                                    </p>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                                    <div className="text-indigo-400 font-bold text-sm mb-1.5 flex items-center gap-1.5">
                                        <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div> 2. 總覽模式 (Rack Overview)
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        跨機櫃排布與大格局物理架構視覺化。將所有已建立的實體機櫃與側掛設備 (SideCDU) 水平並排展示，支援<strong>自適應縮放 (Fit to Screen)</strong> 保持最佳視野。
                                    </p>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                                    <div className="text-indigo-400 font-bold text-sm mb-1.5 flex items-center gap-1.5">
                                        <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div> 3. 邏輯拓撲 (Network Topology)
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        呈現邏輯與實體網路連線關係。系統會自動解析設備角色，劃分為 <strong>North-South Fabric (南北向)</strong>、<strong>East-West Fabric (東西向)</strong> 與底部 <strong>Endpoint Layer (終端運算/儲存)</strong> 三大層。
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">頂部全域資源統計 (Global Resources Stats)</h3>
                                <p className="text-xs text-slate-400">系統即時加總專案內除 SideCDU 外的硬體資源，為您的部署規模與預算提供即時參考：</p>
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                    <span className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-bold font-mono">
                                        空間 (U)：累加所有上架設備之實體高度空間。
                                    </span>
                                    <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-bold font-mono">
                                        功耗 (W)：累計伺服器、交換器等硬體之標稱或配置總功耗。
                                    </span>
                                    <span className="px-2.5 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/25 rounded-lg text-xs font-bold font-mono">
                                        報價 (USD)：加總目前上架之所有硬體設備總單價。
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: UI */}
                        <section id="sec-ui" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">二、</span> 核心操作介面說明
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">互動面板與介面佈局指南</p>
                            </div>
                            
                            <p className="text-sm leading-relaxed">
                                為了提供最直觀的機櫃設計體驗，整個操作視窗被嚴格劃分為四個高效聯動區塊：
                            </p>

                            {/* Dynamic CSS Grid Mock Interface mapping UI */}
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                                <div className="text-xs font-bold text-slate-400 text-center uppercase tracking-wider mb-2">系統主畫面佈局示意圖</div>
                                <div className="grid grid-cols-12 gap-2 h-44 text-[10px] font-bold text-slate-400 font-mono">
                                    
                                    {/* Top Header Mock */}
                                    <div className="col-span-12 bg-slate-900 border border-indigo-500/20 hover:border-indigo-500/60 p-2.5 rounded-lg flex items-center justify-between transition-colors group cursor-default">
                                        <div className="flex items-center gap-1.5 text-indigo-400"><Monitor className="w-3.5 h-3.5" /> 頂部控制列 (Header)</div>
                                        <span className="text-[9px] text-slate-500 font-normal">專案讀寫 / 報表匯出 / 建議配置 / 視圖切換</span>
                                    </div>
                                    
                                    {/* Sidebar Mock */}
                                    <div className="col-span-3 bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/60 p-2.5 rounded-lg flex flex-col justify-between transition-colors group cursor-default">
                                        <div className="text-emerald-400 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> 左側設備清單</div>
                                        <span className="text-[9px] text-slate-500 font-normal">伺服器、CDU、交換器拖曳上架</span>
                                    </div>
                                    
                                    {/* Canvas Mock */}
                                    <div className="col-span-6 bg-slate-900 border border-sky-500/20 hover:border-sky-500/60 p-2.5 rounded-lg flex flex-col justify-between transition-colors group cursor-default">
                                        <div className="text-sky-400 flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> 中央畫布 (Canvas)</div>
                                        <span className="text-[9px] text-slate-500 font-normal">48U物理機架 / 側掛液冷 / 線路管路拖曳</span>
                                    </div>
                                    
                                    {/* Right Panel Mock */}
                                    <div className="col-span-3 bg-slate-900 border border-purple-500/20 hover:border-purple-500/60 p-2.5 rounded-lg flex flex-col justify-between transition-colors group cursor-default">
                                        <div className="text-purple-400 flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" /> 右側設定面板</div>
                                        <span className="text-[9px] text-slate-500 font-normal">U數/節點自訂、硬體規格輸入、水路</span>
                                    </div>

                                </div>
                            </div>

                            <ul className="space-y-3.5 text-xs text-slate-455">
                                <li>
                                    <span className="text-slate-200 font-bold block mb-1">2.1 頂部控制列 (Header)：</span>
                                    提供「讀取/儲存專案 (.json)」以實現進度備份；「匯出 BOM 表」與「線路表 (.csv)」以利採購與施工；「建議配置」可以快速套用 2 到 20 台伺服器的標準 RA 設定；亦有「一鍵清除」與「顯示/隱藏線路」功能。
                                </li>
                                <li>
                                    <span className="text-slate-200 font-bold block mb-1">2.2 左側設備清單 (Sidebar)：</span>
                                    分類展示硬體範本。按住設備名稱，將其**拖曳並放開 (Drag & Drop)** 至中央機架對應的 U 數格子中，即可完成上架部署。
                                </li>
                                <li>
                                    <span className="text-slate-200 font-bold block mb-1">2.3 中央視覺化畫布 (Canvas)：</span>
                                    模擬金屬機櫃實體。設備右側佈滿了不同色彩的連線埠點，您可以用滑鼠點選埠點並拉出線路，對接至其他設備之埠口，以建立物理拓撲。
                                </li>
                                <li>
                                    <span className="text-slate-200 font-bold block mb-1">2.4 右側設定面板 (RightPanel)：</span>
                                    點選畫布中任何設備（或機櫃），此面板即會自動滑出，供您修改設備名稱、功耗、硬體配備規格及水冷設定。
                                </li>
                            </ul>
                        </section>

                        {/* Section 3: Spec */}
                        <section id="sec-spec" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">三、</span> 設備分類與規格配置指南
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">伺服器類型、動態插槽、水冷與管理埠規則</p>
                            </div>

                            <h3 className="text-sm font-bold text-slate-200">3.1 伺服器分類與高度 (U 數) 自訂</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                選取伺服器後，右側設定面板的「伺服器設定 (Server Config)」選單提供不同的高度及節點規格。畫布中的伺服器實體會同步調整高度：
                            </p>

                            <div className="overflow-x-auto border border-slate-800 rounded-xl">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
                                            <th className="p-3">伺服器分類</th>
                                            <th className="p-3">支援高度與節點類型</th>
                                            <th className="p-3">畫布視覺排版規則</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-400">
                                        <tr>
                                            <td className="p-3 font-semibold text-slate-200">General Purpose</td>
                                            <td className="p-3">1U, 2U, 3U, 4U</td>
                                            <td className="p-3">標準通用型，按 U 數大小自適應縮放高度。</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-semibold text-slate-200">High Density</td>
                                            <td className="p-3">1U1N, 1U2N, 2U1N, 2U2N, 2U4N</td>
                                            <td className="p-3 text-slate-300">
                                                * <strong>1U2N</strong>：Node 1 & Node 2 以**一列水平排列**展示。<br />
                                                * <strong>2U4N</strong>：Node 1 ~ 4 以 **2x2 網格二行二列**展示。
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-semibold text-slate-200">AI Server</td>
                                            <td className="p-3">4U, 5U, 6U, 10U</td>
                                            <td className="p-3">大型 GPU 加速運算主機，最大支援 10U。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl text-xs space-y-2 text-amber-300">
                                <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4 text-amber-400" /> 注意：網路拓撲排版規則</div>
                                <p className="leading-relaxed">
                                    在畫布中，2U4N 伺服器是以 2x2 網格顯示；但在**網路拓撲檢視**中，為了美觀與排版一致性，該設備之節點會以**二列**（Node 1 & Node 2 於首列，Node 3 & Node 4 於次列）呈現，而不會佔據四列空間，確保圖面整潔對稱。
                                </p>
                            </div>

                            {/* Dynamic PCIe slot simulation */}
                            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                        <Settings2 className="w-4 h-4 text-indigo-400" /> 3.2 PCIe 插槽動態配置 (手冊互動模擬)
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-mono">1 ~ 13 Slots</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    在 General Purpose 與 AI Server (以及 High Density 的各個節點) 的硬體規格中，提供 <strong>PCIe Slots 數量選單</strong>。當更改數量時，右側設定面板將**動態長出對應數量的 PCIe Slot 欄位**供您命名，並同步在畫布與拓撲圖上產生等量的實體埠點。
                                </p>
                                
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">模擬選擇 PCIe Slots 數量:</span>
                                        <select 
                                            value={simPcieSlots} 
                                            onChange={(e) => setSimPcieSlots(Number(e.target.value))}
                                            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            {[1, 2, 4, 6, 8, 10, 13].map(n => <option key={n} value={n}>{n} 個</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">動態生成之硬體欄位與埠點示意：</div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {Array.from({ length: simPcieSlots }).map((_, i) => (
                                                <div key={i} className="bg-slate-900 border border-indigo-500/25 p-2 rounded flex flex-col justify-between h-14 animate-in slide-in-from-top-2 duration-200">
                                                    <span className="text-[9px] text-slate-500">PCIe Slot {i+1}</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-indigo-300 font-mono font-bold">2 Ports</span>
                                                        <div className="flex gap-1">
                                                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">3.3 網路埠口與管理連線限制</h3>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-2.5">
                                    <li>
                                        <strong className="text-slate-300">Super NIC Mgt 限制：</strong>
                                        在 General Purpose 伺服器中，管理網路 Super NIC Mgt 的數量上限與硬體規格中配置的 PCIe Slots 數量維持一致。例如：若 PCIe Slots 選擇 4，則 Super NIC Mgt 埠數最大僅能設定為 4。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">AI Server 的 EW NIC 配置：</strong>
                                        AI 伺服器的 **EW NIC 數量開放為可編輯狀態**，您可以直接於右側面板修改其數量，畫布與拓撲中的 `EW NIC` 錨點將隨之動態增減。網路傳輸類型亦可自由切換為：
                                        <br />
                                        * <span className="text-emerald-400 font-semibold">Ethernet / RoCE v2</span>：採用**綠線**連線，光模組標配 `MMA4Z00-NS-FLT`。
                                        <br />
                                        * <span className="text-orange-400 font-semibold">InfiniBand / NDR</span>：採用**橘線**連線，標配 `MCA7K10` 主動式光纜。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">BMC 埠欄位移除：</strong>
                                        系統已全面移除手動輸入的「BMC孔數」欄位，簡化介面，防止因填寫不一致造成混亂。
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">3.4 液冷系統與側掛 CDU 操作</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    當伺服器、儲存設備啟用 Host Cooling 或 GPU Cooling 的 **LC (液冷 - Liquid Cooling)** 選項時，設備在畫布上會動態啟用水冷接頭錨點：
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-900/60 p-3 rounded-lg border border-blue-500/25 flex items-center gap-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full shrink-0"></div>
                                        <div>
                                            <strong className="text-blue-400">C (冷水端 - Cold Water Inlet)</strong>
                                            <p className="text-[10px] text-slate-500 mt-0.5">用於將低溫冷水導入冷卻板。對接 SideCDU 的 Cold Port。</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/60 p-3 rounded-lg border border-red-500/25 flex items-center gap-3">
                                        <div className="w-3 h-3 bg-red-500 rounded-full shrink-0"></div>
                                        <div>
                                            <strong className="text-red-400">H (熱水端 - Hot Water Outlet)</strong>
                                            <p className="text-[10px] text-slate-500 mt-0.5">承載熱水導出設備。對接 SideCDU 的 Hot Port。</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <strong>側掛液冷單元 (SideCDU)：</strong>將其拖入主機櫃右側後，會自動吸附並在底部產生 **Water Loop** 進出水排埠。使用者可以直接從伺服器的 C/H 點拉出水冷管線對接至 SideCDU，以便系統於報表中進行冷卻水路拓撲紀錄。
                                </p>
                            </div>
                        </section>

                        {/* Section 4: Topology */}
                        <section id="sec-topology" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">四、</span> 網路與水路拓撲管理
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">連線操作、邏輯層級與線路視覺色彩定義</p>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">4.1 物理埠口對接與拖曳連線規則</h3>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-2">
                                    <li><strong className="text-slate-300">建立連線：</strong>滑鼠左鍵點選設備之埠點，按住並拖曳出虛線，移動至目標設備的埠點釋放即可。</li>
                                    <li><strong className="text-slate-300">中斷連線：</strong>在任何已連線的埠口上**連按兩次滑鼠左鍵 (Double Click)**，即可拆除與該埠口相連的所有線路。</li>
                                    <li><strong className="text-slate-300">多對一連線功能：</strong>伺服器或儲存設備之單一網口支援多對一（一埠接至多個交換器埠）連線，最多可同時連接 8 條線路。此時埠點中心會以黑色數字標示目前連線數（例如 <code>3</code>）。</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">4.2 邏輯網路拓撲與等寬對稱美學</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    進入「網路拓撲」視圖後，Endpoint 設備會依照 <code>topologyGroup</code>（預設為所在實體機櫃名稱，如 RACK-001）進行分組外框繪製：
                                </p>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-2">
                                    <li>
                                        <strong className="text-slate-300">分組收合與一鍵展開：</strong>
                                        點擊分組標題旁的展開/收合圖示，可將整個 Group 折疊為一個緊湊的小方塊（顯示如 "RACK-001 - 5 Devices"），此時該 Group 所有的對外連線會自動匯總為一條較粗的**群組匯總連線**。點擊 Fabric 標題旁的 **「一鍵收起/展開」**，可進行全域批次操作。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">等寬對稱設計：</strong>
                                        Endpoint Layer 的每一個分組寬度固定為 **420px**，確保不論該機櫃內是擺放寬度較寬的 High Density (2U4N) 或是 AI 伺服器，整個拓撲圖的 Group 大小皆維持對稱與整潔。
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">4.3 連線視覺化色彩定義</h3>
                                <p className="text-xs text-slate-400 mb-2">線路在畫布與拓撲上，會依據其**功能與連接端點類型**顯示特定顏色：</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#60a5fa] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">藍色 (Blue)</div>
                                            <div className="text-[10px] text-slate-500">BMC 管理網路線 / Switch 1G 網路線 / 水冷冷水管</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#ef4444] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">紅色 (Red)</div>
                                            <div className="text-[10px] text-slate-500">Router 幹線 / 水冷熱水管 / High Density 節點 2 連線</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#22c55e] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">綠色 (Green)</div>
                                            <div className="text-[10px] text-slate-500">AI 伺服器東西向 RoCE v2 運算網路 (Ethernet) / Switch 800G 線路</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#f97316] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">橘色 (Orange)</div>
                                            <div className="text-[10px] text-slate-500">AI 伺服器東西向 NDR 運算網路 (InfiniBand) / Switch 10G 線路</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#facc15] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">黃色 (Yellow)</div>
                                            <div className="text-[10px] text-slate-500">Switch 400G 線路 / 通用 PCIe Slot 連線 / High Density 節點 1 連線</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                                        <div className="w-4 h-4 bg-[#a855f7] rounded shrink-0"></div>
                                        <div>
                                            <div className="font-semibold text-slate-200">紫色 (Purple)</div>
                                            <div className="text-[10px] text-slate-500">通用交換器 Port-to-Port 幹線 / Switch 傳輸線</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-800/60">
                                <h3 className="text-sm font-bold text-slate-200">4.4 線路路徑與走線槽動態最佳化</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    系統提供「最佳化走線」功能，模擬真實機房的走線方式，自動將交叉凌亂的連線整理進兩側理線槽：
                                </p>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-2">
                                    <li>
                                        <strong className="text-slate-300">同機櫃走線：</strong>
                                        線路自埠口水平拉出，進入兩側 32px 的「立柱理線槽 (Pillars)」。同側連線直接在立柱內爬升；對角連線會爬升至頂端或底座繞行跨越，避免遮擋伺服器面板。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">跨機櫃走線：</strong>
                                        線路自立柱槽爬升至機櫃上方，透過「架空橋接線槽 (Overhead Tray)」橫向跨越至另一機櫃，再由其立柱槽垂直降下接至目標埠口。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">走線模式切換：</strong>
                                        點擊頂部控制列的 **「最佳化走線 / 直連走線」** 按鈕可即時切換。最佳化走線提供乾淨整潔的 CAD 工地排線外觀，直連走線則使用經典弧形貝氏曲線，便於端點對比。
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 5: Hotkeys */}
                        <section id="sec-hotkeys" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">五、</span> 進階快捷操作與範本應用
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">鍵盤快捷鍵、命名遞增與建議配置範本</p>
                            </div>

                            <h3 className="text-sm font-bold text-slate-200">5.1 鍵盤快捷鍵 (Hotkeys)</h3>
                            <p className="text-xs text-slate-400">
                                在畫布中未輸入任何表單文字時，可使用以下鍵盤快捷鍵加速部署：
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">快速刪除選定設備</span>
                                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold shadow-md">Delete</kbd>
                                </div>
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">複製設備 / 整個機櫃</span>
                                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold shadow-md">Ctrl + C</kbd>
                                </div>
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">貼上設備 / 機櫃</span>
                                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold shadow-md">Ctrl + V</kbd>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">5.2 命名自動遞增邏輯</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    當複製與貼上設備時，系統會自動分析來源名稱末端的數字。若名稱以 <code>-01</code>, <code>-001</code> 或 <code>_1</code> 結尾，新設備將自動尋找現有最大序號並遞增。
                                </p>
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-center gap-6 text-xs text-center font-mono">
                                    <div className="bg-slate-900 border border-indigo-500/25 px-4 py-2.5 rounded-lg">
                                        <div className="text-[10px] text-slate-500">來源設備</div>
                                        <div className="text-slate-300 font-bold mt-1">Server-01</div>
                                    </div>
                                    <div className="text-indigo-400 font-bold">複製貼上 (Ctrl+V) ➔</div>
                                    <div className="bg-slate-900 border border-emerald-500/25 px-4 py-2.5 rounded-lg">
                                        <div className="text-[10px] text-slate-500">生成新設備</div>
                                        <div className="text-emerald-400 font-bold mt-1">Server-02</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">5.3 RA 建議配置範本一鍵套用</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    頂部控制列的 **「建議配置」** 功能提供了四種 Inventec 常用的標準規模硬體部署範本。點擊即可直接載入，快速體驗完整線路互連：
                                </p>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
                                    <li><strong>20台 範本</strong>：自動建立含 20 台 AI Server/High Density 的高規格大型機櫃叢集與 800G Spine-Leaf 交換器。</li>
                                    <li><strong>16台 範本</strong>：配置 16 台通用伺服器與雙 Fabric 網路對接。</li>
                                    <li><strong>4台 / 2台 範本</strong>：輕量級測試範本，適合快速體驗線路互連與水冷迴路串接。</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 6: Export */}
                        <section id="sec-export" className="space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-indigo-400">六、</span> 數據匯出與整合
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">BOM 物料清單、線路佈線表與架構圖導出</p>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">6.1 物料清單 (BOM) 匯出</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    點選「檔案」 ➔ 「匯出 BOM 表 (.csv)」將產出詳細的硬體材料與線材統計 CSV 報表：
                                </p>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-2">
                                    <li><strong className="text-slate-300">設備統計：</strong>包含每一台設備的所在機櫃名稱、機架位置（U數範圍）、功耗、解熱能力與報價。</li>
                                    <li>
                                        <strong className="text-slate-300">PCIe Slot 3+ / High Density 規格合併：</strong>
                                        為了報表清爽，系統將前兩個插槽 (PCIe Slot 1 & 2) 獨立輸出，其餘 Slot 3 至 Slot 13，以及 High Density 各個子節點中 Slot 3 以上的規格，會自動以分號連接，格式化歸類在最後的 **Other (型號*數量)** 欄位中。
                                    </li>
                                    <li>
                                        <strong className="text-slate-300">線材與光收發模組自動折算：</strong>
                                        系統會自動遍歷全專案的連線，估算並輸出對應的 1G ~ 800G 線材與 QSFP56 / 2x400G 光模組數量。若使用 InfiniBand 則會自動折算 `MCA7K10` 主動式光纜。
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">6.2 網路線路表 (Cable Routing) 匯出</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    點選「檔案」 ➔ 「匯出網路線路表 (.csv)」會將專案中所有連線以「網路交換器」為核心進行整理：
                                </p>
                                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
                                    <li>自動依照網路用途 (Fabric Group) ➔ 網路角色 (Spine/Leaf) ➔ 交換器名稱排序。</li>
                                    <li>詳列交換器上的 `Port 1` ~ `Port N` 實體埠口連接到了哪一台機櫃、哪一台伺服器的哪一個 PCIe Slot 或 OCP/BMC。</li>
                                    <li>若對接端為 AI 伺服器，會自動依據其網路傳輸技術，在欄位中自動帶出建議的 Transceiver 與 Cable 型號，方便工程師按表施工。</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-200">6.3 畫布架構圖截圖存檔</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    點選頂部「截圖存檔」，系統將以超高解析度渲染目前的畫布內容，並在背景加上帶有當前時間的 **Inventec Confidential** 斜角浮水印。此圖檔可直接用於客戶簡報或系統架構設計書中。
                                </p>
                            </div>
                        </section>

                    </div>
                </div>
                
                {/* Footer buttons */}
                <div className="px-6 py-4 border-t border-slate-800 bg-[#0e192c] flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        如有系統疑問，請洽 Kevin Tsai (Tsai.KevinC.W@inventec.com)
                    </div>
                    <button 
                        onClick={() => setIsUserManualOpen(false)}
                        className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/20"
                    >
                        我知道了，關閉說明
                    </button>
                </div>

            </div>
        </div>
    );
};

export default UserManualModal;
