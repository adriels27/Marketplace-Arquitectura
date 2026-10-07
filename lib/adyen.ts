import "server-only";
import { CheckoutAPI, Client, EnvironmentEnum } from "@adyen/api-library";

// Flujo "Sessions" del ejemplo oficial adyen-node-online-payments (checkout-example).
export function getAdyenConfig() {
  const apiKey = process.env.ADYEN_API_KEY;
  const clientKey = process.env.ADYEN_CLIENT_KEY;
  const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
  if (!apiKey || !clientKey || !merchantAccount) {
    throw new Error("Configura ADYEN_API_KEY, ADYEN_CLIENT_KEY y ADYEN_MERCHANT_ACCOUNT en .env.local.");
  }
  return { apiKey, clientKey, merchantAccount };
}

export function getCheckoutApi() {
  const { apiKey } = getAdyenConfig();
  // Por defecto TEST (no cobra dinero). Para producción real hace falta cuenta LIVE aprobada por Adyen.
  const client = new Client({ apiKey, environment: EnvironmentEnum.TEST });
  return new CheckoutAPI(client);
}

export const PAYMENT_CURRENCY = "USD";
export const PAYMENT_COUNTRY = "EC";
