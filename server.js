const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const dialog = require('dialog-node');

const app = express();
const PORT = 3001;
const ROOT_DIR = process.cwd();

app.use(cors());
app.use(express.json());

// Helper to get file tree
async function getFileTree(dir) {
  try {
    const stats = await fs.stat(dir);
    const name = path.basename(dir);
    const id = path.relative(ROOT_DIR, dir) || 'root';

    if (!stats.isDirectory()) {
      return { id, name, type: 'file', language: getLanguage(name) };
    }

    const children = await fs.readdir(dir);
    const childNodes = await Promise.all(
      children
        .filter(child => !['node_modules', '.git', 'dist'].includes(child))
        .map(async (child) => {
          try {
            return await getFileTree(path.join(dir, child));
          } catch (e) {
            return null;
          }
        })
    );

    return {
      id,
      name,
      type: 'folder',
      children: childNodes.filter(n => n !== null).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
    };
  } catch (err) {
    return null;
  }
}

function getLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.js': return 'javascript';
    case '.ts':
    case '.tsx': return 'typescript';
    case '.json': return 'json';
    case '.css': return 'css';
    case '.html': return 'html';
    case '.md': return 'markdown';
    default: return 'plaintext';
  }
}

// API Routes
app.get('/api/files', async (req, res) => {
  try {
    const tree = await getFileTree(ROOT_DIR);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/file/:path*', async (req, res) => {
  try {
    const filePath = path.join(ROOT_DIR, req.params.path + (req.params[0] || ''));
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    await fs.writeFile(path.join(ROOT_DIR, filePath), content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Новая ручка для сохранения в любое место (Save As)
app.post('/api/save-as', (req, res) => {
  const { content } = req.body;
  
  // Внимание: dialog-node может потребовать установленных системных диалогов (zenity, kdialog или powershell)
  // Мы используем powershell для надежности на Windows через exec
  const psCommand = `
    $ErrorActionPreference = "Stop"
    Add-Type -AssemblyName System.Windows.Forms
    $FileBrowser = New-Object System.Windows.Forms.SaveFileDialog
    $FileBrowser.Filter = "All Files (*.*)|*.*"
    $FileBrowser.Title = "Save File As"
    $Show = $FileBrowser.ShowDialog()
    if ($Show -eq "OK") {
        Write-Output $FileBrowser.FileName
    }
  `;

  exec(`powershell.exe -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, async (error, stdout) => {
    if (error || !stdout.trim()) {
      return res.json({ success: false, error: 'User cancelled or error occurred' });
    }
    
    const filePath = stdout.trim();
    try {
      await fs.writeFile(filePath, content);
      res.json({ success: true, path: filePath });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.post('/api/terminal', (req, res) => {
  const { command } = req.body;
  exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
    res.json({ stdout, stderr, error: error ? error.message : null });
  });
});

app.listen(PORT, () => {
  console.log(`IDE Backend running at http://localhost:${PORT}`);
});
