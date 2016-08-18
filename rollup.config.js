import npm from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
  entry : "index.js",
  format : "umd",
  moduleName : "sphereModule",
  plugins : [
    npm({jsnext : true}), commonjs({
      ignoreGlobal : true,
      namedExports : {
        'node_modules/ndarray-ops/ndarray-ops.js' : [ 'addeq', 'multseq' ]
      }
    }),
    babel()
  ],
  dest : "sphereModule.js"
};

