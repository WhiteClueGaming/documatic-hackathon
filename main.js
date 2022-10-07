const EventEmitter = require("events");
const express = require("express");
const app = express();
var path = require('path');
var fileRouter = require('./index.js');

class App extends EventEmitter {
    constructor(options = {}) {
        super();
        var router = fileRouter.load(path.join(__dirname, options._dir ? options._dir : 'routes'));
        app.use(router);
        module.exports.app = app;
        app.listen(options.port ? options.port : 3000);
        console.log("Listening on port " + options.port ? options.port : 3000);
    }
}

module.exports.App = App;