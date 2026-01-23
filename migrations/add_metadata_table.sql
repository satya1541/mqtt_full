-- Migration to add metadata table
-- Run this on your MySQL database: DGMR at 40.192.42.60

USE DGMR;

-- Create metadata table
CREATE TABLE IF NOT EXISTS metadata (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  original_key VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_key (original_key, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_metadata_user ON metadata(user_id);
CREATE INDEX idx_metadata_key ON metadata(original_key);

-- Verify the changes
DESCRIBE metadata;
