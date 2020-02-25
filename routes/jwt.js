"use strict";
const db = require("../db");
const Password = require("node-php-password");

module.exports = async function(fastify, opts) {
  fastify.post("/api/jwt/login", async function(req, reply) {
    const users = await db.any(
      `
            SELECT u.*, r.id as role_id, r.role_name, r.role_description, r.repo_path 
                FROM public.p_user u 
                JOIN public.p_user_role ur ON u.id = ur.user_id 
                JOIN public.p_role r ON r.id = ur.role_id 
                WHERE username like $1
            `,
      [req.body.username]
    );
    if (users.length > 0) {
      if (Password.verify(req.body.password, users[0].password)) {
        const u = users[0];
        delete u.password;
        const token = fastify.jwt.sign({
          ...u,
          role: u.role_name,
          time: new Date().toString(),
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["admin"],
            "x-hasura-default-role": "admin",
            "x-hasura-user-id": u.id.toString()
          }
        });
        reply.send({ jwt: token, user: u });
        return;
      }
    }

    reply.code(403).send({
      reason: "Username and/or password does not found"
    });
  });

  fastify.post("/api/jwt/verify", async function(req, reply) {
    const token = req.headers.authorization.substr(7);
    fastify.jwt.verify(token, (err, decoded) => {
      if (err) {
        reply.code(403).send(err);
        fastify.log.error(err);
      } else reply.send(decoded);
    });
  });
};
