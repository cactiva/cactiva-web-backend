'use strict'
const db = require("../db");

module.exports = async function (fastify, opts) {
    fastify.get('/api/db/structure', async function (req, res) {
        const table = req.query.table;
        if (table) {
            let where = `${table ? `where tc.table_name = '${table}' or ccu.table_name = '${table}'` : ''}`;
            let r = await db.any(`${structureQuery} ${where}`);
            if (r.length === 0) {
                let f = await db.any(funcQuery.replace('__table__', table));
                if (f.length > 0) {
                    const ftable = f[0].return_type;
                    where = `${table ? `where tc.table_name = '${ftable}' or ccu.table_name = '${ftable}'` : ''}`;
                    r = await (await db.any(`${structureQuery} ${where}`)).map(e => {
                        e.alias = table;
                        return e;
                    });
                }
            }
            res.send(r);
        } else {
            res.send('Please provide a table in query');
        }
    })

    fastify.get('/api/db/columns', async function (req, res) {
        const table = req.query.table;
        if (table) {
            let r = await db.any(`${columnsQuery.replace('__table__', table)}`);
            if (r.length === 0) {
                let f = await db.any(funcQuery.replace('__table__', table));
                if (f.length > 0) {
                    const ftable = f[0].return_type;
                    r = await db.any(`${columnsQuery.replace('__table__', ftable)}`);
                }
            }
            res.send(r);
        } else {
            res.send('Please provide a table in query');
        }
    })
}

const funcQuery = `
SELECT  proname, proargnames as arguments,
        oidvectortypes(proargtypes) as arguments_type, 
        t.typname as return_type,prosrc as source
FROM    pg_catalog.pg_namespace n
JOIN    pg_catalog.pg_proc p   ON    pronamespace = n.oid     
JOIN    pg_type t ON p.prorettype = t.oid  
WHERE    proname = '__table__'`

const columnsQuery = `
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name   = '__table__'
     ;`

const structureQuery = `
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
`