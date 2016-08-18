import npm from "rollup-plugin-node-resolve";
import babel from 'rollup-plugin-babel';

export default {
  entry : "index.js",
  format : "umd",
  moduleName : "sphereModule",
  plugins : [ npm({jsnext : true}), babel() ],
  dest : "sphereModule.js"
};

