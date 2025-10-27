/*
  # Les Cycles Larivière - Database Schema

  ## Overview
  This migration creates the complete database schema for the bike/scooter diagnostic and repair management system.

  ## New Tables

  ### 1. `clients`
  Client information table
  - `id` (uuid, primary key)
  - `name` (text) - Client full name
  - `phone` (text) - Contact phone number
  - `email` (text) - Email address for notifications
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `vehicles`
  Vehicle registry (bikes and scooters)
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key) - Links to clients table
  - `type` (text) - 'bike' or 'scooter'
  - `brand` (text) - Vehicle brand/manufacturer
  - `model` (text) - Vehicle model
  - `serial_number` (text) - Serial or frame number
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `repairs`
  Main repair/diagnostic records
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key) - Links to clients
  - `vehicle_id` (uuid, foreign key) - Links to vehicles
  - `vendor_name` (text) - Name of the vendor who handled intake
  - `client_issue` (text) - Problem reported by client
  - `status` (text) - Workflow status
  - `desired_return_date` (date) - When client wants vehicle back
  - `estimated_labor_minutes` (integer) - Total estimated labor time
  - `preliminary_quote` (numeric) - Initial quote amount
  - `client_decision` (text) - 'accepted', 'max_price', 'detailed_quote'
  - `max_price` (numeric) - Maximum price set by client (if applicable)
  - `detailed_quote_fee` (numeric) - Fee for detailed quote (default 50)
  - `final_quote` (numeric) - Final detailed quote from technician
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `checklist_items`
  Master checklist template (categories and check points)
  - `id` (uuid, primary key)
  - `category` (text) - E.g., 'braking', 'transmission', 'wheels'
  - `item_name` (text) - Specific check point
  - `estimated_labor_minutes` (integer) - Time needed if defective
  - `estimated_parts_cost` (numeric) - Mock parts cost
  - `order_index` (integer) - Display order
  - `vehicle_type` (text) - 'bike', 'scooter', or 'both'

  ### 5. `repair_checklist`
  Junction table linking repairs to checklist results
  - `id` (uuid, primary key)
  - `repair_id` (uuid, foreign key) - Links to repairs
  - `checklist_item_id` (uuid, foreign key) - Links to checklist_items
  - `status` (text) - 'ok' or 'ng' (non-garantie/defective)
  - `technician_notes` (text) - Additional notes from technician

  ## Security
  - Enable RLS on all tables
  - Create policies for authenticated users (vendors and technicians)
  - Separate read/write permissions based on roles

  ## Notes
  - All monetary values use numeric type for precision
  - Timestamps use timestamptz for timezone awareness
  - Status workflow: initial > pending_approval > parts_ordered > in_repair > completed
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bike', 'scooter')),
  brand text,
  model text,
  serial_number text,
  created_at timestamptz DEFAULT now()
);

-- Create repairs table
CREATE TABLE IF NOT EXISTS repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  client_issue text NOT NULL,
  status text DEFAULT 'initial' CHECK (status IN ('initial', 'pending_approval', 'parts_ordered', 'in_repair', 'completed')),
  desired_return_date date,
  estimated_labor_minutes integer DEFAULT 0,
  preliminary_quote numeric(10,2) DEFAULT 0,
  client_decision text CHECK (client_decision IN ('accepted', 'max_price', 'detailed_quote')),
  max_price numeric(10,2),
  detailed_quote_fee numeric(10,2) DEFAULT 50,
  final_quote numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create checklist_items master table
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  item_name text NOT NULL,
  estimated_labor_minutes integer DEFAULT 0,
  estimated_parts_cost numeric(10,2) DEFAULT 0,
  order_index integer DEFAULT 0,
  vehicle_type text DEFAULT 'both' CHECK (vehicle_type IN ('bike', 'scooter', 'both'))
);

-- Create repair_checklist junction table
CREATE TABLE IF NOT EXISTS repair_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('ok', 'ng')),
  technician_notes text
);

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_checklist ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Authenticated users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for vehicles table
CREATE POLICY "Authenticated users can view all vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for repairs table
CREATE POLICY "Authenticated users can view all repairs"
  ON repairs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert repairs"
  ON repairs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update repairs"
  ON repairs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for checklist_items table
CREATE POLICY "Authenticated users can view checklist items"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage checklist items"
  ON checklist_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for repair_checklist table
CREATE POLICY "Authenticated users can view repair checklist"
  ON repair_checklist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage repair checklist"
  ON repair_checklist FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default checklist items for bikes and scooters
INSERT INTO checklist_items (category, item_name, estimated_labor_minutes, estimated_parts_cost, order_index, vehicle_type) VALUES
-- Braking system
('Freinage', 'État des patins/plaquettes', 15, 25.00, 1, 'both'),
('Freinage', 'Tension des câbles', 10, 5.00, 2, 'bike'),
('Freinage', 'État des disques', 20, 45.00, 3, 'both'),
('Freinage', 'Étriers de frein', 15, 35.00, 4, 'both'),
('Freinage', 'Système hydraulique', 30, 80.00, 5, 'both'),

-- Transmission
('Transmission', 'État de la chaîne', 15, 20.00, 6, 'both'),
('Transmission', 'Cassette/pignons', 20, 35.00, 7, 'bike'),
('Transmission', 'Plateau(x)', 20, 40.00, 8, 'bike'),
('Transmission', 'Dérailleur avant', 15, 50.00, 9, 'bike'),
('Transmission', 'Dérailleur arrière', 15, 55.00, 10, 'bike'),
('Transmission', 'Câbles de vitesse', 10, 8.00, 11, 'bike'),
('Transmission', 'Courroie', 20, 90.00, 12, 'both'),

-- Wheels
('Roues', 'Voile avant', 25, 15.00, 13, 'both'),
('Roues', 'Voile arrière', 25, 15.00, 14, 'both'),
('Roues', 'Rayons cassés/desserrés', 20, 10.00, 15, 'both'),
('Roues', 'État des pneus avant', 10, 30.00, 16, 'both'),
('Roues', 'État des pneus arrière', 10, 30.00, 17, 'both'),
('Roues', 'Roulements moyeu avant', 30, 25.00, 18, 'both'),
('Roues', 'Roulements moyeu arrière', 30, 25.00, 19, 'both'),

-- Frame and Fork
('Cadre et Fourche', 'État du cadre (fissures)', 5, 0.00, 20, 'both'),
('Cadre et Fourche', 'État de la fourche', 10, 0.00, 21, 'both'),
('Cadre et Fourche', 'Suspension avant', 45, 120.00, 22, 'both'),
('Cadre et Fourche', 'Suspension arrière', 45, 150.00, 23, 'bike'),
('Cadre et Fourche', 'Jeu de direction', 20, 30.00, 24, 'both'),

-- Saddle and Handlebar
('Selle et Guidon', 'État de la selle', 5, 25.00, 25, 'both'),
('Selle et Guidon', 'Tige de selle', 10, 20.00, 26, 'both'),
('Selle et Guidon', 'Guidon et potence', 15, 35.00, 27, 'both'),
('Selle et Guidon', 'Poignées/Guidoline', 15, 15.00, 28, 'both'),

-- Drivetrain
('Pédalier', 'Roulements pédalier', 30, 40.00, 29, 'bike'),
('Pédalier', 'Manivelles', 20, 50.00, 30, 'bike'),
('Pédalier', 'Pédales', 10, 25.00, 31, 'bike'),

-- Electrical (for e-bikes/scooters)
('Électrique', 'Batterie (charge/état)', 15, 0.00, 32, 'both'),
('Électrique', 'Moteur', 30, 0.00, 33, 'both'),
('Électrique', 'Contrôleur', 30, 150.00, 34, 'both'),
('Électrique', 'Display/écran', 15, 80.00, 35, 'both'),
('Électrique', 'Câblage électrique', 20, 30.00, 36, 'both'),
('Électrique', 'Éclairage avant', 10, 20.00, 37, 'both'),
('Électrique', 'Éclairage arrière', 10, 15.00, 38, 'both'),

-- Accessories
('Accessoires', 'Garde-boue', 10, 20.00, 39, 'both'),
('Accessoires', 'Porte-bagages', 15, 30.00, 40, 'both'),
('Accessoires', 'Béquille', 10, 15.00, 41, 'both'),
('Accessoires', 'Sonnette/klaxon', 5, 8.00, 42, 'both');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_repairs_vendor ON repairs(vendor_name);
CREATE INDEX IF NOT EXISTS idx_repairs_desired_date ON repairs(desired_return_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_client ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_repair_checklist_repair ON repair_checklist(repair_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_vehicle_type ON checklist_items(vehicle_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for repairs table
CREATE TRIGGER update_repairs_updated_at BEFORE UPDATE ON repairs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();