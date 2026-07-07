/**
 * Alphanaut feedback backend — Google Apps Script web app.
 *
 * Receives bug reports from the hidden feedback tool in the web-flasher and
 * appends one row per report to the bound Google Sheet.
 *
 * DEPLOY (Apps Script editor → Deploy → New deployment → Web app):
 *   - Execute as:      Me
 *   - Who has access:  Anyone
 * Copy the /exec URL into the web-flasher env var FEEDBACK_WEBHOOK_URL.
 *
 * OPTIONAL anti-spam token:
 *   Project Settings → Script Properties → add SHARED_TOKEN = <secret>.
 *   Set the same value in the web-flasher env var FEEDBACK_TOKEN. If the
 *   property is absent, the token check is skipped.
 *
 * The client POSTs Content-Type: text/plain (a CORS "simple request", so no
 * preflight — Apps Script has no doOptions). The body is JSON; we JSON.parse it.
 */

var SHEET_NAME = 'feedback';
var MAX_CELL = 45000; // stay under Sheets' ~50,000 char/cell limit
var DEDUPE_LOOKBACK = 250; // scan the last N submissionIds for idempotency
var MIN_SCHEMA = 1;
var SUBMISSION_ID_COL_INDEX = 3; // 1-based column of 'submissionId' — keep in sync with COLUMNS

// Fixed column order. The header row equals these keys; order is load-bearing.
var COLUMNS = [
  'serverReceivedAt', 'submittedAt', 'submissionId', 'schemaVersion',
  'firmware.id', 'firmware.version', 'firmware.isPrBuild', 'firmware.prNumber',
  'device.platformioTarget', 'device.displayName',
  'report.handle', 'report.contact', 'report.rating', 'report.whatHappened',
  'report.expectedBehavior', 'report.reproSteps', 'report.appPlatform',
  'report.appVersion', 'report.otherInfo',
  'logs.serialLog', 'logs.appLogs',
  'rawJson' // hidden — full JSON for forward-compat / debugging
];

var NUMERIC_COLS = { 'schemaVersion': 1, 'firmware.prNumber': 1, 'report.rating': 1 };
var BOOLEAN_COLS = { 'firmware.isPrBuild': 1 };

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonOut({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'empty-body' });
    }

    var raw = e.postData.contents;
    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      return jsonOut({ ok: false, error: 'invalid-json' });
    }

    // Optional shared-secret gate (only enforced when the property exists).
    var expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');
    if (expected && String(payload.token || '') !== expected) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }

    var schema = Number(payload.schemaVersion || 0);
    if (!schema || schema < MIN_SCHEMA) {
      return jsonOut({ ok: false, error: 'unsupported-schema' });
    }

    // Required fields (whitelist means any extras are ignored, not stored).
    if (!getByPath(payload, 'device.platformioTarget')) {
      return jsonOut({ ok: false, error: 'missing device.platformioTarget' });
    }
    if (!getByPath(payload, 'report.handle') || !getByPath(payload, 'report.whatHappened')) {
      return jsonOut({ ok: false, error: 'missing required report fields' });
    }

    var sheet = getSheet();
    ensureHeader(sheet);

    // Idempotent dedupe by submissionId over the tail of the sheet.
    var subId = String(payload.submissionId || '');
    if (subId) {
      var hit = findExistingRow(sheet, subId);
      if (hit > 0) return jsonOut({ ok: true, row: hit, deduped: true });
    }

    var row = COLUMNS.map(function (col) {
      if (col === 'serverReceivedAt') return new Date();
      if (col === 'rawJson') return truncate(raw, MAX_CELL);
      return coerce(col, getByPath(payload, col));
    });

    sheet.appendRow(row);
    return jsonOut({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonOut({ ok: true, service: 'alphanaut-feedback', schema: MIN_SCHEMA, ts: new Date().toISOString() });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  return sh;
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() >= 1) {
    var first = sheet.getRange(1, 1).getValue();
    if (first === COLUMNS[0]) return; // header already current
  }
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  sheet.setFrozenRows(1);
  sheet.hideColumns(COLUMNS.length); // hide trailing rawJson column
}

// Scan only the tail of the submissionId column to keep dedupe O(N).
function findExistingRow(sheet, subId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var start = Math.max(2, last - DEDUPE_LOOKBACK + 1);
  var count = last - start + 1;
  var ids = sheet.getRange(start, SUBMISSION_ID_COL_INDEX, count, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === subId) return start + i;
  }
  return 0;
}

function getByPath(obj, path) {
  var parts = path.split('.');
  var cur = obj;
  for (var i = 0; i < parts.length; i++) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = cur[parts[i]];
  }
  return (cur === undefined || cur === null) ? '' : cur;
}

function coerce(col, v) {
  if (v === '' || v === null || v === undefined) return '';
  if (NUMERIC_COLS[col]) {
    var n = Number(v);
    return isNaN(n) ? '' : n;
  }
  if (BOOLEAN_COLS[col]) return (v === true || v === 'true');
  return truncate(String(v), MAX_CELL);
}

function truncate(s, max) {
  if (typeof s !== 'string') s = String(s);
  return s.length > max ? (s.slice(0, max) + '…[truncated ' + (s.length - max) + ' chars]') : s;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
