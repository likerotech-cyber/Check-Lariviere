/*
  # Add tutorial video URL to checklist items

  1. Changes
    - Add `tutorial_video_url` column to `checklist_items` table
    - This column will store YouTube or video URLs for tutorials on how to check/repair each item
    - Column is optional (nullable) as not all items may have videos initially
  
  2. Notes
    - Videos can be added progressively over time
    - URL format is flexible to support various video platforms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checklist_items' AND column_name = 'tutorial_video_url'
  ) THEN
    ALTER TABLE checklist_items ADD COLUMN tutorial_video_url text;
  END IF;
END $$;
