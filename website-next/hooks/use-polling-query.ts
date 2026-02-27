"use client";

import {useCallback, useEffect, useRef, useState} from "react";

type UsePollingQueryOptions<T> = {
    queryFn: () => Promise<T>;
    intervalMs: number;
    initialData: T;
    isPendingInitial?: boolean;
};

type UsePollingQueryResult<T> = {
    data: T;
    isPending: boolean;
    isFetching: boolean;
    isError: boolean;
    refetch: () => Promise<void>;
};

export function usePollingQuery<T>({
    queryFn,
    intervalMs,
    initialData,
    isPendingInitial = true,
}: UsePollingQueryOptions<T>): UsePollingQueryResult<T> {
    const [data, setData] = useState<T>(initialData);
    const [isPending, setIsPending] = useState(isPendingInitial);
    const [isFetching, setIsFetching] = useState(false);
    const [isError, setIsError] = useState(false);
    const inFlightRef = useRef(false);
    const mountedRef = useRef(false);

    const refetch = useCallback(async () => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;
        setIsFetching(true);

        try {
            const nextData = await queryFn();
            if (!mountedRef.current) return;
            setData(nextData);
            setIsError(false);
        } catch {
            if (!mountedRef.current) return;
            setIsError(true);
        } finally {
            inFlightRef.current = false;
            if (!mountedRef.current) return;
            setIsPending(false);
            setIsFetching(false);
        }
    }, [queryFn]);

    useEffect(() => {
        mountedRef.current = true;
        void refetch();

        const timer = window.setInterval(() => {
            void refetch();
        }, intervalMs);

        return () => {
            mountedRef.current = false;
            window.clearInterval(timer);
        };
    }, [intervalMs, refetch]);

    return {
        data,
        isPending,
        isFetching,
        isError,
        refetch,
    };
}
