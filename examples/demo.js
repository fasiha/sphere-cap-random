const northPole = capRandom.ndarrayToNative(
    capRandom.sampleSphericalCap({N : 500, deg : 30}));
const octant = capRandom.ndarrayToNative(capRandom.sampleDirectedSphericalCap(
    capRandom.asNdarray([ [ 1 ], [ 1 ], [ 1 ] ]), {N : 500, deg : 30}));

const trace1 = {
  x : northPole[0],
  y : northPole[1],
  z : northPole[2],
  mode : 'markers',
  marker : {
    size : 2,
    line : {color : 'rgba(217, 217, 217, 0.14)', width : 0.0},
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
    line : {color : 'rgba(217, 217, 217, 0.14)', width : 0.0},
    opacity : 0.8
  },
  type : 'scatter3d',
  name : 'Positive octant'
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

const data = [ trace1, trace2, trace0 ];
const layout = {margin : {l : 0, r : 0, b : 0, t : 0}};
Plotly.newPlot('divPlot', data, layout);

