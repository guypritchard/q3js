"use client";

import {useCallback, useEffect, useRef, useState} from "react";

type UsePollingQueryOptions<T> = {
    queryFn: () => Promise<T>;
    intervalMs: number;
    initialData: T;
    isPendingInitial?: boolean;
    queryKey?: string;
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
    queryKey = "__default__",
}: UsePollingQueryOptions<T>): UsePollingQueryResult<T> {
    const [data, setData] = useState<T>(initialData);
    const [isPending, setIsPending] = useState(isPendingInitial);
    const [isFetching, setIsFetching] = useState(false);
    const [isError, setIsError] = useState(false);
    const inFlightRef = useRef(false);
    const mountedRef = useRef(false);
    const requestIdRef = useRef(0);
    const queryKeyRef = useRef(queryKey);

    useEffect(() => {
        if (queryKeyRef.current === queryKey) return;

        queryKeyRef.current = queryKey;
        requestIdRef.current += 1;
        inFlightRef.current = false;
        setData(initialData);
        setIsPending(isPendingInitial);
        setIsFetching(false);
        setIsError(false);
    }, [initialData, isPendingInitial, queryKey]);

    const refetch = useCallback(async () => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;
        setIsFetching(true);
        const requestId = ++requestIdRef.current;

        try {
            const nextData = await queryFn();
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            setData(nextData);
            setIsError(false);
        } catch {
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            setIsError(true);
        } finally {
            if (requestId === requestIdRef.current) {
                inFlightRef.current = false;
            }
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
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
