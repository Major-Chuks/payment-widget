import { useEffect, useRef, useState, useCallback } from "react";

interface UseQuoteCountdownOptions {
    intervalMs?: number;
    onRefresh: () => void;
    enabled?: boolean;
}

export function useQuoteCountdown({
    intervalMs = 30000,
    onRefresh,
    enabled = true,
}: UseQuoteCountdownOptions) {
    const totalSeconds = Math.floor(intervalMs / 1000);
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const remainingRef = useRef(totalSeconds);

    // Callers pass a new onRefresh on every render, and the expiry countdown
    // re-renders the page every second. Keeping it out of the timer's deps
    // stops those re-renders restarting the timer
    const onRefreshRef = useRef(onRefresh);
    useEffect(() => {
        onRefreshRef.current = onRefresh;
    });

    const restart = useCallback(() => {
        remainingRef.current = totalSeconds;
        setSecondsLeft(totalSeconds);
    }, [totalSeconds]);

    const refresh = useCallback(() => {
        onRefreshRef.current();
        restart();
    }, [restart]);

    useEffect(() => {
        if (!enabled) return;

        const timer = setInterval(() => {
            remainingRef.current -= 1;
            if (remainingRef.current <= 0) {
                // Outside the state updater, which React may run twice
                remainingRef.current = totalSeconds;
                onRefreshRef.current();
            }
            setSecondsLeft(remainingRef.current);
        }, 1000);

        return () => clearInterval(timer);
    }, [enabled, totalSeconds]);

    const progress = secondsLeft / totalSeconds; // 1 → 0

    return { secondsLeft, progress, refresh };
}
