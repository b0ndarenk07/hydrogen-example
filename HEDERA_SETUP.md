# Hedera Payment Integration Setup Guide

This guide will help you set up Hedera cryptocurrency payments in your Hydrogen store.

## Overview

The integration allows customers to pay for products using HBAR cryptocurrency on the Hedera network. Payments are processed through HashConnect wallet and verified using Hedera's Mirror Node API.

## Prerequisites

1. A Hedera account (merchant account) to receive payments
2. Supabase project for payment tracking
3. HashConnect wallet extension for testing

## Setup Steps

### 1. Create a Hedera Account

Visit [Hedera Portal](https://portal.hedera.com/) to create a mainnet account. Save your account ID in format `0.0.XXXXXX`.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Hedera Configuration
HEDERA_MERCHANT_ACCOUNT_ID=0.0.123456
HEDERA_HBAR_PRICE_USD=0.05
HEDERA_MIRROR_NODE_URL=https://mainnet-public.mirrornode.hedera.com
```

**Important Notes:**
- `HEDERA_MERCHANT_ACCOUNT_ID`: Your Hedera account that will receive payments
- `HEDERA_HBAR_PRICE_USD`: Current HBAR price in USD for conversion
- Update the HBAR price regularly or integrate a price feed API

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

This will install:
- `@supabase/supabase-js` for database operations
- HashConnect SDK (loaded in browser)

### 4. Database Migration

The database table `hedera_payments` has been automatically created with the following schema:

- `id`: Unique payment identifier
- `payment_id`: Payment reference
- `sender_account_id`: Customer's Hedera account
- `merchant_account_id`: Your merchant account
- `amount_hbar`: Payment amount in HBAR
- `amount_usd`: Equivalent USD amount
- `transaction_id`: Hedera transaction ID
- `status`: Payment status (pending, completed, failed)
- `order_data`: JSON with order details
- `created_at`: Payment creation timestamp
- `completed_at`: Payment completion timestamp

### 5. Install HashConnect Wallet

For testing:
1. Install [HashConnect browser extension](https://www.hashpack.app/hashconnect)
2. Create a testnet account for testing
3. Fund it with test HBAR from [Hedera testnet faucet](https://portal.hedera.com/faucet)

## Usage

### Customer Flow

1. Customer adds products to cart
2. In cart, clicks "Pay with Hedera" button
3. Redirected to `/hedera-checkout`
4. Connects HashConnect wallet
5. Reviews payment details (HBAR amount, merchant account)
6. Confirms payment in wallet
7. Transaction is verified via Mirror Node
8. Payment marked as completed in database
9. Success message displayed

### Accessing Hedera Checkout

The Hedera payment option appears in:
- Cart page (`/cart`)
- Cart drawer

Button text: "Pay with Hedera"

## API Endpoints

### GET `/api/hedera/merchant-details`
Returns merchant account ID and payment details.

### POST `/api/hedera/create-payment`
Creates a payment record and returns transaction details.

**Request Body:**
```json
{
  "senderAccountId": "0.0.123456",
  "orderData": {
    "items": [...],
    "totalAmount": "99.99"
  }
}
```

**Response:**
```json
{
  "paymentId": "HED-1234567890-abc123",
  "transactionBytes": "base64_encoded_transaction",
  "amount": "1999.80000000"
}
```

### POST `/api/hedera/verify-payment`
Verifies transaction on Hedera network and updates payment status.

**Request Body:**
```json
{
  "paymentId": "HED-1234567890-abc123",
  "transactionId": "0.0.123456@1234567890.123456789"
}
```

## Security Considerations

1. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it to the client
2. **Transaction Verification**: All transactions are verified via Mirror Node before marking as complete
3. **Row Level Security**: Database policies ensure users can only view their own payments
4. **Amount Validation**: Transaction amounts are verified to match expected payment amounts

## Testing

### Testnet Testing

1. Switch `HEDERA_MIRROR_NODE_URL` to testnet:
   ```
   HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
   ```

2. Use testnet account IDs

3. Fund accounts using testnet faucet

### Test Transaction Flow

1. Add products to cart
2. Navigate to Hedera checkout
3. Connect HashConnect wallet (testnet)
4. Complete payment
5. Check Supabase database for payment record
6. Verify transaction on [HashScan](https://hashscan.io/testnet/dashboard)

## Monitoring

Monitor payments in Supabase:

```sql
SELECT
  payment_id,
  sender_account_id,
  amount_hbar,
  amount_usd,
  status,
  transaction_id,
  created_at,
  completed_at
FROM hedera_payments
ORDER BY created_at DESC;
```

## Troubleshooting

### "HashConnect wallet extension not found"
- Install HashConnect wallet extension
- Refresh the page

### "Transaction verification failed"
- Check Mirror Node URL is correct
- Verify transaction was successful on HashScan
- Ensure merchant account ID matches

### "Payment not found"
- Check database connection
- Verify payment was created successfully
- Check Supabase logs

## Production Considerations

1. **HBAR Price Feed**: Integrate real-time price API instead of static value
2. **Error Handling**: Add comprehensive error logging and monitoring
3. **Order Fulfillment**: Connect payment completion to order fulfillment system
4. **Refunds**: Implement refund process for failed orders
5. **Rate Limiting**: Add rate limiting to API endpoints
6. **Webhooks**: Consider adding webhooks for payment notifications

## Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [HashConnect Documentation](https://docs.hashconnect.hashpack.app/)
- [Mirror Node API](https://docs.hedera.com/guides/docs/mirror-node-api)
- [Supabase Documentation](https://supabase.com/docs)

## Support

For issues related to:
- Hedera network: [Hedera Discord](https://hedera.com/discord)
- HashConnect: [HashPack Support](https://www.hashpack.app/support)
- Supabase: [Supabase Support](https://supabase.com/support)
