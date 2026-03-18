"use client";

import * as React from "react";

export enum JoystickShape {
    Circle = "circle",
    Square = "square",
}

export interface IJoystickProps {
    size?: number;
    stickSize?: number;
    baseColor?: string;
    stickColor?: string;
    throttle?: number;
    disabled?: boolean;
    sticky?: boolean;
    move?: (event: IJoystickUpdateEvent) => void;
    stop?: (event: IJoystickUpdateEvent) => void;
    start?: (event: IJoystickUpdateEvent) => void;
    stickImage?: string;
    baseImage?: string;
    followCursor?: boolean;
    baseShape?: JoystickShape;
    stickShape?: JoystickShape;
    controlPlaneShape?: JoystickShape;
    minDistance?: number;
    pos?: {x: number; y: number};
}

enum InteractionEvents {
    PointerDown = "pointerdown",
    PointerMove = "pointermove",
    PointerUp = "pointerup",
}

export interface IJoystickUpdateEvent {
    type: "move" | "stop" | "start";
    x: number | null;
    y: number | null;
    direction: JoystickDirection | null;
    distance: number | null;
}

export interface IJoystickState {
    dragging: boolean;
    coordinates?: IJoystickCoordinates;
}

type JoystickDirection = "FORWARD" | "RIGHT" | "LEFT" | "BACKWARD";

export interface IJoystickCoordinates {
    relativeX: number;
    relativeY: number;
    axisX: number;
    axisY: number;
    direction: JoystickDirection;
    distance: number;
}

enum RadianQuadrantBinding {
    TopRight = 2.35619449,
    TopLeft = -2.35619449,
    BottomRight = 0.785398163,
    BottomLeft = -0.785398163,
}

function shapeFactory(shape: JoystickShape, size: number): React.CSSProperties {
    if (shape === JoystickShape.Square) {
        return {
            borderRadius: `${Math.round(size * 0.18)}px`,
        };
    }

    return {
        borderRadius: "9999px",
    };
}

function shapeBoundsFactory(
    shape: JoystickShape,
    relativeX: number,
    relativeY: number,
    distance: number,
    radius: number,
) {
    if (shape === JoystickShape.Square) {
        return {
            relativeX: Math.max(-radius, Math.min(radius, relativeX)),
            relativeY: Math.max(-radius, Math.min(radius, relativeY)),
        };
    }

    if (distance <= radius || distance === 0) {
        return {relativeX, relativeY};
    }

    const scale = radius / distance;
    return {
        relativeX: relativeX * scale,
        relativeY: relativeY * scale,
    };
}

class Joystick extends React.Component<IJoystickProps, IJoystickState> {
    private readonly stickRef: React.RefObject<HTMLButtonElement | null> = React.createRef();
    private readonly baseRef: React.RefObject<HTMLDivElement | null> = React.createRef();
    private readonly throttledMoveCallback: (data: IJoystickUpdateEvent) => void;
    private baseSize = 100;
    private stickSize?: number;
    private frameId: number | null = null;
    private radius = 50;
    private parentRect: DOMRect = new DOMRect();
    private pointerId: number | null = null;
    private mounted = false;

    constructor(props: IJoystickProps) {
        super(props);
        this.state = {
            dragging: false,
        };

        this.throttledMoveCallback = (() => {
            let lastCall = 0;
            return (event: IJoystickUpdateEvent) => {
                const now = Date.now();
                const throttleAmount = this.props.throttle || 0;
                if (now - lastCall < throttleAmount) {
                    return;
                }
                lastCall = now;
                this.props.move?.(event);
            };
        })();
    }

    componentDidMount() {
        this.mounted = true;

        if (!this.props.followCursor) {
            return;
        }

        this.parentRect = this.baseRef.current?.getBoundingClientRect() ?? new DOMRect();
        this.setState({dragging: true});
        window.addEventListener(InteractionEvents.PointerMove, this.pointerMove, {passive: false});
        this.props.start?.({
            type: "start",
            x: null,
            y: null,
            distance: null,
            direction: null,
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        window.removeEventListener(InteractionEvents.PointerMove, this.pointerMove);
        window.removeEventListener(InteractionEvents.PointerUp, this.pointerUp);

        if (this.frameId !== null) {
            window.cancelAnimationFrame(this.frameId);
        }
    }

    private updatePos(coordinates: IJoystickCoordinates) {
        this.frameId = window.requestAnimationFrame(() => {
            if (!this.mounted) {
                return;
            }
            this.setState({coordinates});
        });

        if (typeof this.props.minDistance === "number" && coordinates.distance < this.props.minDistance) {
            return;
        }

        this.throttledMoveCallback({
            type: "move",
            x: (coordinates.relativeX * 2) / this.baseSize,
            y: -((coordinates.relativeY * 2) / this.baseSize),
            direction: coordinates.direction,
            distance: coordinates.distance,
        });
    }

    private pointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (this.props.disabled || this.props.followCursor) {
            return;
        }

        event.preventDefault();
        this.parentRect = this.baseRef.current?.getBoundingClientRect() ?? new DOMRect();
        this.setState({dragging: true});
        window.addEventListener(InteractionEvents.PointerUp, this.pointerUp);
        window.addEventListener(InteractionEvents.PointerMove, this.pointerMove, {passive: false});
        this.pointerId = event.pointerId;
        this.stickRef.current?.setPointerCapture(event.pointerId);

        this.props.start?.({
            type: "start",
            x: null,
            y: null,
            distance: null,
            direction: null,
        });
    };

    private getDirection(atan2: number): JoystickDirection {
        if (atan2 > RadianQuadrantBinding.TopRight || atan2 < RadianQuadrantBinding.TopLeft) {
            return "FORWARD";
        }
        if (atan2 < RadianQuadrantBinding.TopRight && atan2 > RadianQuadrantBinding.BottomRight) {
            return "RIGHT";
        }
        if (atan2 < RadianQuadrantBinding.BottomLeft) {
            return "LEFT";
        }
        return "BACKWARD";
    }

    private distance(x: number, y: number) {
        return Math.hypot(x, y);
    }

    private distanceToPercentile(distance: number) {
        const percent = (distance / (this.baseSize / 2)) * 100;
        return Math.min(percent, 100);
    }

    private pointerMove = (event: PointerEvent) => {
        event.preventDefault();

        if (!this.state.dragging) {
            return;
        }

        if (!this.props.followCursor && event.pointerId !== this.pointerId) {
            return;
        }

        const absoluteX = event.clientX;
        const absoluteY = event.clientY;
        let relativeX = absoluteX - this.parentRect.left - this.radius;
        let relativeY = absoluteY - this.parentRect.top - this.radius;
        const dist = this.distance(relativeX, relativeY);
        const bounded = shapeBoundsFactory(
            this.props.controlPlaneShape || this.props.baseShape || JoystickShape.Circle,
            relativeX,
            relativeY,
            dist,
            this.radius,
        );

        relativeX = bounded.relativeX;
        relativeY = bounded.relativeY;

        this.updatePos({
            relativeX,
            relativeY,
            distance: this.distanceToPercentile(this.distance(relativeX, relativeY)),
            direction: this.getDirection(Math.atan2(relativeX, relativeY)),
            axisX: absoluteX - this.parentRect.left,
            axisY: absoluteY - this.parentRect.top,
        });
    };

    private pointerUp = (event: PointerEvent) => {
        if (event.pointerId !== this.pointerId) {
            return;
        }

        const nextState: IJoystickState = {
            dragging: false,
            coordinates: this.props.sticky ? this.state.coordinates : undefined,
        };

        this.frameId = window.requestAnimationFrame(() => {
            if (!this.mounted) {
                return;
            }
            this.setState(nextState);
        });

        window.removeEventListener(InteractionEvents.PointerUp, this.pointerUp);
        window.removeEventListener(InteractionEvents.PointerMove, this.pointerMove);
        this.pointerId = null;

        const stickyCoordinates = this.props.sticky ? this.state.coordinates : undefined;
        this.props.stop?.({
            type: "stop",
            x: stickyCoordinates ? (stickyCoordinates.relativeX * 2) / this.baseSize : null,
            y: stickyCoordinates ? -((stickyCoordinates.relativeY * 2) / this.baseSize) : null,
            direction: stickyCoordinates?.direction ?? null,
            distance: stickyCoordinates?.distance ?? null,
        });
    };

    private getBaseShapeStyle() {
        return shapeFactory(this.props.baseShape || JoystickShape.Circle, this.baseSize);
    }

    private getStickShapeStyle() {
        return shapeFactory(this.props.stickShape || JoystickShape.Circle, this.stickSize || this.baseSize / 1.5);
    }

    private getBaseStyle(): React.CSSProperties {
        const baseColor = this.props.baseColor ?? "#000033";
        const size = `${this.baseSize}px`;
        const style: React.CSSProperties = {
            ...this.getBaseShapeStyle(),
            height: size,
            width: size,
            background: baseColor,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            touchAction: "none",
            overflow: "visible",
        };

        if (this.props.baseImage) {
            style.background = `url(${this.props.baseImage})`;
            style.backgroundSize = "100%";
        }

        return style;
    }

    private getStickStyle(): React.CSSProperties {
        const stickColor = this.props.stickColor ?? "#3D59AB";
        const size = `${this.stickSize ? this.stickSize : this.baseSize / 1.5}px`;
        let style: React.CSSProperties = {
            ...this.getStickShapeStyle(),
            background: stickColor,
            cursor: "move",
            height: size,
            width: size,
            border: "none",
            flexShrink: 0,
            touchAction: "none",
            position: "absolute",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.24)",
            backdropFilter: "blur(18px)",
        };

        if (this.props.stickImage) {
            style.background = `url(${this.props.stickImage})`;
            style.backgroundSize = "100%";
        }

        if (this.props.pos) {
            style = {
                ...style,
                transform: `translate3d(${(this.props.pos.x * this.baseSize) / 2}px, ${-(this.props.pos.y * this.baseSize) / 2}px, 0)`,
            };
        }

        if (this.state.coordinates) {
            style = {
                ...style,
                transform: `translate3d(${this.state.coordinates.relativeX}px, ${this.state.coordinates.relativeY}px, 0)`,
            };
        }

        return style;
    }

    render() {
        this.baseSize = this.props.size || 100;
        this.stickSize = this.props.stickSize;
        this.radius = this.baseSize / 2;
        const baseStyle = this.getBaseStyle();
        const stickStyle = this.getStickStyle();

        return (
            <div
                data-testid="joystick-base"
                className={this.props.disabled ? "opacity-60" : undefined}
                ref={this.baseRef}
                style={baseStyle}
            >
                <button
                    ref={this.stickRef}
                    type="button"
                    disabled={this.props.disabled}
                    onPointerDown={this.pointerDown}
                    className={this.props.disabled ? "cursor-not-allowed" : undefined}
                    style={stickStyle}
                />
            </div>
        );
    }
}

export {Joystick};
