-- MedPronto Neon Database Schema
-- SQL for your Neon Console (SQL Editor)

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    age TEXT,
    email TEXT,
    birth_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    crm TEXT UNIQUE NOT NULL,
    cpf TEXT UNIQUE, -- Added for Bird ID
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    specialty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atestados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- Format: MP-XXXXXXXX
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    patient_name TEXT,
    doctor_name TEXT,
    doctor_crm TEXT,
    days_off INTEGER,
    cid TEXT,
    content TEXT, -- Digital content for dynamic preview
    download_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    pdf_path TEXT, -- URL to PDF file (optional now)
    notes TEXT,
    prescriptions TEXT,
    exams TEXT,
    content TEXT, -- Full digital content
    validation_code TEXT,
    download_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    complaint TEXT NOT NULL,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'in-consultation'
    doctor_id UUID REFERENCES doctors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
