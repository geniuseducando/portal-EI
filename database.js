import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;

export async function initializeDatabase() {
  if (db) return db;

  db = await open({
    filename: path.join(__dirname, 'genius_portal.db'),
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');

  // Crear tabla de usuarios (niñeras)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Crear tabla de rutinas semanales
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_name TEXT NOT NULL,
      age_range TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      model_type TEXT NOT NULL,
      routine_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Crear tabla de historial
  await db.exec(`
    CREATE TABLE IF NOT EXISTS routine_history (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (routine_id) REFERENCES weekly_routines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Base de datos inicializada correctamente');
  return db;
}

export async function getDatabase() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}
