const EventEmitter = require("events");
const express = require("express");
const path = require('path');
const fs = require('fs');
const Router = require('express').Router;
const Request = require('./request');
const Response = require('./response');
const rateLimit = require('express-rate-limit');

function LoadFolder(folder, options) {
  options = options || {};
  var router = Router({ mergeParams : true });
  var folderFiles = fs.readdirSync(folder);

  var routerIndex = folderFiles.indexOf('router.js');
  if (routerIndex !== -1) {
    router = require(path.join(folder, 'router.js'))(router);
    folderFiles.splice(routerIndex, 1);
  }

  var routeIndex = folderFiles.indexOf('route.js');
  if (routeIndex !== -1) {
    folderFiles.splice(routeIndex, 1);
  }

  var files = [];
  var folders = [];

  folderFiles.forEach(function(file) {
    var stat = fs.statSync(path.join(folder, file));
    if (stat.isDirectory()) {
      folders.push(file);
    } else if (stat.isFile()) {
      files.push(file);
    }
  });

  files.forEach(function(file) {
    let props = require(`${folder}/${file}`);
    console.info("Router for " + file + " loaded!");
    var method = file.replace('.js', '').toLowerCase();

    if (options.usePromise) {
      if(props.ratelimit) {
        const ratelimit = rateLimit(props.ratelimit);
      router[method]('/', ratelimit, function(req, res, next) {
        var request = new Request({
          method: req.method,
          params: req.params,
          path: req.path,
          query: req.query,
          body: req.body,
          headers: req.headers,
          cookies: req.cookies
        });

        require(path.join(folder, file))(request)
          .then(function(response) {
            res.status(response.responseCode).json(response.data);
          })
          .catch(function(err) {
            next(err);
          });
      });
          } else {
              router[method]('/', function(req, res, next) {
        var request = new Request({
          method: req.method,
          params: req.params,
          path: req.path,
          query: req.query,
          body: req.body,
          headers: req.headers,
          cookies: req.cookies
        });

        require(path.join(folder, file))(request)
          .then(function(response) {
            res.status(response.responseCode).json(response.data);
          })
          .catch(function(err) {
            next(err);
          });
      });
          }
    } else {
        if(props.ratelimit) {
        const ratelimit = rateLimit(props.ratelimit);
      router[method]('/', ratelimit, require(path.join(folder, file)));
            } else {
                router[method]('/', require(path.join(folder, file)));
            }
    }
  });

  var normalFolders = [];
  var paramFolders = [];

  folders.forEach(function(file) {
    if (file.indexOf(':') !== -1) {
      paramFolders.push(file);
    } else {
      normalFolders.push(file);
    }
  });

  normalFolders.concat(paramFolders).forEach(function(file) {
    var routeIndex = folderFiles.indexOf(path.join(path.join(folder, file), 'route.js'));
    if (routeIndex !== -1) {
      folderFiles.splice(routeIndex, 1);
    }

    var route = file;
    if (fs.existsSync(path.join(path.join(folder, file), 'route.js'))) {
      route = require(path.join(path.join(folder, file), 'route.js'))();
    }

    router.use('/' + route, LoadFolder(path.join(folder, file), options));
  });

  return router;
}

module.exports.load = LoadFolder;
module.exports.Request = Request;
module.exports.Response = Response;