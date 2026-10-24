const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JSONBIN_MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

const fallbackLabs = [
  { id:'1', title:'Лабораторная работа №1', subject:'Информатика', description:'Введение в алгоритмы сортировки.', content:'## Цель\nИзучить алгоритмы', fileName:null, fileBinId:null, createdAt:'2026-01-15T10:00:00.000Z' }
];

function isJsonBinConfigured() {
  return JSONBIN_MASTER_KEY && JSONBIN_BIN_ID && JSONBIN_BIN_ID !== 'yourBinIdHere';
}

async function getLabs() {
  if (!isJsonBinConfigured()) return fallbackLabs;
  try {
    const res = await axios.get(`${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
    return res.data.record.labs || [];
  } catch {
    return fallbackLabs;
  }
}

async function saveLabs(labs) {
  if (!isJsonBinConfigured()) return;
  const metaOnly = labs.map(({ fileUrl, ...rest }) => rest);
  await axios.put(`${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}`, { labs: metaOnly }, {
    headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'Content-Type': 'application/json' }
  });
}

async function saveFileToBin(fileUrl, fileName) {
  if (!isJsonBinConfigured() || !fileUrl) return null;
  try {
    const res = await axios.post(`${JSONBIN_BASE}/b`, { fileUrl, fileName }, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'Content-Type': 'application/json', 'X-Bin-Private': 'false' }
    });
    return res.data.metadata.id;
  } catch (e) {
    console.error('saveFileToBin error:', e.message);
    return null;
  }
}

async function getFileFromBin(fileBinId) {
  if (!isJsonBinConfigured() || !fileBinId) return null;
  try {
    const res = await axios.get(`${JSONBIN_BASE}/b/${fileBinId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
    return res.data.record;
  } catch {
    return null;
  }
}

async function deleteFileBin(fileBinId) {
  if (!isJsonBinConfigured() || !fileBinId) return;
  try {
    await axios.delete(`${JSONBIN_BASE}/b/${fileBinId}`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
  } catch (e) {
    console.error('deleteFileBin error:', e.message);
  }
}

app.get('/api/labs', async (req, res) => {
  try {
    const labs = await getLabs();
    res.json({ success: true, labs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/labs/:id/file', async (req, res) => {
  try {
    const labs = await getLabs();
    const lab = labs.find(l => l.id === req.params.id);
    if (!lab) return res.status(404).json({ success: false, error: 'Лаба не найдена' });
    if (!lab.fileBinId) return res.status(404).json({ success: false, error: 'Файл не прикреплён' });
    const file = await getFileFromBin(lab.fileBinId);
    if (!file) return res.status(404).json({ success: false, error: 'Файл не найден' });
    res.json({ success: true, fileUrl: file.fileUrl, fileName: file.fileName });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: Buffer.from(ADMIN_PASSWORD).toString('base64') });
  } else {
    res.status(401).json({ success: false, error: 'Неверный пароль' });
  }
});

app.post('/api/labs', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== Buffer.from(ADMIN_PASSWORD).toString('base64')) {
    return res.status(403).json({ success: false, error: 'Нет доступа' });
  }
  try {
    const { title, subject, description, content, fileUrl, fileName } = req.body;
    if (!title || !subject || !description) {
      return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }
    const labs = await getLabs();
    let fileBinId = null;
    if (fileUrl && fileName) {
      fileBinId = await saveFileToBin(fileUrl, fileName);
    }
    const newLab = {
      id: Date.now().toString(), title, subject, description,
      content: content || description,
      fileName: fileName || null,
      fileBinId: fileBinId || null,
      createdAt: new Date().toISOString()
    };
    labs.unshift(newLab);
    await saveLabs(labs);
    res.json({ success: true, lab: { ...newLab, fileUrl: fileUrl || null } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/labs/:id', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== Buffer.from(ADMIN_PASSWORD).toString('base64')) {
    return res.status(403).json({ success: false, error: 'Нет доступа' });
  }
  try {
    let labs = await getLabs();
    const lab = labs.find(l => l.id === req.params.id);
    if (!lab) return res.status(404).json({ success: false, error: 'Лаба не найдена' });
    if (lab.fileBinId) await deleteFileBin(lab.fileBinId);
    labs = labs.filter(l => l.id !== req.params.id);
    await saveLabs(labs);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

if (require.main === module) {
  app.listen(3001, () => console.log('API running on http://localhost:3001'));
}

module.exports = app;
