'use strict'
const initOptions = {};
const pgp = require("pg-promise")(initOptions);
const config = require("./config");
const db = pgp(config.db);

module.exports = db;