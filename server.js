import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Determine static root directory (prefer dist if exists and has index.html, else root)
const distDir = path.join(__dirname, 'dist');
const staticDir = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : __dirname;

app.use(express.static(staticDir));

app.get('/download-zip', (req, res) => {
  const zipPath = path.join(__dirname, 'mider-source.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'mider-2.0-source.zip');
  } else {
    res.status(404).send('ZIP file not found');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MIDER server running on http://0.0.0.0:${PORT}`);
});
