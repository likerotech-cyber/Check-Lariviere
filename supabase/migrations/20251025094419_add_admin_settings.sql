/*
  # Add Admin Settings and Repair Templates
  
  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `hourly_rate` (numeric) - Hourly labor rate in currency
      - `updated_at` (timestamptz)
    
    - `repair_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name (e.g., "Tune-up", "Brake repair")
      - `description` (text) - Description of the repair
      - `estimated_minutes` (integer) - Estimated time in minutes
      - `vehicle_type` (text) - Type of vehicle (bike/scooter/both)
      - `is_active` (boolean) - Whether template is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read
    - Add policies for authenticated users to manage (assuming admin role)

  3. Initial Data
    - Insert default hourly rate
    - Insert common repair templates
*/

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hourly_rate numeric DEFAULT 60 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update admin settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default admin settings if not exists
INSERT INTO admin_settings (hourly_rate)
SELECT 60
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Create repair_templates table
CREATE TABLE IF NOT EXISTS repair_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  estimated_minutes integer DEFAULT 0 NOT NULL,
  vehicle_type text DEFAULT 'both' NOT NULL CHECK (vehicle_type IN ('bike', 'scooter', 'both')),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE repair_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active repair templates"
  ON repair_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert repair templates"
  ON repair_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update repair templates"
  ON repair_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete repair templates"
  ON repair_templates FOR DELETE
  TO authenticated
  USING (true);

-- Insert common repair templates
INSERT INTO repair_templates (name, description, estimated_minutes, vehicle_type)
VALUES
  ('Mise au point complète', 'Révision générale avec réglages', 45, 'both'),
  ('Réparation freins', 'Remplacement ou ajustement des freins', 30, 'both'),
  ('Changement chaîne', 'Remplacement de la chaîne', 20, 'bike'),
  ('Réparation crevaison', 'Réparation ou remplacement chambre à air', 15, 'both'),
  ('Réglage dérailleur', 'Ajustement du dérailleur avant/arrière', 20, 'bike'),
  ('Changement câbles', 'Remplacement câbles de frein ou vitesse', 30, 'both'),
  ('Révision batterie', 'Vérification et entretien batterie', 25, 'scooter'),
  ('Réparation roue', 'Voilage ou remplacement de roue', 40, 'both')
ON CONFLICT DO NOTHING;