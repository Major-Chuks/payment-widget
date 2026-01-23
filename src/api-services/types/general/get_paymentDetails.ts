export interface get_paymentDetails {
  product_title: string;
  description: string;
  images: ProductImage[];
  price: string;
  price_denomination: "crypto" | string;
  price_denomination_asset: Asset;
  customer_can_change_price: boolean;
  allows_token_swaps: boolean;
  allows_card_pay: boolean;
  crypto_options: CryptoOption[];
  recipients: Recipient[];
  allows_multiple_sales: boolean;
  min_sales: number;
  max_sales: number;
  requires_customer_info: boolean;
  customer_info: CustomerInfo;
  redirect_option: "instant" | string;
  redirect_url: string;
  show_badge: boolean;
  primary_color: string;
  button_color: string;
}

export interface ProductImage {
  id: string;
  url: string;
  created_at: string;
}

export interface Asset {
  id: string;
  slug: string;
  title: string;
  logo: string;
}

export interface CryptoOption {
  id: string;
  slug: string;
  title: string;
  logo: string;
  networks: Network[];
}

export interface Network {
  id: string;
  slug: string;
  title: string;
  logo: string;
  token_address?: string;
}

export interface Recipient {
  network: Network;
  wallet_address: string;
}

export interface CustomerInfo {
  custom: CustomCustomerField[];
  system: SystemCustomerFields;
}

export interface CustomCustomerField {
  key: string;
  type: "text" | "email" | "tel" | string;
  label: string;
  required: "0" | "1";
  description: string | null;
}

export interface SystemCustomerFields {
  email: SystemField;
  phone: SystemField;
  name_and_shipping: SystemField;
}

export interface SystemField {
  type: "text" | "email" | "tel";
  label: string;
  required: "0" | "1";
}
