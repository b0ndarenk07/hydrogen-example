import {useState, useEffect} from 'react';
import {useCart} from '@shopify/hydrogen';
import {Button, Text, Heading} from '~/components';

interface HederaPaymentProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function HederaPayment({onSuccess, onCancel}: HederaPaymentProps) {
  const {cost, lines} = useCart();
  const [accountId, setAccountId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    merchantAccountId: string;
    amount: string;
    memo: string;
  } | null>(null);

  useEffect(() => {
    fetchMerchantDetails();
  }, []);

  async function fetchMerchantDetails() {
    try {
      const response = await fetch('/api/hedera/merchant-details');
      const data = await response.json();
      setPaymentDetails(data);
    } catch (err) {
      setError('Failed to load payment details');
    }
  }

  async function connectWallet() {
    setIsConnecting(true);
    setError(null);

    try {
      if (!(window as any).hashconnect) {
        throw new Error('HashConnect wallet extension not found. Please install it first.');
      }

      const hashconnect = (window as any).hashconnect;
      const appMetadata = {
        name: 'Hydrogen Store',
        description: 'Shopify Hydrogen Store',
        icon: window.location.origin + '/favicon.svg',
      };

      await hashconnect.init(appMetadata, 'mainnet', false);
      const state = await hashconnect.connect();

      if (state.pairingData && state.pairingData.accountIds.length > 0) {
        setAccountId(state.pairingData.accountIds[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }

  async function processPayment() {
    if (!accountId || !paymentDetails) {
      setError('Wallet not connected or payment details not loaded');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderData = {
        items: lines.map(line => ({
          variantId: line.merchandise.id,
          quantity: line.quantity,
          title: line.merchandise.product.title,
        })),
        totalAmount: cost?.totalAmount?.amount,
      };

      const response = await fetch('/api/hedera/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderAccountId: accountId,
          orderData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment transaction');
      }

      const {transactionBytes, paymentId} = await response.json();

      const hashconnect = (window as any).hashconnect;
      const result = await hashconnect.sendTransaction(
        accountId,
        transactionBytes
      );

      await fetch('/api/hedera/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          transactionId: result.transactionId,
        }),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!paymentDetails) {
    return (
      <div className="flex items-center justify-center p-8">
        <Text>Loading payment details...</Text>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-6 bg-contrast border border-primary/10 rounded">
      <Heading as="h3" size="lead">
        Pay with Hedera
      </Heading>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <Text className="text-red-900">{error}</Text>
        </div>
      )}

      <div className="grid gap-4">
        <div className="flex justify-between">
          <Text color="subtle">Total Amount (HBAR)</Text>
          <Text className="font-medium">{paymentDetails.amount}</Text>
        </div>
        <div className="flex justify-between">
          <Text color="subtle">Merchant Account</Text>
          <Text className="font-mono text-sm">{paymentDetails.merchantAccountId}</Text>
        </div>
      </div>

      {!accountId ? (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          width="full"
        >
          {isConnecting ? 'Connecting Wallet...' : 'Connect Hedera Wallet'}
        </Button>
      ) : (
        <div className="grid gap-4">
          <div className="p-4 bg-primary/5 rounded">
            <Text color="subtle" size="fine">Connected Account</Text>
            <Text className="font-mono text-sm mt-1">{accountId}</Text>
          </div>
          <Button
            onClick={processPayment}
            disabled={isProcessing}
            width="full"
          >
            {isProcessing ? 'Processing Payment...' : 'Complete Payment'}
          </Button>
        </div>
      )}

      <Button
        onClick={onCancel}
        variant="secondary"
        width="full"
      >
        Cancel
      </Button>
    </div>
  );
}
