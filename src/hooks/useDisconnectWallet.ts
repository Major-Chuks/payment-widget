"use client";

import { useCallback } from "react";
import { useDisconnect } from "@reown/appkit/react";
import { modal } from "@/context";
import { config } from "@/config";

// WalletConnect's reason code for a user-initiated disconnect
const USER_DISCONNECTED = { message: "User disconnected.", code: 6000 };

/**
 * Ends the WalletConnect session on this page only, without the relay. It
 * does what happens when the wallet ends a session:
 * - removes the session from WalletConnect's store and raises its
 *   "session_delete" event, so the provider clears itself and AppKit resets.
 *   (WalletConnect's engine.deleteSession can't be used: it first
 *   unsubscribes from the relay, which waits until the relay is reachable.)
 * - emits "disconnect" on wagmi's WalletConnect connector, so wagmi drops the
 *   connection. The connector removed its own listeners when AppKit's
 *   disconnect failed, so it won't hear the session_delete event.
 * Returns false when there's no WalletConnect session.
 */
async function endWalletConnectSessionOnPage(): Promise<boolean> {
  const provider = await modal.getUniversalProvider();
  const topic = provider?.session?.topic;
  if (!provider || !topic) return false;

  await provider.client.session.delete(topic, USER_DISCONNECTED);
  provider.client.events.emit("session_delete", { id: 0, topic });

  for (const { connector } of config.state.connections.values()) {
    if (connector.id === "walletConnect") connector.emitter.emit("disconnect");
  }
  return true;
}

/**
 * Disconnects the wallet. AppKit first tells the wallet through
 * WalletConnect's relay, and if it can't reach the relay (no connection, or a
 * network that blocks it) it throws and leaves the wallet connected on the
 * page. The session is then ended on the page only; the wallet keeps its copy
 * until it expires or the customer removes it there.
 */
export function useDisconnectWallet() {
  const { disconnect } = useDisconnect();

  return useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      if (!(await endWalletConnectSessionOnPage())) throw error;
    }
  }, [disconnect]);
}
