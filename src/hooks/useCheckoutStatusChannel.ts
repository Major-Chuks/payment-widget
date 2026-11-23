import type Echo from "laravel-echo";
import { useEffect, useRef, useState } from "react";

// Live status updates for charge checkouts (POS sales, dynamic payment links,
// deposits), so the page reacts the moment the charge changes, for example
// when the cashier cancels the sale. Set both variables to turn them on; the
// key differs between sandbox and production.
const WEBSOCKET_HOST = process.env.NEXT_PUBLIC_WEBSOCKET_HOST ?? "";
const WEBSOCKET_KEY = process.env.NEXT_PUBLIC_WEBSOCKET_ID ?? "";

/** Sent with broadcastAs("checkout.status.changed"), hence the leading dot. */
const CHECKOUT_STATUS_EVENT = ".checkout.status.changed";

/** The same status values as `charge_status` in the payment details. */
export interface CheckoutStatusEvent {
  charge_token: string;
  charge_status: string;
  expires_at?: string | null;
  /**
   * Only on link availability updates: false when the merchant deactivated
   * or deleted the link, true when they turned it back on. Absent on payment
   * progress updates, which leave availability as it is.
   */
  available?: boolean;
  /** "link_inactive" or "link_deleted" when `available` is false. */
  reason?: string | null;
}

// One connection for the page's lifetime. Echo and pusher-js load on demand,
// keeping them out of the first download.
let echoPromise: Promise<Echo<"reverb"> | null> | null = null;

const getEcho = (): Promise<Echo<"reverb"> | null> => {
  if (!WEBSOCKET_HOST || !WEBSOCKET_KEY) return Promise.resolve(null);
  echoPromise ??= Promise.all([import("laravel-echo"), import("pusher-js")])
    .then(
      ([{ default: EchoClient }, { default: Pusher }]) =>
        new EchoClient({
          broadcaster: "reverb",
          key: WEBSOCKET_KEY,
          wsHost: WEBSOCKET_HOST,
          wsPort: 443,
          wssPort: 443,
          forceTLS: true,
          enabledTransports: ["ws", "wss"],
          Pusher,
        }),
    )
    .catch((error) => {
      console.error("[Orki checkout] Couldn't start live updates", error);
      echoPromise = null;
      return null;
    });
  return echoPromise;
};

interface CheckoutStatusHandlers {
  onStatus: (event: CheckoutStatusEvent) => void;
  /**
   * Runs each time the channel is joined, including after a reconnect, so the
   * caller can fetch anything sent while it wasn't listening.
   */
  onSubscribed?: () => void;
}

/**
 * Listens on the charge's public channel, `checkout.{chg_…}`. Returns whether
 * it's listening; while it isn't (not configured, connecting, or the
 * connection dropped), the caller should check the status itself.
 */
export const useCheckoutStatusChannel = (
  chargeToken: string | null,
  { onStatus, onSubscribed }: CheckoutStatusHandlers,
): boolean => {
  const [isLive, setIsLive] = useState(false);

  // Callers pass new callbacks on every render; keep them out of the
  // subscription's deps so it isn't rejoined on each render
  const onStatusRef = useRef(onStatus);
  const onSubscribedRef = useRef(onSubscribed);
  useEffect(() => {
    onStatusRef.current = onStatus;
    onSubscribedRef.current = onSubscribed;
  });

  useEffect(() => {
    if (!chargeToken) return;
    const channelName = `checkout.${chargeToken}`;
    let isCurrent = true;
    let stop: (() => void) | undefined;

    void getEcho().then((echo) => {
      if (!echo || !isCurrent) return;

      echo
        .channel(channelName)
        .subscribed(() => {
          setIsLive(true);
          onSubscribedRef.current?.();
        })
        .error(() => setIsLive(false))
        .listen(CHECKOUT_STATUS_EVENT, (event: CheckoutStatusEvent) => {
          if (event?.charge_token && event.charge_token !== chargeToken) return;
          if (typeof event?.charge_status !== "string") return;
          onStatusRef.current(event);
        });

      // The channel rejoins by itself after a reconnect, which marks it live
      // again through subscribed() above
      const stopWatchingConnection = echo.connector.onConnectionChange(
        (status) => {
          if (status !== "connected") setIsLive(false);
        },
      );

      stop = () => {
        stopWatchingConnection();
        echo.leaveChannel(channelName);
      };
    });

    return () => {
      isCurrent = false;
      stop?.();
      setIsLive(false);
    };
  }, [chargeToken]);

  return isLive;
};
