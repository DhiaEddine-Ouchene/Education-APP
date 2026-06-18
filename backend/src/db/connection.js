const alasql = require('alasql');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'edumatch.json');

const TABLE_NAMES = ['organizations', 'users', 'word_sets', 'words', 'courses', 'student_progress'];

// Helper to save current in-memory database to file
function saveDb() {
  try {
    const exportData = {};
    TABLE_NAMES.forEach(tableName => {
      exportData[tableName] = alasql.tables[tableName] ? (alasql.tables[tableName].data || []) : [];
    });
    fs.writeFileSync(dbPath, JSON.stringify(exportData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database file:', err.message);
  }
}

// Create all tables and ensure .data array exists
function createTables() {
  TABLE_NAMES.forEach(name => {
    if (!alasql.tables[name]) {
      alasql(`CREATE TABLE ${name}`);
    }
    if (!Array.isArray(alasql.tables[name].data)) {
      alasql.tables[name].data = [];
    }
  });
}

// Initialize
createTables();

// Load from file if exists
const dbExists = fs.existsSync(dbPath);
if (dbExists) {
  try {
    const fileContent = fs.readFileSync(dbPath, 'utf8');
    const tables = JSON.parse(fileContent);

    Object.keys(tables).forEach(tableName => {
      if (alasql.tables[tableName] && Array.isArray(tables[tableName]) && tables[tableName].length > 0) {
        alasql.tables[tableName].data = tables[tableName];
      }
    });

    const totalRecords = Object.values(tables).reduce((sum, t) => sum + (Array.isArray(t) ? t.length : 0), 0);
    console.log(`Database loaded from edumatch.json (${totalRecords} records).`);
  } catch (err) {
    console.error('Failed to load database file:', err.message);
  }
} else {
  console.log('New database initialized. Run "node src/db/seed.js" to populate demo data.');
  saveDb();
}

// ─── Query Helpers ─────────────────────────────────────────────────────────────

/**
 * Run a SELECT and return all matching rows.
 * Uses alasql for simple WHERE queries.
 */
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const result = alasql(sql, params);
      resolve(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Query error:', err.message, '\nSQL:', sql);
      reject(err);
    }
  });
};

/**
 * Run a SELECT and return the first matching row.
 */
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const result = alasql(sql, params);
      resolve(Array.isArray(result) && result.length > 0 ? result[0] : null);
    } catch (err) {
      console.error('Get error:', err.message, '\nSQL:', sql);
      reject(err);
    }
  });
};

/**
 * Insert a single object into a named table.
 * Uses direct array push — reliable with alasql in-memory tables.
 */
const insert = (tableName, obj) => {
  return new Promise((resolve, reject) => {
    try {
      if (!alasql.tables[tableName]) {
        return reject(new Error(`Table '${tableName}' could not be found`));
      }
      if (!Array.isArray(alasql.tables[tableName].data)) {
        alasql.tables[tableName].data = [];
      }
      alasql.tables[tableName].data.push(obj);
      saveDb();
      resolve({ changes: 1 });
    } catch (err) {
      console.error('Insert error:', err.message);
      reject(err);
    }
  });
};

/**
 * Legacy run() shim — parses "INSERT INTO tableName VALUES ?" 
 * and delegates to insert(), or runs sql directly for UPDATE/DELETE.
 */
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      // Detect INSERT pattern
      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s+VALUES\s+\?/i);
      if (insertMatch) {
        const tableName = insertMatch[1];
        const obj = params[0];
        insert(tableName, obj).then(resolve).catch(reject);
        return;
      }
      // Otherwise run as raw alasql
      const result = alasql(sql, params);
      saveDb();
      resolve({ changes: result || 0 });
    } catch (err) {
      console.error('Run error:', err.message, '\nSQL:', sql);
      reject(err);
    }
  });
};

module.exports = { db: alasql, query, get, run, insert, saveDb };
