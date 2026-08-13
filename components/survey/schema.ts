/**
 * DEF CON 34 post-event Meshtastic survey — single source of truth.
 *
 * This file defines every question, every valid option code, and every branch
 * rule. The Vue renderer reads it directly; the Apps Script backend gets a
 * generated mirror (see scripts/gen-appsscript-schema.ts) so client and server
 * can never disagree about what a valid submission looks like.
 *
 * Copy lives here rather than in i18n/locales/** because that path is
 * Crowdin-managed and protected by .github/workflows against direct edits.
 * The survey is a time-boxed, English-only artifact; it is not translated.
 *
 * Question IDs are the sheet column headers and are permanent. Never rename or
 * reuse one — bump SCHEMA_VERSION and add a new ID instead. Option codes are
 * likewise permanent; only `label` may be edited freely after launch.
 */

// Explicit .ts extension: this module is imported both by Vite (which resolves
// extensionless) and by the tools under plain Node ESM (which does not).
import { DEVICE_OPTIONS } from './devices.generated.ts'

export const SCHEMA_VERSION = 3

/** Minimum plausible time to fill even the shortest branch, in ms. */
export const MIN_FILL_MS = 20_000

export type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'textarea'

export interface SurveyOption {
  code: string
  label: string
  /** Selecting this clears all other selections in a multi (e.g. "None of the above"). */
  exclusive?: boolean
  /** Choosing this ends the survey immediately with the named terminal screen. */
  terminal?: TerminalId
}

export type TerminalId = 'screened_out' | 'complete'

export interface ScaleSpec {
  min: number
  max: number
  minLabel: string
  maxLabel: string
  /** Adds an explicit "Not applicable" choice stored as the code `na`. */
  allowNa?: boolean
}

/**
 * Serializable visibility rule. Deliberately a tiny closed AST rather than a
 * predicate function so the exact same logic can be evaluated in Apps Script,
 * where we re-check that every submitted answer belongs to a question the
 * respondent should actually have seen.
 */
export type Rule
  = | { all: Rule[] }
    | { any: Rule[] }
    | { not: Rule }
    | { q: string, eq: string }
    | { q: string, in: string[] }
    | { q: string, includes: string }
    | { q: string, answered: true }

export interface Question {
  id: string
  section: string
  type: QuestionType
  prompt: string
  help?: string
  options?: SurveyOption[]
  scale?: ScaleSpec
  /** Character cap for text/textarea. Enforced client- and server-side. */
  maxLength?: number
  /** Required questions block section advance. Defaults to false. */
  required?: boolean
  /** Shown only when this rule evaluates true. Absent means always shown. */
  visibleIf?: Rule
  /** Options are the selected options of another multi question, not `options`. */
  pipeFrom?: string
  /** Render with a specialised control instead of the default option list. */
  picker?: 'device'
}

export interface Section {
  id: string
  title: string
  blurb?: string
  visibleIf?: Rule
}

// ---------------------------------------------------------------------------
// Shared rules
// ---------------------------------------------------------------------------

/** True for anyone who actually had a node powered on at the event. */
const RAN_NODE: Rule = {
  q: 'q_powered',
  in: ['whole_event', 'most_days', 'one_day_or_less'],
}

const BRANCH_EVENT_FW: Rule = {
  all: [RAN_NODE, { q: 'q_cohort', eq: 'event_fw' }],
}

const BRANCH_MANUAL: Rule = {
  all: [RAN_NODE, { q: 'q_cohort', in: ['manual_full', 'manual_chan', 'manual_lora'] }],
}

const BRANCH_DEFAULT: Rule = {
  all: [RAN_NODE, { q: 'q_cohort', in: ['default_longfast', 'unsure'] }],
}

/** Reported at least one real problem (so "which was worst" is meaningful). */
const HAS_ISSUES: Rule = {
  all: [
    { q: 'q_issues', answered: true },
    { not: { q: 'q_issues', includes: 'none' } },
  ],
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const SECTIONS: Section[] = [
  {
    id: 's0',
    title: 'Getting started',
    blurb: 'Two quick questions so we know which parts of the survey to show you.',
  },
  {
    id: 's1',
    title: 'How your node was set up',
    blurb: 'This is the single most important thing we are trying to learn.',
    visibleIf: RAN_NODE,
  },
  {
    id: 's1a',
    title: 'Flashing the event firmware',
    visibleIf: BRANCH_EVENT_FW,
  },
  {
    id: 's1b',
    title: 'Configuring it yourself',
    visibleIf: BRANCH_MANUAL,
  },
  {
    id: 's1c',
    title: 'Running the defaults',
    visibleIf: BRANCH_DEFAULT,
  },
  {
    id: 's2',
    title: 'Your hardware and apps',
    visibleIf: RAN_NODE,
  },
  {
    id: 's3',
    title: 'How it actually went',
    visibleIf: RAN_NODE,
  },
  {
    id: 's5',
    title: 'Reach and next year',
  },
]

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const QUESTIONS: Question[] = [
  // --- S0 Screener ---------------------------------------------------------
  {
    id: 'q_attend',
    section: 's0',
    type: 'single',
    required: true,
    prompt: 'Did you attend DEF CON 34 in person?',
    options: [
      { code: 'venue', label: 'Yes, I was at the conference' },
      { code: 'vegas', label: 'I was in Las Vegas for DEF CON but mostly off-site' },
      { code: 'no', label: 'No', terminal: 'screened_out' },
    ],
  },
  {
    id: 'q_powered',
    section: 's0',
    type: 'single',
    required: true,
    prompt: 'Roughly how much of the event did you have a Meshtastic node powered on and with you?',
    options: [
      { code: 'whole_event', label: 'The whole event' },
      { code: 'most_days', label: 'Most days' },
      { code: 'one_day_or_less', label: 'A day or less' },
      { code: 'never', label: 'I never powered one on' },
    ],
  },
  {
    id: 'q_never_why',
    section: 's0',
    type: 'multi',
    prompt: 'What stopped you from running a node?',
    visibleIf: { q: 'q_powered', eq: 'never' },
    options: [
      { code: 'no_hardware', label: 'Didn\'t bring hardware' },
      { code: 'hw_failed', label: 'My hardware failed' },
      { code: 'config_failed', label: 'Couldn\'t get it configured' },
      { code: 'chose_not_to', label: 'Decided not to' },
      { code: 'other', label: 'Something else' },
    ],
  },

  // --- S1 Setup cohort -----------------------------------------------------
  {
    id: 'q_cohort',
    section: 's1',
    type: 'single',
    required: true,
    visibleIf: RAN_NODE,
    prompt: 'Which best describes how your main node was set up during DEF CON 34?',
    help: 'If you ran several nodes, answer for the one you carried around most.',
    options: [
      { code: 'event_fw', label: 'I flashed the official DEF CON event firmware from defcon.meshtastic.org' },
      { code: 'manual_full', label: 'Stock firmware, but I applied the event LoRa settings AND added the event channel(s)' },
      { code: 'manual_chan', label: 'Stock firmware with the event channel(s) added, but I did not change LoRa settings' },
      { code: 'manual_lora', label: 'Stock firmware with the event LoRa settings, but I did not add the event channel(s)' },
      { code: 'default_longfast', label: 'Default LongFast — no event firmware, settings, or channels' },
      { code: 'unsure', label: 'Not sure, or something else' },
    ],
  },
  {
    id: 'q_cohort_changed',
    section: 's1',
    type: 'single',
    visibleIf: RAN_NODE,
    prompt: 'Did your setup change during the event?',
    options: [
      { code: 'no_change', label: 'No, it was the same all week' },
      { code: 'to_event_fw', label: 'I switched to the event firmware partway through' },
      { code: 'to_manual', label: 'I switched to manual event settings partway through' },
      { code: 'away_from_event', label: 'I switched away from the event config' },
      { code: 'other', label: 'It changed some other way' },
    ],
  },
  {
    id: 'q_cohort_change_why',
    section: 's1',
    type: 'multi',
    prompt: 'What prompted the change?',
    visibleIf: {
      all: [RAN_NODE, { not: { q: 'q_cohort_changed', eq: 'no_change' } }, { q: 'q_cohort_changed', answered: true }],
    },
    options: [
      { code: 'unusable', label: 'The mesh was unusable on my old setup' },
      { code: 'told_by_someone', label: 'Someone at the event told me to' },
      { code: 'found_out_late', label: 'I only found out about the event config later' },
      { code: 'hit_bug', label: 'I hit a bug' },
      { code: 'wanted_own_channels', label: 'I wanted my own channels back' },
      { code: 'other', label: 'Something else' },
    ],
  },

  // --- S1a Branch A: event firmware ---------------------------------------
  {
    id: 'q_fw_method',
    section: 's1a',
    type: 'single',
    visibleIf: BRANCH_EVENT_FW,
    prompt: 'How did you flash the event firmware?',
    options: [
      { code: 'web_flasher', label: 'The defcon.meshtastic.org web flasher' },
      { code: 'cli', label: 'Meshtastic CLI / Python' },
      { code: 'esptool', label: 'esptool manually' },
      { code: 'someone_else', label: 'Someone else flashed it for me' },
      { code: 'other', label: 'Some other way' },
    ],
  },
  {
    id: 'q_fw_first_try',
    section: 's1a',
    type: 'single',
    visibleIf: BRANCH_EVENT_FW,
    prompt: 'Did flashing work on the first attempt?',
    options: [
      { code: 'yes_first_try', label: 'Yes, worked first time' },
      { code: 'yes_after_retries', label: 'Yes, but it took a few tries' },
      { code: 'failed_got_help', label: 'It failed and I needed help' },
      { code: 'failed_gave_up', label: 'It failed and I gave up' },
    ],
  },
  {
    id: 'q_fw_problems',
    section: 's1a',
    type: 'multi',
    prompt: 'What went wrong?',
    visibleIf: {
      all: [
        BRANCH_EVENT_FW,
        { q: 'q_fw_first_try', answered: true },
        { not: { q: 'q_fw_first_try', eq: 'yes_first_try' } },
      ],
    },
    options: [
      { code: 'no_webserial', label: 'My browser couldn\'t connect to the device' },
      { code: 'driver_port', label: 'Driver or serial port problem' },
      { code: 'device_missing', label: 'My device model wasn\'t offered' },
      { code: 'no_bootloader', label: 'Device wouldn\'t enter bootloader mode' },
      { code: 'no_boot', label: 'It flashed but the device wouldn\'t boot' },
      { code: 'lost_config', label: 'I lost my previous config and did not expect to' },
      { code: 'no_laptop', label: 'I didn\'t have a laptop with me' },
      { code: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'q_fw_browser',
    section: 's1a',
    type: 'single',
    prompt: 'Which browser did you flash from?',
    help: 'Browser support for the underlying WebSerial API varies a lot, so this is genuinely useful to us.',
    visibleIf: { all: [BRANCH_EVENT_FW, { q: 'q_fw_method', eq: 'web_flasher' }] },
    options: [
      { code: 'chrome', label: 'Chrome' },
      { code: 'edge', label: 'Edge' },
      { code: 'brave', label: 'Brave' },
      { code: 'arc', label: 'Arc' },
      { code: 'safari', label: 'Safari' },
      { code: 'firefox', label: 'Firefox' },
      { code: 'other', label: 'Other or don\'t remember' },
    ],
  },
  {
    id: 'q_fw_kept',
    section: 's1a',
    type: 'single',
    visibleIf: BRANCH_EVENT_FW,
    prompt: 'Is your device still running the event firmware?',
    options: [
      { code: 'still_on_it', label: 'Yes, it\'s still on there' },
      { code: 'reverted_after', label: 'I reverted after the event' },
      { code: 'reverted_during', label: 'I reverted during the event' },
      { code: 'not_sure', label: 'Not sure' },
    ],
  },
  // --- S1b Branch B: manual configuration ---------------------------------
  {
    id: 'q_manual_why_not_fw',
    section: 's1b',
    type: 'multi',
    visibleIf: BRANCH_MANUAL,
    prompt: 'Why did you configure it yourself instead of flashing the event firmware?',
    help: 'Pick everything that applied. There are no wrong answers here — we want to know what got in the way.',
    options: [
      { code: 'didnt_know', label: 'I didn\'t know the event firmware existed' },
      { code: 'too_late', label: 'I found out about it too late' },
      { code: 'keep_config', label: 'I didn\'t want to lose my existing config or channels' },
      { code: 'device_unsupported', label: 'My device isn\'t supported by the flasher' },
      { code: 'no_computer', label: 'I didn\'t have a computer with me' },
      { code: 'non_stock', label: 'I didn\'t want to run non-stock firmware' },
      { code: 'too_complicated', label: 'It seemed too complicated' },
      { code: 'tried_failed', label: 'I tried and it failed' },
      { code: 'prefer_control', label: 'I prefer to control my own settings' },
      { code: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'q_manual_settings',
    section: 's1b',
    type: 'multi',
    visibleIf: BRANCH_MANUAL,
    prompt: 'Which settings did you actually change?',
    options: [
      { code: 'modem_preset', label: 'Modem preset' },
      { code: 'region', label: 'Region' },
      { code: 'freq_slot', label: 'Frequency slot' },
      { code: 'hop_limit', label: 'Hop limit' },
      { code: 'role', label: 'Node role' },
      { code: 'mqtt', label: 'MQTT on/off' },
      { code: 'position_interval', label: 'Position broadcast interval' },
      { code: 'telemetry_interval', label: 'Telemetry intervals' },
      { code: 'channels', label: 'Added channel(s)' },
      { code: 'node_name', label: 'Node name' },
      { code: 'none', label: 'None of these, or not sure', exclusive: true },
    ],
  },
  {
    id: 'q_manual_source',
    section: 's1b',
    type: 'multi',
    visibleIf: BRANCH_MANUAL,
    prompt: 'Where did you get the event settings from?',
    options: [
      { code: 'qr_at_event', label: 'A QR code at the event' },
      { code: 'defcon_site', label: 'defcon.meshtastic.org' },
      { code: 'docs', label: 'meshtastic.org documentation' },
      { code: 'discord', label: 'Meshtastic Discord' },
      { code: 'dc_forums', label: 'DEF CON forums' },
      { code: 'friend', label: 'A friend' },
      { code: 'signage', label: 'Village or booth signage' },
      { code: 'defcon_run', label: 'defcon.run' },
      { code: 'social', label: 'Social media' },
      { code: 'other', label: 'Somewhere else' },
    ],
  },
  // --- S1c Branch C: defaults ---------------------------------------------
  {
    id: 'q_default_aware',
    section: 's1c',
    type: 'single',
    visibleIf: BRANCH_DEFAULT,
    prompt: 'Did you know there was event firmware and a set of event settings?',
    options: [
      { code: 'knew_before', label: 'Yes, before the event' },
      { code: 'learned_during', label: 'I learned about it during the event' },
      { code: 'learned_after', label: 'I learned about it after the event' },
      { code: 'never_knew', label: 'No, this survey is the first I\'m hearing of it' },
    ],
  },
  {
    id: 'q_default_why',
    section: 's1c',
    type: 'multi',
    prompt: 'What made you stick with the defaults?',
    visibleIf: {
      all: [BRANCH_DEFAULT, { q: 'q_default_aware', in: ['knew_before', 'learned_during'] }],
    },
    options: [
      { code: 'not_necessary', label: 'It didn\'t seem necessary' },
      { code: 'working_fine', label: 'LongFast was working fine for me' },
      { code: 'no_change', label: 'I didn\'t want to change my setup' },
      { code: 'too_complicated', label: 'It looked too complicated' },
      { code: 'no_time', label: 'I didn\'t have time' },
      { code: 'didnt_trust', label: 'I didn\'t trust it' },
      { code: 'device_cant', label: 'My device couldn\'t run it' },
      { code: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'q_default_would_change',
    section: 's1c',
    type: 'multi',
    visibleIf: BRANCH_DEFAULT,
    prompt: 'What would have made you use the event config?',
    options: [
      { code: 'clearer_instructions', label: 'Clearer instructions' },
      { code: 'phone_qr', label: 'A QR code I could scan with my phone' },
      { code: 'in_person', label: 'Someone showing me in person' },
      { code: 'earlier_notice', label: 'Knowing about it earlier' },
      { code: 'no_flash_needed', label: 'A way to apply the settings without flashing' },
      { code: 'nothing', label: 'Nothing — I\'d still run LongFast', exclusive: true },
      { code: 'other', label: 'Something else' },
    ],
  },

  // --- S2 Hardware & client ------------------------------------------------
  {
    id: 'q_devices',
    section: 's2',
    type: 'multi',
    picker: 'device',
    visibleIf: RAN_NODE,
    prompt: 'Which device(s) did you run at the event?',
    help: 'Search or filter by manufacturer. Older hardware is listed too.',
    // Generated from the same vendored hardware list the flasher falls back on,
    // so codes are real platformioTarget values rather than invented ones and
    // join cleanly against flasher and firmware data.
    options: [
      ...DEVICE_OPTIONS.map(device => ({ code: device.code, label: device.label })),
      { code: 'other', label: 'Something else, or I\'m not sure' },
    ],
  },
  {
    id: 'q_role',
    section: 's2',
    type: 'single',
    visibleIf: RAN_NODE,
    prompt: 'What role was your main node set to?',
    help: 'If you never changed it, it was almost certainly CLIENT. "Don\'t know" is a perfectly good answer.',
    options: [
      { code: 'client', label: 'CLIENT' },
      { code: 'client_mute', label: 'CLIENT_MUTE' },
      { code: 'router', label: 'ROUTER' },
      { code: 'router_client', label: 'ROUTER_CLIENT' },
      { code: 'repeater', label: 'REPEATER' },
      { code: 'tracker', label: 'TRACKER' },
      { code: 'sensor', label: 'SENSOR' },
      { code: 'dont_know', label: 'Don\'t know' },
    ],
  },
  {
    id: 'q_interaction',
    section: 's2',
    type: 'single',
    visibleIf: RAN_NODE,
    prompt: 'How did you mainly interact with your node?',
    options: [
      { code: 'standalone', label: 'Standalone device only — its own keyboard and screen, no phone' },
      { code: 'phone_app', label: 'Paired to a phone app' },
      { code: 'both', label: 'Both, roughly equally' },
      { code: 'web_client', label: 'Web client over USB or Bluetooth' },
      { code: 'cli', label: 'Command line' },
    ],
  },
  {
    id: 'q_clients',
    section: 's2',
    type: 'multi',
    prompt: 'Which client app(s) did you use?',
    visibleIf: {
      all: [RAN_NODE, { q: 'q_interaction', answered: true }, { not: { q: 'q_interaction', eq: 'standalone' } }],
    },
    options: [
      { code: 'ios', label: 'iOS / iPadOS app' },
      { code: 'android_play', label: 'Android app (Play Store)' },
      { code: 'android_sideload', label: 'Android app (F-Droid or sideloaded APK)' },
      { code: 'web', label: 'Web client (client.meshtastic.org)' },
      { code: 'watch', label: 'Apple Watch' },
      { code: 'cli', label: 'CLI / Python' },
      { code: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'q_client_version',
    section: 's2',
    type: 'text',
    maxLength: 40,
    prompt: 'What version was the app, if you know it?',
    help: 'Optional. Even a rough answer helps us line up bug reports.',
    visibleIf: {
      all: [RAN_NODE, { q: 'q_interaction', answered: true }, { not: { q: 'q_interaction', eq: 'standalone' } }],
    },
  },

  // --- S3 Experience & issues ----------------------------------------------
  {
    id: 'q_overall',
    section: 's3',
    type: 'scale',
    visibleIf: RAN_NODE,
    prompt: 'Overall, how well did Meshtastic work for you at DEF CON 34?',
    scale: { min: 1, max: 5, minLabel: 'Badly', maxLabel: 'Great' },
  },
  {
    id: 'q_issues',
    section: 's3',
    type: 'multi',
    visibleIf: RAN_NODE,
    prompt: 'Which of these did you run into?',
    help: 'Pick everything you experienced, even briefly.',
    options: [
      { code: 'no_delivery', label: 'Messages I sent never arrived' },
      { code: 'long_delays', label: 'Long delays before messages arrived' },
      { code: 'duplicates', label: 'Duplicate or repeated messages' },
      { code: 'too_busy', label: 'Channel so busy I couldn\'t follow the conversation' },
      { code: 'nodedb_churn', label: 'Node list filled up, or nodes constantly appearing and disappearing' },
      { code: 'no_nodes', label: 'Couldn\'t see any nodes at all' },
      { code: 'ble_drops', label: 'Bluetooth pairing kept dropping' },
      { code: 'app_crash', label: 'App crashed or froze' },
      { code: 'app_reconnect', label: 'App wouldn\'t reconnect after going out of range' },
      { code: 'device_reboot', label: 'Device rebooted or crashed on its own' },
      { code: 'battery', label: 'Battery drained faster than expected' },
      { code: 'position', label: 'Position or map not updating, or wrong' },
      { code: 'decrypt', label: 'Couldn\'t see or decrypt event channel messages' },
      { code: 'outside_traffic', label: 'Traffic from outside the event leaking in' },
      { code: 'none', label: 'None of these', exclusive: true },
    ],
  },
  {
    id: 'q_worst_issue',
    section: 's3',
    type: 'single',
    pipeFrom: 'q_issues',
    visibleIf: { all: [RAN_NODE, HAS_ISSUES] },
    prompt: 'Of those, which was the biggest problem?',
  },
  {
    id: 'q_where_worst',
    section: 's3',
    type: 'multi',
    visibleIf: { all: [RAN_NODE, HAS_ISSUES] },
    prompt: 'Where was it worst?',
    options: [
      { code: 'contest', label: 'Contest and CTF areas' },
      { code: 'halls', label: 'Main conference halls' },
      { code: 'villages', label: 'Villages' },
      { code: 'hotel', label: 'Hotel room' },
      { code: 'casino', label: 'Casino floor' },
      { code: 'outdoors', label: 'Outdoors, between venues' },
      { code: 'transit', label: 'In transit' },
      { code: 'everywhere', label: 'It was about the same everywhere', exclusive: true },
      { code: 'dont_know', label: 'Don\'t know', exclusive: true },
    ],
  },
  {
    id: 'q_dm',
    section: 's3',
    type: 'single',
    visibleIf: RAN_NODE,
    prompt: 'Did you use direct messages?',
    options: [
      { code: 'worked_well', label: 'Yes, and they worked well' },
      { code: 'unreliable', label: 'Yes, but they were unreliable' },
      { code: 'never_worked', label: 'Yes, and they never worked' },
      { code: 'didnt_try', label: 'I didn\'t try' },
    ],
  },
  {
    id: 'q_channel_used',
    section: 's3',
    type: 'multi',
    visibleIf: RAN_NODE,
    prompt: 'Which channel(s) did you actually spend time on?',
    options: [
      { code: 'defconnect', label: 'DEFCONnect' },
      { code: 'hackercomms', label: 'HackerComms' },
      { code: 'nodechat', label: 'NodeChat' },
      { code: 'private', label: 'My own private channel' },
      { code: 'longfast', label: 'The default LongFast channel' },
      { code: 'dont_know', label: 'Don\'t know', exclusive: true },
    ],
  },

  // --- S5 Comms reach ------------------------------------------------------
  {
    id: 'q_heard',
    section: 's5',
    type: 'multi',
    prompt: 'How did you first hear about the event firmware or settings?',
    options: [
      { code: 'defcon_site', label: 'defcon.meshtastic.org' },
      { code: 'social', label: 'Meshtastic social media' },
      { code: 'discord', label: 'Meshtastic Discord' },
      { code: 'dc_forums', label: 'DEF CON forums or Discord' },
      { code: 'friend', label: 'A friend or someone at the event' },
      { code: 'signage', label: 'Signage or a QR code at the venue' },
      { code: 'village', label: 'A village or booth' },
      { code: 'defcon_run', label: 'defcon.run' },
      { code: 'press', label: 'A news or press article' },
      { code: 'never', label: 'I didn\'t hear about it until this survey', exclusive: true },
    ],
  },

  // --- S5 Forward-looking --------------------------------------------------
  {
    id: 'q_next_year',
    section: 's5',
    type: 'single',
    prompt: 'If we ship event firmware again for DEF CON 35, would you flash it?',
    options: [
      { code: 'definitely', label: 'Definitely' },
      { code: 'probably', label: 'Probably' },
      { code: 'if_keeps_config', label: 'Only if it preserved my existing config' },
      { code: 'probably_not', label: 'Probably not' },
      { code: 'definitely_not', label: 'Definitely not' },
    ],
  },
  {
    id: 'q_one_change',
    section: 's5',
    type: 'textarea',
    maxLength: 300,
    prompt: 'What one change would most improve your Meshtastic experience at the event next year?',
  },
  {
    id: 'q_node_id',
    section: 's5',
    type: 'text',
    maxLength: 40,
    visibleIf: RAN_NODE,
    prompt: 'Your node short name or !hexid, if you want to share it',
    help: 'Completely optional. We only use it to cross-check reports against the mesh data we captured during the event. We are not collecting your name, email, or anything else — this survey is anonymous.',
  },
]

// ---------------------------------------------------------------------------
// Derived lookups & rule evaluation
// ---------------------------------------------------------------------------

export type AnswerValue = string | string[] | number | null

export type Answers = Record<string, AnswerValue>

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map(q => [q.id, q]),
)

export const SECTIONS_BY_ID: Record<string, Section> = Object.fromEntries(
  SECTIONS.map(s => [s.id, s]),
)

function isAnswered(value: AnswerValue): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

/**
 * Evaluate a visibility rule against the current answers.
 *
 * Mirrored verbatim in the generated Apps Script schema so the server can
 * reject answers to questions the respondent should never have been shown.
 */
export function evaluateRule(rule: Rule | undefined, answers: Answers): boolean {
  if (!rule) return true

  if ('all' in rule) return rule.all.every(r => evaluateRule(r, answers))
  if ('any' in rule) return rule.any.some(r => evaluateRule(r, answers))
  if ('not' in rule) return !evaluateRule(rule.not, answers)

  const value = answers[rule.q]

  if ('answered' in rule) return isAnswered(value)
  if ('eq' in rule) return value === rule.eq
  if ('in' in rule) return typeof value === 'string' && rule.in.includes(value)
  if ('includes' in rule) return Array.isArray(value) && value.includes(rule.includes)

  return true
}

/** Questions currently visible, in schema order. */
export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => {
    const section = SECTIONS_BY_ID[q.section]
    return evaluateRule(section?.visibleIf, answers) && evaluateRule(q.visibleIf, answers)
  })
}

/** Sections currently visible, in schema order. */
export function visibleSections(answers: Answers): Section[] {
  return SECTIONS.filter((s) => {
    if (!evaluateRule(s.visibleIf, answers)) return false
    return QUESTIONS.some(q => q.section === s.id && evaluateRule(q.visibleIf, answers))
  })
}

/**
 * Options for a question, resolving `pipeFrom` against the current answers so
 * "which was worst" only ever offers problems the respondent actually reported.
 */
export function optionsFor(question: Question, answers: Answers): SurveyOption[] {
  if (!question.pipeFrom) return question.options ?? []

  const source = QUESTIONS_BY_ID[question.pipeFrom]
  const selected = answers[question.pipeFrom]
  if (!source?.options || !Array.isArray(selected)) return []

  return source.options.filter(o => selected.includes(o.code) && !o.exclusive)
}

/** The terminal screen triggered by an answer, if any. */
export function terminalFor(question: Question, value: AnswerValue): TerminalId | null {
  if (question.type !== 'single' || typeof value !== 'string') return null
  return question.options?.find(o => o.code === value)?.terminal ?? null
}
