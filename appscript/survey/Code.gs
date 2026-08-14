/**
 * DEF CON 34 Meshtastic survey — submission endpoint.
 *
 * Deploy as a Web App with:
 *   Execute as:      Me
 *   Who has access:  Anyone        <- NOT "Anyone with a Google Account"
 *
 * "Anyone with a Google Account" forces an interactive login that a
 * cross-origin fetch cannot satisfy, and would break the survey's anonymity
 * guarantee. "Anyone" is required and is safe here: this script only ever
 * appends validated rows and never reads anything back out.
 *
 * Required Script Properties (Project Settings -> Script Properties):
 *   SHEET_ID           the target spreadsheet ID
 *   TURNSTILE_SECRET   Cloudflare Turnstile secret key
 *
 * If TURNSTILE_SECRET is absent the bot check is skipped and every response is
 * tagged accordingly — that is the local-development path and must never be
 * the state of the production deployment.
 *
 * Schema.gs is GENERATED. Do not hand-edit it; run
 *   node scripts/gen-appsscript-schema.ts
 * in the web-flasher-events repo and paste the result.
 */

var SHEET_NAME = 'responses'
var CODEBOOK_SHEET_NAME = 'codebook'
var TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Hard cap on the raw request body, applied before any parsing. */
var MAX_PAYLOAD_BYTES = 32768

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function doGet() {
  return jsonOutput({ status: 'ok', service: 'defcon-survey', schemaVersion: SCHEMA_VERSION })
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents
    if (!raw) return jsonError('Empty request body.')
    if (raw.length > MAX_PAYLOAD_BYTES) return jsonError('Payload too large.')

    var payload
    try {
      payload = JSON.parse(raw)
    }
    catch (parseErr) {
      return jsonError('Malformed JSON.')
    }

    var verdict = validateSubmission(payload)
    if (!verdict.ok) return jsonError(verdict.message)

    appendResponse(verdict.answers, payload, verdict.botCheck)
    return jsonOutput({ status: 'ok' })
  }
  catch (err) {
    // Never leak a stack trace to an anonymous caller.
    console.error('doPost failed: ' + (err && err.stack ? err.stack : err))
    return jsonError('Internal error.')
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Full server-side validation. The client enforces all of this too, but the
 * client is attacker-controlled, so nothing here trusts it.
 */
function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object') {
    return fail('Malformed submission.')
  }

  // 1. Honeypot. A real respondent never sees this field.
  if (payload.hp) return fail('Rejected.')

  // 2. Schema version must match exactly. A mismatch means a stale cached page
  //    is posting against a changed question set, which would silently corrupt
  //    the column meanings.
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    return fail('This survey has been updated. Please reload the page and try again.')
  }

  // 3. Fill time. Anything faster than a human can read the questions is junk.
  var duration = payload.durationMs
  if (typeof duration !== 'number' || !isFinite(duration) || duration < 0) {
    return fail('Rejected.')
  }
  if (duration < MIN_FILL_MS) return fail('Rejected.')

  // 4. Bot check.
  //
  // The failure modes need distinct messages. "No token reached the server" and
  // "Cloudflare rejected this token" have entirely different causes — a broken
  // widget versus an expired token versus a misconfigured key — and collapsing
  // them into one string makes the difference invisible from the outside, which
  // is precisely how this became hard to diagnose.
  var botCheck = verifyTurnstile(payload.turnstileToken)
  if (!botCheck.passed) {
    if (botCheck.mode === 'missing-token') {
      return fail('The spam check did not complete. Please reload the page and try again.')
    }
    if (botCheck.mode === 'not-configured') {
      return fail('The spam check is not configured on the server. Please report this.')
    }
    if (botCheck.mode === 'error') {
      return fail('The spam check could not be reached. Please try again in a moment.')
    }
    var codes = (botCheck.codes || []).join(', ')
    return fail('Spam check rejected' + (codes ? ' (' + codes + ')' : '') + '. Please reload the page and try again.')
  }

  // 5. Answers.
  var answers = payload.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return fail('Malformed answers.')
  }

  var questionsById = questionIndex()

  for (var id in answers) {
    if (!Object.prototype.hasOwnProperty.call(answers, id)) continue

    var question = questionsById[id]
    if (!question) return fail('Unknown question: ' + id)

    // The respondent must actually have been shown this question. This is what
    // stops a crafted payload from filling in every branch at once.
    if (!isVisible(question, answers)) {
      return fail('Answer supplied for a question that was not shown: ' + id)
    }

    var problem = validateAnswer(question, answers[id], answers)
    if (problem) return fail(problem)

    // A terminal answer ends the survey on a thank-you screen that has no
    // submit button, so a submission carrying one cannot have come from the
    // real flow. Rejecting keeps the promise that this sheet holds only
    // completed, screened-in responses.
    if (terminalOption(question, answers[id])) {
      return fail('Rejected.')
    }
  }

  // 6. Required questions must be present.
  for (var i = 0; i < QUESTIONS.length; i++) {
    var q = QUESTIONS[i]
    if (!q.required) continue
    if (!isVisible(q, answers)) continue
    if (!isAnswered(answers[q.id])) return fail('Missing required answer: ' + q.id)
  }

  return { ok: true, answers: answers, botCheck: botCheck }
}

/** Validate one answer against its question. Returns an error string or null. */
function validateAnswer(question, value, answers) {
  switch (question.type) {
    case 'single': {
      if (typeof value !== 'string') return question.id + ': expected a single choice.'
      var allowed = allowedCodes(question, answers)
      if (allowed.indexOf(value) === -1) return question.id + ': invalid option "' + value + '".'
      return null
    }

    case 'multi': {
      if (!Array.isArray(value)) return question.id + ': expected a list.'
      if (value.length > (question.options || []).length) return question.id + ': too many selections.'

      var codes = optionCodes(question)
      var seen = {}
      var exclusiveSelected = false

      for (var i = 0; i < value.length; i++) {
        var code = value[i]
        if (typeof code !== 'string') return question.id + ': invalid selection.'
        if (codes.indexOf(code) === -1) return question.id + ': invalid option "' + code + '".'
        if (seen[code]) return question.id + ': duplicate option "' + code + '".'
        seen[code] = true
        if (isExclusive(question, code)) exclusiveSelected = true
      }

      if (exclusiveSelected && value.length > 1) {
        return question.id + ': that option cannot be combined with others.'
      }
      return null
    }

    case 'scale': {
      var spec = question.scale
      if (spec && spec.allowNa && value === 'na') return null
      if (typeof value !== 'number' || value !== Math.floor(value)) {
        return question.id + ': expected a whole number.'
      }
      if (!spec || value < spec.min || value > spec.max) {
        return question.id + ': value out of range.'
      }
      return null
    }

    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') return question.id + ': expected text.'
      if (question.maxLength && value.length > question.maxLength) {
        return question.id + ': answer is too long.'
      }
      return null
    }

    default:
      return question.id + ': unsupported question type.'
  }
}

/**
 * Valid codes for a question, resolving piped options so q_worst_issue can
 * only ever name a problem the respondent actually selected.
 */
function allowedCodes(question, answers) {
  if (!question.pipeFrom) return optionCodes(question)

  var source = questionIndex()[question.pipeFrom]
  var selected = answers[question.pipeFrom]
  if (!source || !source.options || !isArray(selected)) return []

  var out = []
  for (var i = 0; i < source.options.length; i++) {
    var opt = source.options[i]
    if (selected.indexOf(opt.code) !== -1 && !opt.exclusive) out.push(opt.code)
  }
  return out
}

function optionCodes(question) {
  var out = []
  var options = question.options || []
  for (var i = 0; i < options.length; i++) out.push(options[i].code)
  return out
}

/** The terminal screen an answer triggers, or null. Mirrors terminalFor(). */
function terminalOption(question, value) {
  if (question.type !== 'single' || typeof value !== 'string') return null
  var options = question.options || []
  for (var i = 0; i < options.length; i++) {
    if (options[i].code === value && options[i].terminal) return options[i].terminal
  }
  return null
}

function isExclusive(question, code) {
  var options = question.options || []
  for (var i = 0; i < options.length; i++) {
    if (options[i].code === code) return Boolean(options[i].exclusive)
  }
  return false
}

// ---------------------------------------------------------------------------
// Visibility — mirrors evaluateRule() in components/survey/schema.ts
// ---------------------------------------------------------------------------

function isVisible(question, answers) {
  var section = sectionIndex()[question.section]
  if (section && !evaluateRule(section.visibleIf, answers)) return false
  return evaluateRule(question.visibleIf, answers)
}

function evaluateRule(rule, answers) {
  if (!rule) return true

  var i
  if (rule.all) {
    for (i = 0; i < rule.all.length; i++) {
      if (!evaluateRule(rule.all[i], answers)) return false
    }
    return true
  }
  if (rule.any) {
    for (i = 0; i < rule.any.length; i++) {
      if (evaluateRule(rule.any[i], answers)) return true
    }
    return false
  }
  if (rule.not) return !evaluateRule(rule.not, answers)

  var value = answers[rule.q]

  if (rule.answered) return isAnswered(value)
  if (Object.prototype.hasOwnProperty.call(rule, 'eq')) return value === rule.eq
  if (rule.in) return typeof value === 'string' && rule.in.indexOf(value) !== -1
  if (Object.prototype.hasOwnProperty.call(rule, 'includes')) {
    return isArray(value) && value.indexOf(rule.includes) !== -1
  }
  return true
}

function isAnswered(value) {
  if (value === null || value === undefined) return false
  if (isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.replace(/^\s+|\s+$/g, '') !== ''
  return true
}

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]'
}

// ---------------------------------------------------------------------------
// Turnstile
// ---------------------------------------------------------------------------

function verifyTurnstile(token) {
  var properties = PropertiesService.getScriptProperties()
  // Trimmed: a stray space pasted into the property yields invalid-input-secret,
  // which looks identical to a bad token from the outside.
  var secret = (properties.getProperty('TURNSTILE_SECRET') || '').replace(/^\s+|\s+$/g, '')

  if (!secret) {
    // Fail closed. A missing secret in production is a configuration error, and
    // silently accepting everything would let bots through while the rows look
    // no different from real ones. Bypassing requires deliberately setting a
    // second property, so it cannot happen by omission.
    if (properties.getProperty('ALLOW_INSECURE_TURNSTILE_BYPASS') === 'true') {
      console.warn('TURNSTILE_SECRET is not set — bot check bypassed by explicit opt-in.')
      return { passed: true, mode: 'skipped' }
    }
    console.error('TURNSTILE_SECRET is not set; rejecting submission.')
    return { passed: false, mode: 'not-configured' }
  }

  if (!token || typeof token !== 'string') return { passed: false, mode: 'missing-token' }

  try {
    var response = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true,
    })
    var result = JSON.parse(response.getContentText())
    if (result.success !== true) {
      // Cloudflare's error codes are the only way to tell a reused token
      // (timeout-or-duplicate) from a misconfigured key (invalid-input-secret)
      // from a genuine bot. Without them every failure looks the same from the
      // outside, which is exactly how this cost an afternoon.
      console.warn('Turnstile rejected a token: ' + JSON.stringify(result['error-codes'] || []))
    }
    return {
      passed: result.success === true,
      mode: result.success ? 'verified' : 'rejected',
      codes: result['error-codes'] || [],
    }
  }
  catch (err) {
    console.error('Turnstile verification error: ' + err)
    // Fail closed. An outage should stop collection, not silently disable the
    // only bot defence the survey has.
    return { passed: false, mode: 'error' }
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

var SYSTEM_COLUMNS = ['submission_id', 'submitted_at', 'schema_version', 'duration_ms', 'bot_check']

/**
 * Full expected header row: system columns, then for each question its answer
 * column, plus one boolean column per option for multi-selects so the sheet
 * pivots without any string parsing.
 */
function expectedHeaders() {
  var headers = SYSTEM_COLUMNS.slice()

  for (var i = 0; i < QUESTIONS.length; i++) {
    var q = QUESTIONS[i]
    headers.push(q.id)
    if (q.type !== 'multi') continue
    var options = q.options || []
    for (var j = 0; j < options.length; j++) {
      headers.push(q.id + '__' + options[j].code)
    }
  }
  return headers
}

function appendResponse(answers, payload, botCheck) {
  var lock = LockService.getScriptLock()
  // Concurrent appends would otherwise interleave and produce torn rows.
  lock.waitLock(30000)

  try {
    var sheet = getResponsesSheet()
    var headers = ensureHeaders(sheet)

    var values = {}
    values.submission_id = Utilities.getUuid()
    values.submitted_at = Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'")
    values.schema_version = SCHEMA_VERSION
    values.duration_ms = payload.durationMs
    values.bot_check = botCheck.mode

    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i]
      var answer = answers[q.id]
      if (answer === undefined || answer === null) continue

      if (q.type === 'multi') {
        values[q.id] = answer.join(';')
        var options = q.options || []
        for (var j = 0; j < options.length; j++) {
          values[q.id + '__' + options[j].code] = answer.indexOf(options[j].code) !== -1
        }
      }
      else {
        values[q.id] = answer
      }
    }

    var row = []
    for (var k = 0; k < headers.length; k++) {
      var key = headers[k]
      var cell = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : ''
      row.push(sanitizeCell(cell))
    }

    sheet.appendRow(row)
  }
  finally {
    lock.releaseLock()
  }
}

/**
 * Characters that make Sheets treat a cell as a formula.
 *
 * appendRow writes with user-entered semantics, so a free-text answer beginning
 * with any of these would be evaluated rather than stored — spreadsheet formula
 * injection, triggered the moment someone opens the results. Prefixing with an
 * apostrophe forces the value to literal text; Sheets consumes the apostrophe
 * on display, so the stored answer still reads exactly as submitted.
 */
var FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r']

function sanitizeCell(value) {
  if (typeof value !== 'string' || value === '') return value
  return FORMULA_TRIGGERS.indexOf(value.charAt(0)) === -1 ? value : "'" + value
}

function getResponsesSheet() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  if (!sheetId) throw new Error('SHEET_ID script property is not set.')

  var spreadsheet = SpreadsheetApp.openById(sheetId)
  var sheet = spreadsheet.getSheetByName(SHEET_NAME)
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME)
  return sheet
}

/**
 * Reconcile the sheet's header row with the schema.
 *
 * Missing columns are appended at the end rather than inserted, so existing
 * rows keep their meaning when the schema gains a question mid-flight. Column
 * order in the sheet is therefore authoritative, not the schema order.
 */
function ensureHeaders(sheet) {
  var expected = expectedHeaders()
  var lastColumn = sheet.getLastColumn()

  if (sheet.getLastRow() === 0 || lastColumn === 0) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected])
    sheet.setFrozenRows(1)
    return expected
  }

  var current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
  var have = {}
  for (var i = 0; i < current.length; i++) have[current[i]] = true

  var missing = []
  for (var j = 0; j < expected.length; j++) {
    if (!have[expected[j]]) missing.push(expected[j])
  }

  if (missing.length > 0) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing])
    current = current.concat(missing)
  }

  return current
}

// ---------------------------------------------------------------------------
// Codebook — run manually from the Apps Script editor after a schema change
// ---------------------------------------------------------------------------

/**
 * Rewrite the codebook tab: one row per question/option pair, describing what
 * every code in the responses tab means. Generated from the same schema the
 * endpoint validates against, so it cannot drift from the collected data.
 */
function rebuildCodebook() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  if (!sheetId) throw new Error('SHEET_ID script property is not set.')

  var spreadsheet = SpreadsheetApp.openById(sheetId)
  var sheet = spreadsheet.getSheetByName(CODEBOOK_SHEET_NAME)
  if (!sheet) sheet = spreadsheet.insertSheet(CODEBOOK_SHEET_NAME)
  sheet.clear()

  var rows = [['question_id', 'section', 'type', 'required', 'prompt', 'option_code', 'option_label']]

  for (var i = 0; i < QUESTIONS.length; i++) {
    var q = QUESTIONS[i]
    var options = q.options || []

    if (options.length === 0) {
      rows.push([q.id, q.section, q.type, q.required ? 'yes' : 'no', q.prompt, '', ''])
      continue
    }
    for (var j = 0; j < options.length; j++) {
      rows.push([
        q.id, q.section, q.type, q.required ? 'yes' : 'no', q.prompt,
        options[j].code, options[j].label,
      ])
    }
  }

  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows)
  sheet.setFrozenRows(1)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var _questionIndex = null
var _sectionIndex = null

function questionIndex() {
  if (!_questionIndex) {
    _questionIndex = {}
    for (var i = 0; i < QUESTIONS.length; i++) _questionIndex[QUESTIONS[i].id] = QUESTIONS[i]
  }
  return _questionIndex
}

function sectionIndex() {
  if (!_sectionIndex) {
    _sectionIndex = {}
    for (var i = 0; i < SECTIONS.length; i++) _sectionIndex[SECTIONS[i].id] = SECTIONS[i]
  }
  return _sectionIndex
}

function fail(message) {
  return { ok: false, message: message }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

function jsonError(message) {
  return jsonOutput({ status: 'error', message: message })
}
