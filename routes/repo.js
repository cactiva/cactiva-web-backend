"use strict";
const fs = require("fs");
const path = require("path");
const process = require("process");
const repo = require("../repo.json");
const multer = require("fastify-multer");
const uploadPath = path.resolve(
  repo.mode === "local" ? "../repo" : path.dirname(process.execPath) + repo.root
);
const FORBIDDEN = 403,
  OK = 200;
const repoFolder = repo.folder;

module.exports = async function(fastify, opts) {
  fastify.post("/api/repo/upload", async function(req, res) {
    req.jwtVerify();
    if (!req.user) {
      return res.code(FORBIDDEN).send({ error: "Unauthorized!" });
    }
    try {
      const fileFilter = (req, file, cb) => {
        const { path } = req.body;
        const { mimetype, originalname } = file;
        const extFile = mimetype.split("/");
        const { role } = req.user;
        if (!path || Object.keys(repoFolder).indexOf(path) === -1) {
          cb(
            new Error(
              `Upload '${originalname}' in folder '${path}' is denied!`
            ),
            false
          );
        } else if (!role || repoFolder[path].role.indexOf(role) === -1) {
          cb(new Error(`User role not allowed to upload file!`), false);
        } else if (
          repoFolder[path].fileType.indexOf(extFile[extFile.length - 1]) === -1
        ) {
          cb(
            new Error(`Upload '${originalname}' not allowed file type!`),
            false
          );
        } else {
          cb(null, true);
        }
      };
      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          const { path } = req.body;
          const dir = uploadPath + "/" + path;
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        }
      });
      const upload = multer({
        storage,
        fileFilter
      });
      const uploadHandler = upload.single("file");
      uploadHandler(req, res, e => {
        if (e) {
          return res.code(FORBIDDEN).send({ error: e.message });
        } else {
          const path = req.body.path;
          const file = req.file;
          const maxSize = repoFolder[path].maxSize;
          if (file.size > maxSize) {
            res.code(FORBIDDEN).send({
              error: `Upload failed, max file size is ${maxSize / 1048576}Mb`
            });
            return fs.unlinkSync(file.path);
          }
          return res.code(OK).send(file);
        }
      });
    } catch (e) {
      return res.code(FORBIDDEN).send({ error: e });
    }
  });

  fastify.post("/api/repo/delete", async function(req, res) {
    req.jwtVerify();
    if (!req.user) {
      return res.code(FORBIDDEN).send({ error: "Unauthorized!" });
    }
    const { folder, filename } = req.body;
    if (!folder || !filename)
      return res.code(FORBIDDEN).send({ error: "Not found!" });
    try {
      const { role } = req.user;
      const dir = uploadPath + "/" + path;

      if (
        Object.keys(repoFolder).indexOf(folder) === -1 ||
        !fs.existsSync(dir)
      ) {
        return res.code(FORBIDDEN).send({ error: "Not found!" });
      } else if (repoFolder[folder].role.indexOf(role) === -1) {
        return res.code(FORBIDDEN).send({ error: "Unauthorize!" });
      }
      fs.unlinkSync(dir);
      return res.code(OK).send(`Delete ${folder}/${filename} success!`);
    } catch (e) {
      return res.code(FORBIDDEN).send({ error: e });
    }
  });

  fastify.get("/api/repo/tree/:folder", async function(req, res) {
    req.jwtVerify();
    if (!req.user) {
      return res.code(FORBIDDEN).send({ error: "Unauthorized!" });
    }
    const { folder } = req.params;
    if (!folder) return res.code(FORBIDDEN).send({ error: "Not found!" });
    const { role } = req.user;
    if (Object.keys(repoFolder).indexOf(folder) === -1) {
      return res.code(FORBIDDEN).send({ error: "Not found!" });
    } else if (repoFolder[folder].role.indexOf(role) === -1) {
      return res.code(FORBIDDEN).send({ error: "Unauthorize!" });
    }
    const tree = jetpack.inspectTree(`${uploadPath}/${folder}`, {
      relativePath: true
    });
    return res.code(200).send(tree);
  });

  fastify.get("/api/repo/view/:folder/:filename", async function(req, res) {
    req.jwtVerify();
    if (!req.user) {
      return res.code(FORBIDDEN).send({ error: "Unauthorized!" });
    }
    const { folder, filename } = req.params;
    if (!folder || !filename)
      return res.code(FORBIDDEN).send({ error: "Not found!" });
    const { role } = req.user;

    if (Object.keys(repoFolder).indexOf(folder) === -1) {
      return res.code(FORBIDDEN).send({ error: "Not found!" });
    } else if (
      repoFolder[folder].permission === "private" &&
      repoFolder[folder].role.length > 0
    ) {
      if (repoFolder[folder].role.indexOf(role) === -1) {
        return res.code(FORBIDDEN).send({ error: "Unauthorize!" });
      }
    }
    const filepath = `${uploadPath}/${folder}/${filename}`;
    if (fs.existsSync(filepath)) {
      const stream = fs.createReadStream(filepath);
      return res.code(OK).send(stream);
    }
    return res.code(FORBIDDEN).send({ error: "Not found!" });
  });
};
