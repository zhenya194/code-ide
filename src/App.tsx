import React, { useState, useEffect } from 'react';
import { 
  Files, 
  Terminal as TerminalIcon, 
  Settings, 
  Search, 
  Play, 
  Save, 
  Download,
  Menu,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { clsx } from 'clsx';

// --- Types ---
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to Gemini IDE Terminal', 'Type a command and press Enter...']);
  const [terminalInput, setTerminalInput] = useState('');
  
  // Fetch initial files
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/files`);
      const data = await res.json();
      setFiles(data.children || [data]);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      try {
        const res = await fetch(`${API_BASE}/file/${file.id}`);
        const data = await res.json();
        setActiveFile({ ...file, content: data.content });
      } catch (err) {
        console.error('Failed to load file:', err);
      }
    } else {
      const toggleNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === file.id) return { ...node, isOpen: !node.isOpen };
          if (node.children) return { ...node, children: toggleNode(node.children) };
          return node;
        });
      };
      setFiles(toggleNode(files));
    }
  };

  const handleSave = async () => {
    if (!activeFile || activeFile.content === undefined) return;
    try {
      await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile.id, content: activeFile.content })
      });
      alert('File saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Новая функция "Сохранить как" через системный диалог
  const handleSaveAs = async () => {
    if (!activeFile || activeFile.content === undefined) return;
    try {
      const res = await fetch(`${API_BASE}/save-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeFile.content })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Saved to: ${data.path}`);
        fetchFiles(); // Refresh to see if it's in our tree
      }
    } catch (err) {
      console.error('Save As failed:', err);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    const cmd = terminalInput;
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);
    setTerminalInput('');

    try {
      const res = await fetch(`${API_BASE}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      if (data.stdout) setTerminalOutput(prev => [...prev, data.stdout]);
      if (data.stderr) setTerminalOutput(prev => [...prev, `ERROR: ${data.stderr}`]);
    } catch (err) {
      setTerminalOutput(prev => [...prev, 'Failed to execute command']);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f111a] text-[#e2e8f0] overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 glass backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <Menu className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)} />
          <span className="font-semibold tracking-wider text-[#3b82f6] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            GEMINI IDE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all text-sm" onClick={fetchFiles}>
             Refresh
          </button>
          <div className="flex gap-1">
            <button className="p-1.5 rounded hover:bg-white/10 text-gray-400" title="Save" onClick={handleSave}>
              <Save className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/10 text-gray-400" title="Save As..." onClick={handleSaveAs}>
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="w-[1px] h-4 bg-white/10" />
          <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="glass-heavy h-full overflow-hidden flex flex-col z-40 shrink-0"
            >
              <div className="p-4 flex flex-col gap-6 h-full overflow-hidden">
                <div className="flex flex-col gap-2 h-full overflow-hidden">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-2 mb-2">Explorer</div>
                  <div className="overflow-y-auto flex-1 no-scrollbar pb-10">
                    <FileTree nodes={files} onSelect={handleFileSelect} activeId={activeFile?.id} />
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0d0d12]">
          {/* Tabs */}
          <div className="h-10 border-b border-white/10 flex items-center bg-black/20 overflow-x-auto no-scrollbar shrink-0">
            {activeFile && (
              <div className="flex items-center gap-2 px-4 h-full border-r border-white/10 bg-white/5 text-sm text-blue-400 border-t-2 border-t-blue-500 shrink-0">
                <FileCode className="w-3 h-3" />
                {activeFile.name}
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            {activeFile ? (
              <div className="absolute inset-0">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={activeFile.id}
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={(val) => setActiveFile(prev => prev ? { ...prev, content: val || '' } : null)}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono',
                    backgroundColor: 'transparent',
                    padding: { top: 20 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    bracketPairColorization: { enabled: true },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    fixedOverflowWidgets: true
                  }}
                />
              </div>
            ) : (
              <div className="flex-center h-full flex-col gap-4 text-gray-600">
                <Files className="w-16 h-16 opacity-20" />
                <p className="text-sm">Select a file to start coding</p>
              </div>
            )}
          </div>

          {/* Terminal Section */}
          <AnimatePresence>
            {terminalOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className="border-t border-white/10 glass backdrop-blur-2xl z-30 flex flex-col shrink-0"
              >
                <div className="h-8 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 shrink-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    <TerminalIcon className="w-3 h-3" /> Terminal
                  </div>
                  <button onClick={() => setTerminalOpen(false)} className="text-gray-500 hover:text-white">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-green-400/80 scrollbar-thin">
                  {terminalOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-1">{line}</div>
                  ))}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2">
                    <span className="text-blue-400 shrink-0">gemini-ide:~$</span>
                    <input 
                      className="bg-transparent border-none outline-none text-white w-full"
                      value={terminalInput}
                      onChange={e => setTerminalInput(e.target.value)}
                    />
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Activity Bar (Slim) */}
        <nav className="w-12 glass-heavy flex flex-col items-center py-4 gap-6 border-l border-white/10 z-50 shrink-0">
          <Files className="w-5 h-5 text-blue-400 cursor-pointer" />
          <Search className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer" />
          <div className="flex-1" />
          <TerminalIcon className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer" onClick={() => setTerminalOpen(!terminalOpen)} />
          <Settings className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer" />
        </nav>
      </main>

      <footer className="h-6 border-t border-white/10 glass flex items-center justify-between px-4 text-[10px] text-gray-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>Ready</span>
          <span>Ln 1, Col 1</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>TypeScript JSX</span>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .flex-center { display: flex; align-items: center; justify-content: center; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1 1 0%; }
        .shrink-0 { flex-shrink: 0; }
        .h-screen { height: 100vh; }
        .w-screen { width: 100vw; }
        .h-full { height: 100%; }
        .w-full { width: 100%; }
        .inset-0 { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .p-4 { padding: 1rem; }
        .gap-1 { gap: 0.25rem; }
        .gap-4 { gap: 1rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-6 { gap: 1.5rem; }
        .text-sm { font-size: 0.875rem; }
        .font-mono { font-family: var(--font-mono); }
        .border-b { border-bottom-width: 1px; }
        .border-t { border-top-width: 1px; }
        .border-r { border-right-width: 1px; }
        .border-l { border-left-width: 1px; }
        .border-none { border-style: none; }
        .outline-none { outline: 2px solid transparent; outline-offset: 2px; }
        .border-white\/10 { border-color: rgba(255, 255, 255, 0.1); }
        .border-white\/5 { border-color: rgba(255, 255, 255, 0.05); }
        .bg-white\/5 { background-color: rgba(255, 255, 255, 0.05); }
        .bg-white\/10 { background-color: rgba(255, 255, 255, 0.1); }
        .bg-black\/20 { background-color: rgba(0, 0, 0, 0.2); }
        .bg-blue-600\/20 { background-color: rgba(37, 99, 235, 0.2); }
        .bg-blue-600\/30:hover { background-color: rgba(37, 99, 235, 0.3); }
        .bg-blue-500\/20 { background-color: rgba(59, 130, 246, 0.2); }
        .bg-transparent { background-color: transparent; }
        .text-blue-400 { color: #60a5fa; }
        .text-blue-300 { color: #93c5fd; }
        .text-purple-400 { color: #c084fc; }
        .text-green-400\/80 { color: rgba(74, 222, 128, 0.8); }
        .text-white { color: #ffffff; }
        .text-gray-400 { color: #9ca3af; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .hover\\:text-white:hover { color: #ffffff; }
        .hover\\:text-gray-200:hover { color: #e5e7eb; }
        .hover\\:bg-white\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
        .cursor-pointer { cursor: pointer; }
        .rounded { border-radius: 0.25rem; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .z-50 { z-index: 50; }
        .z-40 { z-index: 40; }
        .z-30 { z-index: 30; }
        .overflow-hidden { overflow: hidden; }
        .overflow-y-auto { overflow-y: auto; }
        .overflow-x-auto { overflow-x: auto; }
        .max-h-\\[80vh\\] { max-height: 80vh; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .ml-4 { margin-left: 1rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .pb-10 { padding-bottom: 2.5rem; }
        .text-\\[10px\\] { font-size: 10px; }
        .border-t-2 { border-top-width: 2px; }
        .border-t-blue-500 { border-top-color: #3b82f6; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}} />
    </div>
  );
}

function FileTree({ nodes, onSelect, activeId }: { nodes: FileNode[], onSelect: (node: FileNode) => void, activeId?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {nodes.map(node => (
        <div key={node.id} className="flex flex-col">
          <div 
            className={clsx(
              "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-all text-xs",
              activeId === node.id ? "bg-blue-500/20 text-blue-300" : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
            )}
            onClick={() => onSelect(node)}
          >
            {node.type === 'folder' ? (
              node.isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              getFileIcon(node.name)
            )}
            {node.name}
          </div>
          {node.type === 'folder' && node.isOpen && node.children && (
            <div className="ml-4 border-l border-white/5 pl-1 mt-1">
              <FileTree nodes={node.children} onSelect={onSelect} activeId={activeId} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getFileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-purple-400" />;
  return <FileText className="w-3.5 h-3.5 text-gray-500" />;
}
