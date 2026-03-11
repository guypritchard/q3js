import {type Dispatch, type SetStateAction, useCallback, useEffect, useState} from "react";

type UseLocalStorageReturn<T> = [T, Dispatch<SetStateAction<T>>];
const LOCAL_STORAGE_SYNC_EVENT = "q3js-local-storage-sync";

type LocalStorageSyncDetail = {
    key: string;
    value: string | null;
};

function parseStoredValue<T>(raw: string, initialValue: T): T {
    if (typeof initialValue === "string") {
        return raw as T;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return initialValue;
    }
}

function serializeValue<T>(value: T): string {
    if (typeof value === "string") {
        return value;
    }

    return JSON.stringify(value);
}

function readLocalStorage<T>(key: string, initialValue: T): T {
    if (typeof window === "undefined") {
        return initialValue;
    }

    try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue === null) {
            return initialValue;
        }

        return parseStoredValue(storedValue, initialValue);
    } catch {
        return initialValue;
    }
}

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T> {
    const [value, setValue] = useState<T>(() => readLocalStorage(key, initialValue));

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            if (window.localStorage.getItem(key) === null) {
                window.localStorage.setItem(key, serializeValue(initialValue));
            }
        } catch {
        }
    }, [initialValue, key]);

    const setLocalStorageValue: Dispatch<SetStateAction<T>> = useCallback(
        (nextValue) => {
            setValue((previousValue) => {
                const resolvedValue =
                    typeof nextValue === "function"
                        ? (nextValue as (previous: T) => T)(previousValue)
                        : nextValue;

                if (typeof window !== "undefined") {
                    try {
                        const serializedValue = serializeValue(resolvedValue);
                        window.localStorage.setItem(key, serializedValue);
                        window.setTimeout(() => {
                            window.dispatchEvent(new CustomEvent<LocalStorageSyncDetail>(LOCAL_STORAGE_SYNC_EVENT, {
                                detail: {
                                    key,
                                    value: serializedValue,
                                },
                            }));
                        }, 0);
                    } catch {
                    }
                }

                return resolvedValue;
            });
        },
        [key],
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const syncValue = (event: StorageEvent) => {
            if (event.key !== key) {
                return;
            }

            if (event.newValue === null) {
                setValue(initialValue);
                return;
            }

            setValue(parseStoredValue(event.newValue, initialValue));
        };

        const syncSameTabValue = (event: Event) => {
            const customEvent = event as CustomEvent<LocalStorageSyncDetail>;
            if (customEvent.detail.key !== key) {
                return;
            }

            if (customEvent.detail.value === null) {
                setValue(initialValue);
                return;
            }

            setValue(parseStoredValue(customEvent.detail.value, initialValue));
        };

        window.addEventListener("storage", syncValue);
        window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, syncSameTabValue);
        return () => {
            window.removeEventListener("storage", syncValue);
            window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, syncSameTabValue);
        };
    }, [initialValue, key]);

    return [value, setLocalStorageValue];
}
