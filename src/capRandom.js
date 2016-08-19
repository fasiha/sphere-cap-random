import ndarray from "ndarray";
import zeros from "zeros";
import * as ops from 'ndarray-ops';
import pack from 'ndarray-pack';
import gemm from 'ndarray-gemm';
import diagonal from 'ndarray-diagonal';

import unpack from "ndarray-unpack";

export function ndarrayToNative(x) { return unpack(x); }
export function ndarrayColsToNative(x) { return unpack(x.transpose(1, 0)); }

export default function sampleSphericalCap(params) {
  params = params == null ? {N : 1, z : 0} : params;

  const π = Math.PI;
  const π2 = 2 * π;
  const halfπ = 0.5 * π;
  const radPerDeg = π / 180;

  const minZ =
      (params.z ? +params.z
                : (params.deg ? Math.cos(+params.deg * radPerDeg)
                              : (params.rad ? Math.cos(+params.rad) : 0)));
  const N = params.N ? +params.N : 1;
  return pack(Array.from({length : N}, _ => {
           const z = Math.random() * (1 - minZ) + minZ;
           const r = Math.sqrt(1 - z * z);
           const θ = Math.random() * π2;
           const x = r * Math.cos(θ);
           const y = r * Math.sin(θ);
           return [ x, y, z ];
         })).transpose(1, 0);
}

export function asNdarray(x) { return x.data ? x : pack(x); }

export function sampleDirectedSphericalCap(direction, ...args) {
  const normDir = normalizeCols(direction);
  const rotAxis = normalizeCols(dot(crossMatrix(0, 0, 1), normDir));
  const rotAngle =
      Math.acos(dot(ndarray([ 0, 0, 1 ], [ 1, 3 ]), normDir).get(0, 0));
  const R = axisAngleToRotationMatrix(rotAxis, rotAngle);

  const samples = sampleSphericalCap(...args);

  return dot(R, samples);
}

export function axisAngleToRotationMatrix(axis, angleRad) {
  const C = crossMatrix(...ndToIterator(axis));
  ops.mulseq(C, Math.sin(angleRad));

  const R = zeros([ 3, 3 ]);
  ops.assigns(diagonal(R), Math.cos(angleRad));

  ops.addeq(R, C);

  gemm(R, axis, axis.transpose(1, 0), 1, 1);

  return R;
}

export function crossMatrix(x, y, z) {
  return pack([
    [ 0, -z, y ], //
    [ z, 0, -x ], //
    [ -y, x, 0 ]
  ]);
}

export function dot(...args) {
  return args.reduce((sofar, curr) => {
    const result = zeros([ sofar.shape[0], curr.shape[1] ]);
    gemm(result, sofar, curr);
    return result;
  });
}

export function ndToIterator(x) { return x.data || x; }

// Can https://github.com/scijs/cwise#compute-2d-vector-norms-using-blocks be
// used here?
export function normalizeCols(x) {
  for (var i = 0; i < x.shape[1]; i++) {
    const col = x.pick(null, i);
    const norm = ops.norm2(col);
    ops.divseq(col, norm);
  }
  return x;
}

export function normalizeColsPure(x) {
  const y = zeros(x.shape);
  for (var i = 0; i < x.shape[1]; i++) {
    const col = x.pick(null, i);
    const norm = ops.norm2(col);
    ops.divs(y.pick(null, i), col, norm);
  }
  return y;
}

export function example1() { return ops.random(ndarray([ 1, 2, 3, 4 ], [ 2, 2 ])); }

export function example2() {
  const a = ops.random(zeros([ 2, 2 ]));
  const b = ndarray([ 100, 200, 300, 400 ], [ 2, 2 ]);
  const c = zeros([ 2, 2 ]);
  ops.add(c, a, b);
  return c;
}
