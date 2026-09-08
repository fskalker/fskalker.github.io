(() => {
  const data = window.PRELOADED_CURVES;
  if (!data) return;

  let lo = 0, hi = 1;
  for (let i = 0; i < 70; i++) {
    const r = (lo + hi) / 2;
    r ** 6 + r ** 4 > 1 ? hi = r : lo = r;
  }
  const r = (lo + hi) / 2;
  const trefoil = Array.from({ length: 481 }, (_, i) => {
    const t = 2 * Math.PI * i / 480;
    return [r*r*Math.cos(2*t), r*r*Math.sin(2*t), r**3*Math.cos(3*t), r**3*Math.sin(3*t)];
  });

  const d5 = data['knot-trace3.json'].points;
  const d32 = data['knot.json'].points;
  const d60 = window.FUNDAMENTAL_CURVES['60'].points;
  const d117 = data['knot-trace11.json'].points;

  function rotate(q, angle, i, j) {
    const c = Math.cos(angle), s = Math.sin(angle), a = q[i], b = q[j];
    q[i] = c*a - s*b;
    q[j] = s*a + c*b;
  }

  function applyAmbientRotation(q, u, v) {
    rotate(q, u, 0, 3);
    rotate(q, v, 1, 2);
    return q;
  }

  function choosePole(curves) {
    let best = { index: 3, sign: 1, margin: -Infinity };
    for (let index = 0; index < 4; index++) for (const sign of [-1, 1]) {
      let largestDot = -Infinity;
      for (const curve of curves) for (const point of curve.points) {
        for (let iu = -4; iu <= 4; iu += 2) for (let iv = -4; iv <= 4; iv += 2) {
          const q = applyAmbientRotation(point.slice(), .28*iu/4, .20*iv/4);
          largestDot = Math.max(largestDot, sign*q[index]);
        }
      }
      const margin = 1-largestDot;
      if (margin > best.margin) best = { index, sign, margin };
    }
    return best;
  }

  function projected(point, time, yaw, pitch, pole) {
    const q = point.slice();
    applyAmbientRotation(q, .28*Math.sin(time*.00035), .20*Math.cos(time*.00029));
    const denominator = 1-pole.sign*q[pole.index];
    if (denominator < 1e-5) return null;
    const coordinates = q.filter((_, i) => i !== pole.index).map(value => value/denominator);
    let [X,Y,Z] = coordinates;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = cy*X + sy*Z;
    const z = -sy*X + cy*Z;
    return [x, cp*Y - sp*z, sp*Y + cp*z];
  }

  function makeScene(id, curves, compact = false, fixedPole = null) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pole = fixedPole || choosePole(curves);
    let yaw = 0, pitch = 0, pointer = null;

    canvas.addEventListener('pointerdown', event => {
      pointer = [event.clientX, event.clientY];
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointer) return;
      yaw += (event.clientX - pointer[0]) * .012;
      pitch += (event.clientY - pointer[1]) * .012;
      pointer = [event.clientX, event.clientY];
    });
    const release = () => pointer = null;
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    function frame(time) {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      const width = Math.max(1, box.width), height = Math.max(1, box.height);
      if (canvas.width !== Math.round(width*ratio) || canvas.height !== Math.round(height*ratio)) {
        canvas.width = Math.round(width*ratio);
        canvas.height = Math.round(height*ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const transformed = curves.map(curve => curve.points.map(p => projected(p, time, yaw, pitch, pole)));
      const visible = transformed.flat().filter(Boolean);
      if (!visible.length) return requestAnimationFrame(frame);
      const xs = visible.map(p => p[0]), ys = visible.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const scale = .82 * Math.min(width/Math.max(maxX-minX,.1), height/Math.max(maxY-minY,.1));
      const centerX = (minX+maxX)/2, centerY = (minY+maxY)/2;

      const segments = [];
      transformed.forEach((points, curveIndex) => {
        for (let i = 1; i < points.length; i++) {
          const a = points[i-1], b = points[i];
          if (!a || !b) continue;
          const phase = 2*Math.PI*i/(points.length-1);
          segments.push({
            a: [width/2+(a[0]-centerX)*scale, height/2-(a[1]-centerY)*scale],
            b: [width/2+(b[0]-centerX)*scale, height/2-(b[1]-centerY)*scale],
            depth: (a[2]+b[2])/2,
            colour: `hsl(${curves[curveIndex].hue + 20*Math.sin(phase)} 50% ${48 + 10*Math.cos(phase) + 5*Math.tanh(b[2])}%)`
          });
        }
      });

      // Draw far segments first so crossings retain their correct depth order
      // after the 3D scene is flattened to canvas.
      segments.sort((a, b) => a.depth-b.depth);
      ctx.lineCap = 'round';
      segments.forEach(segment => {
        ctx.beginPath(); ctx.moveTo(...segment.a); ctx.lineTo(...segment.b);
        ctx.strokeStyle = segment.colour;
        ctx.lineWidth = compact ? 1.45 : 2.5;
        ctx.stroke();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  makeScene('divider-trefoil', [{ points: trefoil, hue: 323 }], true, { index: 3, sign: 1 });
  makeScene('divider-d5', [{ points: d5, hue: 175 }], true);
  makeScene('divider-d32', [{ points: d32, hue: 200 }], true);
  makeScene('divider-d60', [{ points: d60, hue: 260 }], true);
  makeScene('divider-d117', [{ points: d117, hue: 323 }], true);
  makeScene('trefoil-knot', [{ points: trefoil, hue: 323 }, { points: d5, hue: 175 }], false, { index: 3, sign: 1 });
  makeScene('geodesics', [{ points: d32, hue: 190 }, { points: d117, hue: 323 }]);
})();
