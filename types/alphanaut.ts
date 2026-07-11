// Types for the alphanaut feedback tool (hidden bug reporter for the 2.8
// pre-release testing group). Self-contained: nothing here is imported by core
// flasher code. See stores/alphanautStore.ts and utils/alphanautSubmit.ts.

export type AppPlatform
  = 'Android' | 'iOS' | 'macOS' | 'Linux' | 'Windows' | 'Web' | 'N/A'

/** Tester's verdict on the build under test. */
export type AlphanautOutcome = 'pass' | 'fail' | 'observation'

/** Firmware context auto-captured from firmwareStore.selectedFirmware. */
export interface AlphanautFirmwareContext {
  id: string // e.g. 'v2.8.0.b246bcd' (version WITH git hash), '' if unknown
  version: string // id without leading 'v', or prBuild.version
  isPrBuild: boolean
  prNumber: number | null
}

/** The hardware that was flashed, auto-captured from deviceStore.selectedTarget. */
export interface AlphanautDeviceContext {
  platformioTarget: string
  displayName: string
}

/** Live snapshot taken when the panel opens. Either field may be null. */
export interface AlphanautSnapshot {
  firmware: AlphanautFirmwareContext | null
  device: AlphanautDeviceContext | null
}

/** Tester-entered form model. */
export interface AlphanautReportForm {
  handle: string
  contact: string
  outcome: AlphanautOutcome | '' // '' = not yet chosen
  whatHappened: string
  expectedBehavior: string
  reproSteps: string
  appPlatform: AppPlatform
  appVersion: string
  otherInfo: string
  attachSerialLog: boolean
  appLogs: string
}

/** The exact JSON body POSTed to the Apps Script web app. */
export interface AlphanautPayload {
  schemaVersion: number
  submissionId: string
  submittedAt: string
  token?: string
  firmware: AlphanautFirmwareContext | null
  device: AlphanautDeviceContext | null
  report: {
    handle: string
    contact: string | null
    outcome: AlphanautOutcome
    whatHappened: string
    expectedBehavior: string
    reproSteps: string | null
    appPlatform: AppPlatform
    appVersion: string | null
    otherInfo: string | null
  }
  logs: {
    serialLog: string | null
    appLogs: string | null
  }
}

/** A failed submission held in localStorage for retry. */
export interface QueuedSubmission {
  id: string // == payload.submissionId
  payload: AlphanautPayload
  createdAt: string
  attempts: number
  lastError?: string
}
