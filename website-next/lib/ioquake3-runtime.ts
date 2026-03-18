import type {IOQ3Module} from "@/lib/fs.ts";

export type IOQ3RuntimeModule = IOQ3Module & {
    canvas?: HTMLCanvasElement;
    _Q3JS_MobileInitBindings?: () => void;
    _Q3JS_MobileKeyEvent?: (key: number, down: number) => void;
    _Q3JS_MobileMouseMove?: (dx: number, dy: number) => void;
    _Q3JS_MobileJoystickAxis?: (axis: number, value: number) => void;
};

let runtimeModule: IOQ3RuntimeModule | null = null;
let runtimePromise: Promise<IOQ3RuntimeModule> | null = null;

function getRuntimeCanvas() {
    if (typeof document === "undefined") {
        return null;
    }

    return (runtimeModule?.canvas as HTMLCanvasElement | undefined) ?? document.getElementById("canvas") as HTMLCanvasElement | null;
}

export function registerIOQ3Runtime(promise: Promise<IOQ3RuntimeModule>) {
    runtimePromise = promise;
    runtimeModule = null;

    promise
        .then((module) => {
            runtimeModule = module;
            module._Q3JS_MobileInitBindings?.();
        })
        .catch(() => {
            if (runtimePromise === promise) {
                runtimePromise = null;
                runtimeModule = null;
            }
        });
}

export function clearIOQ3Runtime() {
    runtimePromise = null;
    runtimeModule = null;
}

export function hasIOQ3MobileBridge() {
    return Boolean(
        runtimeModule?._Q3JS_MobileKeyEvent
        && runtimeModule?._Q3JS_MobileMouseMove
        && runtimeModule?._Q3JS_MobileJoystickAxis
    );
}

export function initIOQ3MobileBindings() {
    runtimeModule?._Q3JS_MobileInitBindings?.();
}

export function sendIOQ3MobileKey(key: number, down: boolean) {
    runtimeModule?._Q3JS_MobileKeyEvent?.(key, down ? 1 : 0);
}

export function sendIOQ3MobileMouseMove(dx: number, dy: number) {
    runtimeModule?._Q3JS_MobileMouseMove?.(dx, dy);
}

export function sendIOQ3MobileJoystickAxis(axis: number, value: number) {
    runtimeModule?._Q3JS_MobileJoystickAxis?.(axis, value);
}

export function resizeIOQ3Canvas(width: number, height: number) {
    const canvas = getRuntimeCanvas();
    if (!canvas) {
        return;
    }

    if (canvas.width !== width) {
        canvas.width = width;
    }

    if (canvas.height !== height) {
        canvas.height = height;
    }
}
