"use strict";

const fp = require("fastify-plugin");

module.exports = fp(function(fastify, opts, next) {
  fastify.register(require("fastify-cors"), {
    // put your options here
  });

  fastify.register(require("fastify-jwt"), {
    secret: "26CI1VZVB8OICUWQI2QTSUYR03ZRTBZ4RX81RJF3"
  });

  // fastify.decorate('someSupport', function () {
  //   return 'hugs'
  // })
  next();
});
