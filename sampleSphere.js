
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
  const z = Array.from({length : N}, _ => Math.random() * (1 - minZ) + minZ);

  const r = z.map(z => Math.sqrt(1 - z * z));
  const θ = r.map(_ => Math.random() * π2);
  return r.map((r, i) => [r * Math.cos(θ[i]), r * Math.sin(θ[i]), z[i]]);
}
