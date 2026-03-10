import type {HydrogenApiRouteOptions, HydrogenRequest} from '@shopify/hydrogen';

export async function api(
  request: HydrogenRequest,
  {}: HydrogenApiRouteOptions,
) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {Allow: 'GET'},
    });
  }

  const merchantAccountId = process.env.HEDERA_MERCHANT_ACCOUNT_ID;

  if (!merchantAccountId) {
    return new Response(
      JSON.stringify({error: 'Merchant account not configured'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      },
    );
  }

  return new Response(
    JSON.stringify({
      merchantAccountId,
      amount: '0',
      memo: 'Hydrogen Store Payment',
    }),
    {
      headers: {'Content-Type': 'application/json'},
    },
  );
}
