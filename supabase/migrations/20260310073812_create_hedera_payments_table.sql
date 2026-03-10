/*
  # Create Hedera Payments Table

  1. New Tables
    - `hedera_payments`
      - `id` (uuid, primary key)
      - `payment_id` (text, unique identifier for payment)
      - `sender_account_id` (text, Hedera account that sent payment)
      - `merchant_account_id` (text, merchant's Hedera account)
      - `amount_hbar` (decimal, amount in HBAR)
      - `amount_usd` (decimal, equivalent USD amount at time of payment)
      - `transaction_id` (text, Hedera transaction ID)
      - `status` (text, payment status: pending, completed, failed)
      - `order_data` (jsonb, order details)
      - `created_at` (timestamptz, when payment was initiated)
      - `completed_at` (timestamptz, when payment was confirmed)
      - `memo` (text, payment memo)

  2. Security
    - Enable RLS on `hedera_payments` table
    - Add policy for authenticated users to view their own payments
    - Add policy for service role to manage all payments
*/

CREATE TABLE IF NOT EXISTS hedera_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL,
  sender_account_id text NOT NULL,
  merchant_account_id text NOT NULL,
  amount_hbar decimal(20, 8) NOT NULL,
  amount_usd decimal(10, 2),
  transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  order_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  memo text
);

ALTER TABLE hedera_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON hedera_payments
  FOR SELECT
  TO authenticated
  USING (sender_account_id = current_setting('request.jwt.claims', true)::json->>'hedera_account_id');

CREATE POLICY "Service role can insert payments"
  ON hedera_payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON hedera_payments
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hedera_payments_payment_id ON hedera_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_hedera_payments_transaction_id ON hedera_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_hedera_payments_status ON hedera_payments(status);
CREATE INDEX IF NOT EXISTS idx_hedera_payments_sender ON hedera_payments(sender_account_id);
