(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.capRandom = global.capRandom || {})));
}(this, (function (exports) { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}

function interopDefault(ex) {
	return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var iota = createCommonjsModule(function (module) {
  "use strict";

  function iota(n) {
    var result = new Array(n);
    for (var i = 0; i < n; ++i) {
      result[i] = i;
    }
    return result;
  }

  module.exports = iota;
});

var iota$1 = interopDefault(iota);

var require$$1 = Object.freeze({
  default: iota$1
});

var index = createCommonjsModule(function (module) {
  /*!
   * Determine if an object is a Buffer
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   */

  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually
  module.exports = function (obj) {
    return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
  };

  function isBuffer(obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
  }

  // For Node v0.10 support. Remove this eventually.
  function isSlowBuffer(obj) {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0));
  }
});

var index$1 = interopDefault(index);

var require$$0$1 = Object.freeze({
  default: index$1
});

var ndarray = createCommonjsModule(function (module) {
  var iota = interopDefault(require$$1);
  var isBuffer = interopDefault(require$$0$1);

  var hasTypedArrays = typeof Float64Array !== "undefined";

  function compare1st(a, b) {
    return a[0] - b[0];
  }

  function order() {
    var stride = this.stride;
    var terms = new Array(stride.length);
    var i;
    for (i = 0; i < terms.length; ++i) {
      terms[i] = [Math.abs(stride[i]), i];
    }
    terms.sort(compare1st);
    var result = new Array(terms.length);
    for (i = 0; i < result.length; ++i) {
      result[i] = terms[i][1];
    }
    return result;
  }

  function compileConstructor(dtype, dimension) {
    var className = ["View", dimension, "d", dtype].join("");
    if (dimension < 0) {
      className = "View_Nil" + dtype;
    }
    var useGetters = dtype === "generic";

    if (dimension === -1) {
      //Special case for trivial arrays
      var code = "function " + className + "(a){this.data=a;};\
var proto=" + className + ".prototype;\
proto.dtype='" + dtype + "';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new " + className + "(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_" + className + "(a){return new " + className + "(a);}";
      var procedure = new Function(code);
      return procedure();
    } else if (dimension === 0) {
      //Special case for 0d arrays
      var code = "function " + className + "(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto=" + className + ".prototype;\
proto.dtype='" + dtype + "';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function " + className + "_copy() {\
return new " + className + "(this.data,this.offset)\
};\
proto.pick=function " + className + "_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function " + className + "_get(){\
return " + (useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]") + "};\
proto.set=function " + className + "_set(v){\
return " + (useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v") + "\
};\
return function construct_" + className + "(a,b,c,d){return new " + className + "(a,d)}";
      var procedure = new Function("TrivialArray", code);
      return procedure(CACHED_CONSTRUCTORS[dtype][0]);
    }

    var code = ["'use strict'"];

    //Create constructor for view
    var indices = iota(dimension);
    var args = indices.map(function (i) {
      return "i" + i;
    });
    var index_str = "this.offset+" + indices.map(function (i) {
      return "this.stride[" + i + "]*i" + i;
    }).join("+");
    var shapeArg = indices.map(function (i) {
      return "b" + i;
    }).join(",");
    var strideArg = indices.map(function (i) {
      return "c" + i;
    }).join(",");
    code.push("function " + className + "(a," + shapeArg + "," + strideArg + ",d){this.data=a", "this.shape=[" + shapeArg + "]", "this.stride=[" + strideArg + "]", "this.offset=d|0}", "var proto=" + className + ".prototype", "proto.dtype='" + dtype + "'", "proto.dimension=" + dimension);

    //view.size:
    code.push("Object.defineProperty(proto,'size',{get:function " + className + "_size(){\
return " + indices.map(function (i) {
      return "this.shape[" + i + "]";
    }).join("*"), "}})");

    //view.order:
    if (dimension === 1) {
      code.push("proto.order=[0]");
    } else {
      code.push("Object.defineProperty(proto,'order',{get:");
      if (dimension < 4) {
        code.push("function " + className + "_order(){");
        if (dimension === 2) {
          code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})");
        } else if (dimension === 3) {
          code.push("var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})");
        }
      } else {
        code.push("ORDER})");
      }
    }

    //view.set(i0, ..., v):
    code.push("proto.set=function " + className + "_set(" + args.join(",") + ",v){");
    if (useGetters) {
      code.push("return this.data.set(" + index_str + ",v)}");
    } else {
      code.push("return this.data[" + index_str + "]=v}");
    }

    //view.get(i0, ...):
    code.push("proto.get=function " + className + "_get(" + args.join(",") + "){");
    if (useGetters) {
      code.push("return this.data.get(" + index_str + ")}");
    } else {
      code.push("return this.data[" + index_str + "]}");
    }

    //view.index:
    code.push("proto.index=function " + className + "_index(", args.join(), "){return " + index_str + "}");

    //view.hi():
    code.push("proto.hi=function " + className + "_hi(" + args.join(",") + "){return new " + className + "(this.data," + indices.map(function (i) {
      return ["(typeof i", i, "!=='number'||i", i, "<0)?this.shape[", i, "]:i", i, "|0"].join("");
    }).join(",") + "," + indices.map(function (i) {
      return "this.stride[" + i + "]";
    }).join(",") + ",this.offset)}");

    //view.lo():
    var a_vars = indices.map(function (i) {
      return "a" + i + "=this.shape[" + i + "]";
    });
    var c_vars = indices.map(function (i) {
      return "c" + i + "=this.stride[" + i + "]";
    });
    code.push("proto.lo=function " + className + "_lo(" + args.join(",") + "){var b=this.offset,d=0," + a_vars.join(",") + "," + c_vars.join(","));
    for (var i = 0; i < dimension; ++i) {
      code.push("if(typeof i" + i + "==='number'&&i" + i + ">=0){\
d=i" + i + "|0;\
b+=c" + i + "*d;\
a" + i + "-=d}");
    }
    code.push("return new " + className + "(this.data," + indices.map(function (i) {
      return "a" + i;
    }).join(",") + "," + indices.map(function (i) {
      return "c" + i;
    }).join(",") + ",b)}");

    //view.step():
    code.push("proto.step=function " + className + "_step(" + args.join(",") + "){var " + indices.map(function (i) {
      return "a" + i + "=this.shape[" + i + "]";
    }).join(",") + "," + indices.map(function (i) {
      return "b" + i + "=this.stride[" + i + "]";
    }).join(",") + ",c=this.offset,d=0,ceil=Math.ceil");
    for (var i = 0; i < dimension; ++i) {
      code.push("if(typeof i" + i + "==='number'){\
d=i" + i + "|0;\
if(d<0){\
c+=b" + i + "*(a" + i + "-1);\
a" + i + "=ceil(-a" + i + "/d)\
}else{\
a" + i + "=ceil(a" + i + "/d)\
}\
b" + i + "*=d\
}");
    }
    code.push("return new " + className + "(this.data," + indices.map(function (i) {
      return "a" + i;
    }).join(",") + "," + indices.map(function (i) {
      return "b" + i;
    }).join(",") + ",c)}");

    //view.transpose():
    var tShape = new Array(dimension);
    var tStride = new Array(dimension);
    for (var i = 0; i < dimension; ++i) {
      tShape[i] = "a[i" + i + "]";
      tStride[i] = "b[i" + i + "]";
    }
    code.push("proto.transpose=function " + className + "_transpose(" + args + "){" + args.map(function (n, idx) {
      return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)";
    }).join(";"), "var a=this.shape,b=this.stride;return new " + className + "(this.data," + tShape.join(",") + "," + tStride.join(",") + ",this.offset)}");

    //view.pick():
    code.push("proto.pick=function " + className + "_pick(" + args + "){var a=[],b=[],c=this.offset");
    for (var i = 0; i < dimension; ++i) {
      code.push("if(typeof i" + i + "==='number'&&i" + i + ">=0){c=(c+this.stride[" + i + "]*i" + i + ")|0}else{a.push(this.shape[" + i + "]);b.push(this.stride[" + i + "])}");
    }
    code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}");

    //Add return statement
    code.push("return function construct_" + className + "(data,shape,stride,offset){return new " + className + "(data," + indices.map(function (i) {
      return "shape[" + i + "]";
    }).join(",") + "," + indices.map(function (i) {
      return "stride[" + i + "]";
    }).join(",") + ",offset)}");

    //Compile procedure
    var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"));
    return procedure(CACHED_CONSTRUCTORS[dtype], order);
  }

  function arrayDType(data) {
    if (isBuffer(data)) {
      return "buffer";
    }
    if (hasTypedArrays) {
      switch (Object.prototype.toString.call(data)) {
        case "[object Float64Array]":
          return "float64";
        case "[object Float32Array]":
          return "float32";
        case "[object Int8Array]":
          return "int8";
        case "[object Int16Array]":
          return "int16";
        case "[object Int32Array]":
          return "int32";
        case "[object Uint8Array]":
          return "uint8";
        case "[object Uint16Array]":
          return "uint16";
        case "[object Uint32Array]":
          return "uint32";
        case "[object Uint8ClampedArray]":
          return "uint8_clamped";
      }
    }
    if (Array.isArray(data)) {
      return "array";
    }
    return "generic";
  }

  var CACHED_CONSTRUCTORS = {
    "float32": [],
    "float64": [],
    "int8": [],
    "int16": [],
    "int32": [],
    "uint8": [],
    "uint16": [],
    "uint32": [],
    "array": [],
    "uint8_clamped": [],
    "buffer": [],
    "generic": []
  };(function () {
    for (var id in CACHED_CONSTRUCTORS) {
      CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1));
    }
  });

  function wrappedNDArrayCtor(data, shape, stride, offset) {
    if (data === undefined) {
      var ctor = CACHED_CONSTRUCTORS.array[0];
      return ctor([]);
    } else if (typeof data === "number") {
      data = [data];
    }
    if (shape === undefined) {
      shape = [data.length];
    }
    var d = shape.length;
    if (stride === undefined) {
      stride = new Array(d);
      for (var i = d - 1, sz = 1; i >= 0; --i) {
        stride[i] = sz;
        sz *= shape[i];
      }
    }
    if (offset === undefined) {
      offset = 0;
      for (var i = 0; i < d; ++i) {
        if (stride[i] < 0) {
          offset -= (shape[i] - 1) * stride[i];
        }
      }
    }
    var dtype = arrayDType(data);
    var ctor_list = CACHED_CONSTRUCTORS[dtype];
    while (ctor_list.length <= d + 1) {
      ctor_list.push(compileConstructor(dtype, ctor_list.length - 1));
    }
    var ctor = ctor_list[d + 1];
    return ctor(data, shape, stride, offset);
  }

  module.exports = wrappedNDArrayCtor;
});

var ndarray$1 = interopDefault(ndarray);

var require$$0 = Object.freeze({
  default: ndarray$1
});

var zeros = createCommonjsModule(function (module) {
  "use strict";

  var ndarray = interopDefault(require$$0);

  function dtypeToType(dtype) {
    switch (dtype) {
      case 'uint8':
        return Uint8Array;
      case 'uint16':
        return Uint16Array;
      case 'uint32':
        return Uint32Array;
      case 'int8':
        return Int8Array;
      case 'int16':
        return Int16Array;
      case 'int32':
        return Int32Array;
      case 'float':
      case 'float32':
        return Float32Array;
      case 'double':
      case 'float64':
        return Float64Array;
      case 'uint8_clamped':
        return Uint8ClampedArray;
      case 'generic':
      case 'buffer':
      case 'data':
      case 'dataview':
        return ArrayBuffer;
      case 'array':
        return Array;
    }
  }

  module.exports = function zeros(shape, dtype) {
    dtype = dtype || 'float64';
    var sz = 1;
    for (var i = 0; i < shape.length; ++i) {
      sz *= shape[i];
    }
    return ndarray(new (dtypeToType(dtype))(sz), shape);
  };
});

var zeros$1 = interopDefault(zeros);

var uniq = createCommonjsModule(function (module) {
  "use strict";

  function unique_pred(list, compare) {
    var ptr = 1,
        len = list.length,
        a = list[0],
        b = list[0];
    for (var i = 1; i < len; ++i) {
      b = a;
      a = list[i];
      if (compare(a, b)) {
        if (i === ptr) {
          ptr++;
          continue;
        }
        list[ptr++] = a;
      }
    }
    list.length = ptr;
    return list;
  }

  function unique_eq(list) {
    var ptr = 1,
        len = list.length,
        a = list[0],
        b = list[0];
    for (var i = 1; i < len; ++i, b = a) {
      b = a;
      a = list[i];
      if (a !== b) {
        if (i === ptr) {
          ptr++;
          continue;
        }
        list[ptr++] = a;
      }
    }
    list.length = ptr;
    return list;
  }

  function unique(list, compare, sorted) {
    if (list.length === 0) {
      return list;
    }
    if (compare) {
      if (!sorted) {
        list.sort(compare);
      }
      return unique_pred(list, compare);
    }
    if (!sorted) {
      list.sort();
    }
    return unique_eq(list);
  }

  module.exports = unique;
});

var uniq$1 = interopDefault(uniq);

var require$$0$5 = Object.freeze({
  default: uniq$1
});

var compile = createCommonjsModule(function (module) {
  "use strict";

  var uniq = interopDefault(require$$0$5);

  // This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
  // TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
  function innerFill(order, proc, body) {
    var dimension = order.length,
        nargs = proc.arrayArgs.length,
        has_index = proc.indexArgs.length > 0,
        code = [],
        vars = [],
        idx = 0,
        pidx = 0,
        i,
        j;
    for (i = 0; i < dimension; ++i) {
      // Iteration variables
      vars.push(["i", i, "=0"].join(""));
    }
    //Compute scan deltas
    for (j = 0; j < nargs; ++j) {
      for (i = 0; i < dimension; ++i) {
        pidx = idx;
        idx = order[i];
        if (i === 0) {
          // The innermost/fastest dimension's delta is simply its stride
          vars.push(["d", j, "s", i, "=t", j, "p", idx].join(""));
        } else {
          // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
          vars.push(["d", j, "s", i, "=(t", j, "p", idx, "-s", pidx, "*t", j, "p", pidx, ")"].join(""));
        }
      }
    }
    code.push("var " + vars.join(","));
    //Scan loop
    for (i = dimension - 1; i >= 0; --i) {
      // Start at largest stride and work your way inwards
      idx = order[i];
      code.push(["for(i", i, "=0;i", i, "<s", idx, ";++i", i, "){"].join(""));
    }
    //Push body of inner loop
    code.push(body);
    //Advance scan pointers
    for (i = 0; i < dimension; ++i) {
      pidx = idx;
      idx = order[i];
      for (j = 0; j < nargs; ++j) {
        code.push(["p", j, "+=d", j, "s", i].join(""));
      }
      if (has_index) {
        if (i > 0) {
          code.push(["index[", pidx, "]-=s", pidx].join(""));
        }
        code.push(["++index[", idx, "]"].join(""));
      }
      code.push("}");
    }
    return code.join("\n");
  }

  // Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
  // TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
  //       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
  function outerFill(matched, order, proc, body) {
    var dimension = order.length,
        nargs = proc.arrayArgs.length,
        blockSize = proc.blockSize,
        has_index = proc.indexArgs.length > 0,
        code = [];
    for (var i = 0; i < nargs; ++i) {
      code.push(["var offset", i, "=p", i].join(""));
    }
    //Generate loops for unmatched dimensions
    // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
    // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
    for (var i = matched; i < dimension; ++i) {
      code.push(["for(var j" + i + "=SS[", order[i], "]|0;j", i, ">0;){"].join("")); // Iterate back to front
      code.push(["if(j", i, "<", blockSize, "){"].join("")); // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
      code.push(["s", order[i], "=j", i].join(""));
      code.push(["j", i, "=0"].join(""));
      code.push(["}else{s", order[i], "=", blockSize].join(""));
      code.push(["j", i, "-=", blockSize, "}"].join(""));
      if (has_index) {
        code.push(["index[", order[i], "]=j", i].join(""));
      }
    }
    for (var i = 0; i < nargs; ++i) {
      var indexStr = ["offset" + i];
      for (var j = matched; j < dimension; ++j) {
        indexStr.push(["j", j, "*t", i, "p", order[j]].join(""));
      }
      code.push(["p", i, "=(", indexStr.join("+"), ")"].join(""));
    }
    code.push(innerFill(order, proc, body));
    for (var i = matched; i < dimension; ++i) {
      code.push("}");
    }
    return code.join("\n");
  }

  //Count the number of compatible inner orders
  // This is the length of the longest common prefix of the arrays in orders.
  // Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
  // This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
  function countMatches(orders) {
    var matched = 0,
        dimension = orders[0].length;
    while (matched < dimension) {
      for (var j = 1; j < orders.length; ++j) {
        if (orders[j][matched] !== orders[0][matched]) {
          return matched;
        }
      }
      ++matched;
    }
    return matched;
  }

  //Processes a block according to the given data types
  // Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
  function processBlock(block, proc, dtypes) {
    var code = block.body;
    var pre = [];
    var post = [];
    for (var i = 0; i < block.args.length; ++i) {
      var carg = block.args[i];
      if (carg.count <= 0) {
        continue;
      }
      var re = new RegExp(carg.name, "g");
      var ptrStr = "";
      var arrNum = proc.arrayArgs.indexOf(i);
      switch (proc.argTypes[i]) {
        case "offset":
          var offArgIndex = proc.offsetArgIndex.indexOf(i);
          var offArg = proc.offsetArgs[offArgIndex];
          arrNum = offArg.array;
          ptrStr = "+q" + offArgIndex; // Adds offset to the "pointer" in the array
        case "array":
          ptrStr = "p" + arrNum + ptrStr;
          var localStr = "l" + i;
          var arrStr = "a" + arrNum;
          if (proc.arrayBlockIndices[arrNum] === 0) {
            // Argument to body is just a single value from this array
            if (carg.count === 1) {
              // Argument/array used only once(?)
              if (dtypes[arrNum] === "generic") {
                if (carg.lvalue) {
                  pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                  code = code.replace(re, localStr);
                  post.push([arrStr, ".set(", ptrStr, ",", localStr, ")"].join(""));
                } else {
                  code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""));
                }
              } else {
                code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
              }
            } else if (dtypes[arrNum] === "generic") {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
              code = code.replace(re, localStr);
              if (carg.lvalue) {
                post.push([arrStr, ".set(", ptrStr, ",", localStr, ")"].join(""));
              }
            } else {
              pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
              code = code.replace(re, localStr);
              if (carg.lvalue) {
                post.push([arrStr, "[", ptrStr, "]=", localStr].join(""));
              }
            }
          } else {
            // Argument to body is a "block"
            var reStrArr = [carg.name],
                ptrStrArr = [ptrStr];
            for (var j = 0; j < Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
              reStrArr.push("\\s*\\[([^\\]]+)\\]");
              ptrStrArr.push("$" + (j + 1) + "*t" + arrNum + "b" + j); // Matched index times stride
            }
            re = new RegExp(reStrArr.join(""), "g");
            ptrStr = ptrStrArr.join("+");
            if (dtypes[arrNum] === "generic") {
              /*if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr)
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
              }*/
              throw new Error("cwise: Generic arrays not supported in combination with blocks!");
            } else {
              // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
            }
          }
          break;
        case "scalar":
          code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i));
          break;
        case "index":
          code = code.replace(re, "index");
          break;
        case "shape":
          code = code.replace(re, "shape");
          break;
      }
    }
    return [pre.join("\n"), code, post.join("\n")].join("\n").trim();
  }

  function typeSummary(dtypes) {
    var summary = new Array(dtypes.length);
    var allEqual = true;
    for (var i = 0; i < dtypes.length; ++i) {
      var t = dtypes[i];
      var digits = t.match(/\d+/);
      if (!digits) {
        digits = "";
      } else {
        digits = digits[0];
      }
      if (t.charAt(0) === 0) {
        summary[i] = "u" + t.charAt(1) + digits;
      } else {
        summary[i] = t.charAt(0) + digits;
      }
      if (i > 0) {
        allEqual = allEqual && summary[i] === summary[i - 1];
      }
    }
    if (allEqual) {
      return summary[0];
    }
    return summary.join("");
  }

  //Generates a cwise operator
  function generateCWiseOp(proc, typesig) {

    //Compute dimension
    // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
    var dimension = typesig[1].length - Math.abs(proc.arrayBlockIndices[0]) | 0;
    var orders = new Array(proc.arrayArgs.length);
    var dtypes = new Array(proc.arrayArgs.length);
    for (var i = 0; i < proc.arrayArgs.length; ++i) {
      dtypes[i] = typesig[2 * i];
      orders[i] = typesig[2 * i + 1];
    }

    //Determine where block and loop indices start and end
    var blockBegin = [],
        blockEnd = []; // These indices are exposed as blocks
    var loopBegin = [],
        loopEnd = []; // These indices are iterated over
    var loopOrders = []; // orders restricted to the loop indices
    for (var i = 0; i < proc.arrayArgs.length; ++i) {
      if (proc.arrayBlockIndices[i] < 0) {
        loopBegin.push(0);
        loopEnd.push(dimension);
        blockBegin.push(dimension);
        blockEnd.push(dimension + proc.arrayBlockIndices[i]);
      } else {
        loopBegin.push(proc.arrayBlockIndices[i]); // Non-negative
        loopEnd.push(proc.arrayBlockIndices[i] + dimension);
        blockBegin.push(0);
        blockEnd.push(proc.arrayBlockIndices[i]);
      }
      var newOrder = [];
      for (var j = 0; j < orders[i].length; j++) {
        if (loopBegin[i] <= orders[i][j] && orders[i][j] < loopEnd[i]) {
          newOrder.push(orders[i][j] - loopBegin[i]); // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
        }
      }
      loopOrders.push(newOrder);
    }

    //First create arguments for procedure
    var arglist = ["SS"]; // SS is the overall shape over which we iterate
    var code = ["'use strict'"];
    var vars = [];

    for (var j = 0; j < dimension; ++j) {
      vars.push(["s", j, "=SS[", j, "]"].join("")); // The limits for each dimension.
    }
    for (var i = 0; i < proc.arrayArgs.length; ++i) {
      arglist.push("a" + i); // Actual data array
      arglist.push("t" + i); // Strides
      arglist.push("p" + i); // Offset in the array at which the data starts (also used for iterating over the data)

      for (var j = 0; j < dimension; ++j) {
        // Unpack the strides into vars for looping
        vars.push(["t", i, "p", j, "=t", i, "[", loopBegin[i] + j, "]"].join(""));
      }

      for (var j = 0; j < Math.abs(proc.arrayBlockIndices[i]); ++j) {
        // Unpack the strides into vars for block iteration
        vars.push(["t", i, "b", j, "=t", i, "[", blockBegin[i] + j, "]"].join(""));
      }
    }
    for (var i = 0; i < proc.scalarArgs.length; ++i) {
      arglist.push("Y" + i);
    }
    if (proc.shapeArgs.length > 0) {
      vars.push("shape=SS.slice(0)"); // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
    }
    if (proc.indexArgs.length > 0) {
      // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
      var zeros = new Array(dimension);
      for (var i = 0; i < dimension; ++i) {
        zeros[i] = "0";
      }
      vars.push(["index=[", zeros.join(","), "]"].join(""));
    }
    for (var i = 0; i < proc.offsetArgs.length; ++i) {
      // Offset arguments used for stencil operations
      var off_arg = proc.offsetArgs[i];
      var init_string = [];
      for (var j = 0; j < off_arg.offset.length; ++j) {
        if (off_arg.offset[j] === 0) {
          continue;
        } else if (off_arg.offset[j] === 1) {
          init_string.push(["t", off_arg.array, "p", j].join(""));
        } else {
          init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""));
        }
      }
      if (init_string.length === 0) {
        vars.push("q" + i + "=0");
      } else {
        vars.push(["q", i, "=", init_string.join("+")].join(""));
      }
    }

    //Prepare this variables
    var thisVars = uniq([].concat(proc.pre.thisVars).concat(proc.body.thisVars).concat(proc.post.thisVars));
    vars = vars.concat(thisVars);
    code.push("var " + vars.join(","));
    for (var i = 0; i < proc.arrayArgs.length; ++i) {
      code.push("p" + i + "|=0");
    }

    //Inline prelude
    if (proc.pre.body.length > 3) {
      code.push(processBlock(proc.pre, proc, dtypes));
    }

    //Process body
    var body = processBlock(proc.body, proc, dtypes);
    var matched = countMatches(loopOrders);
    if (matched < dimension) {
      code.push(outerFill(matched, loopOrders[0], proc, body)); // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
    } else {
      code.push(innerFill(loopOrders[0], proc, body));
    }

    //Inline epilog
    if (proc.post.body.length > 3) {
      code.push(processBlock(proc.post, proc, dtypes));
    }

    if (proc.debug) {
      console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------");
    }

    var loopName = [proc.funcName || "unnamed", "_cwise_loop_", orders[0].join("s"), "m", matched, typeSummary(dtypes)].join("");
    var f = new Function(["function ", loopName, "(", arglist.join(","), "){", code.join("\n"), "} return ", loopName].join(""));
    return f();
  }
  module.exports = generateCWiseOp;
});

var compile$1 = interopDefault(compile);

var require$$0$4 = Object.freeze({
  default: compile$1
});

var thunk = createCommonjsModule(function (module) {
  "use strict";

  // The function below is called when constructing a cwise function object, and does the following:
  // A function object is constructed which accepts as argument a compilation function and returns another function.
  // It is this other function that is eventually returned by createThunk, and this function is the one that actually
  // checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
  // The compilation passed to the first function object is used for compiling new functions.
  // Once this function object is created, it is called with compile as argument, where the first argument of compile
  // is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
  // So createThunk roughly works like this:
  // function createThunk(proc) {
  //   var thunk = function(compileBound) {
  //     var CACHED = {}
  //     return function(arrays and scalars) {
  //       if (dtype and order of arrays in CACHED) {
  //         var func = CACHED[dtype and order of arrays]
  //       } else {
  //         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
  //       }
  //       return func(arrays and scalars)
  //     }
  //   }
  //   return thunk(compile.bind1(proc))
  // }

  var compile = interopDefault(require$$0$4);

  function createThunk(proc) {
    var code = ["'use strict'", "var CACHED={}"];
    var vars = [];
    var thunkName = proc.funcName + "_cwise_thunk";

    //Build thunk
    code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""));
    var typesig = [];
    var string_typesig = [];
    var proc_args = [["array", proc.arrayArgs[0], ".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
    Math.max(0, proc.arrayBlockIndices[0]), proc.arrayBlockIndices[0] < 0 ? "," + proc.arrayBlockIndices[0] + ")" : ")"].join("")];
    var shapeLengthConditions = [],
        shapeConditions = [];
    // Process array arguments
    for (var i = 0; i < proc.arrayArgs.length; ++i) {
      var j = proc.arrayArgs[i];
      vars.push(["t", j, "=array", j, ".dtype,", "r", j, "=array", j, ".order"].join(""));
      typesig.push("t" + j);
      typesig.push("r" + j);
      string_typesig.push("t" + j);
      string_typesig.push("r" + j + ".join()");
      proc_args.push("array" + j + ".data");
      proc_args.push("array" + j + ".stride");
      proc_args.push("array" + j + ".offset|0");
      if (i > 0) {
        // Gather conditions to check for shape equality (ignoring block indices)
        shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0]) - Math.abs(proc.arrayBlockIndices[i])));
        shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0, proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0, proc.arrayBlockIndices[i]) + "]");
      }
    }
    // Check for shape equality
    if (proc.arrayArgs.length > 1) {
      code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')");
      code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {");
      code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')");
      code.push("}");
    }
    // Process scalar arguments
    for (var i = 0; i < proc.scalarArgs.length; ++i) {
      proc_args.push("scalar" + proc.scalarArgs[i]);
    }
    // Check for cached function (and if not present, generate it)
    vars.push(["type=[", string_typesig.join(","), "].join()"].join(""));
    vars.push("proc=CACHED[type]");
    code.push("var " + vars.join(","));

    code.push(["if(!proc){", "CACHED[type]=proc=compile([", typesig.join(","), "])}", "return proc(", proc_args.join(","), ")}"].join(""));

    if (proc.debug) {
      console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------");
    }

    //Compile thunk
    var thunk = new Function("compile", code.join("\n"));
    return thunk(compile.bind(undefined, proc));
  }

  module.exports = createThunk;
});

var thunk$1 = interopDefault(thunk);

var require$$0$3 = Object.freeze({
  default: thunk$1
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var compiler = createCommonjsModule(function (module) {
  "use strict";

  var createThunk = interopDefault(require$$0$3);

  function Procedure() {
    this.argTypes = [];
    this.shimArgs = [];
    this.arrayArgs = [];
    this.arrayBlockIndices = [];
    this.scalarArgs = [];
    this.offsetArgs = [];
    this.offsetArgIndex = [];
    this.indexArgs = [];
    this.shapeArgs = [];
    this.funcName = "";
    this.pre = null;
    this.body = null;
    this.post = null;
    this.debug = false;
  }

  function compileCwise(user_args) {
    //Create procedure
    var proc = new Procedure();

    //Parse blocks
    proc.pre = user_args.pre;
    proc.body = user_args.body;
    proc.post = user_args.post;

    //Parse arguments
    var proc_args = user_args.args.slice(0);
    proc.argTypes = proc_args;
    for (var i = 0; i < proc_args.length; ++i) {
      var arg_type = proc_args[i];
      if (arg_type === "array" || (typeof arg_type === 'undefined' ? 'undefined' : _typeof(arg_type)) === "object" && arg_type.blockIndices) {
        proc.argTypes[i] = "array";
        proc.arrayArgs.push(i);
        proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0);
        proc.shimArgs.push("array" + i);
        if (i < proc.pre.args.length && proc.pre.args[i].count > 0) {
          throw new Error("cwise: pre() block may not reference array args");
        }
        if (i < proc.post.args.length && proc.post.args[i].count > 0) {
          throw new Error("cwise: post() block may not reference array args");
        }
      } else if (arg_type === "scalar") {
        proc.scalarArgs.push(i);
        proc.shimArgs.push("scalar" + i);
      } else if (arg_type === "index") {
        proc.indexArgs.push(i);
        if (i < proc.pre.args.length && proc.pre.args[i].count > 0) {
          throw new Error("cwise: pre() block may not reference array index");
        }
        if (i < proc.body.args.length && proc.body.args[i].lvalue) {
          throw new Error("cwise: body() block may not write to array index");
        }
        if (i < proc.post.args.length && proc.post.args[i].count > 0) {
          throw new Error("cwise: post() block may not reference array index");
        }
      } else if (arg_type === "shape") {
        proc.shapeArgs.push(i);
        if (i < proc.pre.args.length && proc.pre.args[i].lvalue) {
          throw new Error("cwise: pre() block may not write to array shape");
        }
        if (i < proc.body.args.length && proc.body.args[i].lvalue) {
          throw new Error("cwise: body() block may not write to array shape");
        }
        if (i < proc.post.args.length && proc.post.args[i].lvalue) {
          throw new Error("cwise: post() block may not write to array shape");
        }
      } else if ((typeof arg_type === 'undefined' ? 'undefined' : _typeof(arg_type)) === "object" && arg_type.offset) {
        proc.argTypes[i] = "offset";
        proc.offsetArgs.push({ array: arg_type.array, offset: arg_type.offset });
        proc.offsetArgIndex.push(i);
      } else {
        throw new Error("cwise: Unknown argument type " + proc_args[i]);
      }
    }

    //Make sure at least one array argument was specified
    if (proc.arrayArgs.length <= 0) {
      throw new Error("cwise: No array arguments specified");
    }

    //Make sure arguments are correct
    if (proc.pre.args.length > proc_args.length) {
      throw new Error("cwise: Too many arguments in pre() block");
    }
    if (proc.body.args.length > proc_args.length) {
      throw new Error("cwise: Too many arguments in body() block");
    }
    if (proc.post.args.length > proc_args.length) {
      throw new Error("cwise: Too many arguments in post() block");
    }

    //Check debug flag
    proc.debug = !!user_args.printCode || !!user_args.debug;

    //Retrieve name
    proc.funcName = user_args.funcName || "cwise";

    //Read in block size
    proc.blockSize = user_args.blockSize || 64;

    return createThunk(proc);
  }

  module.exports = compileCwise;
});

var compiler$1 = interopDefault(compiler);



var require$$0$2 = Object.freeze({
  default: compiler$1
});

var ndarrayOps = createCommonjsModule(function (module, exports) {
  "use strict";

  var compile = interopDefault(require$$0$2);

  var EmptyProc = {
    body: "",
    args: [],
    thisVars: [],
    localVars: []
  };

  function fixup(x) {
    if (!x) {
      return EmptyProc;
    }
    for (var i = 0; i < x.args.length; ++i) {
      var a = x.args[i];
      if (i === 0) {
        x.args[i] = { name: a, lvalue: true, rvalue: !!x.rvalue, count: x.count || 1 };
      } else {
        x.args[i] = { name: a, lvalue: false, rvalue: true, count: 1 };
      }
    }
    if (!x.thisVars) {
      x.thisVars = [];
    }
    if (!x.localVars) {
      x.localVars = [];
    }
    return x;
  }

  function pcompile(user_args) {
    return compile({
      args: user_args.args,
      pre: fixup(user_args.pre),
      body: fixup(user_args.body),
      post: fixup(user_args.proc),
      funcName: user_args.funcName
    });
  }

  function makeOp(user_args) {
    var args = [];
    for (var i = 0; i < user_args.args.length; ++i) {
      args.push("a" + i);
    }
    var wrapper = new Function("P", ["return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"].join(""));
    return wrapper(pcompile(user_args));
  }

  var assign_ops = {
    add: "+",
    sub: "-",
    mul: "*",
    div: "/",
    mod: "%",
    band: "&",
    bor: "|",
    bxor: "^",
    lshift: "<<",
    rshift: ">>",
    rrshift: ">>>"
  };(function () {
    for (var id in assign_ops) {
      var op = assign_ops[id];
      exports[id] = makeOp({
        args: ["array", "array", "array"],
        body: { args: ["a", "b", "c"],
          body: "a=b" + op + "c" },
        funcName: id
      });
      exports[id + "eq"] = makeOp({
        args: ["array", "array"],
        body: { args: ["a", "b"],
          body: "a" + op + "=b" },
        rvalue: true,
        funcName: id + "eq"
      });
      exports[id + "s"] = makeOp({
        args: ["array", "array", "scalar"],
        body: { args: ["a", "b", "s"],
          body: "a=b" + op + "s" },
        funcName: id + "s"
      });
      exports[id + "seq"] = makeOp({
        args: ["array", "scalar"],
        body: { args: ["a", "s"],
          body: "a" + op + "=s" },
        rvalue: true,
        funcName: id + "seq"
      });
    }
  })();

  var unary_ops = {
    not: "!",
    bnot: "~",
    neg: "-",
    recip: "1.0/"
  };(function () {
    for (var id in unary_ops) {
      var op = unary_ops[id];
      exports[id] = makeOp({
        args: ["array", "array"],
        body: { args: ["a", "b"],
          body: "a=" + op + "b" },
        funcName: id
      });
      exports[id + "eq"] = makeOp({
        args: ["array"],
        body: { args: ["a"],
          body: "a=" + op + "a" },
        rvalue: true,
        count: 2,
        funcName: id + "eq"
      });
    }
  })();

  var binary_ops = {
    and: "&&",
    or: "||",
    eq: "===",
    neq: "!==",
    lt: "<",
    gt: ">",
    leq: "<=",
    geq: ">="
  };(function () {
    for (var id in binary_ops) {
      var op = binary_ops[id];
      exports[id] = makeOp({
        args: ["array", "array", "array"],
        body: { args: ["a", "b", "c"],
          body: "a=b" + op + "c" },
        funcName: id
      });
      exports[id + "s"] = makeOp({
        args: ["array", "array", "scalar"],
        body: { args: ["a", "b", "s"],
          body: "a=b" + op + "s" },
        funcName: id + "s"
      });
      exports[id + "eq"] = makeOp({
        args: ["array", "array"],
        body: { args: ["a", "b"],
          body: "a=a" + op + "b" },
        rvalue: true,
        count: 2,
        funcName: id + "eq"
      });
      exports[id + "seq"] = makeOp({
        args: ["array", "scalar"],
        body: { args: ["a", "s"],
          body: "a=a" + op + "s" },
        rvalue: true,
        count: 2,
        funcName: id + "seq"
      });
    }
  })();

  var math_unary = ["abs", "acos", "asin", "atan", "ceil", "cos", "exp", "floor", "log", "round", "sin", "sqrt", "tan"];(function () {
    for (var i = 0; i < math_unary.length; ++i) {
      var f = math_unary[i];
      exports[f] = makeOp({
        args: ["array", "array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b"], body: "a=this_f(b)", thisVars: ["this_f"] },
        funcName: f
      });
      exports[f + "eq"] = makeOp({
        args: ["array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a"], body: "a=this_f(a)", thisVars: ["this_f"] },
        rvalue: true,
        count: 2,
        funcName: f + "eq"
      });
    }
  })();

  var math_comm = ["max", "min", "atan2", "pow"];(function () {
    for (var i = 0; i < math_comm.length; ++i) {
      var f = math_comm[i];
      exports[f] = makeOp({
        args: ["array", "array", "array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b", "c"], body: "a=this_f(b,c)", thisVars: ["this_f"] },
        funcName: f
      });
      exports[f + "s"] = makeOp({
        args: ["array", "array", "scalar"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b", "c"], body: "a=this_f(b,c)", thisVars: ["this_f"] },
        funcName: f + "s"
      });
      exports[f + "eq"] = makeOp({ args: ["array", "array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b"], body: "a=this_f(a,b)", thisVars: ["this_f"] },
        rvalue: true,
        count: 2,
        funcName: f + "eq"
      });
      exports[f + "seq"] = makeOp({ args: ["array", "scalar"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b"], body: "a=this_f(a,b)", thisVars: ["this_f"] },
        rvalue: true,
        count: 2,
        funcName: f + "seq"
      });
    }
  })();

  var math_noncomm = ["atan2", "pow"];(function () {
    for (var i = 0; i < math_noncomm.length; ++i) {
      var f = math_noncomm[i];
      exports[f + "op"] = makeOp({
        args: ["array", "array", "array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b", "c"], body: "a=this_f(c,b)", thisVars: ["this_f"] },
        funcName: f + "op"
      });
      exports[f + "ops"] = makeOp({
        args: ["array", "array", "scalar"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b", "c"], body: "a=this_f(c,b)", thisVars: ["this_f"] },
        funcName: f + "ops"
      });
      exports[f + "opeq"] = makeOp({ args: ["array", "array"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b"], body: "a=this_f(b,a)", thisVars: ["this_f"] },
        rvalue: true,
        count: 2,
        funcName: f + "opeq"
      });
      exports[f + "opseq"] = makeOp({ args: ["array", "scalar"],
        pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
        body: { args: ["a", "b"], body: "a=this_f(b,a)", thisVars: ["this_f"] },
        rvalue: true,
        count: 2,
        funcName: f + "opseq"
      });
    }
  })();

  exports.any = compile({
    args: ["array"],
    pre: EmptyProc,
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "if(a){return true}", localVars: [], thisVars: [] },
    post: { args: [], localVars: [], thisVars: [], body: "return false" },
    funcName: "any"
  });

  exports.all = compile({
    args: ["array"],
    pre: EmptyProc,
    body: { args: [{ name: "x", lvalue: false, rvalue: true, count: 1 }], body: "if(!x){return false}", localVars: [], thisVars: [] },
    post: { args: [], localVars: [], thisVars: [], body: "return true" },
    funcName: "all"
  });

  exports.sum = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "this_s+=a", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
    funcName: "sum"
  });

  exports.prod = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=1" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "this_s*=a", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
    funcName: "prod"
  });

  exports.norm2squared = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 2 }], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
    funcName: "norm2squared"
  });

  exports.norm2 = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 2 }], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return Math.sqrt(this_s)" },
    funcName: "norm2"
  });

  exports.norminf = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 4 }], body: "if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
    funcName: "norminf"
  });

  exports.norm1 = compile({
    args: ["array"],
    pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
    body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 3 }], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"] },
    post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
    funcName: "norm1"
  });

  exports.sup = compile({
    args: ["array"],
    pre: { body: "this_h=-Infinity",
      args: [],
      thisVars: ["this_h"],
      localVars: [] },
    body: { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
      args: [{ "name": "_inline_1_arg0_", "lvalue": false, "rvalue": true, "count": 2 }],
      thisVars: ["this_h"],
      localVars: [] },
    post: { body: "return this_h",
      args: [],
      thisVars: ["this_h"],
      localVars: [] }
  });

  exports.inf = compile({
    args: ["array"],
    pre: { body: "this_h=Infinity",
      args: [],
      thisVars: ["this_h"],
      localVars: [] },
    body: { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
      args: [{ "name": "_inline_1_arg0_", "lvalue": false, "rvalue": true, "count": 2 }],
      thisVars: ["this_h"],
      localVars: [] },
    post: { body: "return this_h",
      args: [],
      thisVars: ["this_h"],
      localVars: [] }
  });

  exports.argmin = compile({
    args: ["index", "array", "shape"],
    pre: {
      body: "{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
      args: [{ name: "_inline_0_arg0_", lvalue: false, rvalue: false, count: 0 }, { name: "_inline_0_arg1_", lvalue: false, rvalue: false, count: 0 }, { name: "_inline_0_arg2_", lvalue: false, rvalue: true, count: 1 }],
      thisVars: ["this_i", "this_v"],
      localVars: [] },
    body: {
      body: "{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
      args: [{ name: "_inline_1_arg0_", lvalue: false, rvalue: true, count: 2 }, { name: "_inline_1_arg1_", lvalue: false, rvalue: true, count: 2 }],
      thisVars: ["this_i", "this_v"],
      localVars: ["_inline_1_k"] },
    post: {
      body: "{return this_i}",
      args: [],
      thisVars: ["this_i"],
      localVars: [] }
  });

  exports.argmax = compile({
    args: ["index", "array", "shape"],
    pre: {
      body: "{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
      args: [{ name: "_inline_0_arg0_", lvalue: false, rvalue: false, count: 0 }, { name: "_inline_0_arg1_", lvalue: false, rvalue: false, count: 0 }, { name: "_inline_0_arg2_", lvalue: false, rvalue: true, count: 1 }],
      thisVars: ["this_i", "this_v"],
      localVars: [] },
    body: {
      body: "{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
      args: [{ name: "_inline_1_arg0_", lvalue: false, rvalue: true, count: 2 }, { name: "_inline_1_arg1_", lvalue: false, rvalue: true, count: 2 }],
      thisVars: ["this_i", "this_v"],
      localVars: ["_inline_1_k"] },
    post: {
      body: "{return this_i}",
      args: [],
      thisVars: ["this_i"],
      localVars: [] }
  });

  exports.random = makeOp({
    args: ["array"],
    pre: { args: [], body: "this_f=Math.random", thisVars: ["this_f"] },
    body: { args: ["a"], body: "a=this_f()", thisVars: ["this_f"] },
    funcName: "random"
  });

  exports.assign = makeOp({
    args: ["array", "array"],
    body: { args: ["a", "b"], body: "a=b" },
    funcName: "assign" });

  exports.assigns = makeOp({
    args: ["array", "scalar"],
    body: { args: ["a", "b"], body: "a=b" },
    funcName: "assigns" });

  exports.equals = compile({
    args: ["array", "array"],
    pre: EmptyProc,
    body: { args: [{ name: "x", lvalue: false, rvalue: true, count: 1 }, { name: "y", lvalue: false, rvalue: true, count: 1 }],
      body: "if(x!==y){return false}",
      localVars: [],
      thisVars: [] },
    post: { args: [], localVars: [], thisVars: [], body: "return true" },
    funcName: "equals"
  });
});

interopDefault(ndarrayOps);
var add = ndarrayOps.add;
var addeq = ndarrayOps.addeq;
var mulseq = ndarrayOps.mulseq;
var divs = ndarrayOps.divs;
var divseq = ndarrayOps.divseq;
var assigns = ndarrayOps.assigns;
var random = ndarrayOps.random;
var norm2 = ndarrayOps.norm2;

var doConvert = createCommonjsModule(function (module) {
  module.exports = interopDefault(require$$0$2)({ "args": ["array", "scalar", "index"], "pre": { "body": "{}", "args": [], "thisVars": [], "localVars": [] }, "body": { "body": "{\nvar _inline_1_v=_inline_1_arg1_,_inline_1_i\nfor(_inline_1_i=0;_inline_1_i<_inline_1_arg2_.length-1;++_inline_1_i) {\n_inline_1_v=_inline_1_v[_inline_1_arg2_[_inline_1_i]]\n}\n_inline_1_arg0_=_inline_1_v[_inline_1_arg2_[_inline_1_arg2_.length-1]]\n}", "args": [{ "name": "_inline_1_arg0_", "lvalue": true, "rvalue": false, "count": 1 }, { "name": "_inline_1_arg1_", "lvalue": false, "rvalue": true, "count": 1 }, { "name": "_inline_1_arg2_", "lvalue": false, "rvalue": true, "count": 4 }], "thisVars": [], "localVars": ["_inline_1_i", "_inline_1_v"] }, "post": { "body": "{}", "args": [], "thisVars": [], "localVars": [] }, "funcName": "convert", "blockSize": 64 });
});

var doConvert$1 = interopDefault(doConvert);

var require$$0$6 = Object.freeze({
  default: doConvert$1
});

var convert = createCommonjsModule(function (module) {
  "use strict";

  var ndarray = interopDefault(require$$0);
  var do_convert = interopDefault(require$$0$6);

  module.exports = function convert(arr, result) {
    var shape = [],
        c = arr,
        sz = 1;
    while (Array.isArray(c)) {
      shape.push(c.length);
      sz *= c.length;
      c = c[0];
    }
    if (shape.length === 0) {
      return ndarray();
    }
    if (!result) {
      result = ndarray(new Float64Array(sz), shape);
    }
    do_convert(result, arr);
    return result;
  };
});

var pack = interopDefault(convert);

var planner = createCommonjsModule(function (module) {
  "use strict";

  module.exports = generateMatrixProduct;

  var BLOCK_SIZE = 32;

  function unpackOrder(order) {
    return order === "r" ? [1, 0] : [0, 1];
  }

  function unpackShape(name, type) {
    if (type[1] === "native") {
      return [name, "d0=", name, ".length,", name, "d1=", name, "[0].length,"].join("");
    } else {
      return [name, "d0=", name, ".shape[0],", name, "d1=", name, ".shape[1],", name, "s0=", name, ".stride[0],", name, "s1=", name, ".stride[1],", name, "o=", name, ".offset,", name, "d=", name, ".data,"].join("");
    }
  }

  function start(order, name, type, i, j, w) {
    var code = [];
    if (type[1] === "native") {
      if (order[0]) {
        if (i) {
          code.push("var ", name, "p=", name, "[", i, "];");
        } else {
          code.push("var ", name, "p=", name, "[0];");
        }
      }
    } else {
      if (i && j) {
        if (w) {
          code.push("var ", name, "t0=", name, "s", order[0], ",", name, "t1=", name, "s", order[1], "-", name, "s", order[0], "*", w, ",", name, "p=", name, "o+", i, "*", name, "s0+", j, "*", name, "s1;");
        } else {
          code.push("var ", name, "t0=", name, "s", order[0], ",", name, "p=", name, "o+", i, "*", name, "s0+", j, "*", name, "s1;");
        }
      } else if (i) {
        code.push("var ", name, "t0=", name, "s", order[0], ",", name, "p=", name, "o+", i, "*", name, "s0;");
      } else if (j) {
        code.push("var ", name, "t0=", name, "s", order[0], ",", name, "p=", name, "o+", j, "*", name, "s1;");
      } else {
        code.push("var ", name, "t0=", name, "s", order[0], ",", name, "t1=", name, "s", order[1], "-", name, "s", order[0], "*", name, "d", order[0], ",", name, "p=", name, "o;");
      }
    }
    return code;
  }

  function walk(order, name, type, d, i) {
    var code = [];
    if (type[1] === "native") {
      if (order[0] && d === 1) {
        code.push(name, "p=", name, "[", i, "+1]");
      }
    } else {
      code.push(name, "p+=", name, "t", d, ";");
    }
    return code;
  }

  function write(order, name, type, i, j, w) {
    var code = [];
    if (type[1] === "native") {
      if (order[0]) {
        code.push(name, "p[", j, "]=", w, ";");
      } else {
        code.push(name, "[", i, "][", j, "]=", w, ";");
      }
    } else if (type[1] === "generic") {
      code.push(name, "d.set(", name, "p,", w, ");");
    } else {
      code.push(name, "d[", name, "p]=", w, ";");
    }
    return code;
  }

  function read(order, name, type, i, j) {
    var code = [];
    if (type[1] === "native") {
      if (order[0]) {
        code.push(name, "p[", j, "]");
      } else {
        code.push(name, "[", i, "][", j, "]");
      }
    } else if (type[1] === "generic") {
      code.push(name, "d.get(", name, "p)");
    } else {
      code.push(name, "d[", name, "p]");
    }
    return code.join("");
  }

  function generateRowColumnLoop(oType, aType, bType, useAlpha, useBeta) {
    var code = [];
    var oOrd = oType[0] === "r" ? [1, 0] : [0, 1],
        aOrd = [1, 0],
        bOrd = [0, 1];
    var symbols = ["i", "j"];

    code.push.apply(code, start(oOrd, "o", oType));

    if (oOrd[1]) {
      code.push("for(j=0;j<od1;++j){");
      code.push("for(i=0;i<od0;++i){");
    } else {
      code.push("for(i=0;i<od0;++i){");
      code.push("for(j=0;j<od1;++j){");
    }

    code.push.apply(code, start(aOrd, "a", aType, "i"));
    code.push.apply(code, start(bOrd, "b", bType, undefined, "j"));

    code.push("var r=0.0;", "for(k=0;k<ad1;++k){", "r+=", read(aOrd, "a", aType, "i", "k"), "*", read(bOrd, "b", bType, "k", "j"), ";");

    //Terminate k loop
    code.push.apply(code, walk(aOrd, "a", aType, 0, "k"));
    code.push.apply(code, walk(bOrd, "b", bType, 0, "k"));
    code.push("}");

    //Write r to output
    if (useAlpha) {
      code.push("r*=A;");
    }
    if (useBeta) {
      code.push("r+=B*", read(oOrd, "o", oType, "i", "j"), ";");
    }
    code.push.apply(code, write(oOrd, "o", oType, "i", "j", "r"));

    //Terminate j loop loop
    code.push.apply(code, walk(oOrd, "o", oType, 0, symbols[1]));
    code.push("}");

    //Terminate i loop
    code.push.apply(code, walk(oOrd, "o", oType, 1, symbols[0]));
    code.push("}");

    return code;
  }

  function generateBetaPass(oType, useBeta) {
    var code = [];
    var oOrd = oType[0] === "r" ? [1, 0] : [0, 1],
        symbols;
    if (useBeta) {
      code.push("if(B!==1.0){");
    }
    code.push.apply(code, start(oOrd, "o", oType));
    if (oOrd[0]) {
      code.push("for(i=0;i<od0;++i){for(j=0;j<od1;++j){");
      symbols = ["i", "j"];
    } else {
      code.push("for(j=0;j<od1;++j){for(i=0;i<od0;++i){");
      symbols = ["j", "i"];
    }
    if (useBeta) {
      code.push.apply(code, write(oOrd, "o", oType, "i", "j", "B*" + read(oOrd, "o", oType, "i", "j")));
    } else {
      code.push.apply(code, write(oOrd, "o", oType, "i", "j", "0"));
    }
    code.push.apply(code, walk(oOrd, "o", oType, 0, symbols[1]));
    code.push("}");
    code.push.apply(code, walk(oOrd, "o", oType, 1, symbols[0]));
    code.push("}");
    if (useBeta) {
      code.push("}");
    }
    return code;
  }

  function generateBlockLoop(oType, aType, bType, useAlpha, useBeta) {
    var code = [];
    var shapes = ["od0", "od1", "ad1"];
    var oOrd = [1, 0];
    var aOrd = [1, 0];
    var bOrd = [0, 1];

    //Do pass over output to zero it out
    code.push.apply(code, generateBetaPass(oType, useBeta));

    for (var i = 0; i < 3; ++i) {
      code.push("for(var i", i, "=", shapes[i], ";i", i, ">0;){", "var w", i, "=", BLOCK_SIZE, ";", "if(i", i, "<", BLOCK_SIZE, "){", "w", i, "=i", i, ";", "i", i, "=0;", "}else{", "i", i, "-=", BLOCK_SIZE, ";", "}");
    }

    code.push.apply(code, start(oOrd, "o", oType, "i0", "i1", "w1"));

    code.push("for(i=0;i<w0;++i){\
for(j=0;j<w1;++j){\
var r=0.0;");

    code.push.apply(code, start(aOrd, "a", aType, "(i0+i)", "i2"));
    code.push.apply(code, start(bOrd, "b", bType, "i2", "(i1+j)"));

    code.push("for(k=0;k<w2;++k){");

    code.push("r+=", read(aOrd, "a", aType, "(i0+i)", "(i2+k)"), "*", read(bOrd, "b", bType, "(i2+k)", "(i1+j)"), ";");

    //Close off k-loop
    code.push.apply(code, walk(aOrd, "a", aType, 0, "(i2+k)"));
    code.push.apply(code, walk(bOrd, "b", bType, 0, "(i2+k)"));
    code.push("}");

    //Write r back to output array
    var sym = "r";
    if (useAlpha) {
      sym = "A*r";
    }
    code.push.apply(code, write(oOrd, "o", oType, "(i0+i)", "(i1+j)", sym + "+" + read(oOrd, "o", oType, "(i0+i)", "(i1+j)")));

    //Close off j-loop
    code.push.apply(code, walk(oOrd, "o", oType, 0, "(i1+j)"));
    code.push("}");

    //Close off i-loop
    code.push.apply(code, walk(oOrd, "o", oType, 1, "(i0+i)"));
    code.push("}}}}");

    return code;
  }

  function generateMatrixProduct(outType, aType, bType, useAlpha, useBeta) {
    var funcName = ["gemm", outType[0], outType[1], "a", aType[0], aType[1], "b", bType[0], bType[1], useAlpha ? "alpha" : "", useBeta ? "beta" : ""].join("");
    var code = ["function ", funcName, "(o,a,b,A,B){", "var ", unpackShape("o", outType), unpackShape("a", aType), unpackShape("b", bType), "i,j,k;"];

    if (aType[0] === "r" && bType[0] === "c") {
      code.push.apply(code, generateRowColumnLoop(outType, aType, bType, useAlpha, useBeta));
    } else {
      code.push.apply(code, generateBlockLoop(outType, aType, bType, useAlpha, useBeta));
    }

    code.push("}return ", funcName);

    //Compile function
    var proc = new Function(code.join(""));
    return proc();
  }
});

var planner$1 = interopDefault(planner);

var require$$0$7 = Object.freeze({
  default: planner$1
});

var gemm = createCommonjsModule(function (module) {
  "use strict";

  module.exports = matrixProduct;

  var generatePlan = interopDefault(require$$0$7);

  function shape(arr) {
    if (Array.isArray(arr)) {
      return [arr.length, arr[0].length];
    } else {
      return arr.shape;
    }
  }

  function checkShapes(out, a, b) {
    var os = shape(out);
    var as = shape(a);
    var bs = shape(b);
    if (os[0] !== as[0] || os[1] !== bs[1] || as[1] !== bs[0]) {
      throw new Error("Mismatched array shapes for matrix product");
    }
  }

  function classifyType(m) {
    if (Array.isArray(m)) {
      if (Array.isArray(m)) {
        return ["r", "native"];
      }
    } else if (m.shape && m.shape.length === 2) {
      if (m.order[0]) {
        return ["r", m.dtype];
      } else {
        return ["c", m.dtype];
      }
    }
    throw new Error("Unrecognized data type");
  }

  var CACHE = {};

  function matrixProduct(out, a, b, alpha, beta) {
    if (alpha === undefined) {
      alpha = 1.0;
    }
    if (beta === undefined) {
      beta = 0.0;
    }
    var useAlpha = alpha !== 1.0;
    var useBeta = beta !== 0.0;
    var outType = classifyType(out);
    var aType = classifyType(a);
    var bType = classifyType(b);

    checkShapes(out, a, b);

    var typeSig = [outType, aType, bType, useAlpha, useBeta].join(":");
    var proc = CACHE[typeSig];
    if (!proc) {
      proc = CACHE[typeSig] = generatePlan(outType, aType, bType, useAlpha, useBeta);
    }
    return proc(out, a, b, alpha, beta);
  }
});

var gemm$1 = interopDefault(gemm);

var diag = createCommonjsModule(function (module) {
  'use strict';

  var ndarray = interopDefault(require$$0);

  module.exports = pickDiagonal;

  function pickDiagonal(M) {
    var d = M.dimension;
    if (d <= 1) {
      return M;
    }
    var nshape = 1 << 30;
    var nstride = 0;
    var mshape = M.shape;
    var mstride = M.stride;
    for (var i = 0; i < d; ++i) {
      nshape = Math.min(nshape, mshape[i]) | 0;
      nstride += mstride[i];
    }
    return ndarray(M.data, [nshape], [nstride], M.offset);
  }
});

var diagonal = interopDefault(diag);

var dup = createCommonjsModule(function (module) {
  "use strict";

  function dupe_array(count, value, i) {
    var c = count[i] | 0;
    if (c <= 0) {
      return [];
    }
    var result = new Array(c),
        j;
    if (i === count.length - 1) {
      for (j = 0; j < c; ++j) {
        result[j] = value;
      }
    } else {
      for (j = 0; j < c; ++j) {
        result[j] = dupe_array(count, value, i + 1);
      }
    }
    return result;
  }

  function dupe_number(count, value) {
    var result, i;
    result = new Array(count);
    for (i = 0; i < count; ++i) {
      result[i] = value;
    }
    return result;
  }

  function dupe(count, value) {
    if (typeof value === "undefined") {
      value = 0;
    }
    switch (typeof count === "undefined" ? "undefined" : _typeof(count)) {
      case "number":
        if (count > 0) {
          return dupe_number(count | 0, value);
        }
        break;
      case "object":
        if (typeof count.length === "number") {
          return dupe_array(count, value, 0);
        }
        break;
    }
    return [];
  }

  module.exports = dupe;
});

var dup$1 = interopDefault(dup);



var require$$1$1 = Object.freeze({
  default: dup$1
});

var esprima=createCommonjsModule(function(module,exports){/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
  Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*//*jslint bitwise:true plusplus:true *//*global esprima:true, define:true, exports:true, window: true,
throwErrorTolerant: true,
throwError: true, generateStatement: true, peek: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseUnaryExpression: true,
parseStatement: true, parseSourceElement: true */(function(root,factory){'use strict';// Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
// Rhino, and plain browser loading.
/* istanbul ignore next */if(typeof define==='function'&&define.amd){define(['exports'],factory);}else if(typeof exports!=='undefined'){factory(exports);}else{factory(root.esprima={});}})(this,function(exports){'use strict';var Token,TokenName,FnExprTokens,Syntax,PropertyKind,Messages,Regex,SyntaxTreeDelegate,source,strict,index,lineNumber,lineStart,length,delegate,lookahead,state,extra;Token={BooleanLiteral:1,EOF:2,Identifier:3,Keyword:4,NullLiteral:5,NumericLiteral:6,Punctuator:7,StringLiteral:8,RegularExpression:9};TokenName={};TokenName[Token.BooleanLiteral]='Boolean';TokenName[Token.EOF]='<end>';TokenName[Token.Identifier]='Identifier';TokenName[Token.Keyword]='Keyword';TokenName[Token.NullLiteral]='Null';TokenName[Token.NumericLiteral]='Numeric';TokenName[Token.Punctuator]='Punctuator';TokenName[Token.StringLiteral]='String';TokenName[Token.RegularExpression]='RegularExpression';// A function following one of those tokens is an expression.
FnExprTokens=['(','{','[','in','typeof','instanceof','new','return','case','delete','throw','void',// assignment operators
'=','+=','-=','*=','/=','%=','<<=','>>=','>>>=','&=','|=','^=',',',// binary/unary operators
'+','-','*','/','%','++','--','<<','>>','>>>','&','|','^','!','~','&&','||','?',':','===','==','>=','<=','<','>','!=','!=='];Syntax={AssignmentExpression:'AssignmentExpression',ArrayExpression:'ArrayExpression',BlockStatement:'BlockStatement',BinaryExpression:'BinaryExpression',BreakStatement:'BreakStatement',CallExpression:'CallExpression',CatchClause:'CatchClause',ConditionalExpression:'ConditionalExpression',ContinueStatement:'ContinueStatement',DoWhileStatement:'DoWhileStatement',DebuggerStatement:'DebuggerStatement',EmptyStatement:'EmptyStatement',ExpressionStatement:'ExpressionStatement',ForStatement:'ForStatement',ForInStatement:'ForInStatement',FunctionDeclaration:'FunctionDeclaration',FunctionExpression:'FunctionExpression',Identifier:'Identifier',IfStatement:'IfStatement',Literal:'Literal',LabeledStatement:'LabeledStatement',LogicalExpression:'LogicalExpression',MemberExpression:'MemberExpression',NewExpression:'NewExpression',ObjectExpression:'ObjectExpression',Program:'Program',Property:'Property',ReturnStatement:'ReturnStatement',SequenceExpression:'SequenceExpression',SwitchStatement:'SwitchStatement',SwitchCase:'SwitchCase',ThisExpression:'ThisExpression',ThrowStatement:'ThrowStatement',TryStatement:'TryStatement',UnaryExpression:'UnaryExpression',UpdateExpression:'UpdateExpression',VariableDeclaration:'VariableDeclaration',VariableDeclarator:'VariableDeclarator',WhileStatement:'WhileStatement',WithStatement:'WithStatement'};PropertyKind={Data:1,Get:2,Set:4};// Error messages should be identical to V8.
Messages={UnexpectedToken:'Unexpected token %0',UnexpectedNumber:'Unexpected number',UnexpectedString:'Unexpected string',UnexpectedIdentifier:'Unexpected identifier',UnexpectedReserved:'Unexpected reserved word',UnexpectedEOS:'Unexpected end of input',NewlineAfterThrow:'Illegal newline after throw',InvalidRegExp:'Invalid regular expression',UnterminatedRegExp:'Invalid regular expression: missing /',InvalidLHSInAssignment:'Invalid left-hand side in assignment',InvalidLHSInForIn:'Invalid left-hand side in for-in',MultipleDefaultsInSwitch:'More than one default clause in switch statement',NoCatchOrFinally:'Missing catch or finally after try',UnknownLabel:'Undefined label \'%0\'',Redeclaration:'%0 \'%1\' has already been declared',IllegalContinue:'Illegal continue statement',IllegalBreak:'Illegal break statement',IllegalReturn:'Illegal return statement',StrictModeWith:'Strict mode code may not include a with statement',StrictCatchVariable:'Catch variable may not be eval or arguments in strict mode',StrictVarName:'Variable name may not be eval or arguments in strict mode',StrictParamName:'Parameter name eval or arguments is not allowed in strict mode',StrictParamDupe:'Strict mode function may not have duplicate parameter names',StrictFunctionName:'Function name may not be eval or arguments in strict mode',StrictOctalLiteral:'Octal literals are not allowed in strict mode.',StrictDelete:'Delete of an unqualified identifier in strict mode.',StrictDuplicateProperty:'Duplicate data property in object literal not allowed in strict mode',AccessorDataProperty:'Object literal may not have data and accessor property with the same name',AccessorGetSet:'Object literal may not have multiple get/set accessors with the same name',StrictLHSAssignment:'Assignment to eval or arguments is not allowed in strict mode',StrictLHSPostfix:'Postfix increment/decrement may not have eval or arguments operand in strict mode',StrictLHSPrefix:'Prefix increment/decrement may not have eval or arguments operand in strict mode',StrictReservedWord:'Use of future reserved word in strict mode'};// See also tools/generate-unicode-regex.py.
Regex={NonAsciiIdentifierStart:new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]'),NonAsciiIdentifierPart:new RegExp('[ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-҇Ҋ-ԧԱ-Ֆՙա-և֑-ׇֽֿׁׂׅׄא-תװ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺࠀ-࠭ࡀ-࡛ࢠࢢ-ࢬࣤ-ࣾऀ-ॣ०-९ॱ-ॷॹ-ॿঁ-ঃঅ-ঌএঐও-নপ-রলশ-হ়-ৄেৈো-ৎৗড়ঢ়য়-ৣ০-ৱਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹ਼ਾ-ੂੇੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ଁ-ଃଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହ଼-ୄେୈୋ-୍ୖୗଡ଼ଢ଼ୟ-ୣ୦-୯ୱஂஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௯ఁ-ఃఅ-ఌఎ-ఐఒ-నప-ళవ-హఽ-ౄె-ైొ-్ౕౖౘౙౠ-ౣ౦-౯ಂಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕೖೞೠ-ೣ೦-೯ೱೲംഃഅ-ഌഎ-ഐഒ-ഺഽ-ൄെ-ൈൊ-ൎൗൠ-ൣ൦-൯ൺ-ൿංඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟෲෳก-ฺเ-๎๐-๙ກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ູົ-ຽເ-ໄໆ່-ໍ໐-໙ໜ-ໟༀ༘༙༠-༩༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟ᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-᜔ᜠ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲᝳក-៓ៗៜ៝០-៩᠋-᠍᠐-᠙ᠠ-ᡷᢀ-ᢪᢰ-ᣵᤀ-ᤜᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧙ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧᬀ-ᭋ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽ᳐-᳔᳒-ᳶᴀ-ᷦ᷼-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‌‍‿⁀⁔ⁱⁿₐ-ₜ⃐-⃥⃜⃡-⃰ℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿⸯ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙゚ゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙯ꙴ-꙽ꙿ-ꚗꚟ-꛱ꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠧꡀ-ꡳꢀ-꣄꣐-꣙꣠-ꣷꣻ꤀-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺꩻꪀ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯪ꯬꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︦︳︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]')};// Ensure the condition is true, otherwise throw an error.
// This is only to have a better contract semantic, i.e. another safety net
// to catch a logic error. The condition shall be fulfilled in normal case.
// Do NOT use this to enforce a certain condition on any user input.
function assert(condition,message){/* istanbul ignore if */if(!condition){throw new Error('ASSERT: '+message);}}function isDecimalDigit(ch){return ch>=48&&ch<=57;// 0..9
}function isHexDigit(ch){return'0123456789abcdefABCDEF'.indexOf(ch)>=0;}function isOctalDigit(ch){return'01234567'.indexOf(ch)>=0;}// 7.2 White Space
function isWhiteSpace(ch){return ch===0x20||ch===0x09||ch===0x0B||ch===0x0C||ch===0xA0||ch>=0x1680&&[0x1680,0x180E,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200A,0x202F,0x205F,0x3000,0xFEFF].indexOf(ch)>=0;}// 7.3 Line Terminators
function isLineTerminator(ch){return ch===0x0A||ch===0x0D||ch===0x2028||ch===0x2029;}// 7.6 Identifier Names and Identifiers
function isIdentifierStart(ch){return ch===0x24||ch===0x5F||// $ (dollar) and _ (underscore)
ch>=0x41&&ch<=0x5A||// A..Z
ch>=0x61&&ch<=0x7A||// a..z
ch===0x5C||// \ (backslash)
ch>=0x80&&Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));}function isIdentifierPart(ch){return ch===0x24||ch===0x5F||// $ (dollar) and _ (underscore)
ch>=0x41&&ch<=0x5A||// A..Z
ch>=0x61&&ch<=0x7A||// a..z
ch>=0x30&&ch<=0x39||// 0..9
ch===0x5C||// \ (backslash)
ch>=0x80&&Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));}// 7.6.1.2 Future Reserved Words
function isFutureReservedWord(id){switch(id){case'class':case'enum':case'export':case'extends':case'import':case'super':return true;default:return false;}}function isStrictModeReservedWord(id){switch(id){case'implements':case'interface':case'package':case'private':case'protected':case'public':case'static':case'yield':case'let':return true;default:return false;}}function isRestrictedWord(id){return id==='eval'||id==='arguments';}// 7.6.1.1 Keywords
function isKeyword(id){if(strict&&isStrictModeReservedWord(id)){return true;}// 'const' is specialized as Keyword in V8.
// 'yield' and 'let' are for compatiblity with SpiderMonkey and ES.next.
// Some others are from future reserved words.
switch(id.length){case 2:return id==='if'||id==='in'||id==='do';case 3:return id==='var'||id==='for'||id==='new'||id==='try'||id==='let';case 4:return id==='this'||id==='else'||id==='case'||id==='void'||id==='with'||id==='enum';case 5:return id==='while'||id==='break'||id==='catch'||id==='throw'||id==='const'||id==='yield'||id==='class'||id==='super';case 6:return id==='return'||id==='typeof'||id==='delete'||id==='switch'||id==='export'||id==='import';case 7:return id==='default'||id==='finally'||id==='extends';case 8:return id==='function'||id==='continue'||id==='debugger';case 10:return id==='instanceof';default:return false;}}// 7.4 Comments
function addComment(type,value,start,end,loc){var comment,attacher;assert(typeof start==='number','Comment must have valid position');// Because the way the actual token is scanned, often the comments
// (if any) are skipped twice during the lexical analysis.
// Thus, we need to skip adding a comment if the comment array already
// handled it.
if(state.lastCommentStart>=start){return;}state.lastCommentStart=start;comment={type:type,value:value};if(extra.range){comment.range=[start,end];}if(extra.loc){comment.loc=loc;}extra.comments.push(comment);if(extra.attachComment){extra.leadingComments.push(comment);extra.trailingComments.push(comment);}}function skipSingleLineComment(offset){var start,loc,ch,comment;start=index-offset;loc={start:{line:lineNumber,column:index-lineStart-offset}};while(index<length){ch=source.charCodeAt(index);++index;if(isLineTerminator(ch)){if(extra.comments){comment=source.slice(start+offset,index-1);loc.end={line:lineNumber,column:index-lineStart-1};addComment('Line',comment,start,index-1,loc);}if(ch===13&&source.charCodeAt(index)===10){++index;}++lineNumber;lineStart=index;return;}}if(extra.comments){comment=source.slice(start+offset,index);loc.end={line:lineNumber,column:index-lineStart};addComment('Line',comment,start,index,loc);}}function skipMultiLineComment(){var start,loc,ch,comment;if(extra.comments){start=index-2;loc={start:{line:lineNumber,column:index-lineStart-2}};}while(index<length){ch=source.charCodeAt(index);if(isLineTerminator(ch)){if(ch===0x0D&&source.charCodeAt(index+1)===0x0A){++index;}++lineNumber;++index;lineStart=index;if(index>=length){throwError({},Messages.UnexpectedToken,'ILLEGAL');}}else if(ch===0x2A){// Block comment ends with '*/'.
if(source.charCodeAt(index+1)===0x2F){++index;++index;if(extra.comments){comment=source.slice(start+2,index-2);loc.end={line:lineNumber,column:index-lineStart};addComment('Block',comment,start,index,loc);}return;}++index;}else{++index;}}throwError({},Messages.UnexpectedToken,'ILLEGAL');}function skipComment(){var ch,start;start=index===0;while(index<length){ch=source.charCodeAt(index);if(isWhiteSpace(ch)){++index;}else if(isLineTerminator(ch)){++index;if(ch===0x0D&&source.charCodeAt(index)===0x0A){++index;}++lineNumber;lineStart=index;start=true;}else if(ch===0x2F){// U+002F is '/'
ch=source.charCodeAt(index+1);if(ch===0x2F){++index;++index;skipSingleLineComment(2);start=true;}else if(ch===0x2A){// U+002A is '*'
++index;++index;skipMultiLineComment();}else{break;}}else if(start&&ch===0x2D){// U+002D is '-'
// U+003E is '>'
if(source.charCodeAt(index+1)===0x2D&&source.charCodeAt(index+2)===0x3E){// '-->' is a single-line comment
index+=3;skipSingleLineComment(3);}else{break;}}else if(ch===0x3C){// U+003C is '<'
if(source.slice(index+1,index+4)==='!--'){++index;// `<`
++index;// `!`
++index;// `-`
++index;// `-`
skipSingleLineComment(4);}else{break;}}else{break;}}}function scanHexEscape(prefix){var i,len,ch,code=0;len=prefix==='u'?4:2;for(i=0;i<len;++i){if(index<length&&isHexDigit(source[index])){ch=source[index++];code=code*16+'0123456789abcdef'.indexOf(ch.toLowerCase());}else{return'';}}return String.fromCharCode(code);}function getEscapedIdentifier(){var ch,id;ch=source.charCodeAt(index++);id=String.fromCharCode(ch);// '\u' (U+005C, U+0075) denotes an escaped character.
if(ch===0x5C){if(source.charCodeAt(index)!==0x75){throwError({},Messages.UnexpectedToken,'ILLEGAL');}++index;ch=scanHexEscape('u');if(!ch||ch==='\\'||!isIdentifierStart(ch.charCodeAt(0))){throwError({},Messages.UnexpectedToken,'ILLEGAL');}id=ch;}while(index<length){ch=source.charCodeAt(index);if(!isIdentifierPart(ch)){break;}++index;id+=String.fromCharCode(ch);// '\u' (U+005C, U+0075) denotes an escaped character.
if(ch===0x5C){id=id.substr(0,id.length-1);if(source.charCodeAt(index)!==0x75){throwError({},Messages.UnexpectedToken,'ILLEGAL');}++index;ch=scanHexEscape('u');if(!ch||ch==='\\'||!isIdentifierPart(ch.charCodeAt(0))){throwError({},Messages.UnexpectedToken,'ILLEGAL');}id+=ch;}}return id;}function getIdentifier(){var start,ch;start=index++;while(index<length){ch=source.charCodeAt(index);if(ch===0x5C){// Blackslash (U+005C) marks Unicode escape sequence.
index=start;return getEscapedIdentifier();}if(isIdentifierPart(ch)){++index;}else{break;}}return source.slice(start,index);}function scanIdentifier(){var start,id,type;start=index;// Backslash (U+005C) starts an escaped character.
id=source.charCodeAt(index)===0x5C?getEscapedIdentifier():getIdentifier();// There is no keyword or literal with only one character.
// Thus, it must be an identifier.
if(id.length===1){type=Token.Identifier;}else if(isKeyword(id)){type=Token.Keyword;}else if(id==='null'){type=Token.NullLiteral;}else if(id==='true'||id==='false'){type=Token.BooleanLiteral;}else{type=Token.Identifier;}return{type:type,value:id,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}// 7.7 Punctuators
function scanPunctuator(){var start=index,code=source.charCodeAt(index),code2,ch1=source[index],ch2,ch3,ch4;switch(code){// Check for most common single-character punctuators.
case 0x2E:// . dot
case 0x28:// ( open bracket
case 0x29:// ) close bracket
case 0x3B:// ; semicolon
case 0x2C:// , comma
case 0x7B:// { open curly brace
case 0x7D:// } close curly brace
case 0x5B:// [
case 0x5D:// ]
case 0x3A:// :
case 0x3F:// ?
case 0x7E:// ~
++index;if(extra.tokenize){if(code===0x28){extra.openParenToken=extra.tokens.length;}else if(code===0x7B){extra.openCurlyToken=extra.tokens.length;}}return{type:Token.Punctuator,value:String.fromCharCode(code),lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};default:code2=source.charCodeAt(index+1);// '=' (U+003D) marks an assignment or comparison operator.
if(code2===0x3D){switch(code){case 0x2B:// +
case 0x2D:// -
case 0x2F:// /
case 0x3C:// <
case 0x3E:// >
case 0x5E:// ^
case 0x7C:// |
case 0x25:// %
case 0x26:// &
case 0x2A:// *
index+=2;return{type:Token.Punctuator,value:String.fromCharCode(code)+String.fromCharCode(code2),lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};case 0x21:// !
case 0x3D:// =
index+=2;// !== and ===
if(source.charCodeAt(index)===0x3D){++index;}return{type:Token.Punctuator,value:source.slice(start,index),lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}}}// 4-character punctuator: >>>=
ch4=source.substr(index,4);if(ch4==='>>>='){index+=4;return{type:Token.Punctuator,value:ch4,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}// 3-character punctuators: === !== >>> <<= >>=
ch3=ch4.substr(0,3);if(ch3==='>>>'||ch3==='<<='||ch3==='>>='){index+=3;return{type:Token.Punctuator,value:ch3,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}// Other 2-character punctuators: ++ -- << >> && ||
ch2=ch3.substr(0,2);if(ch1===ch2[1]&&'+-<>&|'.indexOf(ch1)>=0||ch2==='=>'){index+=2;return{type:Token.Punctuator,value:ch2,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}// 1-character punctuators: < > = ! + - * % & | ^ /
if('<>=!+-*%&|^/'.indexOf(ch1)>=0){++index;return{type:Token.Punctuator,value:ch1,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}throwError({},Messages.UnexpectedToken,'ILLEGAL');}// 7.8.3 Numeric Literals
function scanHexLiteral(start){var number='';while(index<length){if(!isHexDigit(source[index])){break;}number+=source[index++];}if(number.length===0){throwError({},Messages.UnexpectedToken,'ILLEGAL');}if(isIdentifierStart(source.charCodeAt(index))){throwError({},Messages.UnexpectedToken,'ILLEGAL');}return{type:Token.NumericLiteral,value:parseInt('0x'+number,16),lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}function scanOctalLiteral(start){var number='0'+source[index++];while(index<length){if(!isOctalDigit(source[index])){break;}number+=source[index++];}if(isIdentifierStart(source.charCodeAt(index))||isDecimalDigit(source.charCodeAt(index))){throwError({},Messages.UnexpectedToken,'ILLEGAL');}return{type:Token.NumericLiteral,value:parseInt(number,8),octal:true,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}function isImplicitOctalLiteral(){var i,ch;// Implicit octal, unless there is a non-octal digit.
// (Annex B.1.1 on Numeric Literals)
for(i=index+1;i<length;++i){ch=source[i];if(ch==='8'||ch==='9'){return false;}if(!isOctalDigit(ch)){return true;}}return true;}function scanNumericLiteral(){var number,start,ch;ch=source[index];assert(isDecimalDigit(ch.charCodeAt(0))||ch==='.','Numeric literal must start with a decimal digit or a decimal point');start=index;number='';if(ch!=='.'){number=source[index++];ch=source[index];// Hex number starts with '0x'.
// Octal number starts with '0'.
if(number==='0'){if(ch==='x'||ch==='X'){++index;return scanHexLiteral(start);}if(isOctalDigit(ch)){if(isImplicitOctalLiteral()){return scanOctalLiteral(start);}}}while(isDecimalDigit(source.charCodeAt(index))){number+=source[index++];}ch=source[index];}if(ch==='.'){number+=source[index++];while(isDecimalDigit(source.charCodeAt(index))){number+=source[index++];}ch=source[index];}if(ch==='e'||ch==='E'){number+=source[index++];ch=source[index];if(ch==='+'||ch==='-'){number+=source[index++];}if(isDecimalDigit(source.charCodeAt(index))){while(isDecimalDigit(source.charCodeAt(index))){number+=source[index++];}}else{throwError({},Messages.UnexpectedToken,'ILLEGAL');}}if(isIdentifierStart(source.charCodeAt(index))){throwError({},Messages.UnexpectedToken,'ILLEGAL');}return{type:Token.NumericLiteral,value:parseFloat(number),lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}// 7.8.4 String Literals
function scanStringLiteral(){var str='',quote,start,ch,code,unescaped,restore,octal=false,startLineNumber,startLineStart;startLineNumber=lineNumber;startLineStart=lineStart;quote=source[index];assert(quote==='\''||quote==='"','String literal must starts with a quote');start=index;++index;while(index<length){ch=source[index++];if(ch===quote){quote='';break;}else if(ch==='\\'){ch=source[index++];if(!ch||!isLineTerminator(ch.charCodeAt(0))){switch(ch){case'u':case'x':restore=index;unescaped=scanHexEscape(ch);if(unescaped){str+=unescaped;}else{index=restore;str+=ch;}break;case'n':str+='\n';break;case'r':str+='\r';break;case't':str+='\t';break;case'b':str+='\b';break;case'f':str+='\f';break;case'v':str+='\x0B';break;default:if(isOctalDigit(ch)){code='01234567'.indexOf(ch);// \0 is not octal escape sequence
if(code!==0){octal=true;}if(index<length&&isOctalDigit(source[index])){octal=true;code=code*8+'01234567'.indexOf(source[index++]);// 3 digits are only allowed when string starts
// with 0, 1, 2, 3
if('0123'.indexOf(ch)>=0&&index<length&&isOctalDigit(source[index])){code=code*8+'01234567'.indexOf(source[index++]);}}str+=String.fromCharCode(code);}else{str+=ch;}break;}}else{++lineNumber;if(ch==='\r'&&source[index]==='\n'){++index;}lineStart=index;}}else if(isLineTerminator(ch.charCodeAt(0))){break;}else{str+=ch;}}if(quote!==''){throwError({},Messages.UnexpectedToken,'ILLEGAL');}return{type:Token.StringLiteral,value:str,octal:octal,startLineNumber:startLineNumber,startLineStart:startLineStart,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}function testRegExp(pattern,flags){var value;try{value=new RegExp(pattern,flags);}catch(e){throwError({},Messages.InvalidRegExp);}return value;}function scanRegExpBody(){var ch,str,classMarker,terminated,body;ch=source[index];assert(ch==='/','Regular expression literal must start with a slash');str=source[index++];classMarker=false;terminated=false;while(index<length){ch=source[index++];str+=ch;if(ch==='\\'){ch=source[index++];// ECMA-262 7.8.5
if(isLineTerminator(ch.charCodeAt(0))){throwError({},Messages.UnterminatedRegExp);}str+=ch;}else if(isLineTerminator(ch.charCodeAt(0))){throwError({},Messages.UnterminatedRegExp);}else if(classMarker){if(ch===']'){classMarker=false;}}else{if(ch==='/'){terminated=true;break;}else if(ch==='['){classMarker=true;}}}if(!terminated){throwError({},Messages.UnterminatedRegExp);}// Exclude leading and trailing slash.
body=str.substr(1,str.length-2);return{value:body,literal:str};}function scanRegExpFlags(){var ch,str,flags,restore;str='';flags='';while(index<length){ch=source[index];if(!isIdentifierPart(ch.charCodeAt(0))){break;}++index;if(ch==='\\'&&index<length){ch=source[index];if(ch==='u'){++index;restore=index;ch=scanHexEscape('u');if(ch){flags+=ch;for(str+='\\u';restore<index;++restore){str+=source[restore];}}else{index=restore;flags+='u';str+='\\u';}throwErrorTolerant({},Messages.UnexpectedToken,'ILLEGAL');}else{str+='\\';throwErrorTolerant({},Messages.UnexpectedToken,'ILLEGAL');}}else{flags+=ch;str+=ch;}}return{value:flags,literal:str};}function scanRegExp(){var start,body,flags,pattern,value;lookahead=null;skipComment();start=index;body=scanRegExpBody();flags=scanRegExpFlags();value=testRegExp(body.value,flags.value);if(extra.tokenize){return{type:Token.RegularExpression,value:value,lineNumber:lineNumber,lineStart:lineStart,start:start,end:index};}return{literal:body.literal+flags.literal,value:value,start:start,end:index};}function collectRegex(){var pos,loc,regex,token;skipComment();pos=index;loc={start:{line:lineNumber,column:index-lineStart}};regex=scanRegExp();loc.end={line:lineNumber,column:index-lineStart};/* istanbul ignore next */if(!extra.tokenize){// Pop the previous token, which is likely '/' or '/='
if(extra.tokens.length>0){token=extra.tokens[extra.tokens.length-1];if(token.range[0]===pos&&token.type==='Punctuator'){if(token.value==='/'||token.value==='/='){extra.tokens.pop();}}}extra.tokens.push({type:'RegularExpression',value:regex.literal,range:[pos,index],loc:loc});}return regex;}function isIdentifierName(token){return token.type===Token.Identifier||token.type===Token.Keyword||token.type===Token.BooleanLiteral||token.type===Token.NullLiteral;}function advanceSlash(){var prevToken,checkToken;// Using the following algorithm:
// https://github.com/mozilla/sweet.js/wiki/design
prevToken=extra.tokens[extra.tokens.length-1];if(!prevToken){// Nothing before that: it cannot be a division.
return collectRegex();}if(prevToken.type==='Punctuator'){if(prevToken.value===']'){return scanPunctuator();}if(prevToken.value===')'){checkToken=extra.tokens[extra.openParenToken-1];if(checkToken&&checkToken.type==='Keyword'&&(checkToken.value==='if'||checkToken.value==='while'||checkToken.value==='for'||checkToken.value==='with')){return collectRegex();}return scanPunctuator();}if(prevToken.value==='}'){// Dividing a function by anything makes little sense,
// but we have to check for that.
if(extra.tokens[extra.openCurlyToken-3]&&extra.tokens[extra.openCurlyToken-3].type==='Keyword'){// Anonymous function.
checkToken=extra.tokens[extra.openCurlyToken-4];if(!checkToken){return scanPunctuator();}}else if(extra.tokens[extra.openCurlyToken-4]&&extra.tokens[extra.openCurlyToken-4].type==='Keyword'){// Named function.
checkToken=extra.tokens[extra.openCurlyToken-5];if(!checkToken){return collectRegex();}}else{return scanPunctuator();}// checkToken determines whether the function is
// a declaration or an expression.
if(FnExprTokens.indexOf(checkToken.value)>=0){// It is an expression.
return scanPunctuator();}// It is a declaration.
return collectRegex();}return collectRegex();}if(prevToken.type==='Keyword'&&prevToken.value!=='this'){return collectRegex();}return scanPunctuator();}function advance(){var ch;skipComment();if(index>=length){return{type:Token.EOF,lineNumber:lineNumber,lineStart:lineStart,start:index,end:index};}ch=source.charCodeAt(index);if(isIdentifierStart(ch)){return scanIdentifier();}// Very common: ( and ) and ;
if(ch===0x28||ch===0x29||ch===0x3B){return scanPunctuator();}// String literal starts with single quote (U+0027) or double quote (U+0022).
if(ch===0x27||ch===0x22){return scanStringLiteral();}// Dot (.) U+002E can also start a floating-point number, hence the need
// to check the next character.
if(ch===0x2E){if(isDecimalDigit(source.charCodeAt(index+1))){return scanNumericLiteral();}return scanPunctuator();}if(isDecimalDigit(ch)){return scanNumericLiteral();}// Slash (/) U+002F can also start a regex.
if(extra.tokenize&&ch===0x2F){return advanceSlash();}return scanPunctuator();}function collectToken(){var loc,token,range,value;skipComment();loc={start:{line:lineNumber,column:index-lineStart}};token=advance();loc.end={line:lineNumber,column:index-lineStart};if(token.type!==Token.EOF){value=source.slice(token.start,token.end);extra.tokens.push({type:TokenName[token.type],value:value,range:[token.start,token.end],loc:loc});}return token;}function lex(){var token;token=lookahead;index=token.end;lineNumber=token.lineNumber;lineStart=token.lineStart;lookahead=typeof extra.tokens!=='undefined'?collectToken():advance();index=token.end;lineNumber=token.lineNumber;lineStart=token.lineStart;return token;}function peek(){var pos,line,start;pos=index;line=lineNumber;start=lineStart;lookahead=typeof extra.tokens!=='undefined'?collectToken():advance();index=pos;lineNumber=line;lineStart=start;}function Position(line,column){this.line=line;this.column=column;}function SourceLocation(startLine,startColumn,line,column){this.start=new Position(startLine,startColumn);this.end=new Position(line,column);}SyntaxTreeDelegate={name:'SyntaxTree',processComment:function processComment(node){var lastChild,trailingComments;if(node.type===Syntax.Program){if(node.body.length>0){return;}}if(extra.trailingComments.length>0){if(extra.trailingComments[0].range[0]>=node.range[1]){trailingComments=extra.trailingComments;extra.trailingComments=[];}else{extra.trailingComments.length=0;}}else{if(extra.bottomRightStack.length>0&&extra.bottomRightStack[extra.bottomRightStack.length-1].trailingComments&&extra.bottomRightStack[extra.bottomRightStack.length-1].trailingComments[0].range[0]>=node.range[1]){trailingComments=extra.bottomRightStack[extra.bottomRightStack.length-1].trailingComments;delete extra.bottomRightStack[extra.bottomRightStack.length-1].trailingComments;}}// Eating the stack.
while(extra.bottomRightStack.length>0&&extra.bottomRightStack[extra.bottomRightStack.length-1].range[0]>=node.range[0]){lastChild=extra.bottomRightStack.pop();}if(lastChild){if(lastChild.leadingComments&&lastChild.leadingComments[lastChild.leadingComments.length-1].range[1]<=node.range[0]){node.leadingComments=lastChild.leadingComments;delete lastChild.leadingComments;}}else if(extra.leadingComments.length>0&&extra.leadingComments[extra.leadingComments.length-1].range[1]<=node.range[0]){node.leadingComments=extra.leadingComments;extra.leadingComments=[];}if(trailingComments){node.trailingComments=trailingComments;}extra.bottomRightStack.push(node);},markEnd:function markEnd(node,startToken){if(extra.range){node.range=[startToken.start,index];}if(extra.loc){node.loc=new SourceLocation(startToken.startLineNumber===undefined?startToken.lineNumber:startToken.startLineNumber,startToken.start-(startToken.startLineStart===undefined?startToken.lineStart:startToken.startLineStart),lineNumber,index-lineStart);this.postProcess(node);}if(extra.attachComment){this.processComment(node);}return node;},postProcess:function postProcess(node){if(extra.source){node.loc.source=extra.source;}return node;},createArrayExpression:function createArrayExpression(elements){return{type:Syntax.ArrayExpression,elements:elements};},createAssignmentExpression:function createAssignmentExpression(operator,left,right){return{type:Syntax.AssignmentExpression,operator:operator,left:left,right:right};},createBinaryExpression:function createBinaryExpression(operator,left,right){var type=operator==='||'||operator==='&&'?Syntax.LogicalExpression:Syntax.BinaryExpression;return{type:type,operator:operator,left:left,right:right};},createBlockStatement:function createBlockStatement(body){return{type:Syntax.BlockStatement,body:body};},createBreakStatement:function createBreakStatement(label){return{type:Syntax.BreakStatement,label:label};},createCallExpression:function createCallExpression(callee,args){return{type:Syntax.CallExpression,callee:callee,'arguments':args};},createCatchClause:function createCatchClause(param,body){return{type:Syntax.CatchClause,param:param,body:body};},createConditionalExpression:function createConditionalExpression(test,consequent,alternate){return{type:Syntax.ConditionalExpression,test:test,consequent:consequent,alternate:alternate};},createContinueStatement:function createContinueStatement(label){return{type:Syntax.ContinueStatement,label:label};},createDebuggerStatement:function createDebuggerStatement(){return{type:Syntax.DebuggerStatement};},createDoWhileStatement:function createDoWhileStatement(body,test){return{type:Syntax.DoWhileStatement,body:body,test:test};},createEmptyStatement:function createEmptyStatement(){return{type:Syntax.EmptyStatement};},createExpressionStatement:function createExpressionStatement(expression){return{type:Syntax.ExpressionStatement,expression:expression};},createForStatement:function createForStatement(init,test,update,body){return{type:Syntax.ForStatement,init:init,test:test,update:update,body:body};},createForInStatement:function createForInStatement(left,right,body){return{type:Syntax.ForInStatement,left:left,right:right,body:body,each:false};},createFunctionDeclaration:function createFunctionDeclaration(id,params,defaults,body){return{type:Syntax.FunctionDeclaration,id:id,params:params,defaults:defaults,body:body,rest:null,generator:false,expression:false};},createFunctionExpression:function createFunctionExpression(id,params,defaults,body){return{type:Syntax.FunctionExpression,id:id,params:params,defaults:defaults,body:body,rest:null,generator:false,expression:false};},createIdentifier:function createIdentifier(name){return{type:Syntax.Identifier,name:name};},createIfStatement:function createIfStatement(test,consequent,alternate){return{type:Syntax.IfStatement,test:test,consequent:consequent,alternate:alternate};},createLabeledStatement:function createLabeledStatement(label,body){return{type:Syntax.LabeledStatement,label:label,body:body};},createLiteral:function createLiteral(token){return{type:Syntax.Literal,value:token.value,raw:source.slice(token.start,token.end)};},createMemberExpression:function createMemberExpression(accessor,object,property){return{type:Syntax.MemberExpression,computed:accessor==='[',object:object,property:property};},createNewExpression:function createNewExpression(callee,args){return{type:Syntax.NewExpression,callee:callee,'arguments':args};},createObjectExpression:function createObjectExpression(properties){return{type:Syntax.ObjectExpression,properties:properties};},createPostfixExpression:function createPostfixExpression(operator,argument){return{type:Syntax.UpdateExpression,operator:operator,argument:argument,prefix:false};},createProgram:function createProgram(body){return{type:Syntax.Program,body:body};},createProperty:function createProperty(kind,key,value){return{type:Syntax.Property,key:key,value:value,kind:kind};},createReturnStatement:function createReturnStatement(argument){return{type:Syntax.ReturnStatement,argument:argument};},createSequenceExpression:function createSequenceExpression(expressions){return{type:Syntax.SequenceExpression,expressions:expressions};},createSwitchCase:function createSwitchCase(test,consequent){return{type:Syntax.SwitchCase,test:test,consequent:consequent};},createSwitchStatement:function createSwitchStatement(discriminant,cases){return{type:Syntax.SwitchStatement,discriminant:discriminant,cases:cases};},createThisExpression:function createThisExpression(){return{type:Syntax.ThisExpression};},createThrowStatement:function createThrowStatement(argument){return{type:Syntax.ThrowStatement,argument:argument};},createTryStatement:function createTryStatement(block,guardedHandlers,handlers,finalizer){return{type:Syntax.TryStatement,block:block,guardedHandlers:guardedHandlers,handlers:handlers,finalizer:finalizer};},createUnaryExpression:function createUnaryExpression(operator,argument){if(operator==='++'||operator==='--'){return{type:Syntax.UpdateExpression,operator:operator,argument:argument,prefix:true};}return{type:Syntax.UnaryExpression,operator:operator,argument:argument,prefix:true};},createVariableDeclaration:function createVariableDeclaration(declarations,kind){return{type:Syntax.VariableDeclaration,declarations:declarations,kind:kind};},createVariableDeclarator:function createVariableDeclarator(id,init){return{type:Syntax.VariableDeclarator,id:id,init:init};},createWhileStatement:function createWhileStatement(test,body){return{type:Syntax.WhileStatement,test:test,body:body};},createWithStatement:function createWithStatement(object,body){return{type:Syntax.WithStatement,object:object,body:body};}};// Return true if there is a line terminator before the next token.
function peekLineTerminator(){var pos,line,start,found;pos=index;line=lineNumber;start=lineStart;skipComment();found=lineNumber!==line;index=pos;lineNumber=line;lineStart=start;return found;}// Throw an exception
function throwError(token,messageFormat){var error,args=Array.prototype.slice.call(arguments,2),msg=messageFormat.replace(/%(\d)/g,function(whole,index){assert(index<args.length,'Message reference must be in range');return args[index];});if(typeof token.lineNumber==='number'){error=new Error('Line '+token.lineNumber+': '+msg);error.index=token.start;error.lineNumber=token.lineNumber;error.column=token.start-lineStart+1;}else{error=new Error('Line '+lineNumber+': '+msg);error.index=index;error.lineNumber=lineNumber;error.column=index-lineStart+1;}error.description=msg;throw error;}function throwErrorTolerant(){try{throwError.apply(null,arguments);}catch(e){if(extra.errors){extra.errors.push(e);}else{throw e;}}}// Throw an exception because of the token.
function throwUnexpected(token){if(token.type===Token.EOF){throwError(token,Messages.UnexpectedEOS);}if(token.type===Token.NumericLiteral){throwError(token,Messages.UnexpectedNumber);}if(token.type===Token.StringLiteral){throwError(token,Messages.UnexpectedString);}if(token.type===Token.Identifier){throwError(token,Messages.UnexpectedIdentifier);}if(token.type===Token.Keyword){if(isFutureReservedWord(token.value)){throwError(token,Messages.UnexpectedReserved);}else if(strict&&isStrictModeReservedWord(token.value)){throwErrorTolerant(token,Messages.StrictReservedWord);return;}throwError(token,Messages.UnexpectedToken,token.value);}// BooleanLiteral, NullLiteral, or Punctuator.
throwError(token,Messages.UnexpectedToken,token.value);}// Expect the next token to match the specified punctuator.
// If not, an exception will be thrown.
function expect(value){var token=lex();if(token.type!==Token.Punctuator||token.value!==value){throwUnexpected(token);}}// Expect the next token to match the specified keyword.
// If not, an exception will be thrown.
function expectKeyword(keyword){var token=lex();if(token.type!==Token.Keyword||token.value!==keyword){throwUnexpected(token);}}// Return true if the next token matches the specified punctuator.
function match(value){return lookahead.type===Token.Punctuator&&lookahead.value===value;}// Return true if the next token matches the specified keyword
function matchKeyword(keyword){return lookahead.type===Token.Keyword&&lookahead.value===keyword;}// Return true if the next token is an assignment operator
function matchAssign(){var op;if(lookahead.type!==Token.Punctuator){return false;}op=lookahead.value;return op==='='||op==='*='||op==='/='||op==='%='||op==='+='||op==='-='||op==='<<='||op==='>>='||op==='>>>='||op==='&='||op==='^='||op==='|=';}function consumeSemicolon(){var line,oldIndex=index,oldLineNumber=lineNumber,oldLineStart=lineStart,oldLookahead=lookahead;// Catch the very common case first: immediately a semicolon (U+003B).
if(source.charCodeAt(index)===0x3B||match(';')){lex();return;}line=lineNumber;skipComment();if(lineNumber!==line){index=oldIndex;lineNumber=oldLineNumber;lineStart=oldLineStart;lookahead=oldLookahead;return;}if(lookahead.type!==Token.EOF&&!match('}')){throwUnexpected(lookahead);}}// Return true if provided expression is LeftHandSideExpression
function isLeftHandSide(expr){return expr.type===Syntax.Identifier||expr.type===Syntax.MemberExpression;}// 11.1.4 Array Initialiser
function parseArrayInitialiser(){var elements=[],startToken;startToken=lookahead;expect('[');while(!match(']')){if(match(',')){lex();elements.push(null);}else{elements.push(parseAssignmentExpression());if(!match(']')){expect(',');}}}lex();return delegate.markEnd(delegate.createArrayExpression(elements),startToken);}// 11.1.5 Object Initialiser
function parsePropertyFunction(param,first){var previousStrict,body,startToken;previousStrict=strict;startToken=lookahead;body=parseFunctionSourceElements();if(first&&strict&&isRestrictedWord(param[0].name)){throwErrorTolerant(first,Messages.StrictParamName);}strict=previousStrict;return delegate.markEnd(delegate.createFunctionExpression(null,param,[],body),startToken);}function parseObjectPropertyKey(){var token,startToken;startToken=lookahead;token=lex();// Note: This function is called only from parseObjectProperty(), where
// EOF and Punctuator tokens are already filtered out.
if(token.type===Token.StringLiteral||token.type===Token.NumericLiteral){if(strict&&token.octal){throwErrorTolerant(token,Messages.StrictOctalLiteral);}return delegate.markEnd(delegate.createLiteral(token),startToken);}return delegate.markEnd(delegate.createIdentifier(token.value),startToken);}function parseObjectProperty(){var token,key,id,value,param,startToken;token=lookahead;startToken=lookahead;if(token.type===Token.Identifier){id=parseObjectPropertyKey();// Property Assignment: Getter and Setter.
if(token.value==='get'&&!match(':')){key=parseObjectPropertyKey();expect('(');expect(')');value=parsePropertyFunction([]);return delegate.markEnd(delegate.createProperty('get',key,value),startToken);}if(token.value==='set'&&!match(':')){key=parseObjectPropertyKey();expect('(');token=lookahead;if(token.type!==Token.Identifier){expect(')');throwErrorTolerant(token,Messages.UnexpectedToken,token.value);value=parsePropertyFunction([]);}else{param=[parseVariableIdentifier()];expect(')');value=parsePropertyFunction(param,token);}return delegate.markEnd(delegate.createProperty('set',key,value),startToken);}expect(':');value=parseAssignmentExpression();return delegate.markEnd(delegate.createProperty('init',id,value),startToken);}if(token.type===Token.EOF||token.type===Token.Punctuator){throwUnexpected(token);}else{key=parseObjectPropertyKey();expect(':');value=parseAssignmentExpression();return delegate.markEnd(delegate.createProperty('init',key,value),startToken);}}function parseObjectInitialiser(){var properties=[],property,name,key,kind,map={},toString=String,startToken;startToken=lookahead;expect('{');while(!match('}')){property=parseObjectProperty();if(property.key.type===Syntax.Identifier){name=property.key.name;}else{name=toString(property.key.value);}kind=property.kind==='init'?PropertyKind.Data:property.kind==='get'?PropertyKind.Get:PropertyKind.Set;key='$'+name;if(Object.prototype.hasOwnProperty.call(map,key)){if(map[key]===PropertyKind.Data){if(strict&&kind===PropertyKind.Data){throwErrorTolerant({},Messages.StrictDuplicateProperty);}else if(kind!==PropertyKind.Data){throwErrorTolerant({},Messages.AccessorDataProperty);}}else{if(kind===PropertyKind.Data){throwErrorTolerant({},Messages.AccessorDataProperty);}else if(map[key]&kind){throwErrorTolerant({},Messages.AccessorGetSet);}}map[key]|=kind;}else{map[key]=kind;}properties.push(property);if(!match('}')){expect(',');}}expect('}');return delegate.markEnd(delegate.createObjectExpression(properties),startToken);}// 11.1.6 The Grouping Operator
function parseGroupExpression(){var expr;expect('(');expr=parseExpression();expect(')');return expr;}// 11.1 Primary Expressions
function parsePrimaryExpression(){var type,token,expr,startToken;if(match('(')){return parseGroupExpression();}if(match('[')){return parseArrayInitialiser();}if(match('{')){return parseObjectInitialiser();}type=lookahead.type;startToken=lookahead;if(type===Token.Identifier){expr=delegate.createIdentifier(lex().value);}else if(type===Token.StringLiteral||type===Token.NumericLiteral){if(strict&&lookahead.octal){throwErrorTolerant(lookahead,Messages.StrictOctalLiteral);}expr=delegate.createLiteral(lex());}else if(type===Token.Keyword){if(matchKeyword('function')){return parseFunctionExpression();}if(matchKeyword('this')){lex();expr=delegate.createThisExpression();}else{throwUnexpected(lex());}}else if(type===Token.BooleanLiteral){token=lex();token.value=token.value==='true';expr=delegate.createLiteral(token);}else if(type===Token.NullLiteral){token=lex();token.value=null;expr=delegate.createLiteral(token);}else if(match('/')||match('/=')){if(typeof extra.tokens!=='undefined'){expr=delegate.createLiteral(collectRegex());}else{expr=delegate.createLiteral(scanRegExp());}peek();}else{throwUnexpected(lex());}return delegate.markEnd(expr,startToken);}// 11.2 Left-Hand-Side Expressions
function parseArguments(){var args=[];expect('(');if(!match(')')){while(index<length){args.push(parseAssignmentExpression());if(match(')')){break;}expect(',');}}expect(')');return args;}function parseNonComputedProperty(){var token,startToken;startToken=lookahead;token=lex();if(!isIdentifierName(token)){throwUnexpected(token);}return delegate.markEnd(delegate.createIdentifier(token.value),startToken);}function parseNonComputedMember(){expect('.');return parseNonComputedProperty();}function parseComputedMember(){var expr;expect('[');expr=parseExpression();expect(']');return expr;}function parseNewExpression(){var callee,args,startToken;startToken=lookahead;expectKeyword('new');callee=parseLeftHandSideExpression();args=match('(')?parseArguments():[];return delegate.markEnd(delegate.createNewExpression(callee,args),startToken);}function parseLeftHandSideExpressionAllowCall(){var expr,args,property,startToken,previousAllowIn=state.allowIn;startToken=lookahead;state.allowIn=true;expr=matchKeyword('new')?parseNewExpression():parsePrimaryExpression();for(;;){if(match('.')){property=parseNonComputedMember();expr=delegate.createMemberExpression('.',expr,property);}else if(match('(')){args=parseArguments();expr=delegate.createCallExpression(expr,args);}else if(match('[')){property=parseComputedMember();expr=delegate.createMemberExpression('[',expr,property);}else{break;}delegate.markEnd(expr,startToken);}state.allowIn=previousAllowIn;return expr;}function parseLeftHandSideExpression(){var expr,property,startToken;assert(state.allowIn,'callee of new expression always allow in keyword.');startToken=lookahead;expr=matchKeyword('new')?parseNewExpression():parsePrimaryExpression();while(match('.')||match('[')){if(match('[')){property=parseComputedMember();expr=delegate.createMemberExpression('[',expr,property);}else{property=parseNonComputedMember();expr=delegate.createMemberExpression('.',expr,property);}delegate.markEnd(expr,startToken);}return expr;}// 11.3 Postfix Expressions
function parsePostfixExpression(){var expr,token,startToken=lookahead;expr=parseLeftHandSideExpressionAllowCall();if(lookahead.type===Token.Punctuator){if((match('++')||match('--'))&&!peekLineTerminator()){// 11.3.1, 11.3.2
if(strict&&expr.type===Syntax.Identifier&&isRestrictedWord(expr.name)){throwErrorTolerant({},Messages.StrictLHSPostfix);}if(!isLeftHandSide(expr)){throwErrorTolerant({},Messages.InvalidLHSInAssignment);}token=lex();expr=delegate.markEnd(delegate.createPostfixExpression(token.value,expr),startToken);}}return expr;}// 11.4 Unary Operators
function parseUnaryExpression(){var token,expr,startToken;if(lookahead.type!==Token.Punctuator&&lookahead.type!==Token.Keyword){expr=parsePostfixExpression();}else if(match('++')||match('--')){startToken=lookahead;token=lex();expr=parseUnaryExpression();// 11.4.4, 11.4.5
if(strict&&expr.type===Syntax.Identifier&&isRestrictedWord(expr.name)){throwErrorTolerant({},Messages.StrictLHSPrefix);}if(!isLeftHandSide(expr)){throwErrorTolerant({},Messages.InvalidLHSInAssignment);}expr=delegate.createUnaryExpression(token.value,expr);expr=delegate.markEnd(expr,startToken);}else if(match('+')||match('-')||match('~')||match('!')){startToken=lookahead;token=lex();expr=parseUnaryExpression();expr=delegate.createUnaryExpression(token.value,expr);expr=delegate.markEnd(expr,startToken);}else if(matchKeyword('delete')||matchKeyword('void')||matchKeyword('typeof')){startToken=lookahead;token=lex();expr=parseUnaryExpression();expr=delegate.createUnaryExpression(token.value,expr);expr=delegate.markEnd(expr,startToken);if(strict&&expr.operator==='delete'&&expr.argument.type===Syntax.Identifier){throwErrorTolerant({},Messages.StrictDelete);}}else{expr=parsePostfixExpression();}return expr;}function binaryPrecedence(token,allowIn){var prec=0;if(token.type!==Token.Punctuator&&token.type!==Token.Keyword){return 0;}switch(token.value){case'||':prec=1;break;case'&&':prec=2;break;case'|':prec=3;break;case'^':prec=4;break;case'&':prec=5;break;case'==':case'!=':case'===':case'!==':prec=6;break;case'<':case'>':case'<=':case'>=':case'instanceof':prec=7;break;case'in':prec=allowIn?7:0;break;case'<<':case'>>':case'>>>':prec=8;break;case'+':case'-':prec=9;break;case'*':case'/':case'%':prec=11;break;default:break;}return prec;}// 11.5 Multiplicative Operators
// 11.6 Additive Operators
// 11.7 Bitwise Shift Operators
// 11.8 Relational Operators
// 11.9 Equality Operators
// 11.10 Binary Bitwise Operators
// 11.11 Binary Logical Operators
function parseBinaryExpression(){var marker,markers,expr,token,prec,stack,right,operator,left,i;marker=lookahead;left=parseUnaryExpression();token=lookahead;prec=binaryPrecedence(token,state.allowIn);if(prec===0){return left;}token.prec=prec;lex();markers=[marker,lookahead];right=parseUnaryExpression();stack=[left,token,right];while((prec=binaryPrecedence(lookahead,state.allowIn))>0){// Reduce: make a binary expression from the three topmost entries.
while(stack.length>2&&prec<=stack[stack.length-2].prec){right=stack.pop();operator=stack.pop().value;left=stack.pop();expr=delegate.createBinaryExpression(operator,left,right);markers.pop();marker=markers[markers.length-1];delegate.markEnd(expr,marker);stack.push(expr);}// Shift.
token=lex();token.prec=prec;stack.push(token);markers.push(lookahead);expr=parseUnaryExpression();stack.push(expr);}// Final reduce to clean-up the stack.
i=stack.length-1;expr=stack[i];markers.pop();while(i>1){expr=delegate.createBinaryExpression(stack[i-1].value,stack[i-2],expr);i-=2;marker=markers.pop();delegate.markEnd(expr,marker);}return expr;}// 11.12 Conditional Operator
function parseConditionalExpression(){var expr,previousAllowIn,consequent,alternate,startToken;startToken=lookahead;expr=parseBinaryExpression();if(match('?')){lex();previousAllowIn=state.allowIn;state.allowIn=true;consequent=parseAssignmentExpression();state.allowIn=previousAllowIn;expect(':');alternate=parseAssignmentExpression();expr=delegate.createConditionalExpression(expr,consequent,alternate);delegate.markEnd(expr,startToken);}return expr;}// 11.13 Assignment Operators
function parseAssignmentExpression(){var token,left,right,node,startToken;token=lookahead;startToken=lookahead;node=left=parseConditionalExpression();if(matchAssign()){// LeftHandSideExpression
if(!isLeftHandSide(left)){throwErrorTolerant({},Messages.InvalidLHSInAssignment);}// 11.13.1
if(strict&&left.type===Syntax.Identifier&&isRestrictedWord(left.name)){throwErrorTolerant(token,Messages.StrictLHSAssignment);}token=lex();right=parseAssignmentExpression();node=delegate.markEnd(delegate.createAssignmentExpression(token.value,left,right),startToken);}return node;}// 11.14 Comma Operator
function parseExpression(){var expr,startToken=lookahead;expr=parseAssignmentExpression();if(match(',')){expr=delegate.createSequenceExpression([expr]);while(index<length){if(!match(',')){break;}lex();expr.expressions.push(parseAssignmentExpression());}delegate.markEnd(expr,startToken);}return expr;}// 12.1 Block
function parseStatementList(){var list=[],statement;while(index<length){if(match('}')){break;}statement=parseSourceElement();if(typeof statement==='undefined'){break;}list.push(statement);}return list;}function parseBlock(){var block,startToken;startToken=lookahead;expect('{');block=parseStatementList();expect('}');return delegate.markEnd(delegate.createBlockStatement(block),startToken);}// 12.2 Variable Statement
function parseVariableIdentifier(){var token,startToken;startToken=lookahead;token=lex();if(token.type!==Token.Identifier){throwUnexpected(token);}return delegate.markEnd(delegate.createIdentifier(token.value),startToken);}function parseVariableDeclaration(kind){var init=null,id,startToken;startToken=lookahead;id=parseVariableIdentifier();// 12.2.1
if(strict&&isRestrictedWord(id.name)){throwErrorTolerant({},Messages.StrictVarName);}if(kind==='const'){expect('=');init=parseAssignmentExpression();}else if(match('=')){lex();init=parseAssignmentExpression();}return delegate.markEnd(delegate.createVariableDeclarator(id,init),startToken);}function parseVariableDeclarationList(kind){var list=[];do{list.push(parseVariableDeclaration(kind));if(!match(',')){break;}lex();}while(index<length);return list;}function parseVariableStatement(){var declarations;expectKeyword('var');declarations=parseVariableDeclarationList();consumeSemicolon();return delegate.createVariableDeclaration(declarations,'var');}// kind may be `const` or `let`
// Both are experimental and not in the specification yet.
// see http://wiki.ecmascript.org/doku.php?id=harmony:const
// and http://wiki.ecmascript.org/doku.php?id=harmony:let
function parseConstLetDeclaration(kind){var declarations,startToken;startToken=lookahead;expectKeyword(kind);declarations=parseVariableDeclarationList(kind);consumeSemicolon();return delegate.markEnd(delegate.createVariableDeclaration(declarations,kind),startToken);}// 12.3 Empty Statement
function parseEmptyStatement(){expect(';');return delegate.createEmptyStatement();}// 12.4 Expression Statement
function parseExpressionStatement(){var expr=parseExpression();consumeSemicolon();return delegate.createExpressionStatement(expr);}// 12.5 If statement
function parseIfStatement(){var test,consequent,alternate;expectKeyword('if');expect('(');test=parseExpression();expect(')');consequent=parseStatement();if(matchKeyword('else')){lex();alternate=parseStatement();}else{alternate=null;}return delegate.createIfStatement(test,consequent,alternate);}// 12.6 Iteration Statements
function parseDoWhileStatement(){var body,test,oldInIteration;expectKeyword('do');oldInIteration=state.inIteration;state.inIteration=true;body=parseStatement();state.inIteration=oldInIteration;expectKeyword('while');expect('(');test=parseExpression();expect(')');if(match(';')){lex();}return delegate.createDoWhileStatement(body,test);}function parseWhileStatement(){var test,body,oldInIteration;expectKeyword('while');expect('(');test=parseExpression();expect(')');oldInIteration=state.inIteration;state.inIteration=true;body=parseStatement();state.inIteration=oldInIteration;return delegate.createWhileStatement(test,body);}function parseForVariableDeclaration(){var token,declarations,startToken;startToken=lookahead;token=lex();declarations=parseVariableDeclarationList();return delegate.markEnd(delegate.createVariableDeclaration(declarations,token.value),startToken);}function parseForStatement(){var init,test,update,left,right,body,oldInIteration,previousAllowIn=state.allowIn;init=test=update=null;expectKeyword('for');expect('(');if(match(';')){lex();}else{if(matchKeyword('var')||matchKeyword('let')){state.allowIn=false;init=parseForVariableDeclaration();state.allowIn=previousAllowIn;if(init.declarations.length===1&&matchKeyword('in')){lex();left=init;right=parseExpression();init=null;}}else{state.allowIn=false;init=parseExpression();state.allowIn=previousAllowIn;if(matchKeyword('in')){// LeftHandSideExpression
if(!isLeftHandSide(init)){throwErrorTolerant({},Messages.InvalidLHSInForIn);}lex();left=init;right=parseExpression();init=null;}}if(typeof left==='undefined'){expect(';');}}if(typeof left==='undefined'){if(!match(';')){test=parseExpression();}expect(';');if(!match(')')){update=parseExpression();}}expect(')');oldInIteration=state.inIteration;state.inIteration=true;body=parseStatement();state.inIteration=oldInIteration;return typeof left==='undefined'?delegate.createForStatement(init,test,update,body):delegate.createForInStatement(left,right,body);}// 12.7 The continue statement
function parseContinueStatement(){var label=null,key;expectKeyword('continue');// Optimize the most common form: 'continue;'.
if(source.charCodeAt(index)===0x3B){lex();if(!state.inIteration){throwError({},Messages.IllegalContinue);}return delegate.createContinueStatement(null);}if(peekLineTerminator()){if(!state.inIteration){throwError({},Messages.IllegalContinue);}return delegate.createContinueStatement(null);}if(lookahead.type===Token.Identifier){label=parseVariableIdentifier();key='$'+label.name;if(!Object.prototype.hasOwnProperty.call(state.labelSet,key)){throwError({},Messages.UnknownLabel,label.name);}}consumeSemicolon();if(label===null&&!state.inIteration){throwError({},Messages.IllegalContinue);}return delegate.createContinueStatement(label);}// 12.8 The break statement
function parseBreakStatement(){var label=null,key;expectKeyword('break');// Catch the very common case first: immediately a semicolon (U+003B).
if(source.charCodeAt(index)===0x3B){lex();if(!(state.inIteration||state.inSwitch)){throwError({},Messages.IllegalBreak);}return delegate.createBreakStatement(null);}if(peekLineTerminator()){if(!(state.inIteration||state.inSwitch)){throwError({},Messages.IllegalBreak);}return delegate.createBreakStatement(null);}if(lookahead.type===Token.Identifier){label=parseVariableIdentifier();key='$'+label.name;if(!Object.prototype.hasOwnProperty.call(state.labelSet,key)){throwError({},Messages.UnknownLabel,label.name);}}consumeSemicolon();if(label===null&&!(state.inIteration||state.inSwitch)){throwError({},Messages.IllegalBreak);}return delegate.createBreakStatement(label);}// 12.9 The return statement
function parseReturnStatement(){var argument=null;expectKeyword('return');if(!state.inFunctionBody){throwErrorTolerant({},Messages.IllegalReturn);}// 'return' followed by a space and an identifier is very common.
if(source.charCodeAt(index)===0x20){if(isIdentifierStart(source.charCodeAt(index+1))){argument=parseExpression();consumeSemicolon();return delegate.createReturnStatement(argument);}}if(peekLineTerminator()){return delegate.createReturnStatement(null);}if(!match(';')){if(!match('}')&&lookahead.type!==Token.EOF){argument=parseExpression();}}consumeSemicolon();return delegate.createReturnStatement(argument);}// 12.10 The with statement
function parseWithStatement(){var object,body;if(strict){// TODO(ikarienator): Should we update the test cases instead?
skipComment();throwErrorTolerant({},Messages.StrictModeWith);}expectKeyword('with');expect('(');object=parseExpression();expect(')');body=parseStatement();return delegate.createWithStatement(object,body);}// 12.10 The swith statement
function parseSwitchCase(){var test,consequent=[],statement,startToken;startToken=lookahead;if(matchKeyword('default')){lex();test=null;}else{expectKeyword('case');test=parseExpression();}expect(':');while(index<length){if(match('}')||matchKeyword('default')||matchKeyword('case')){break;}statement=parseStatement();consequent.push(statement);}return delegate.markEnd(delegate.createSwitchCase(test,consequent),startToken);}function parseSwitchStatement(){var discriminant,cases,clause,oldInSwitch,defaultFound;expectKeyword('switch');expect('(');discriminant=parseExpression();expect(')');expect('{');cases=[];if(match('}')){lex();return delegate.createSwitchStatement(discriminant,cases);}oldInSwitch=state.inSwitch;state.inSwitch=true;defaultFound=false;while(index<length){if(match('}')){break;}clause=parseSwitchCase();if(clause.test===null){if(defaultFound){throwError({},Messages.MultipleDefaultsInSwitch);}defaultFound=true;}cases.push(clause);}state.inSwitch=oldInSwitch;expect('}');return delegate.createSwitchStatement(discriminant,cases);}// 12.13 The throw statement
function parseThrowStatement(){var argument;expectKeyword('throw');if(peekLineTerminator()){throwError({},Messages.NewlineAfterThrow);}argument=parseExpression();consumeSemicolon();return delegate.createThrowStatement(argument);}// 12.14 The try statement
function parseCatchClause(){var param,body,startToken;startToken=lookahead;expectKeyword('catch');expect('(');if(match(')')){throwUnexpected(lookahead);}param=parseVariableIdentifier();// 12.14.1
if(strict&&isRestrictedWord(param.name)){throwErrorTolerant({},Messages.StrictCatchVariable);}expect(')');body=parseBlock();return delegate.markEnd(delegate.createCatchClause(param,body),startToken);}function parseTryStatement(){var block,handlers=[],finalizer=null;expectKeyword('try');block=parseBlock();if(matchKeyword('catch')){handlers.push(parseCatchClause());}if(matchKeyword('finally')){lex();finalizer=parseBlock();}if(handlers.length===0&&!finalizer){throwError({},Messages.NoCatchOrFinally);}return delegate.createTryStatement(block,[],handlers,finalizer);}// 12.15 The debugger statement
function parseDebuggerStatement(){expectKeyword('debugger');consumeSemicolon();return delegate.createDebuggerStatement();}// 12 Statements
function parseStatement(){var type=lookahead.type,expr,labeledBody,key,startToken;if(type===Token.EOF){throwUnexpected(lookahead);}if(type===Token.Punctuator&&lookahead.value==='{'){return parseBlock();}startToken=lookahead;if(type===Token.Punctuator){switch(lookahead.value){case';':return delegate.markEnd(parseEmptyStatement(),startToken);case'(':return delegate.markEnd(parseExpressionStatement(),startToken);default:break;}}if(type===Token.Keyword){switch(lookahead.value){case'break':return delegate.markEnd(parseBreakStatement(),startToken);case'continue':return delegate.markEnd(parseContinueStatement(),startToken);case'debugger':return delegate.markEnd(parseDebuggerStatement(),startToken);case'do':return delegate.markEnd(parseDoWhileStatement(),startToken);case'for':return delegate.markEnd(parseForStatement(),startToken);case'function':return delegate.markEnd(parseFunctionDeclaration(),startToken);case'if':return delegate.markEnd(parseIfStatement(),startToken);case'return':return delegate.markEnd(parseReturnStatement(),startToken);case'switch':return delegate.markEnd(parseSwitchStatement(),startToken);case'throw':return delegate.markEnd(parseThrowStatement(),startToken);case'try':return delegate.markEnd(parseTryStatement(),startToken);case'var':return delegate.markEnd(parseVariableStatement(),startToken);case'while':return delegate.markEnd(parseWhileStatement(),startToken);case'with':return delegate.markEnd(parseWithStatement(),startToken);default:break;}}expr=parseExpression();// 12.12 Labelled Statements
if(expr.type===Syntax.Identifier&&match(':')){lex();key='$'+expr.name;if(Object.prototype.hasOwnProperty.call(state.labelSet,key)){throwError({},Messages.Redeclaration,'Label',expr.name);}state.labelSet[key]=true;labeledBody=parseStatement();delete state.labelSet[key];return delegate.markEnd(delegate.createLabeledStatement(expr,labeledBody),startToken);}consumeSemicolon();return delegate.markEnd(delegate.createExpressionStatement(expr),startToken);}// 13 Function Definition
function parseFunctionSourceElements(){var sourceElement,sourceElements=[],token,directive,firstRestricted,oldLabelSet,oldInIteration,oldInSwitch,oldInFunctionBody,startToken;startToken=lookahead;expect('{');while(index<length){if(lookahead.type!==Token.StringLiteral){break;}token=lookahead;sourceElement=parseSourceElement();sourceElements.push(sourceElement);if(sourceElement.expression.type!==Syntax.Literal){// this is not directive
break;}directive=source.slice(token.start+1,token.end-1);if(directive==='use strict'){strict=true;if(firstRestricted){throwErrorTolerant(firstRestricted,Messages.StrictOctalLiteral);}}else{if(!firstRestricted&&token.octal){firstRestricted=token;}}}oldLabelSet=state.labelSet;oldInIteration=state.inIteration;oldInSwitch=state.inSwitch;oldInFunctionBody=state.inFunctionBody;state.labelSet={};state.inIteration=false;state.inSwitch=false;state.inFunctionBody=true;while(index<length){if(match('}')){break;}sourceElement=parseSourceElement();if(typeof sourceElement==='undefined'){break;}sourceElements.push(sourceElement);}expect('}');state.labelSet=oldLabelSet;state.inIteration=oldInIteration;state.inSwitch=oldInSwitch;state.inFunctionBody=oldInFunctionBody;return delegate.markEnd(delegate.createBlockStatement(sourceElements),startToken);}function parseParams(firstRestricted){var param,params=[],token,stricted,paramSet,key,message;expect('(');if(!match(')')){paramSet={};while(index<length){token=lookahead;param=parseVariableIdentifier();key='$'+token.value;if(strict){if(isRestrictedWord(token.value)){stricted=token;message=Messages.StrictParamName;}if(Object.prototype.hasOwnProperty.call(paramSet,key)){stricted=token;message=Messages.StrictParamDupe;}}else if(!firstRestricted){if(isRestrictedWord(token.value)){firstRestricted=token;message=Messages.StrictParamName;}else if(isStrictModeReservedWord(token.value)){firstRestricted=token;message=Messages.StrictReservedWord;}else if(Object.prototype.hasOwnProperty.call(paramSet,key)){firstRestricted=token;message=Messages.StrictParamDupe;}}params.push(param);paramSet[key]=true;if(match(')')){break;}expect(',');}}expect(')');return{params:params,stricted:stricted,firstRestricted:firstRestricted,message:message};}function parseFunctionDeclaration(){var id,params=[],body,token,stricted,tmp,firstRestricted,message,previousStrict,startToken;startToken=lookahead;expectKeyword('function');token=lookahead;id=parseVariableIdentifier();if(strict){if(isRestrictedWord(token.value)){throwErrorTolerant(token,Messages.StrictFunctionName);}}else{if(isRestrictedWord(token.value)){firstRestricted=token;message=Messages.StrictFunctionName;}else if(isStrictModeReservedWord(token.value)){firstRestricted=token;message=Messages.StrictReservedWord;}}tmp=parseParams(firstRestricted);params=tmp.params;stricted=tmp.stricted;firstRestricted=tmp.firstRestricted;if(tmp.message){message=tmp.message;}previousStrict=strict;body=parseFunctionSourceElements();if(strict&&firstRestricted){throwError(firstRestricted,message);}if(strict&&stricted){throwErrorTolerant(stricted,message);}strict=previousStrict;return delegate.markEnd(delegate.createFunctionDeclaration(id,params,[],body),startToken);}function parseFunctionExpression(){var token,id=null,stricted,firstRestricted,message,tmp,params=[],body,previousStrict,startToken;startToken=lookahead;expectKeyword('function');if(!match('(')){token=lookahead;id=parseVariableIdentifier();if(strict){if(isRestrictedWord(token.value)){throwErrorTolerant(token,Messages.StrictFunctionName);}}else{if(isRestrictedWord(token.value)){firstRestricted=token;message=Messages.StrictFunctionName;}else if(isStrictModeReservedWord(token.value)){firstRestricted=token;message=Messages.StrictReservedWord;}}}tmp=parseParams(firstRestricted);params=tmp.params;stricted=tmp.stricted;firstRestricted=tmp.firstRestricted;if(tmp.message){message=tmp.message;}previousStrict=strict;body=parseFunctionSourceElements();if(strict&&firstRestricted){throwError(firstRestricted,message);}if(strict&&stricted){throwErrorTolerant(stricted,message);}strict=previousStrict;return delegate.markEnd(delegate.createFunctionExpression(id,params,[],body),startToken);}// 14 Program
function parseSourceElement(){if(lookahead.type===Token.Keyword){switch(lookahead.value){case'const':case'let':return parseConstLetDeclaration(lookahead.value);case'function':return parseFunctionDeclaration();default:return parseStatement();}}if(lookahead.type!==Token.EOF){return parseStatement();}}function parseSourceElements(){var sourceElement,sourceElements=[],token,directive,firstRestricted;while(index<length){token=lookahead;if(token.type!==Token.StringLiteral){break;}sourceElement=parseSourceElement();sourceElements.push(sourceElement);if(sourceElement.expression.type!==Syntax.Literal){// this is not directive
break;}directive=source.slice(token.start+1,token.end-1);if(directive==='use strict'){strict=true;if(firstRestricted){throwErrorTolerant(firstRestricted,Messages.StrictOctalLiteral);}}else{if(!firstRestricted&&token.octal){firstRestricted=token;}}}while(index<length){sourceElement=parseSourceElement();/* istanbul ignore if */if(typeof sourceElement==='undefined'){break;}sourceElements.push(sourceElement);}return sourceElements;}function parseProgram(){var body,startToken;skipComment();peek();startToken=lookahead;strict=false;body=parseSourceElements();return delegate.markEnd(delegate.createProgram(body),startToken);}function filterTokenLocation(){var i,entry,token,tokens=[];for(i=0;i<extra.tokens.length;++i){entry=extra.tokens[i];token={type:entry.type,value:entry.value};if(extra.range){token.range=entry.range;}if(extra.loc){token.loc=entry.loc;}tokens.push(token);}extra.tokens=tokens;}function tokenize(code,options){var toString,token,tokens;toString=String;if(typeof code!=='string'&&!(code instanceof String)){code=toString(code);}delegate=SyntaxTreeDelegate;source=code;index=0;lineNumber=source.length>0?1:0;lineStart=0;length=source.length;lookahead=null;state={allowIn:true,labelSet:{},inFunctionBody:false,inIteration:false,inSwitch:false,lastCommentStart:-1};extra={};// Options matching.
options=options||{};// Of course we collect tokens here.
options.tokens=true;extra.tokens=[];extra.tokenize=true;// The following two fields are necessary to compute the Regex tokens.
extra.openParenToken=-1;extra.openCurlyToken=-1;extra.range=typeof options.range==='boolean'&&options.range;extra.loc=typeof options.loc==='boolean'&&options.loc;if(typeof options.comment==='boolean'&&options.comment){extra.comments=[];}if(typeof options.tolerant==='boolean'&&options.tolerant){extra.errors=[];}try{peek();if(lookahead.type===Token.EOF){return extra.tokens;}token=lex();while(lookahead.type!==Token.EOF){try{token=lex();}catch(lexError){token=lookahead;if(extra.errors){extra.errors.push(lexError);// We have to break on the first error
// to avoid infinite loops.
break;}else{throw lexError;}}}filterTokenLocation();tokens=extra.tokens;if(typeof extra.comments!=='undefined'){tokens.comments=extra.comments;}if(typeof extra.errors!=='undefined'){tokens.errors=extra.errors;}}catch(e){throw e;}finally{extra={};}return tokens;}function parse(code,options){var program,toString;toString=String;if(typeof code!=='string'&&!(code instanceof String)){code=toString(code);}delegate=SyntaxTreeDelegate;source=code;index=0;lineNumber=source.length>0?1:0;lineStart=0;length=source.length;lookahead=null;state={allowIn:true,labelSet:{},inFunctionBody:false,inIteration:false,inSwitch:false,lastCommentStart:-1};extra={};if(typeof options!=='undefined'){extra.range=typeof options.range==='boolean'&&options.range;extra.loc=typeof options.loc==='boolean'&&options.loc;extra.attachComment=typeof options.attachComment==='boolean'&&options.attachComment;if(extra.loc&&options.source!==null&&options.source!==undefined){extra.source=toString(options.source);}if(typeof options.tokens==='boolean'&&options.tokens){extra.tokens=[];}if(typeof options.comment==='boolean'&&options.comment){extra.comments=[];}if(typeof options.tolerant==='boolean'&&options.tolerant){extra.errors=[];}if(extra.attachComment){extra.range=true;extra.comments=[];extra.bottomRightStack=[];extra.trailingComments=[];extra.leadingComments=[];}}try{program=parseProgram();if(typeof extra.comments!=='undefined'){program.comments=extra.comments;}if(typeof extra.tokens!=='undefined'){filterTokenLocation();program.tokens=extra.tokens;}if(typeof extra.errors!=='undefined'){program.errors=extra.errors;}}catch(e){throw e;}finally{extra={};}return program;}// Sync with *.json manifests.
exports.version='1.2.5';exports.tokenize=tokenize;exports.parse=parse;// Deep copy.
/* istanbul ignore next */exports.Syntax=function(){var name,types={};if(typeof Object.create==='function'){types=Object.create(null);}for(name in Syntax){if(Syntax.hasOwnProperty(name)){types[name]=Syntax[name];}}if(typeof Object.freeze==='function'){Object.freeze(types);}return types;}();});/* vim: set sw=4 ts=4 et tw=80 : */});var esprima$1 = interopDefault(esprima);

var require$$1$3 = Object.freeze({
  default: esprima$1
});

var index$2 = createCommonjsModule(function (module) {
  "use strict";

  var esprima = interopDefault(require$$1$3);
  var uniq = interopDefault(require$$0$5);

  var PREFIX_COUNTER = 0;

  function CompiledArgument(name, lvalue, rvalue) {
    this.name = name;
    this.lvalue = lvalue;
    this.rvalue = rvalue;
    this.count = 0;
  }

  function CompiledRoutine(body, args, thisVars, localVars) {
    this.body = body;
    this.args = args;
    this.thisVars = thisVars;
    this.localVars = localVars;
  }

  function isGlobal(identifier) {
    if (identifier === "eval") {
      throw new Error("cwise-parser: eval() not allowed");
    }
    if (typeof window !== "undefined") {
      return identifier in window;
    } else if (typeof commonjsGlobal !== "undefined") {
      return identifier in commonjsGlobal;
    } else if (typeof self !== "undefined") {
      return identifier in self;
    } else {
      return false;
    }
  }

  function getArgNames(ast) {
    var params = ast.body[0].expression.callee.params;
    var names = new Array(params.length);
    for (var i = 0; i < params.length; ++i) {
      names[i] = params[i].name;
    }
    return names;
  }

  function preprocess(func) {
    var src = ["(", func, ")()"].join("");
    var ast = esprima.parse(src, { range: true });

    //Compute new prefix
    var prefix = "_inline_" + PREFIX_COUNTER++ + "_";

    //Parse out arguments
    var argNames = getArgNames(ast);
    var compiledArgs = new Array(argNames.length);
    for (var i = 0; i < argNames.length; ++i) {
      compiledArgs[i] = new CompiledArgument([prefix, "arg", i, "_"].join(""), false, false);
    }

    //Create temporary data structure for source rewriting
    var exploded = new Array(src.length);
    for (var i = 0, n = src.length; i < n; ++i) {
      exploded[i] = src.charAt(i);
    }

    //Local variables
    var localVars = [];
    var thisVars = [];
    var computedThis = false;

    //Retrieves a local variable
    function createLocal(id) {
      var nstr = prefix + id.replace(/\_/g, "__");
      localVars.push(nstr);
      return nstr;
    }

    //Creates a this variable
    function createThisVar(id) {
      var nstr = "this_" + id.replace(/\_/g, "__");
      thisVars.push(nstr);
      return nstr;
    }

    //Rewrites an ast node
    function rewrite(node, nstr) {
      var lo = node.range[0],
          hi = node.range[1];
      for (var i = lo + 1; i < hi; ++i) {
        exploded[i] = "";
      }
      exploded[lo] = nstr;
    }

    //Remove any underscores
    function escapeString(str) {
      return "'" + str.replace(/\_/g, "\\_").replace(/\'/g, "\'") + "'";
    }

    //Returns the source of an identifier
    function source(node) {
      return exploded.slice(node.range[0], node.range[1]).join("");
    }

    //Computes the usage of a node
    var LVALUE = 1;
    var RVALUE = 2;
    function getUsage(node) {
      if (node.parent.type === "AssignmentExpression") {
        if (node.parent.left === node) {
          if (node.parent.operator === "=") {
            return LVALUE;
          }
          return LVALUE | RVALUE;
        }
      }
      if (node.parent.type === "UpdateExpression") {
        return LVALUE | RVALUE;
      }
      return RVALUE;
    }

    //Handle visiting a node
    (function visit(node, parent) {
      node.parent = parent;
      if (node.type === "MemberExpression") {
        //Handle member expression
        if (node.computed) {
          visit(node.object, node);
          visit(node.property, node);
        } else if (node.object.type === "ThisExpression") {
          rewrite(node, createThisVar(node.property.name));
        } else {
          visit(node.object, node);
        }
      } else if (node.type === "ThisExpression") {
        throw new Error("cwise-parser: Computed this is not allowed");
      } else if (node.type === "Identifier") {
        //Handle identifier
        var name = node.name;
        var argNo = argNames.indexOf(name);
        if (argNo >= 0) {
          var carg = compiledArgs[argNo];
          var usage = getUsage(node);
          if (usage & LVALUE) {
            carg.lvalue = true;
          }
          if (usage & RVALUE) {
            carg.rvalue = true;
          }
          ++carg.count;
          rewrite(node, carg.name);
        } else if (isGlobal(name)) {
          //Don't rewrite globals
        } else {
          rewrite(node, createLocal(name));
        }
      } else if (node.type === "Literal") {
        if (typeof node.value === "string") {
          rewrite(node, escapeString(node.value));
        }
      } else if (node.type === "WithStatement") {
        throw new Error("cwise-parser: with() statements not allowed");
      } else {
        //Visit all children
        var keys = Object.keys(node);
        for (var i = 0, n = keys.length; i < n; ++i) {
          if (keys[i] === "parent") {
            continue;
          }
          var value = node[keys[i]];
          if (value) {
            if (value instanceof Array) {
              for (var j = 0; j < value.length; ++j) {
                if (value[j] && typeof value[j].type === "string") {
                  visit(value[j], node);
                }
              }
            } else if (typeof value.type === "string") {
              visit(value, node);
            }
          }
        }
      }
    })(ast.body[0].expression.callee.body, undefined);

    //Remove duplicate variables
    uniq(localVars);
    uniq(thisVars);

    //Return body
    var routine = new CompiledRoutine(source(ast.body[0].expression.callee.body), compiledArgs, thisVars, localVars);
    return routine;
  }

  module.exports = preprocess;
});

var index$3 = interopDefault(index$2);

var require$$1$2 = Object.freeze({
  default: index$3
});

var cwiseEsprima = createCommonjsModule(function (module) {
  "use strict";

  var parse = interopDefault(require$$1$2);
  var compile = interopDefault(require$$0$2);

  var REQUIRED_FIELDS = ["args", "body"];
  var OPTIONAL_FIELDS = ["pre", "post", "printCode", "funcName", "blockSize"];

  function createCWise(user_args) {
    //Check parameters
    for (var id in user_args) {
      if (REQUIRED_FIELDS.indexOf(id) < 0 && OPTIONAL_FIELDS.indexOf(id) < 0) {
        console.warn("cwise: Unknown argument '" + id + "' passed to expression compiler");
      }
    }
    for (var i = 0; i < REQUIRED_FIELDS.length; ++i) {
      if (!user_args[REQUIRED_FIELDS[i]]) {
        throw new Error("cwise: Missing argument: " + REQUIRED_FIELDS[i]);
      }
    }

    //Parse blocks
    return compile({
      args: user_args.args,
      pre: parse(user_args.pre || function () {}),
      body: parse(user_args.body),
      post: parse(user_args.post || function () {}),
      debug: !!user_args.printCode,
      funcName: user_args.funcName || user_args.body.name || "cwise",
      blockSize: user_args.blockSize || 64
    });
  }

  module.exports = createCWise;
});

var cwiseEsprima$1 = interopDefault(cwiseEsprima);

var require$$0$8 = Object.freeze({
  default: cwiseEsprima$1
});

var unpack = createCommonjsModule(function (module) {
  "use strict";

  var dup = interopDefault(require$$1$1);
  var cwise = interopDefault(require$$0$8);

  var do_unpack = cwise({
    args: ["array", "scalar", "index"],
    body: function unpackCwise(arr, a, idx) {
      var v = a,
          i;
      for (i = 0; i < idx.length - 1; ++i) {
        v = v[idx[i]];
      }
      v[idx[idx.length - 1]] = arr;
    }
  });

  module.exports = function unpack(arr) {
    var result = dup(arr.shape);
    do_unpack(arr, result);
    return result;
  };
});

var unpack$1 = interopDefault(unpack);

function ndarrayToNative(x) {
  return unpack$1(x);
}
function ndarrayColsToNative(x) {
  return unpack$1(x.transpose(1, 0));
}

function sampleSphericalCap(params) {
  params = params == null ? { N: 1, z: 0 } : params;

  var π = Math.PI;
  var π2 = 2 * π;
  var radPerDeg = π / 180;

  var minZ = params.z ? +params.z : params.deg ? Math.cos(+params.deg * radPerDeg) : params.rad ? Math.cos(+params.rad) : 0;
  var N = params.N ? +params.N : 1;
  return pack(Array.from({ length: N }, function (_) {
    var z = Math.random() * (1 - minZ) + minZ;
    var r = Math.sqrt(1 - z * z);
    var θ = Math.random() * π2;
    var x = r * Math.cos(θ);
    var y = r * Math.sin(θ);
    return [x, y, z];
  })).transpose(1, 0);
}

function asNdarray(x) {
  return x.data ? x : pack(x);
}

function sampleDirectedSphericalCap(direction) {
  var normDir = normalizeCols(asNdarray(direction));
  var rotAxis = normalizeCols(dot(crossMatrix(0, 0, 1), normDir));
  var rotAngle = Math.acos(dot(ndarray$1([0, 0, 1], [1, 3]), normDir).get(0, 0));
  var R = axisAngleToRotationMatrix(rotAxis, rotAngle);

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var samples = sampleSphericalCap.apply(undefined, args);

  return dot(R, samples);
}

function axisAngleToRotationMatrix(axis, angleRad) {
  var C = crossMatrix.apply(undefined, toConsumableArray(ndToIterator(axis)));
  mulseq(C, Math.sin(angleRad));

  var R = zeros$1([3, 3]);
  assigns(diagonal(R), Math.cos(angleRad));

  addeq(R, C);

  gemm$1(R, axis, axis.transpose(1, 0), 1 - Math.cos(angleRad), 1);

  return R;
}

function crossMatrix(x, y, z) {
  return pack([[0, -z, y], //
  [z, 0, -x], //
  [-y, x, 0]]);
}

function dot() {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return args.reduce(function (sofar, curr) {
    var result = zeros$1([sofar.shape[0], curr.shape[1]]);
    gemm$1(result, sofar, curr);
    return result;
  });
}

function ndToIterator(x) {
  return x.data || x;
}

// Can https://github.com/scijs/cwise#compute-2d-vector-norms-using-blocks be
// used here?
function normalizeCols(x) {
  for (var i = 0; i < x.shape[1]; i++) {
    var col = x.pick(null, i);
    var norm = norm2(col);
    if (norm > 0) {
      divseq(col, norm);
    }
  }
  return x;
}

function normalizeColsPure(x) {
  var y = zeros$1(x.shape);
  for (var i = 0; i < x.shape[1]; i++) {
    var col = x.pick(null, i);
    var norm = norm2(col);
    if (norm > 0) {
      divs(y.pick(null, i), col, norm);
    }
  }
  return y;
}

function example1() {
  return random(ndarray$1([1, 2, 3, 4], [2, 2]));
}

function example2() {
  var a = random(zeros$1([2, 2]));
  var b = ndarray$1([100, 200, 300, 400], [2, 2]);
  var c = zeros$1([2, 2]);
  add(c, a, b);
  return c;
}

exports.sampleSphericalCap = sampleSphericalCap;
exports.sampleDirectedSphericalCap = sampleDirectedSphericalCap;
exports.axisAngleToRotationMatrix = axisAngleToRotationMatrix;
exports.normalizeCols = normalizeCols;
exports.normalizeColsPure = normalizeColsPure;
exports.crossMatrix = crossMatrix;
exports.ndToIterator = ndToIterator;
exports.dot = dot;
exports.ndarrayColsToNative = ndarrayColsToNative;
exports.ndarrayToNative = ndarrayToNative;
exports.asNdarray = asNdarray;
exports.example1 = example1;
exports.example2 = example2;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=cap-random.js.map
