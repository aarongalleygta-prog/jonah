-- =========================================================
-- Smart Emergency Response & Community Help System
-- Database Schema (MySQL)
-- =========================================================

CREATE DATABASE IF NOT EXISTS emergency_response;
USE emergency_response;

-- ---------------------------------------------------------
-- USERS
-- Covers citizens, responders, and admins via a single table
-- distinguished by `role`. Keeps auth logic simple for a
-- final-year project while still being realistic.
-- ---------------------------------------------------------
CREATE TABLE users (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    full_name         VARCHAR(100)      NOT NULL,
    email             VARCHAR(150)      NOT NULL UNIQUE,
    phone             VARCHAR(20)       NOT NULL,
    password_hash     VARCHAR(255)      NOT NULL,
    emergency_contact VARCHAR(20)       NULL,
    role              ENUM('citizen','responder','admin') NOT NULL DEFAULT 'citizen',
    responder_category ENUM('medical','fire','security','accident','flood','other') NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- EMERGENCIES
-- Core table: one row per reported incident.
-- ---------------------------------------------------------
CREATE TABLE emergencies (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id     INT NOT NULL,
    type            ENUM('medical','fire','security','accident','flood','other') NOT NULL,
    description     TEXT NULL,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    address_text    VARCHAR(255) NULL,
    priority        ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    status          ENUM('reported','accepted','responding','resolved') NOT NULL DEFAULT 'reported',
    assigned_to     INT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- STATUS_HISTORY
-- Audit trail of every status change, used for the
-- "average response time" analytics later.
-- ---------------------------------------------------------
CREATE TABLE status_history (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    emergency_id  INT NOT NULL,
    old_status    VARCHAR(20) NULL,
    new_status    VARCHAR(20) NOT NULL,
    changed_by    INT NULL,
    changed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Helpful indexes for dashboard filtering and analytics
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_type ON emergencies(type);
CREATE INDEX idx_emergencies_created ON emergencies(created_at);

-- ---------------------------------------------------------
-- Seed an admin account for first login
-- Password below is the bcrypt hash for: Admin@123
-- ---------------------------------------------------------
INSERT INTO users (full_name, email, phone, password_hash, role)
VALUES ('System Admin', 'admin@emergency.local', '0000000000',
'$2a$10$Y.JjrkWhB09GH94TIwdfYeobLMjgJDXmd3gyVVygZhqbnhGU59OmS', 'admin');
