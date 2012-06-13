var WATCHED_FILES = {}, 
    SKIP_COMPILE = false, 
    argv, 
    compileIfNeeded, 
    compileLessScript, 
    findLessFiles, 
    findFiles, 
    compileIfNeeded, 
    runCompiler, 
    startPolling, 
    checkCompile, 
    buildCommand,
    buildRTLCommand,
    buildRTLPath,
    execute = require('child_process').exec,
    fs = require('fs'),
    usage = "Watch a directory and recompile .less styles if they change.\nUsage: less-watcher -p [prefix] -d [directory].",
    specs = require('optimist').usage(usage)
        ["default"]('d', '.').describe('d', 'Specify which directory to scan.')
        ['default']('f', 'static/less/default/standard.less').describe('f', 'The file for less/r2 compression')
        ['default']('o', 'static/css/standard.css').describe('o', 'The output file standard css')
        ['default']('s', 'rtl').describe('s', 'The suffix for rtl file will append - to begining')
        ['default']('i', 1000).describe('i', 'Interval for polling')
        .boolean('h')
        .describe('h', 'Prints help');

//Show help or set argv -> optimist make this easy
if (specs.parse(process.argv).h) {
    specs.showHelp();
    process.exit();
} else {
    argv = specs.argv;
}

findFiles = function(fileext, dir, fnCompile) {
  return execute("find " + dir + " -name '" + fileext + "' -print", function(error, stdout, stderr) {
    var file, _i, _len, _ref, _results;
    _ref = stdout.split('\n');
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      file = _ref[_i];
      _results.push(file ? fnCompile(file) : void 0);
    }
    return _results;
  });
};

compileIfNeeded = function(watched_files, file) {
  /* Checks the watched */
  return fs.stat(file, function(err, stats) {
    var should_compile,
        old_mtime = watched_files[file],
        new_mtime = new Date(stats.mtime);

    //Check dates and set up should_compile
    if (!old_mtime) {
      should_compile = true;
    } else if (new_mtime > old_mtime) {
      should_compile = true;
    } else {
      should_compile = false;
    }
    
    watched_files[file] = new_mtime;
    
    if (should_compile) {
      if (!SKIP_COMPILE) {
        /* Set skip compile to true to so we don't get multiple lessc compressions at once */
        SKIP_COMPILE = true;
        return runCompiler(buildCommand(), buildRTLCommand());
      }
    }
  });
};

runCompiler = function(command, fnNextCompile) {
  return execute(command, function(error, stdout, stderr) {
    if (error !== null) {
      return console.log(error.message);
    } else {
      /* Reset skip compile once the command has run */
      if (fnNextCompile){
        runCompiler(fnNextCompile);
      } else {
        SKIP_COMPILE = false;
        console.log('Executed: ', command);
      }
    }
  });
};

startPolling = function(dir, fnFindFiles) {
  /* Poll the directoy */
  var directoryPoll;
  directoryPoll = function() {
    return fnFindFiles(dir);
  };
  directoryPoll();
  return setInterval(directoryPoll, argv.i);
};

findLessFiles = function(dir) {
    return findFiles('*.less', dir, checkCompile);
};

checkCompile = function(file) {
    return compileIfNeeded(WATCHED_FILES, file);
};

buildCommand = function() {
    return "lessc " + argv.f + " " + argv.o;
}

buildRTLCommand = function() {
    return "r2 " + argv.o + " " + buildRTLPath();
}

buildRTLPath = function() {
    return argv.o.replace(".css", "-" + argv.s + ".css");
}

process.on('SIGINT', function () {
  process.exit(0);
});

console.log('Watching directory: ', argv.d);
console.log('Compiling file: ', argv.f);
console.log('Compiling to: ', argv.o);

startPolling(argv.d, findLessFiles);

