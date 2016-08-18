import npm from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
  entry : 'index.js',
  format : 'umd',
  moduleName : 'sphereModule',
  plugins : [
    npm({jsnext : true}), commonjs({
      ignoreGlobal : true,
      namedExports : {
        'node_modules/ndarray-ops/ndarray-ops.js' : [
          'add',       'adds',     'addeq',     'addseq',     'sub',
          'subs',      'subeq',    'subseq',    'mul',        'muls',
          'muleq',     'mulseq',   'div',       'divs',       'diveq',
          'divseq',    'mod',      'mods',      'modeq',      'modseq',
          'band',      'bands',    'bandeq',    'bandseq',    'bor',
          'bors',      'boreq',    'borseq',    'bxor',       'bxors',
          'bxoreq',    'bxorseq',  'lshift',    'lshifts',    'lshifteq',
          'lshiftseq', 'rshift',   'rshifts',   'rshifteq',   'rshiftseq',
          'rrshift',   'rrshifts', 'rrshifteq', 'rrshiftseq', 'lt',
          'lts',       'lteq',     'ltseq',     'gt',         'gts',
          'gteq',      'gtseq',    'leq',       'leqs',       'leqeq',
          'leqseq',    'geq',      'geqs',      'geqeq',      'geqseq',
          'eq',        'eqs',      'eqeq',      'eqseq',      'neq',
          'neqs',      'neqeq',    'neqseq',    'and',        'ands',
          'andeq',     'andseq',   'or',        'ors',        'oreq',
          'orseq',     'max',      'maxs',      'maxeq',      'maxseq',
          'min',       'mins',     'mineq',     'minseq'
        ]
      }
    }),
    babel()
  ],
  dest : './dist/sphereModule.js',
  sourceMap: true,
  sourceMapFile: 'dist/sphereModule.js.map'
};

