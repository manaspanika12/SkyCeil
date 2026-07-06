export const markerVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const markerFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPulse;
  varying vec2 vUv;

  void main() {
    float d = distance(vUv, vec2(0.5));
    float core = smoothstep(0.42, 0.08, d);
    float halo = smoothstep(0.5, 0.16, d) * 0.55;
    float pulse = 0.72 + sin(uTime * 0.004 + uPulse) * 0.28;
    float alpha = clamp((core + halo * pulse) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(uColor * (1.1 + halo), alpha);
  }
`;

export const trailVertexShader = `
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trailFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
  }
`;
