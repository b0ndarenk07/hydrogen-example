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
    const {paymentId, transactionId} = await request.json();

    if (!paymentId || !transactionId) {
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

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({error: 'Server configuration error'}),
        {
          status: 500,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {data: payment, error: fetchError} = await supabase
      .from('hedera_payments')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (fetchError || !payment) {
      return new Response(
        JSON.stringify({error: 'Payment not found'}),
        {
          status: 404,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const isVerified = await verifyHederaTransaction(
      transactionId,
      payment.merchant_account_id,
      payment.amount_hbar
    );

    if (!isVerified) {
      return new Response(
        JSON.stringify({error: 'Transaction verification failed'}),
        {
          status: 400,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    const {error: updateError} = await supabase
      .from('hedera_payments')
      .update({
        transaction_id: transactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({error: 'Failed to update payment status'}),
        {
          status: 500,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        transactionId,
        status: 'completed',
      }),
      {
        headers: {'Content-Type': 'application/json'},
      },
    );
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({error: error.message || 'Payment verification failed'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      },
    );
  }
}

async function verifyHederaTransaction(
  transactionId: string,
  expectedRecipient: string,
  expectedAmount: string
): Promise<boolean> {
  const mirrorNodeUrl = process.env.HEDERA_MIRROR_NODE_URL || 'https://mainnet-public.mirrornode.hedera.com';

  try {
    const response = await fetch(
      `${mirrorNodeUrl}/api/v1/transactions/${transactionId}`
    );

    if (!response.ok) {
      console.error('Mirror node response not ok:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data.transactions || data.transactions.length === 0) {
      console.error('No transaction data found');
      return false;
    }

    const transaction = data.transactions[0];

    if (transaction.result !== 'SUCCESS') {
      console.error('Transaction not successful:', transaction.result);
      return false;
    }

    const transfers = transaction.transfers || [];
    const recipientTransfer = transfers.find(
      (t: any) => t.account === expectedRecipient && parseFloat(t.amount) > 0
    );

    if (!recipientTransfer) {
      console.error('Recipient transfer not found');
      return false;
    }

    const receivedAmount = (parseFloat(recipientTransfer.amount) / 100000000).toFixed(8);
    const expectedAmountFloat = parseFloat(expectedAmount);
    const receivedAmountFloat = parseFloat(receivedAmount);

    const tolerance = 0.00000001;
    if (Math.abs(receivedAmountFloat - expectedAmountFloat) > tolerance) {
      console.error('Amount mismatch:', {received: receivedAmount, expected: expectedAmount});
      return false;
    }

    return true;
  } catch (error) {
    console.error('Transaction verification error:', error);
    return false;
  }
}
