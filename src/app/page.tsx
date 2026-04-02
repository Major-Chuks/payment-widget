"use client";

import PaymentFlow from "@/components/PaymentFlow/PaymentFlow";
import classes from "./page.module.css";
import { useClientMounted } from "@/hooks/useClientMount";

const page = () => {
  const mounted = useClientMounted();

  if (!mounted) return null;

  return (
    <div className={classes.container}>
      <PaymentFlow />
    </div>
  );
};

export default page;
