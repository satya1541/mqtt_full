-- Migration to add string value support to readings table
-- Run this on your MySQL database: DGMR at 40.192.42.60

USE DGMR;

-- Add string_value column and make value nullable
ALTER TABLE readings 
  MODIFY value FLOAT NULL,
  ADD COLUMN string_value TEXT NULL;

-- Verify the changes
DESCRIBE readings;
