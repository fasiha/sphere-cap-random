const cap = capRandom;

/* Generate some random data */
// Samples from the 30° spherical cap at the North Pole
const northPole =
    cap.ndarrayToNative(cap.sampleSphericalCap({N : 500, deg : 30}));

// Samples from the 30° spherical cap pointing at [1,1,1]
const octant = cap.ndarrayToNative(cap.sampleDirectedSphericalCap(
    [ [ 1 ], [ 1 ], [ 1 ] ], {N : 500, deg : 30}));

// Samples from the 110° spherical cap (a dome) at the **South** Pole
const dome = cap.ndarrayToNative(cap.sampleDirectedSphericalCap(
    [ [ 0 ], [ 0 ], [ -1 ] ], {N : 2000, deg : 110}));

/* Three Plotly traces for each of these three datasets, plus one for origin */
const trace1 = {
  x : northPole[0],
  y : northPole[1],
  z : northPole[2],
  mode : 'markers',
  marker : {
    size : 2,
    opacity : 0.8
  },
  type : 'scatter3d',
  name : 'North Pole'
};

const trace2 = {
  x : octant[0],
  y : octant[1],
  z : octant[2],
  mode : 'markers',
  marker : {
    size : 2,
    opacity : 0.8
  },
  type : 'scatter3d',
  name : 'Positive octant'
};

const trace3 = {
  x : dome[0],
  y : dome[1],
  z : dome[2],
  mode : 'markers',
  marker : {
    size : 2,
    opacity : 0.8
  },
  type : 'scatter3d',
  name : 'South Pole Dome'
};

const trace0 = {
  x : [0],
  y : [0],
  z : [0],
  mode : 'markers',
  marker : {
    color : 'rgb(127, 127, 127)',
    size : 12,
    symbol : 'circle',
    line : {color : 'rgb(204, 204, 204)', width : 1},
    opacity : 0.8
  },
  type : 'scatter3d',
  name : 'Origin'
};

/* Generate plots! */
const data = [ trace1, trace2, trace3, trace0 ];
const layout = {margin : {l : 0, r : 0, b : 0, t : 0}};
Plotly.newPlot('divPlot', data, layout);

