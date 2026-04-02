"use client";

import PaymentFlow from "@/components/PaymentFlow/PaymentFlow";
import { useClientMounted } from "@/hooks/useClientMount";

const PaymentPage = () => {
    const mounted = useClientMounted();

    if (!mounted) return null;

    return (
        <PaymentFlow />
    );
};

export default PaymentPage;
