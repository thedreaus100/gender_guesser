var http = require("http");
var os = require("os");
var cluster = require("cluster");
var domain = require("domain");
var fs = require("fs");
var todoServer = require("./prediction-server");
var async = require("async");
var path = require("path");
var configFile = process.argv[2] || "server-config/default.json";

var INVALID_FORMAT = "Invalid Format";

activate(configFile);

//////////////////////

function activate(configFile) {

    var tasks = {
        config: async.apply(loadConfig, configFile),
        scripts: async.apply(loadScripts, "lua")
    }

    async.parallel(tasks, function(err, results) {
        if (err) console.error(err.stack);
        else {
            spawn(results.config, results.scripts);
        }
    })
}

function loadConfig(configFile, callback) {

    fs.readFile(configFile, {
        encoding: "utf8"
    }, function(err, config) {

        if (err) return new Error("File Not Found");
        try {
            config = JSON.parse(config);
        } catch (parseErr) {
            return callback(new Error(INVALID_FORMAT), null);
        }

        callback(null, config);
    });
}

function loadScripts(dir, callback) {

    fs.readdir(dir, function(err, fileList) {
        async.map(fileList, loadScript, function(err, script_list) {
            var scripts = {};
            script_list.forEach(function(script) {
                scripts[script.name] = script.script;
            });
            callback(null, scripts);
        })
    });

    function loadScript(file, callback) {

        fs.readFile(path.join(dir, file), {
            encoding: "utf8"
        }, function(err, script) {
            if (err) callback(err, null);
            else callback(null, {
                name: file.replace(/(.lua)/g, ""),
                script: script
            });
        })
    }
}

function spawn(config, scripts) {

    if (cluster.isMaster) {

        for (var i = 0; i < os.cpus().length; i++) forkChild();

        cluster.on("disconnect", function(worker) {
            forkChild();
        });

    } else runChildServer(80, config, scripts);
}

//Fork Child Process
function forkChild() {

    var mem = Number(os.freemem() / os.totalmem());
    if (mem > .25) cluster.fork();
    else console.log("memory is too high!");
    //Possibly monitor memory usage to increase and decrease children to keep the system running
}

function runChildServer(port, config, scripts) {

    var server;
    var workerDomain = domain.create()
        .on("error", function(err) {

            try {

                console.error("Something you did crashed the server...thanx \n", err.stack);
                server.close();
                console.log("Disconnecting worker: ", cluster.worker.id);
                if (cluster.worker.isConnected()) cluster.worker.disconnect(); //Add Callback

            } catch (workerErr) {
                console.error("Problem disconnecting worker \n", workerErr.stack);
            }
        })
        .run(function() {
            server = http.createServer(todoServer(config, scripts)).listen(port, '0.0.0.0');
        });
}
