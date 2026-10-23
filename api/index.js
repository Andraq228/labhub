const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JSONBIN_MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

const fallbackLabs = [
  { id:'1', title:'Лабораторная работа №1', subject:'Информатика', description:'Введение в алгоритмы сортировки. Реализация пузырьковой, выбором и вставками.', content:'## Цель работы\nИзучить алгоритмы сортировки.\n\n## Задание\n1. Реализовать пузырьковую сортировку\n2. Реализовать сортировку выбором\n3. Сравнить время работы\n\n## Теория\nВременная сложность пузырьковой сортировки O(n²).', fileUrl:null, fileName:null, createdAt:'2026-01-15T10:00:00.000Z' },
  { id:'2', title:'Лабораторная работа №2', subject:'Математика', description:'Численные методы решения уравнений: метод бисекции и метод Ньютона.', content:'## Цель работы\nОсвоить численные методы.\n\n## Задание\n1. Реализовать метод бисекции\n2. Реализовать метод Ньютона\n3. Сравнить скорость сходимости\n\n## Теория\nМетод Ньютона — квадратичная сходимость.', fileUrl:null, fileName:null, createdAt:'2026-01-20T10:00:00.000Z' },
  { id:'3', title:'Лабораторная работа №3', subject:'Физика', description:'Законы механики. Второй закон Ньютона, импульс, кинетическая и потенциальная энергия.', content:'## Цель работы\nПроверить законы классической механики.\n\n## Задание\n1. Измерить ускорение тела\n2. Вычислить силу\n3. Проверить закон сохранения энергии\n\n## Теория\nВторой закон Ньютона: F = ma. Закон сохранения импульса: p = mv.', fileUrl:null, fileName:null, createdAt:'2026-02-01T10:00:00.000Z' },
  { id:'4', title:'Лабораторная работа №4', subject:'Программирование', description:'REST API на Node.js и Express. CRUD операции, маршрутизация, тестирование.', content:'## Цель работы\nСоздать RESTful API на Node.js.\n\n## Задание\n1. Создать сервер на Express\n2. Реализовать GET, POST, PUT, DELETE\n3. Протестировать в Postman\n\n## Теория\nREST — архитектурный стиль для веб-сервисов.', fileUrl:null, fileName:null, createdAt:'2026-02-10T10:00:00.000Z' },
  { id:'5', title:'Лабораторная работа №5', subject:'Базы данных', description:'Проектирование реляционных баз данных. Нормализация, SQL запросы, индексы.', content:'## Цель работы\nПроектировать реляционные БД.\n\n## Задание\n1. Нарисовать ER-диаграмму\n2. Создать таблицы в PostgreSQL\n3. Написать SQL запросы\n4. Оптимизировать с индексами\n\n## Теория\nНормализация уменьшает избыточность данных.', fileUrl:null, fileName:null, createdAt:'2026-02-15T10:00:00.000Z' },
  { id:'6', title:'Лабораторная работа №6', subject:'Сети', description:'Протоколы TCP/IP. Настройка сети и анализ трафика в Wireshark.', content:'## Цель работы\nИзучить стек протоколов TCP/IP.\n\n## Задание\n1. Настроить виртуальную сеть\n2. Анализировать трафик в Wireshark\n3. Изучить заголовки пакетов\n\n## Теория\nTCP обеспечивает надёжную доставку данных.', fileUrl:null, fileName:null, createdAt:'2026-03-01T10:00:00.000Z' }
];


async function getBins() {
  if (!JSONBIN_MASTER_KEY || !JSONBIN_BIN_ID || JSONBIN_BIN_ID === 'yourBinIdHere') {
    return fallbackLabs;
  }
  try {
    const res = await axios.get(`${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
    return res.data.record.labs || [];
  } catch {
    return fallbackLabs;
  }
}

async function saveBins(labs) {
  if (!JSONBIN_MASTER_KEY || !JSONBIN_BIN_ID || JSONBIN_BIN_ID === 'yourBinIdHere') return;
  await axios.put(`${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}`, { labs }, {
    headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'Content-Type': 'application/json' }
  });
}

app.get('/api/labs', async (req, res) => {
  try {
    const labs = await getBins();
    res.json({ success: true, labs });
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
    const labs = await getBins();
    const newLab = {
      id: Date.now().toString(), title, subject, description,
      content: content || description,
      fileUrl: fileUrl || null, fileName: fileName || null,
      createdAt: new Date().toISOString()
    };
    labs.unshift(newLab);
    await saveBins(labs);
    res.json({ success: true, lab: newLab });
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
    let labs = await getBins();
    const before = labs.length;
    labs = labs.filter(l => l.id !== req.params.id);
    if (labs.length === before) return res.status(404).json({ success: false, error: 'Лаба не найдена' });
    await saveBins(labs);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

if (require.main === module) {
  app.listen(3001, () => console.log('API running on http://localhost:3001'));
}

module.exports = app;

