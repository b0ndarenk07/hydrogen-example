import {Suspense, useState} from 'react';
import {Seo, useCart} from '@shopify/hydrogen';
import {PageHeader, Section, Text} from '~/components';
import {Layout} from '~/components/index.server';
import {HederaPayment} from '~/components/payment';

export default function HederaCheckout() {
  return (
    <Layout>
      <Suspense>
        <Seo type="page" data={{title: 'Hedera Checkout'}} />
      </Suspense>
      <PageHeader heading="Complete Your Payment" className="max-w-7xl mx-auto" />
      <Section className="max-w-2xl mx-auto">
        <CheckoutContent />
      </Section>
    </Layout>
  );
}

function CheckoutContent() {
  const {lines, cost} = useCart();
  const [paymentComplete, setPaymentComplete] = useState(false);

  if (paymentComplete) {
    return (
      <div className="grid gap-6 p-8 text-center bg-primary/5 rounded">
        <div className="text-5xl">✓</div>
        <div>
          <Text as="h2" size="lead" className="font-bold">
            Payment Successful
          </Text>
          <Text className="mt-2" color="subtle">
            Your Hedera payment has been confirmed. Thank you for your order.
          </Text>
        </div>
        <a
          href="/"
          className="inline-block px-6 py-3 mt-4 text-contrast bg-primary rounded"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="grid gap-6 p-8 text-center">
        <Text as="h2" size="lead">
          Your cart is empty
        </Text>
        <a
          href="/products"
          className="inline-block px-6 py-3 mt-4 text-contrast bg-primary rounded"
        >
          Browse Products
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 p-6 bg-primary/5 rounded">
        <Text as="h3" size="lead" className="font-bold">
          Order Summary
        </Text>
        <div className="grid gap-2">
          {lines.map((line) => (
            <div key={line.id} className="flex justify-between">
              <Text>
                {line.merchandise.product.title} x {line.quantity}
              </Text>
              <Text className="font-medium">
                {line.cost.totalAmount.currencyCode} {line.cost.totalAmount.amount}
              </Text>
            </div>
          ))}
        </div>
        <div className="pt-4 mt-4 border-t border-primary/10">
          <div className="flex justify-between">
            <Text size="lead" className="font-bold">
              Total
            </Text>
            <Text size="lead" className="font-bold">
              {cost?.totalAmount?.currencyCode} {cost?.totalAmount?.amount}
            </Text>
          </div>
        </div>
      </div>

      <HederaPayment
        onSuccess={() => setPaymentComplete(true)}
        onCancel={() => (window.location.href = '/cart')}
      />

      <div className="p-4 text-sm bg-primary/5 rounded">
        <Text color="subtle" size="fine">
          You will need a Hedera wallet with HashConnect browser extension installed to complete this payment.
          The payment will be processed on the Hedera network.
        </Text>
      </div>
    </div>
  );
}
