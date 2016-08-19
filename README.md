# sphere-cap-random

**Obtain random points on directed spherical caps.**

In less high-falutin terms—random points on the surface of the Earth inside balls of fire like this one, caused by Vegeta in the series finale of Dragon Ball Z, circa 1996 😍:

![Vegeta, © FUNimation](/images/cap.jpg?raw=true)

## Introduction

An amateur ES2015 module (i.e., works browser and Node.js) to sample random points from a directed spherical cap of the unit sphere ([Mathworld](http://mathworld.wolfram.com/SphericalCap.html), [Wikipedia](https://en.wikipedia.org/wiki/Spherical_cap)).

The cap may be specified using either an angle (of the cone emanating from the origin) or a height below surface, and is associated with a 3D vector along which lies the cap’s center.

This module uses [scijs](http://scijs.net/packages/) extensively, if amateurishly.

## [Example](http://bl.ocks.org/fasiha/2bbfc20ef882d76e27f17df31950d156)

[Click here to interact with a 3D visualization of random samples using plotly.js.](http://bl.ocks.org/fasiha/2bbfc20ef882d76e27f17df31950d156)

![Example](/images/preview.png?raw=true)

## Installation

**Download** either [random-cap.js](https://raw.githubusercontent.com/fasiha/sphere-cap-random/gh-pages/dist/cap-random.js) (for development: [sourcemap](https://raw.githubusercontent.com/fasiha/sphere-cap-random/gh-pages/dist/cap-random.js.map) available) or [random-cap.min.js](https://raw.githubusercontent.com/fasiha/sphere-cap-random/gh-pages/dist/cap-random.min.js) (minified). Both are UMD—universal modules and can be used in either browser or server-side.

**Browser** Add `<script src="cap-random.min.js"></script>` to your HTML. This loads a global `capRandom` object which contains all the goodies.

**Node.js** Add `const capRandom = require('./cap-random.min.js');` and use the functions therein. NPM module forthcoming.

## API Usage

### `capRandom.sampleSphericalCap([params])`

`sampleSphericalCap()` returns a 3×1 vector, as a scijs [`ndarray`](https://github.com/scijs/ndarray), drawn randomly from the spherical cap centered at the North Pole of the unit sphere with unit height—in other words, the North Hemisphere.

`sampleSphericalCap(params)` looks for the following slots in the `params` object:
- `N`: return an 3×N array whose columns are the random points on the spherical cap;
- `z`: the height above the xy-plane at the bottom of the cap. By default, `z` is 0, which describes the Northern Hemisphere; `z=-1` would consider the entire sphere, rather than a cap.
- `deg`: the angle in degrees of the cone emanating from the origin and expanding towards the North Pole, and whose intersection with the sphere’s surface describes the spherical cap. And,
- `rad`: this same angle in radians.

The last three of these are all equivalent—specifying `z` or `deg` or `rad` sets the other two, but the code looks at these in this order.

### `capRandom.ndarrayToNative(...)`

If you don’t want to deal with scijs `ndarray`s in your JavaScript code, this convenience function unpacks an M×P `ndarray` into a native JavaScript array of length `M`, each element of which is in turn a `P`-long array.

```js
let [x, y, z] = capRandom.ndarrayToNative(capRandom.sampleSphericalCap({N: 10}));
```
This will give you three arrays, each with ten elements, specifying the XYZ components of the ten requested samples.

### `capRandom.ndarrayColsToNative(...)`

This convenience function is offered for completeness. It transposes a scijs `ndarray` before unpacking into a JavaScript array.
```js
let points = capRandom.ndarrayColsToNative(capRandom.sampleSphericalCap({N: 10}));
```
With this you get ten 3-long arrays.

### `capRandom.sampleDirectedSphericalCap(direction[, params])`

Whereas `sampleSphericalCap` considered the spherical cap centered on the North Pole, this function instead considers the spherical cap centered on the intersection of a `direction` 3-vector with the surface of the sphere (in the image above, the cause of the explosion: Vegeta).

`sampleDirectedSphericalCap` can take the same parameter object as `sampleSphericalCap`: you may specify the number of samples via `N`, and/or the `z`-dimension at the bottom of the cap (were it still centered at the North Pole), or the angle of the cone describing the cap via `deg` or `rad`.

This function works by passing on the optional parameter object `params` to `sampleSphericalCap` and rotating the resulting point(s) via an [axis–angle rotation](https://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle) to the desired direction.

### Others

There are a number of other functions exported by the module (see `index.js`): these are experimental, or will be extracted into their own stand-alone scijs-oriented packages.

## Background

This module started life as a [Matlab function](https://github.com/fasiha/personal-matlab-namespace/blob/master/%2Barf/randSphericalCap.m) on a [StackOverflow answer](http://stackoverflow.com/q/38997302/500207), cobbled together using insights from [@joriki](http://math.stackexchange.com/a/205589/81266) and [@Jim Belk](http://math.stackexchange.com/a/44691/81266).

Mike Bostock’s d3.js 4.0 inspired me to investigate Rollup and ES2015 modules. What a shock.

Thanks to the creator and contributors of [scijs](http://scijs.net/packages/) and `ndarray`. Here’s to more adventures 🍻.
