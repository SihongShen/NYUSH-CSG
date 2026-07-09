'use client';

import { useEffect, useRef } from 'react';

/**
 * 登录页背景动效：可被鼠标"搅动"的渐变水面（WebGL shader）。
 *
 * 渐变本身画在 canvas 里；鼠标划过的轨迹点作为扰动源，在片元着色器里
 * 对取色坐标做径向波 + 切向旋转的位移——视觉上就是渐变被搅出涟漪。
 * 点击会搅出更大的一圈。另有一层极微弱的常驻涌动让画面不死板。
 *
 * 兜底：WebGL 不可用或 prefers-reduced-motion 时不渲染，
 * 页面底下的 CSS 渐变（颜色一致）自然接管。
 */

const MAX_POINTS = 24;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec4 u_pts[${MAX_POINTS}]; // x, y（像素，y 向下）, 出生时间, 强度(0=空位)

// 对应 CSS: bg-gradient-to-br from-nyu-violet/50 via-nyu-violet/10 to-background
vec3 gradientColor(vec2 uv) {
  float t = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
  vec3 c0 = vec3(0.671, 0.514, 0.776);  // #57068C 50% over white
  vec3 c1 = vec3(0.934, 0.902, 0.955);  // 10% over white
  vec3 c2 = vec3(1.0, 1.0, 1.0);
  return t < 0.5 ? mix(c0, c1, t * 2.0) : mix(c1, c2, (t - 0.5) * 2.0);
}

void main() {
  // uv 以左上为原点（与鼠标坐标一致）
  vec2 uv = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res;
  float aspect = u_res.x / u_res.y;

  vec2 offset = vec2(0.0);
  for (int i = 0; i < ${MAX_POINTS}; i++) {
    vec4 p = u_pts[i];
    if (p.w <= 0.0) continue;
    float age = u_time - p.z;
    if (age < 0.0 || age > 2.6) continue;

    vec2 dir = uv - p.xy / u_res;
    dir.x *= aspect;              // 修正宽高比，涟漪保持圆形
    float d = length(dir);
    // 向外传播的衰减波：sin(距离·频率 - 时间·速度)，随距离和年龄衰减
    float wave = sin(d * 30.0 - age * 6.5) * exp(-d * 5.5) * exp(-age * 1.3);
    vec2 n = d > 0.0001 ? dir / d : vec2(0.0);
    vec2 tangent = vec2(-n.y, n.x);
    // 径向推挤 + 切向旋转 = "搅"的感觉
    offset += (n * wave + tangent * wave * 0.65) * 0.016 * p.w;
  }

  // 极微弱的常驻涌动（无鼠标时画面也是活的）
  offset += 0.003 * vec2(
    sin(uv.y * 5.0 + u_time * 0.35),
    cos(uv.x * 4.0 + u_time * 0.28)
  );

  gl_FragColor = vec4(gradientColor(uv + offset), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('login shader compile error', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

export function WaterGradient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { antialias: false });
    if (!gl) return; // CSS 渐变兜底

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // 全屏三角形
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uPts = gl.getUniformLocation(prog, 'u_pts');

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // 扰动点环形缓冲：x, y（css 像素 * dpr）, 出生秒, 强度
    const pts = new Float32Array(MAX_POINTS * 4);
    let head = 0;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;

    const push = (x: number, y: number, strength: number) => {
      const i = head * 4;
      pts[i] = x * dpr;
      pts[i + 1] = y * dpr;
      pts[i + 2] = now();
      pts[i + 3] = strength;
      head = (head + 1) % MAX_POINTS;
    };

    let lastX = -1;
    let lastY = -1;
    const onMove = (e: MouseEvent) => {
      if (lastX < 0 || Math.hypot(e.clientX - lastX, e.clientY - lastY) >= 26) {
        lastX = e.clientX;
        lastY = e.clientY;
        push(e.clientX, e.clientY, 1);
      }
    };
    const onDown = (e: MouseEvent) => push(e.clientX, e.clientY, 2.2);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);

    let raf = 0;
    const tick = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now());
      gl.uniform4fv(uPts, pts);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden
    />
  );
}
