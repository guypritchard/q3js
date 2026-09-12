"use client";

import { useEffect, useRef, useState } from "react";
import { assembleGuy, Md3Surface, parseMd3, parseTga } from "@/lib/guy-model";

type ViewerStatus = "loading" | "ready" | "webgl" | "lost" | "error";
type DrawSurface = { position: WebGLBuffer; normal: WebGLBuffer; uv: WebGLBuffer; index: WebGLBuffer; count: number };

const ASSET_ROOT = "/models/players/guy";
const INITIAL_ROTATION = -0.55;
const INITIAL_PITCH = -0.12;
const INITIAL_ZOOM = 3.2;

const vertexShader = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uMvp;
uniform mat4 uModel;
varying vec2 vUv;
varying float vLight;
void main() {
  vec3 normal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
  vec3 lightDirection = normalize(vec3(-0.35, -0.55, 0.9));
  vLight = 0.42 + max(dot(normal, lightDirection), 0.0) * 0.72;
  vUv = aUv;
  gl_Position = uMvp * vec4(aPosition, 1.0);
}`;

const fragmentShader = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;
varying float vLight;
void main() {
  vec3 color = texture2D(uTexture, vUv).rgb;
  gl_FragColor = vec4(color * vLight, 1.0);
}`;

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) for (let row = 0; row < 4; row += 1) {
    for (let index = 0; index < 4; index += 1) result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
  }
  return result;
}

function rotationZ(angle: number): Float32Array {
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  return new Float32Array([cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function viewerMatrix(aspect: number, pitch: number, zoom: number): Float32Array {
  const near = 0.1, far = 20, fov = 1 / Math.tan(Math.PI / 7.5);
  const projection = new Float32Array([fov / Math.max(aspect, 0.01), 0, 0, 0, 0, fov, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
  const cosine = Math.cos(pitch), sine = Math.sin(pitch);
  const zUpView = new Float32Array([1, 0, 0, 0, 0, -sine, -cosine, 0, 0, cosine, -sine, 0, 0, 0, -zoom, 1]);
  return multiply(projection, zUpView);
}

function normalize(surfaces: Md3Surface[]): void {
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const surface of surfaces) for (let index = 0; index < surface.positions.length; index += 3) for (let axis = 0; axis < 3; axis += 1) {
    minimum[axis] = Math.min(minimum[axis], surface.positions[index + axis]);
    maximum[axis] = Math.max(maximum[axis], surface.positions[index + axis]);
  }
  const center = minimum.map((value, axis) => (value + maximum[axis]) / 2);
  const extent = Math.max(...maximum.map((value, axis) => value - minimum[axis]), 1);
  for (const surface of surfaces) for (let index = 0; index < surface.positions.length; index += 3) for (let axis = 0; axis < 3; axis += 1) surface.positions[index + axis] = (surface.positions[index + axis] - center[axis]) * 1.8 / extent;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Could not compile shader";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    throw new Error("Could not create renderer");
  }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Could not link renderer";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function makeBuffer(gl: WebGLRenderingContext, target: number, data: ArrayBufferView<ArrayBufferLike>): WebGLBuffer {
  const result = gl.createBuffer();
  if (!result) throw new Error("Could not create geometry");
  const bytes = new ArrayBuffer(data.byteLength);
  new Uint8Array(bytes).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  gl.bindBuffer(target, result); gl.bufferData(target, bytes, gl.STATIC_DRAW);
  return result;
}

async function fetchBuffer(path: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.arrayBuffer();
}

export function GuyModelViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(INITIAL_ROTATION);
  const pitchRef = useRef(INITIAL_PITCH);
  const zoomRef = useRef(INITIAL_ZOOM);
  const gestureRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "high-performance" });
    if (!gl) { setStatus("webgl"); return; }
    let disposed = false, frame = 0, generation = 0;
    let abortController: AbortController | undefined;
    let drawSurfaces: DrawSurface[] = [];
    let texture: WebGLTexture | undefined;
    let program: WebGLProgram | undefined;
    let render: ((time: number) => void) | undefined;

    const release = () => {
      cancelAnimationFrame(frame);
      abortController?.abort();
      for (const surface of drawSurfaces) {
        gl.deleteBuffer(surface.position); gl.deleteBuffer(surface.normal); gl.deleteBuffer(surface.uv); gl.deleteBuffer(surface.index);
      }
      drawSurfaces = [];
      if (texture) gl.deleteTexture(texture);
      if (program) gl.deleteProgram(program);
      texture = undefined; program = undefined;
    };

    const initialize = async () => {
      const currentGeneration = ++generation;
      release();
      abortController = new AbortController();
      setStatus("loading");
      try {
        const [lowerBytes, upperBytes, headBytes, textureBytes] = await Promise.all([
          "lower.md3", "upper.md3", "head.md3", "guy.tga",
        ].map((name) => fetchBuffer(`${ASSET_ROOT}/${name}`, abortController!.signal)));
        if (disposed || currentGeneration !== generation) return;
        const surfaces = assembleGuy(parseMd3(lowerBytes), parseMd3(upperBytes), parseMd3(headBytes));
        normalize(surfaces);
        const image = parseTga(textureBytes);
        program = createProgram(gl);
        texture = gl.createTexture() || undefined;
        if (!texture) throw new Error("Could not create texture");
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.pixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        drawSurfaces = surfaces.map((surface) => ({
          position: makeBuffer(gl, gl.ARRAY_BUFFER, surface.positions), normal: makeBuffer(gl, gl.ARRAY_BUFFER, surface.normals),
          uv: makeBuffer(gl, gl.ARRAY_BUFFER, surface.uvs), index: makeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, surface.indices), count: surface.indices.length,
        }));
        const position = gl.getAttribLocation(program, "aPosition"), normal = gl.getAttribLocation(program, "aNormal"), uv = gl.getAttribLocation(program, "aUv");
        const mvp = gl.getUniformLocation(program, "uMvp"), model = gl.getUniformLocation(program, "uModel");
        gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.useProgram(program); gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
        let previous = performance.now();
        render = (now) => {
          if (disposed || currentGeneration !== generation || !program) return;
          if (!gestureRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) rotationRef.current += Math.min(now - previous, 40) * 0.00018;
          previous = now;
          const modelMatrix = rotationZ(rotationRef.current);
          gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniformMatrix4fv(mvp, false, multiply(viewerMatrix(canvas.width / Math.max(canvas.height, 1), pitchRef.current, zoomRef.current), modelMatrix));
          gl.uniformMatrix4fv(model, false, modelMatrix);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture!);
          for (const surface of drawSurfaces) {
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.position); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.normal); gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.uv); gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.index); gl.drawElements(gl.TRIANGLES, surface.count, gl.UNSIGNED_SHORT, 0);
          }
          frame = requestAnimationFrame(render!);
        };
        setStatus("ready"); frame = requestAnimationFrame(render);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Could not render GUY model", error);
        if (!disposed && currentGeneration === generation) { release(); setStatus("error"); }
      }
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(viewport.clientWidth * ratio)), height = Math.max(1, Math.round(viewport.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    };
    const observer = new ResizeObserver(resize); observer.observe(viewport); resize();
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas) return;
       const nextZoom = Math.min(5, Math.max(2.55, zoomRef.current + event.deltaY * 0.003));
      if (nextZoom === zoomRef.current) return;
      zoomRef.current = nextZoom;
      event.preventDefault();
    };
    const lost = (event: Event) => { event.preventDefault(); generation += 1; release(); setStatus("lost"); };
    const restored = () => { if (!disposed) void initialize(); };
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("webglcontextlost", lost); canvas.addEventListener("webglcontextrestored", restored);
    void initialize();
    return () => {
      disposed = true; generation += 1; observer.disconnect(); release();
      canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [retry]);

  const reset = () => { rotationRef.current = INITIAL_ROTATION; pitchRef.current = INITIAL_PITCH; zoomRef.current = INITIAL_ZOOM; };
  return <div className="guy-viewer">
    <div ref={viewportRef} className="guy-viewer-viewport">
      <div className="weapon-viewer-grid" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="guy-viewer-canvas"
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D preview of the bundled GUY player model. Focus the viewer before using the mouse wheel to zoom."
        aria-describedby="guy-viewer-help"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); rotationRef.current += event.key === "ArrowLeft" ? -0.12 : 0.12; }
          else if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); zoomRef.current = Math.min(5, Math.max(2.55, zoomRef.current + (event.key === "ArrowUp" ? -0.18 : 0.18))); }
          else if (event.key === "Home" || event.key === "0") { event.preventDefault(); reset(); }
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId); gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const gesture = gestureRef.current; if (!gesture || gesture.id !== event.pointerId) return;
          rotationRef.current += (event.clientX - gesture.x) * 0.012;
          pitchRef.current = Math.min(0.38, Math.max(-0.42, pitchRef.current + (event.clientY - gesture.y) * 0.006));
          gesture.x = event.clientX; gesture.y = event.clientY;
        }}
        onPointerUp={(event) => { if (gestureRef.current?.id === event.pointerId) gestureRef.current = null; }}
        onPointerCancel={(event) => { if (gestureRef.current?.id === event.pointerId) gestureRef.current = null; }}
        onLostPointerCapture={(event) => { if (gestureRef.current?.id === event.pointerId) gestureRef.current = null; }}
      />
      {status !== "ready" ? <div className="guy-viewer-status" role="status">
        <span>{status === "loading" ? "Loading bundled GUY model…" : status === "webgl" ? "WebGL is unavailable in this browser." : status === "lost" ? "3D context lost. Waiting to restore…" : "The bundled GUY preview could not be loaded."}</span>
        {status === "lost" || status === "error" ? <button type="button" className="bot-button" onClick={() => setRetry((value) => value + 1)}>Retry preview</button> : null}
      </div> : null}
    </div>
    <div className="guy-viewer-toolbar">
      <p id="guy-viewer-help"><span className="guy-viewer-help-wide">Click or drag to focus · Focused wheel or ↑/↓ to zoom · ←/→ to turn</span><span className="guy-viewer-help-compact">Drag to turn · Focus + ↑/↓ to zoom</span></p>
      <button type="button" className="bot-button" onClick={reset} aria-label="Reset GUY model view">Reset view</button>
    </div>
  </div>;
}
