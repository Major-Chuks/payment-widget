import { CustomerDataPayload } from "@/api-services/definitions/publicPayments";

export const formatCustomerData = (
  requiresCustomerInfo: boolean | undefined,
  customerInfoData: Record<string, string>,
): CustomerDataPayload | undefined => {
  if (!requiresCustomerInfo) return undefined;

  const {
    fullName,
    email,
    phone,
    city,
    country,
    streetName,
    streetNumber,
    zipCode,
  } = customerInfoData;

  const shipping_address = [streetNumber, streetName, city, zipCode, country]
    .filter(Boolean)
    .join(", ");

  return {
    name: fullName,
    email,
    phone,
    shipping_address: shipping_address || undefined,
  };
};

export const decodeBase64Tx = (base64Tx: string): Uint8Array => {
  if (typeof base64Tx !== "string") {
    throw new Error(
      "Expected a base64 string for the Solana transaction, but got an object.",
    );
  }

  if (typeof atob === "function") {
    const binary = atob(base64Tx);
    const len = binary.length;
    const txBuffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) txBuffer[i] = binary.charCodeAt(i);
    return txBuffer;
  } else {
    return Uint8Array.from(Buffer.from(base64Tx, "base64"));
  }
};
