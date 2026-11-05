-- ============================================
-- Starter App Database Schema
-- Edit / extend these tables for your own app.
-- ============================================

PRAGMA foreign_keys = ON;

-- Example table: items
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
