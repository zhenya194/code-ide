import React, { useState, useEffect } from 'react';
import { 
  Files, 
  Terminal as TerminalIcon, 
  Settings, 
  Search, 
  Save, 
  Download,
  Menu,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText,
  FolderOpen,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { clsx } from 'clsx';

// @ts-ignore
const api = window.electronAPI;

export default function App() {
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Gemini Glass Native Ready.']);
  const [terminalInput, setTerminalInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const loadWorkspace = async (path?: string) => {
    try {
      const data = await api.openWorkspace(path);
      if (data && data.tree) {
        setFiles(data.tree.children || [data.tree]);
        setWorkspaceName(data.rootName);
        setSidebarOpen(true);
        setTerminalOpen(true);
        setActiveFile(null);
      }
    } catch (err) { console.error('Workspace Load Error:', err); }
  };

  const handleManualOpen = async () => {
    const path = await api.selectFolder();
    if (path) loadWorkspace(path);
  };

  const handleFileSelect = async (file: any) => {
    if (file.type === 'file') {
      try {
        const content = await api.readFile(file.id);
        setActiveFile({ ...file, content });
      } catch (err) { console.error('Read Error:', err); }
    } else {
      const toggleNode = (nodes: any[]): any[] => {
        return nodes.map(node => {
          if (node.id === file.id) return { ...node, isOpen: !node.isOpen };
          if (node.children) return { ...node, children: toggleNode(node.children) };
          return node;
        });
      };
      setFiles(toggleNode(files));
    }
  };

  // Drag and Drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const path = (e.dataTransfer.files[0] as any).path;
      if (path) loadWorkspace(path);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalOutput(prev => [...prev, `➜ ${cmd}`]);
    setTerminalInput('');
    const res = await api.runTerminal(cmd);
    if (res.stdout) setTerminalOutput(prev => [...prev, res.stdout]);
    if (res.stderr) setTerminalOutput(prev => [...prev, `ERROR: ${res.stderr}`]);
  };

  const isWorkspaceOpen = workspaceName !== '';

  return (
    <div 
      className="flex flex-col h-screen w-screen bg-[#0f111a] text-[#e2e8f0] overflow-hidden select-none"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] flex-center bg-blue-600/10 backdrop-blur-md pointer-events-none"
          >
            <div className="p-16 border-4 border-dashed border-blue-400 rounded-[50px] bg-[#0f111a]/90 flex flex-col items-center gap-6">
               <FolderOpen className="w-24 h-24 text-blue-400 animate-bounce" />
               <span className="text-3xl font-black text-white uppercase tracking-tighter">Drop Folder Here</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-10 border-b border-white/5 flex items-center justify-between px-4 glass-heavy shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <Menu className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)} />
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-500 uppercase flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
             Gemini Glass
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
           {isWorkspaceOpen && (
             <div className="flex gap-1">
               <button className="p-1.5 rounded hover:bg-white/5 text-gray-400" onClick={() => api.saveFile(activeFile.id, activeFile.content)} disabled={!activeFile}><Save className="w-4 h-4" /></button>
               <button className="p-1.5 rounded hover:bg-white/5 text-gray-400" onClick={() => api.saveAs(activeFile.content)} disabled={!activeFile}><Download className="w-4 h-4" /></button>
             </div>
           )}
           <Settings className="w-4 h-4 text-gray-600" />
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-[260px] glass-heavy border-r border-white/5 flex flex-col shrink-0">
             <div className="p-4 flex flex-col h-full">
                <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-4 flex justify-between items-center">
                   <span>Project</span>
                   <span className="text-blue-500 opacity-60 truncate ml-2">{workspaceName}</span>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                   <FileTree nodes={files} onSelect={handleFileSelect} activeId={activeFile?.id} />
                </div>
             </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col relative bg-[#0a0a0f]">
          <div className="h-9 border-b border-white/5 flex items-center bg-black/40 overflow-x-auto no-scrollbar shrink-0">
             {activeFile && (
               <div className="flex items-center gap-2 px-4 h-full border-r border-white/10 bg-[#0f111a] text-[11px] text-blue-400 border-t-2 border-t-blue-500 font-bold uppercase tracking-wider">
                  <FileCode className="w-3.5 h-3.5" /> {activeFile.name}
               </div>
             )}
          </div>

          <div className="flex-1 relative">
             {isWorkspaceOpen ? (
               activeFile ? (
                 <div className="absolute inset-0">
                    <Editor
                      height="100%" theme="vs-dark"
                      path={activeFile.id} language={activeFile.language} value={activeFile.content}
                      onChange={(v) => setActiveFile((p: any) => ({ ...p, content: v }))}
                      options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true, backgroundColor: 'transparent', padding: { top: 20 } }}
                    />
                 </div>
               ) : (
                 <div className="flex-center h-full text-gray-700 font-black text-xs uppercase tracking-[0.5em] opacity-30">
                    Gemini Glass / Select File
                 </div>
               )
             ) : (
               <div className="flex-center h-full flex-col gap-10">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-6"
                  >
                     <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                        <FolderOpen className="w-32 h-32 text-white/5 relative z-10" />
                     </div>
                     <div className="text-center">
                        <h1 className="text-2xl font-black text-white/80 uppercase tracking-tighter mb-2">No Folder Open</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Drag project here or use button below</p>
                     </div>
                     <button 
                        onClick={handleManualOpen}
                        className="flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 transition-all hover:scale-105"
                     >
                        <Plus className="w-4 h-4" /> Open Project
                     </button>
                  </motion.div>
               </div>
             )}
          </div>

          {/* Terminal */}
          {terminalOpen && (
            <div className="h-[200px] border-t border-white/5 glass-heavy flex flex-col shrink-0">
               <div className="h-7 bg-black/40 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
                  <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 flex items-center gap-2">
                     <TerminalIcon className="w-3 h-3" /> Console
                  </div>
                  <button onClick={() => setTerminalOpen(false)} className="text-gray-600 hover:text-white">×</button>
               </div>
               <div className="flex-1 p-4 font-mono text-[12px] text-blue-200/60 overflow-y-auto no-scrollbar leading-relaxed">
                  {terminalOutput.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                  <form onSubmit={handleTerminalSubmit} className="flex gap-2 mt-2 bg-white/5 p-2 rounded">
                     <span className="text-blue-500 font-bold">➜</span>
                     <input className="bg-transparent border-none outline-none text-white w-full" value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} />
                  </form>
               </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <nav className="w-12 glass-heavy border-l border-white/5 flex flex-col items-center py-6 gap-8 shrink-0">
           <Files className={clsx("w-5 h-5 cursor-pointer transition-all", sidebarOpen ? "text-blue-500" : "text-gray-600 hover:text-white")} onClick={() => setSidebarOpen(!sidebarOpen)} />
           <Search className="w-5 h-5 text-gray-600 hover:text-white cursor-pointer" />
           <div className="flex-1" />
           <TerminalIcon className={clsx("w-5 h-5 cursor-pointer transition-all", terminalOpen ? "text-green-500" : "text-gray-600 hover:text-white")} onClick={() => setTerminalOpen(!terminalOpen)} />
           <Settings className="w-5 h-5 text-gray-600" />
        </nav>
      </main>

      <footer className="h-6 border-t border-white/5 glass-heavy px-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-600 shrink-0">
         <div className="flex items-center gap-4">
            <span>System: Online</span>
            {workspaceName && <span className="text-blue-500/50">Path: {workspaceName}</span>}
         </div>
         <div className="flex items-center gap-4">
            <span>Gemini Glass IDE v1.2</span>
         </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .flex-center { display: flex; align-items: center; justify-content: center; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1 1 0%; }
        .shrink-0 { flex-shrink: 0; }
        .h-screen { height: 100vh; }
        .w-screen { width: 100vw; }
        .inset-0 { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .p-4 { padding: 1rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-10 { gap: 2.5rem; }
        .gap-8 { gap: 2rem; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .border-b { border-bottom-width: 1px; }
        .border-t { border-top-width: 1px; }
        .border-r { border-right-width: 1px; }
        .border-l { border-left-width: 1px; }
        .border-white\/5 { border-color: rgba(255, 255, 255, 0.05); }
        .border-white\/10 { border-color: rgba(255, 255, 255, 0.1); }
        .bg-white\/5 { background-color: rgba(255, 255, 255, 0.05); }
        .bg-black\/40 { background-color: rgba(0, 0, 0, 0.4); }
        .text-blue-400 { color: #60a5fa; }
        .text-blue-500 { color: #3b82f6; }
        .text-green-500 { color: #22c55e; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-white\/5 { color: rgba(255, 255, 255, 0.05); }
        .text-white\/80 { color: rgba(255, 255, 255, 0.8); }
        .rounded-full { border-radius: 9999px; }
        .rounded { border-radius: 0.25rem; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .shadow-blue-600\/30 { --tw-shadow-color: rgba(37, 99, 235, 0.3); }
        .tracking-widest { letter-spacing: 0.1em; }
        .font-bold { font-weight: 700; }
        .font-black { font-weight: 900; }
        .z-50 { z-index: 50; }
        .z-[1000] { z-index: 1000; }
        .ml-2 { margin-left: 0.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .border-t-2 { border-top-width: 2px; }
        .border-t-blue-500 { border-top-color: #3b82f6; }
        .animate-bounce { animation: bounce 1s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(-25%); } 50% { transform: translateY(0); } }
      `}} />
    </div>
  );
}

function FileTree({ nodes, onSelect, activeId }: { nodes: any[], onSelect: (node: any) => void, activeId?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map(node => (
        <div key={node.id} className="flex flex-col">
          <div 
            className={clsx(
              "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all text-[11px] font-bold",
              activeId === node.id ? "bg-blue-500 text-white" : "hover:bg-white/5 text-gray-500 hover:text-gray-300"
            )}
            onClick={() => onSelect(node)}
          >
            {node.type === 'folder' ? (node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <FileCode className="w-3 h-3" />}
            <span className="truncate uppercase tracking-tight">{node.name}</span>
          </div>
          {node.type === 'folder' && node.isOpen && node.children && (
            <div className="ml-3 border-l border-white/5 pl-1.5 mt-0.5 space-y-0.5">
              <FileTree nodes={node.children} onSelect={onSelect} activeId={activeId} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
