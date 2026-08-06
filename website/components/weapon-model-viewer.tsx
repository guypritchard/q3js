"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import type { WeaponModel } from "@/lib/weapons";

interface SurfaceData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
  shader: string;
}

interface TagData {
  origin: Float32Array;
  axis: Float32Array;
}

interface ParsedMd3 {
  surfaces: SurfaceData[];
  tags: Map<string, TagData>;
}

interface DrawSurface {
  position: WebGLBuffer;
  normal: WebGLBuffer;
  uv: WebGLBuffer;
  index: WebGLBuffer;
  texture: WebGLTexture;
  count: number;
  indexType: number;
}

const vertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUv;
  uniform mat4 uMvp;
  uniform mat4 uModel;
  varying vec2 vUv;
  varying float vLight;
  void main() {
    vec3 normal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
    vec3 lightDirection = normalize(vec3(-0.4, -0.7, 1.0));
    vLight = 0.34 + max(dot(normal, lightDirection), 0.0) * 0.78;
    vUv = aUv;
    gl_Position = uMvp * vec4(aPosition, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform vec3 uAccent;
  uniform float uCompositeAlpha;
  varying vec2 vUv;
  varying float vLight;
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    if (color.a < 0.05 && uCompositeAlpha < 0.5) discard;
    vec3 opaqueBase = mix(vec3(0.16, 0.18, 0.17), uAccent, 0.14);
    vec3 surface = uCompositeAlpha > 0.5
      ? mix(opaqueBase, color.rgb, color.a)
      : color.rgb;
    vec3 lit = surface * vLight + uAccent * 0.045;
    float alpha = uCompositeAlpha > 0.5 ? 1.0 : color.a;
    gl_FragColor = vec4(lit, alpha);
  }
`;

function readString(view: DataView, offset: number, length: number): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const value = view.getUint8(offset + index);
    if (value === 0) break;
    result += String.fromCharCode(value);
  }
  return result;
}

function decodeNormal(packed: number): readonly [number, number, number] {
  const latitude = ((packed >> 8) & 255) * (Math.PI * 2 / 255);
  const longitude = (packed & 255) * (Math.PI * 2 / 255);
  return [
    Math.cos(latitude) * Math.sin(longitude),
    Math.sin(latitude) * Math.sin(longitude),
    Math.cos(longitude),
  ];
}

function parseMd3(buffer: ArrayBuffer): ParsedMd3 {
  const view = new DataView(buffer);
  if (readString(view, 0, 4) !== "IDP3" || view.getInt32(4, true) !== 15) {
    throw new Error("Unsupported Quake III model");
  }

  const surfaceCount = view.getInt32(84, true);
  const tagCount = view.getInt32(80, true);
  const tagOffset = view.getInt32(96, true);
  let surfaceOffset = view.getInt32(100, true);
  const surfaces: SurfaceData[] = [];
  const tags = new Map<string, TagData>();

  for (let tagIndex = 0; tagIndex < tagCount; tagIndex += 1) {
    const offset = tagOffset + tagIndex * 112;
    const name = readString(view, offset, 64);
    const origin = new Float32Array(3);
    const axis = new Float32Array(9);
    for (let index = 0; index < 3; index += 1) {
      origin[index] = view.getFloat32(offset + 64 + index * 4, true);
    }
    for (let index = 0; index < 9; index += 1) {
      axis[index] = view.getFloat32(offset + 76 + index * 4, true);
    }
    tags.set(name, { origin, axis });
  }

  for (let surfaceIndex = 0; surfaceIndex < surfaceCount; surfaceIndex += 1) {
    const vertexCount = view.getInt32(surfaceOffset + 80, true);
    const triangleCount = view.getInt32(surfaceOffset + 84, true);
    const triangleOffset = surfaceOffset + view.getInt32(surfaceOffset + 88, true);
    const shaderOffset = surfaceOffset + view.getInt32(surfaceOffset + 92, true);
    const uvOffset = surfaceOffset + view.getInt32(surfaceOffset + 96, true);
    const vertexOffset = surfaceOffset + view.getInt32(surfaceOffset + 100, true);
    const surfaceEnd = view.getInt32(surfaceOffset + 104, true);
    const shader = readString(view, shaderOffset, 64);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const IndexArray = vertexCount > 65_535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(triangleCount * 3);

    for (let index = 0; index < triangleCount * 3; index += 1) {
      indices[index] = view.getInt32(triangleOffset + index * 4, true);
    }

    for (let index = 0; index < vertexCount; index += 1) {
      uvs[index * 2] = view.getFloat32(uvOffset + index * 8, true);
      uvs[index * 2 + 1] = view.getFloat32(uvOffset + index * 8 + 4, true);

      const packedOffset = vertexOffset + index * 8;
      for (let axis = 0; axis < 3; axis += 1) {
        const value = view.getInt16(packedOffset + axis * 2, true) / 64;
        positions[index * 3 + axis] = value;
      }
      const normal = decodeNormal(view.getUint16(packedOffset + 6, true));
      normals.set(normal, index * 3);
    }

    surfaces.push({ positions, normals, uvs, indices, shader });
    surfaceOffset += surfaceEnd;
  }

  return { surfaces, tags };
}

function positionOnTag(surfaces: SurfaceData[], tag: TagData): void {
  surfaces.forEach((surface) => {
    for (let index = 0; index < surface.positions.length; index += 3) {
      const x = surface.positions[index];
      const y = surface.positions[index + 1];
      const z = surface.positions[index + 2];
      surface.positions[index] = tag.origin[0] + x * tag.axis[0] + y * tag.axis[3] + z * tag.axis[6];
      surface.positions[index + 1] = tag.origin[1] + x * tag.axis[1] + y * tag.axis[4] + z * tag.axis[7];
      surface.positions[index + 2] = tag.origin[2] + x * tag.axis[2] + y * tag.axis[5] + z * tag.axis[8];

      const normalX = surface.normals[index];
      const normalY = surface.normals[index + 1];
      const normalZ = surface.normals[index + 2];
      surface.normals[index] = normalX * tag.axis[0] + normalY * tag.axis[3] + normalZ * tag.axis[6];
      surface.normals[index + 1] = normalX * tag.axis[1] + normalY * tag.axis[4] + normalZ * tag.axis[7];
      surface.normals[index + 2] = normalX * tag.axis[2] + normalY * tag.axis[5] + normalZ * tag.axis[8];
    }
  });
}

function normalizeSurfaces(surfaces: SurfaceData[]): void {
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  surfaces.forEach((surface) => {
    for (let index = 0; index < surface.positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = surface.positions[index + axis];
        bounds.min[axis] = Math.min(bounds.min[axis], value);
        bounds.max[axis] = Math.max(bounds.max[axis], value);
      }
    }
  });

  const center = bounds.min.map((minimum, axis) => (minimum + bounds.max[axis]) / 2);
  const extent = Math.max(...bounds.max.map((maximum, axis) => maximum - bounds.min[axis]), 1);
  const scale = 2.15 / extent;
  surfaces.forEach((surface) => {
    for (let index = 0; index < surface.positions.length; index += 3) {
      surface.positions[index] = (surface.positions[index] - center[0]) * scale;
      surface.positions[index + 1] = (surface.positions[index + 1] - center[1]) * scale;
      surface.positions[index + 2] = (surface.positions[index + 2] - center[2]) * scale;
    }
  });
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create the 3D shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Could not compile the 3D shader";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create the 3D renderer");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Could not link the 3D renderer");
  }
  return program;
}

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1) {
        value += a[index * 4 + row] * b[column * 4 + index];
      }
      result[column * 4 + row] = value;
    }
  }
  return result;
}

function rotationZ(angle: number): Float32Array {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Float32Array([cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function perspective(aspect: number): Float32Array {
  const near = 0.1;
  const far = 20;
  const value = 1 / Math.tan(Math.PI / 7);
  return new Float32Array([
    value / aspect, 0, 0, 0,
    0, value, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

function viewMatrix(): Float32Array {
  // Quake MD3 coordinates are X-forward, Y-left, Z-up. WebGL's camera looks
  // down -Z with +Y as screen-up, so map world Z to screen Y and world Y to
  // camera depth. This gives the weapon a level, eye-height product view.
  return new Float32Array([
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, -3.45, 1,
  ]);
}

function texturePath(shader: string, model: WeaponModel): string {
  const normalized = shader.toLowerCase();
  const match = Object.entries(model.textures)
    .sort(([left], [right]) => right.length - left.length)
    .find(([name]) => normalized.includes(name.toLowerCase()));
  return match?.[1] || model.fallbackTexture;
}

function loadTexture(gl: WebGLRenderingContext, source: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    if (!texture) {
      reject(new Error("Could not create the model texture"));
      return;
    }
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve(texture);
    };
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  });
}

function makeBuffer(
  gl: WebGLRenderingContext,
  target: number,
  data: Float32Array | Uint16Array | Uint32Array,
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not create the model geometry");
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data as unknown as BufferSource, gl.STATIC_DRAW);
  return buffer;
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function WeaponModelViewer({
  accent,
  model,
  weaponName,
}: Readonly<{ accent: string; model: WeaponModel; weaponName: string }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(-0.28);
  const draggingRef = useRef<{ pointerId: number; x: number } | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let drawSurfaces: DrawSurface[] = [];
    let program: WebGLProgram | undefined;

    async function start(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      try {
        const response = await fetch(model.file);
        if (!response.ok) throw new Error(`Could not load ${model.file}`);
        const parsed = parseMd3(await response.arrayBuffer());
        const surfaces = [...parsed.surfaces];
        for (const attachment of model.attachments || []) {
          const tag = parsed.tags.get(attachment.tag);
          if (!tag) throw new Error(`Model is missing ${attachment.tag}`);
          const attachmentResponse = await fetch(attachment.file);
          if (!attachmentResponse.ok) throw new Error(`Could not load ${attachment.file}`);
          const attached = parseMd3(await attachmentResponse.arrayBuffer());
          positionOnTag(attached.surfaces, tag);
          surfaces.push(...attached.surfaces);
        }
        normalizeSurfaces(surfaces);
        if (cancelled) return;
        program = createProgram(gl);
        const textures = new Map<string, WebGLTexture>();
        for (const surface of surfaces) {
          const path = texturePath(surface.shader, model);
          if (!textures.has(path)) textures.set(path, await loadTexture(gl, path));
        }
        if (cancelled || !program) return;
        drawSurfaces = surfaces.map((surface) => ({
          position: makeBuffer(gl, gl.ARRAY_BUFFER, surface.positions),
          normal: makeBuffer(gl, gl.ARRAY_BUFFER, surface.normals),
          uv: makeBuffer(gl, gl.ARRAY_BUFFER, surface.uvs),
          index: makeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, surface.indices),
          texture: textures.get(texturePath(surface.shader, model))!,
          count: surface.indices.length,
          indexType: surface.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        }));

        const positionLocation = gl.getAttribLocation(program, "aPosition");
        const normalLocation = gl.getAttribLocation(program, "aNormal");
        const uvLocation = gl.getAttribLocation(program, "aUv");
        const mvpLocation = gl.getUniformLocation(program, "uMvp");
        const modelLocation = gl.getUniformLocation(program, "uModel");
        const accentLocation = gl.getUniformLocation(program, "uAccent");
        const compositeAlphaLocation = gl.getUniformLocation(program, "uCompositeAlpha");
        const textureLocation = gl.getUniformLocation(program, "uTexture");
        const accentRgb = hexToRgb(accent);
        let previous = performance.now();

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        // Quake III's MD3 meshes use the opposite winding from WebGL's
        // default. The original renderer culls GL_FRONT for these surfaces;
        // culling WebGL's default back faces removes the visible weapon shell.
        gl.cullFace(gl.FRONT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(program);
        gl.uniform3f(accentLocation, accentRgb[0], accentRgb[1], accentRgb[2]);
        gl.uniform1f(compositeAlphaLocation, model.compositeAlpha ? 1 : 0);
        gl.uniform1i(textureLocation, 0);

        function draw(now: number) {
          if (cancelled || !program) return;
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
          }
          if (!pausedRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            rotationRef.current += Math.min(now - previous, 40) * 0.00024;
          }
          previous = now;
          // MD3 uses Z-up coordinates. Keep the model upright and apply only a
          // turntable rotation here; the elevated viewing angle belongs to the
          // camera matrix. Tilting before rotating makes the weapon wobble.
          const modelMatrix = rotationZ(rotationRef.current);
          const mvp = multiply(perspective(width / Math.max(height, 1)), multiply(viewMatrix(), modelMatrix));
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniformMatrix4fv(mvpLocation, false, mvp);
          gl.uniformMatrix4fv(modelLocation, false, modelMatrix);

          drawSurfaces.forEach((surface) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.position);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.normal);
            gl.enableVertexAttribArray(normalLocation);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.uv);
            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.index);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, surface.texture);
            gl.drawElements(gl.TRIANGLES, surface.count, surface.indexType, 0);
          });
          animationFrame = requestAnimationFrame(draw);
        }

        setStatus("ready");
        animationFrame = requestAnimationFrame(draw);
      } catch (error) {
        console.error("Could not render weapon model", error);
        if (!cancelled) setStatus("error");
      }
    }

    void start(gl, canvas);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      drawSurfaces.forEach((surface) => {
        gl.deleteBuffer(surface.position);
        gl.deleteBuffer(surface.normal);
        gl.deleteBuffer(surface.uv);
        gl.deleteBuffer(surface.index);
        gl.deleteTexture(surface.texture);
      });
      if (program) gl.deleteProgram(program);
    };
  }, [accent, model]);

  return (
    <div className="weapon-viewer" style={{ "--weapon-accent": accent } as React.CSSProperties}>
      <div className="weapon-viewer-grid" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="relative z-10 size-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={`${model.label}, rotating in 3D`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = { pointerId: event.pointerId, x: event.clientX };
        }}
        onPointerMove={(event) => {
          if (draggingRef.current?.pointerId !== event.pointerId) return;
          rotationRef.current += (event.clientX - draggingRef.current.x) * 0.012;
          draggingRef.current.x = event.clientX;
        }}
        onPointerUp={(event) => {
          if (draggingRef.current?.pointerId === event.pointerId) draggingRef.current = null;
        }}
        onPointerCancel={() => { draggingRef.current = null; }}
      />
      {status === "loading" ? (
        <div className="absolute inset-0 z-20 grid place-items-center font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Loading model…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 z-20 grid place-items-center px-8 text-center font-mono text-sm uppercase tracking-[0.1em] text-muted-foreground">
          3D preview unavailable
        </div>
      ) : null}
      <div className="absolute inset-x-4 bottom-4 z-30 flex items-end justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Drag to inspect // {weaponName}
        </p>
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          className="inline-flex size-9 shrink-0 items-center justify-center border border-border/80 bg-background/80 text-muted-foreground backdrop-blur hover:border-primary hover:text-primary"
          aria-label={paused ? "Resume model rotation" : "Pause model rotation"}
        >
          {paused ? <Play className="size-4" weight="fill" /> : <Pause className="size-4" weight="fill" />}
        </button>
      </div>
    </div>
  );
}
