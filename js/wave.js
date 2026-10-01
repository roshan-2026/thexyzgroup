// 3D WebGL particle wave simulation
(function () {
  'use strict';

  // Wave configuration
  const CONFIG = {
    gridWidth: 155,
    gridDepth: 145,
    spacingX: 0.82,
    spacingZ: 0.85,
    originX: -63.5,
    originZ: -72.0,
    fov: 55,
    near: 0.1,
    far: 250.0,
    cameraBaseY: 17.5,
    cameraBaseZ: 38.0,
    lookTargetY: -1.5,
    lookTargetZ: -18.0,
    pointBaseSize: 52.0,
  };

  // Matrix math helpers
  const Mat4 = {
    create: function () {
      return new Float32Array(16);
    },

    perspective: function (out, fovRad, aspect, near, far) {
      const f = 1.0 / Math.tan(fovRad / 2.0);
      const nf = 1.0 / (near - far);

      out[0] = f / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;

      out[4] = 0;
      out[5] = f;
      out[6] = 0;
      out[7] = 0;

      out[8] = 0;
      out[9] = 0;
      out[10] = (far + near) * nf;
      out[11] = -1;

      out[12] = 0;
      out[13] = 0;
      out[14] = (2.0 * far * near) * nf;
      out[15] = 0;
      return out;
    },

    lookAt: function (out, eye, center, up) {
      let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
      const eyex = eye[0], eyey = eye[1], eyez = eye[2];
      const upx = up[0], upy = up[1], upz = up[2];
      const targetx = center[0], targety = center[1], targetz = center[2];

      z0 = eyex - targetx;
      z1 = eyey - targety;
      z2 = eyez - targetz;

      len = 1.0 / Math.hypot(z0, z1, z2);
      z0 *= len;
      z1 *= len;
      z2 *= len;

      x0 = upy * z2 - upz * z1;
      x1 = upz * z0 - upx * z2;
      x2 = upx * z1 - upy * z0;
      len = Math.hypot(x0, x1, x2);
      if (!len) {
        x0 = 0; x1 = 0; x2 = 0;
      } else {
        len = 1.0 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
      }

      y0 = z1 * x2 - z2 * x1;
      y1 = z2 * x0 - z0 * x2;
      y2 = z0 * x1 - z1 * x0;

      out[0] = x0;
      out[1] = y0;
      out[2] = z0;
      out[3] = 0;

      out[4] = x1;
      out[5] = y1;
      out[6] = z1;
      out[7] = 0;

      out[8] = x2;
      out[9] = y2;
      out[10] = z2;
      out[11] = 0;

      out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
      out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
      out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
      out[15] = 1;
      return out;
    }
  };

  // Vertex shader
  const VERTEX_SHADER_SRC = `
    precision highp float;

    attribute vec4 a_pointData; // x, z, seed, sizeOffset

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform float u_time;
    uniform float u_scrollProgress;
    uniform vec2 u_mouse;
    uniform float u_dpr;

    varying vec3 v_particleColor;
    varying float v_particleAlpha;

    void main() {
      float x = a_pointData.x;
      float z = a_pointData.y;
      float seed = a_pointData.z;
      float sizeMult = a_pointData.w;

      float t = u_time * 0.72;
      float scrollWave = u_scrollProgress * 6.28318;

      // Harmonic sine wave displacement
      float w1 = sin(x * 0.055 + t * 1.15 + scrollWave * 0.75) * cos(z * 0.042 + t * 0.85);
      float w2 = sin(x * 0.11 - z * 0.075 + t * 1.35 + scrollWave * 0.4) * 0.52;
      float w3 = cos(x * 0.028 + z * 0.065 + t * 0.65 + seed * 0.8) * 0.78;
      float w4 = sin((x * 0.7 + z * 0.9) * 0.048 + t * 0.92) * 0.42;

      // Mouse ripple interaction
      vec2 particleXZ = vec2(x, z);
      vec2 mouseWorld = u_mouse * 32.0;
      float mDist = length(particleXZ - mouseWorld);
      float mouseRipple = exp(-mDist * 0.08) * sin(mDist * 0.65 - t * 4.0) * 1.7;

      float y = (w1 + w2 + w3 + w4 + mouseRipple) * 3.6;

      vec4 worldPosition = vec4(x, y, z, 1.0);
      vec4 viewPosition = u_view * worldPosition;
      gl_Position = u_projection * viewPosition;

      float depth = -viewPosition.z;

      float baseSize = 48.0 * u_dpr;
      float calculatedSize = (baseSize / max(depth, 1.0)) * sizeMult * (1.0 + (y + 3.0) * 0.07);
      gl_PointSize = clamp(calculatedSize, 1.2, 38.0 * u_dpr);

      float hNorm = clamp((y + 3.4) / 7.2, 0.0, 1.0);

      vec3 colTrough = vec3(0.78, 0.33, 0.04);
      vec3 colMid    = vec3(0.98, 0.67, 0.12);
      vec3 colPeak   = vec3(1.00, 0.95, 0.58);

      vec3 color;
      if (hNorm < 0.48) {
        color = mix(colTrough, colMid, hNorm / 0.48);
      } else {
        color = mix(colMid, colPeak, (hNorm - 0.48) / 0.52);
      }

      float twinkle = sin(t * 2.2 + seed * 18.0) * 0.12;
      color += vec3(twinkle * 0.22, twinkle * 0.16, twinkle * 0.06);

      v_particleColor = color;

      float fogNear = 4.0;
      float fogFar = 115.0;
      float depthAlpha = smoothstep(fogFar, 48.0, depth) * smoothstep(1.5, fogNear, depth);
      float edgeXAlpha = smoothstep(62.0, 36.0, abs(x));

      v_particleAlpha = depthAlpha * edgeXAlpha * (0.62 + hNorm * 0.38);
    }
  `;

  // Fragment shader
  const FRAGMENT_SHADER_SRC = `
    precision mediump float;

    varying vec3 v_particleColor;
    varying float v_particleAlpha;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);

      if (dist > 0.5) {
        discard;
      }

      float halo = smoothstep(0.5, 0.02, dist);
      float innerCore = smoothstep(0.22, 0.0, dist);

      vec3 finalColor = v_particleColor + vec3(0.35, 0.30, 0.18) * innerCore;
      float finalAlpha = halo * v_particleAlpha;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  // Wave field controller
  class WaveField {
    constructor() {
      this.canvas = document.getElementById('wave-canvas');
      if (!this.canvas) return;

      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      }) || this.canvas.getContext('experimental-webgl');

      if (!this.gl) return;

      this.initParameters();
      this.initShaders();
      this.initGeometry();
      this.initEvents();

      this.resize();
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    initParameters() {
      this.time = 0;
      this.lastTime = performance.now();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.scrollTarget = 0;
      this.scrollCurrent = 0;
      this.maxScroll = 1;

      this.mouseTarget = { x: 0, y: 0 };
      this.mouseCurrent = { x: 0, y: 0 };

      this.projectionMatrix = Mat4.create();
      this.viewMatrix = Mat4.create();
      this.cameraPos = [0, CONFIG.cameraBaseY, CONFIG.cameraBaseZ];
      this.lookAtTarget = [0, CONFIG.lookTargetY, CONFIG.lookTargetZ];
      this.upVector = [0, 1, 0];

      this.isVisible = true;
    }

    createShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    initShaders() {
      const gl = this.gl;
      const vertShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fragShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vertShader);
      gl.attachShader(this.program, fragShader);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) return;

      gl.useProgram(this.program);

      this.aPointDataLocation = gl.getAttribLocation(this.program, 'a_pointData');
      this.uProjectionLocation = gl.getUniformLocation(this.program, 'u_projection');
      this.uViewLocation = gl.getUniformLocation(this.program, 'u_view');
      this.uTimeLocation = gl.getUniformLocation(this.program, 'u_time');
      this.uScrollProgressLocation = gl.getUniformLocation(this.program, 'u_scrollProgress');
      this.uMouseLocation = gl.getUniformLocation(this.program, 'u_mouse');
      this.uDprLocation = gl.getUniformLocation(this.program, 'u_dpr');

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    initGeometry() {
      const gl = this.gl;
      const numX = CONFIG.gridWidth;
      const numZ = CONFIG.gridDepth;
      this.particleCount = numX * numZ;

      const data = new Float32Array(this.particleCount * 4);
      let ptr = 0;

      for (let i = 0; i < numX; i++) {
        for (let j = 0; j < numZ; j++) {
          const jitterX = (Math.random() - 0.5) * CONFIG.spacingX * 0.55;
          const jitterZ = (Math.random() - 0.5) * CONFIG.spacingZ * 0.55;

          const x = CONFIG.originX + i * CONFIG.spacingX + jitterX;
          const z = CONFIG.originZ + j * CONFIG.spacingZ + jitterZ;

          const seed = Math.random();
          const sizeOffset = 0.65 + Math.random() * 0.75 + (Math.random() > 0.94 ? 0.85 : 0.0);

          data[ptr++] = x;
          data[ptr++] = z;
          data[ptr++] = seed;
          data[ptr++] = sizeOffset;
        }
      }

      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(this.aPointDataLocation);
      gl.vertexAttribPointer(this.aPointDataLocation, 4, gl.FLOAT, false, 4 * 4, 0);
    }

    initEvents() {
      const onScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.maxScroll = scrollHeight > 0 ? scrollHeight : 1;
        this.scrollTarget = scrollTop / this.maxScroll;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      window.addEventListener('mousemove', (e) => {
        this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }, { passive: true });

      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.resize(), 100);
      });

      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;
        if (this.isVisible) this.lastTime = performance.now();
      });
    }

    resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.floor(width * this.dpr);
      this.canvas.height = Math.floor(height * this.dpr);

      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';

      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      const aspect = width / height;
      const fovRad = (CONFIG.fov * Math.PI) / 180.0;
      Mat4.perspective(this.projectionMatrix, fovRad, aspect, CONFIG.near, CONFIG.far);
    }

    animate(now) {
      this.rafId = requestAnimationFrame(this.animate);
      if (!this.isVisible) return;

      const dt = Math.min((now - this.lastTime) * 0.001, 0.1);
      this.lastTime = now;
      this.time += dt;

      this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * 0.07;
      this.mouseCurrent.x += (this.mouseTarget.x - this.mouseCurrent.x) * 0.05;
      this.mouseCurrent.y += (this.mouseTarget.y - this.mouseCurrent.y) * 0.05;

      const scrollFlightY = CONFIG.cameraBaseY - this.scrollCurrent * 4.5;
      const scrollFlightZ = CONFIG.cameraBaseZ - this.scrollCurrent * 12.0;

      this.cameraPos[0] = this.mouseCurrent.x * 4.0;
      this.cameraPos[1] = scrollFlightY + this.mouseCurrent.y * 1.5;
      this.cameraPos[2] = scrollFlightZ;

      this.lookAtTarget[0] = this.mouseCurrent.x * 1.5;
      this.lookAtTarget[1] = CONFIG.lookTargetY - this.scrollCurrent * 2.0;
      this.lookAtTarget[2] = CONFIG.lookTargetZ - this.scrollCurrent * 8.0;

      Mat4.lookAt(this.viewMatrix, this.cameraPos, this.lookAtTarget, this.upVector);

      const gl = this.gl;
      gl.clearColor(0.015, 0.015, 0.035, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.aPointDataLocation);
      gl.vertexAttribPointer(this.aPointDataLocation, 4, gl.FLOAT, false, 4 * 4, 0);

      gl.uniformMatrix4fv(this.uProjectionLocation, false, this.projectionMatrix);
      gl.uniformMatrix4fv(this.uViewLocation, false, this.viewMatrix);
      gl.uniform1f(this.uTimeLocation, this.time);
      gl.uniform1f(this.uScrollProgressLocation, this.scrollCurrent);
      gl.uniform2f(this.uMouseLocation, this.mouseCurrent.x, this.mouseCurrent.y);
      gl.uniform1f(this.uDprLocation, this.dpr);

      gl.drawArrays(gl.POINTS, 0, this.particleCount);
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WaveField());
  } else {
    new WaveField();
  }
})();
