import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getDatabase } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para /public/index.html
app.get('/public/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Registro de niñera
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const db = await getDatabase();
    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();

    await db.run(
      'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
      [userId, email, hashedPassword, name]
    );

    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Niñera registrada exitosamente',
      token,
      user: { id: userId, email, name }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login de niñera
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const db = await getDatabase();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcryptjs.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RUTAS DE RUTINAS SEMANALES ====================

// Crear nueva rutina semanal
app.post('/api/routines', authenticateToken, async (req, res) => {
  try {
    const { childName, ageRange, weekNumber, modelType, routineData } = req.body;
    const userId = req.user.id;

    if (!childName || !ageRange || !weekNumber || !modelType) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const db = await getDatabase();
    const routineId = uuidv4();

    await db.run(
      `INSERT INTO weekly_routines (id, user_id, child_name, age_range, week_number, model_type, routine_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [routineId, userId, childName, ageRange, weekNumber, modelType, JSON.stringify(routineData)]
    );

    // Registrar en historial
    await db.run(
      'INSERT INTO routine_history (id, routine_id, user_id, action) VALUES (?, ?, ?, ?)',
      [uuidv4(), routineId, userId, 'created']
    );

    res.status(201).json({
      message: 'Rutina creada exitosamente',
      routine: { id: routineId, childName, ageRange, weekNumber, modelType }
    });
  } catch (error) {
    console.error('Error al crear rutina:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las rutinas del usuario
app.get('/api/routines', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDatabase();

    const routines = await db.all(
      `SELECT id, child_name, age_range, week_number, model_type, created_at, updated_at
       FROM weekly_routines WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ routines });
  } catch (error) {
    console.error('Error al obtener rutinas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener una rutina específica
app.get('/api/routines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = await getDatabase();

    const routine = await db.get(
      `SELECT * FROM weekly_routines WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    routine.routine_data = JSON.parse(routine.routine_data);

    res.json({ routine });
  } catch (error) {
    console.error('Error al obtener rutina:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar rutina
app.put('/api/routines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { routineData } = req.body;
    const userId = req.user.id;
    const db = await getDatabase();

    const routine = await db.get(
      'SELECT * FROM weekly_routines WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    await db.run(
      `UPDATE weekly_routines SET routine_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify(routineData), id]
    );

    // Registrar en historial
    await db.run(
      'INSERT INTO routine_history (id, routine_id, user_id, action) VALUES (?, ?, ?, ?)',
      [uuidv4(), id, userId, 'updated']
    );

    res.json({ message: 'Rutina actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar rutina:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar rutina
app.delete('/api/routines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = await getDatabase();

    const routine = await db.get(
      'SELECT * FROM weekly_routines WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    await db.run('DELETE FROM weekly_routines WHERE id = ?', [id]);

    res.json({ message: 'Rutina eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rutina:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RUTAS DE FICHAS ====================

// Obtener todas las fichas (sin autenticación, públicas)
app.get('/api/activities', async (req, res) => {
  try {
    const activitiesPath = path.join(__dirname, 'data', 'all_activities.json');
    const activitiesData = fs.readFileSync(activitiesPath, 'utf-8');
    const activities = JSON.parse(activitiesData);
    
    res.json({
      message: 'Fichas de estimulación disponibles',
      data: activities
    });
  } catch (error) {
    console.error('Error al cargar fichas:', error);
    res.status(500).json({ error: 'Error al cargar las fichas' });
  }
});

// Obtener fichas por rango de edad
app.get('/api/activities/:ageRange', async (req, res) => {
  try {
    const { ageRange } = req.params;
    const activitiesPath = path.join(__dirname, 'data', 'all_activities.json');
    const activitiesData = fs.readFileSync(activitiesPath, 'utf-8');
    const activities = JSON.parse(activitiesData);
    
    if (!activities[ageRange]) {
      return res.status(404).json({ error: 'Rango de edad no encontrado' });
    }
    
    res.json({
      ageRange,
      data: activities[ageRange]
    });
  } catch (error) {
    console.error('Error al cargar fichas:', error);
    res.status(500).json({ error: 'Error al cargar las fichas' });
  }
});

// ==================== SALUD DEL SERVIDOR ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// ==================== INICIAR SERVIDOR ====================

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Servidor Genius Portal ejecutándose en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
