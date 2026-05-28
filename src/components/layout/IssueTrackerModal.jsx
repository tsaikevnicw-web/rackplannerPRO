import React, { useState, useEffect } from 'react';
import { X, Bug, Trash2, Clock, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { useRackPlanner } from '../../context/RackPlannerContext';

const IssueTrackerModal = () => {
    const { isBugTrackerOpen, setIsBugTrackerOpen } = useRackPlanner();
    const [bugs, setBugs] = useState([]);
    const [newBugContent, setNewBugContent] = useState('');

    // Fetch bugs from backend with localStorage fallback & sync
    const fetchBugs = async () => {
        let remoteBugs = [];
        try {
            // 1. Try to fetch from the active api route
            const response = await fetch(`${import.meta.env.BASE_URL}api/bugs`);
            if (response.ok) {
                remoteBugs = await response.json();
            } else {
                // If api route fails (e.g. 404 on static hosting like GitHub Pages), try fetching static bugs.json file
                const staticRes = await fetch(`${import.meta.env.BASE_URL}bugs/bugs.json`);
                if (staticRes.ok) {
                    remoteBugs = await staticRes.json();
                }
            }
        } catch (e) {
            console.warn('API fetch failed, falling back to static bugs.json:', e);
            try {
                const staticRes = await fetch(`${import.meta.env.BASE_URL}bugs/bugs.json`);
                if (staticRes.ok) {
                    remoteBugs = await staticRes.json();
                }
            } catch (err) {
                console.error('Failed to fetch static bugs:', err);
            }
        }

        // Get local state
        const localDataStr = localStorage.getItem('local_bug_reports');
        if (!localDataStr) {
            // If no local changes yet, just use remote and save to local
            setBugs(remoteBugs);
            localStorage.setItem('local_bug_reports', JSON.stringify(remoteBugs));
            return;
        }

        const localBugs = JSON.parse(localDataStr);
        const deletedIds = JSON.parse(localStorage.getItem('deleted_bug_ids') || '[]');

        // Sync: update status of local bugs if remote status changed, and add new remote bugs
        const syncedBugs = localBugs.map(lBug => {
            const rBug = remoteBugs.find(r => r.id === lBug.id);
            if (rBug && rBug.status !== lBug.status) {
                return { ...lBug, status: rBug.status };
            }
            return lBug;
        });

        remoteBugs.forEach(rBug => {
            const isLocal = syncedBugs.some(lBug => lBug.id === rBug.id);
            const isDeleted = deletedIds.includes(rBug.id);
            if (!isLocal && !isDeleted) {
                syncedBugs.push(rBug);
            }
        });

        // Sort by timestamp desc (newest first)
        syncedBugs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        setBugs(syncedBugs);
        localStorage.setItem('local_bug_reports', JSON.stringify(syncedBugs));
    };

    // Save bugs to backend & localStorage
    const saveToBackend = async (updatedBugs) => {
        setBugs(updatedBugs);
        localStorage.setItem('local_bug_reports', JSON.stringify(updatedBugs));
        try {
            await fetch(`${import.meta.env.BASE_URL}api/bugs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedBugs)
            });
        } catch (e) {
            console.warn('Failed to save to backend (running on static site?):', e);
        }
    };

    // Load bugs when modal opens
    useEffect(() => {
        if (isBugTrackerOpen) {
            fetchBugs();
        }
    }, [isBugTrackerOpen]);

    // Close on ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isBugTrackerOpen) {
                setIsBugTrackerOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isBugTrackerOpen, setIsBugTrackerOpen]);

    if (!isBugTrackerOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newBugContent.trim()) return;

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const newBug = {
            id: String(Date.now() + Math.random().toString(36).substr(2, 5)),
            timestamp: formattedDate,
            content: newBugContent.trim(),
            status: '待處理' // Default status
        };

        const updatedBugs = [newBug, ...bugs];
        saveToBackend(updatedBugs);
        setNewBugContent('');
    };

    const handleStatusChange = (id, newStatus) => {
        const updatedBugs = bugs.map(bug => 
            bug.id === id ? { ...bug, status: newStatus } : bug
        );
        saveToBackend(updatedBugs);
    };

    const handleDelete = (id) => {
        const updatedBugs = bugs.filter(bug => bug.id !== id);
        
        // Save deleted bug ID locally to prevent it from being synced back
        const deletedIds = JSON.parse(localStorage.getItem('deleted_bug_ids') || '[]');
        if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deleted_bug_ids', JSON.stringify(deletedIds));
        }

        saveToBackend(updatedBugs);
    };

    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bugs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "bugs.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-8 animate-fade-in animate-duration-200">
            <div className="bg-[#0b1424] border border-slate-700/60 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0e192c]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                            <Bug className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-200">
                                BUG 紀錄與回報
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">紀錄與追蹤在系統中看見的問題</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportJSON}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors mr-1"
                            title="將 BUG 紀錄匯出為 JSON 檔"
                        >
                            <Download className="w-3.5 h-3.5 text-rose-400" /> 匯出 JSON
                        </button>
                        <button 
                            onClick={() => setIsBugTrackerOpen(false)}
                            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09101d] custom-scrollbar">
                    
                    {/* Helper Info for Static Hosting */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/90 leading-relaxed flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <strong>靜態網頁（如 GitHub Pages）提示：</strong>
                            新回報的 BUG 會暫存於此瀏覽器中。若要同步給所有人，請點擊右上方「匯出 JSON」將檔案取代專案目錄下的 <code>bugs/bugs.json</code> 後 commit & push 到 GitHub 即可。
                        </div>
                    </div>

                    {/* Add Bug Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            新增 BUG 紀錄
                        </label>
                        <textarea
                            value={newBugContent}
                            onChange={(e) => setNewBugContent(e.target.value)}
                            placeholder="請詳細描述您看見的 BUG 內容（例如：水路錨點連接線路顏色顯示不正確）..."
                            className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-rose-500/70 rounded-xl p-3.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all resize-none"
                        />
                        <button
                            type="submit"
                            disabled={!newBugContent.trim()}
                            className={`w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all shadow-lg hover:shadow-rose-600/20 text-center flex items-center justify-center gap-2 cursor-pointer`}
                        >
                            <Bug className="w-4 h-4" /> 送出回報
                        </button>
                    </form>

                    <div className="h-px bg-slate-800/60"></div>

                    {/* Bug List */}
                    <div className="space-y-3 flex-1 flex flex-col">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            BUG 紀錄清單 ({bugs.length})
                        </h4>

                        {bugs.length === 0 ? (
                            <div className="bg-slate-950/40 border border-slate-850/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
                                <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-600">
                                    <Bug className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-400">目前尚無 BUG 紀錄</p>
                                    <p className="text-xs text-slate-500">若有遇到任何系統異常，請使用上方表單新增紀錄。</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bugs.map((bug) => (
                                    <div 
                                        key={bug.id} 
                                        className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all hover:border-slate-700/40"
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                                                <Clock className="w-3.5 h-3.5 text-slate-600" />
                                                <span>{bug.timestamp}</span>
                                            </div>
                                            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                                                {bug.content}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-start shrink-0">
                                            <select
                                                value={bug.status}
                                                onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                                                className={`bg-slate-950 border text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer transition-colors ${
                                                    bug.status === '已修復'
                                                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                                        : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                                                }`}
                                            >
                                                <option value="待處理" className="bg-[#0d1b2e] text-slate-200">待處理</option>
                                                <option value="已修復" className="bg-[#0d1b2e] text-slate-200">已修復</option>
                                            </select>

                                            <button
                                                onClick={() => handleDelete(bug.id)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
                                                title="刪除此紀錄"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IssueTrackerModal;
