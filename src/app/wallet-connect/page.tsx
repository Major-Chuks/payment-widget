"use client";
import WalletConnectApp from "@/components/WalletConnectV4/WalletConnectV4";
import classes from "./page.module.css";

const page = () => {
  return (
    <div className={classes.container}>
      <WalletConnectApp />
    </div>
  );
};

export default page;
