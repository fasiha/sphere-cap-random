var tape = require("tape");
var cap = require("../");

require('source-map-support').install();
var zeros = require('zeros');
var pack = require('ndarray-pack');
var ndarray = require('ndarray');
var ops = require('ndarray-ops');
var gemm = require('ndarray-gemm');
var show = require('ndarray-show');
var p = x => console.log(show(x));

tape("Randomly sample points from the unit spherical cap", function(test) {
  var res = cap.sampleSphericalCap()
  p(res);
  test.true(true, "yay!");
  test.end();
});

