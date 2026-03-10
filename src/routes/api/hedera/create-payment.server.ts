import type {HydrogenApiRouteOptions, HydrogenRequest} from '@shopify/hydrogen';
import {createClient} from '@supabase/supabase-js';

export async function api(
  request: HydrogenRequest,
  {}: HydrogenApiRouteOptions,
) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {Allow: 'POST'},
    });
  }

  try {
    const {senderAccountId, orderData} = await request.json();

    if (!senderAccountId || !orderData) {
      return new Response(
        JSON.stringify({error: 'Missing required fields'}),
        {
          status: 400,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const merchantAccountId = process.env.HEDERA_MERCHANT_ACCOUNT_ID;
    const hbarPriceUsd = parseFloat(process.env.HEDERA_HBAR_PRICE_USD || '0.05');

    if (!supabaseUrl || !supabaseKey || !merchantAccountId) {
      return new Response(
        JSON.stringify({error: 'Server configuration error'}),
        {
          status: 500,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const totalAmountUsd = parseFloat(orderData.totalAmount || '0');
    const amountHbar = (totalAmountUsd / hbarPriceUsd).toFixed(8);

    const paymentId = `HED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const {error: dbError} = await supabase.from('hedera_payments').insert({
      payment_id: paymentId,
      sender_account_id: senderAccountId,
      merchant_account_id: merchantAccountId,
      amount_hbar: amountHbar,
      amount_usd: totalAmountUsd,
      status: 'pending',
      order_data: orderData,
      memo: `Order ${paymentId}`,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({error: 'Failed to create payment record'}),
        {
          status: 500,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const transactionBytes = Buffer.from(
      JSON.stringify({
        type: 'CRYPTO_TRANSFER',
        from: senderAccountId,
        to: merchantAccountId,
        amount: amountHbar,
        memo: `Order ${paymentId}`,
      })
    ).toString('base64');

    return new Response(
      JSON.stringify({
        paymentId,
        transactionBytes,
        amount: amountHbar,
      }),
      {
        headers: {'Content-Type': 'application/json'},
      },
    );
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({error: error.message || 'Payment creation failed'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      },
    );
  }
}
