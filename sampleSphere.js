import ndarray from "ndarray";
import zeros from "zeros";
import * as ops from 'ndarray-ops';
import pack from 'ndarray-pack';
import gemm from 'ndarray-gemm';

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
  return Array.from({length : N}, _ => {
    const z = Math.random() * (1 - minZ) + minZ;
    const r = Math.sqrt(1 - z * z);
    const θ = Math.random() * π2;
    const x = r * Math.cos(θ);
    const y = r * Math.sin(θ);
    return [ x, y, z ];
  });
}

export function crossMatrix(x, y, z) {
  return [
    0, -z, y, //
    z, 0, -x, //
    -y, x, 0
  ];
}

//export function dot(...args) {
//  args.reduce((sofar, curr) => {
//    const result = zeros([ sofar.shape[0], curr.shape[1] ]);
//    gemm(result, sofar, curr);
//    return result;
//  })
//}

export function axisAngleToRotationMatrix(axis, angleRad) {
  const C = ndarray(crossMatrix(...axis), [ 3, 3 ]);
  ops.multseq(C, Math.sin(angleRad));

  const R = zeros([ 3, 3 ]);
  ops.assigns(diagonal(R), Math.cos(angleRad));

  ops.addeq(R, C);

  const u = ndarray(axis, [ 3, 1 ]);
  gemm(R, u, u.transpose(1, 0), 1, 1);

  return R;
}

export function foo() { return ndarray([ 1, 2, 3, 4 ], [ 2, 2 ]); }
