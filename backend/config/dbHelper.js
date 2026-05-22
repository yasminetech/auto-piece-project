const pool = require('./database');

/**
 * Execute a query with parameters
 * @param {string} query - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(sql, params = []) {
  validateParams(params);
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
}

/**
 * Execute a query that returns a single row
 * @param {string} sql - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise} Single row result
 */
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an insert query
 * @param {string} sql - SQL insert query
 * @param {array} params - Query parameters
 * @returns {Promise} Insert result with insertId
 */
async function insert(sql, params = []) {
  validateParams(params);
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * Execute an update query
 * @param {string} sql - SQL update query
 * @param {array} params - Query parameters
 * @returns {Promise} Update result with affectedRows
 */
async function update(sql, params = []) {
  validateParams(params);
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * Execute a delete query
 * @param {string} sql - SQL delete query
 * @param {array} params - Query parameters
 * @returns {Promise} Delete result with affectedRows
 */
async function deleteQuery(sql, params = []) {
  validateParams(params);
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

function validateParams(params) {
  const index = params.findIndex((param) => param === undefined);
  if (index !== -1) {
    throw new Error(`SQL parameter at index ${index} is undefined`);
  }
}

module.exports = {
  query,
  queryOne,
  insert,
  update,
  deleteQuery,
  pool
};
