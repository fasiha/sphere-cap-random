var tape = require("tape"), cap = require("../");

tape("Hi!", function(test) {
  test.true(true, "yay!");
  test.end();
});

