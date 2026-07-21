import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type {
  AlphanautDeviceContext,
  AlphanautReportForm,
  AlphanautSnapshot,
  QueuedSubmission,
} from '~/types/alphanaut'
import type { FirmwareResource } from '~/types/api'
import { buildPayload, isAlphanautVersion, postReport } from '~/utils/alphanautSubmit'
import { useDeviceStore } from './deviceStore'
import { useFirmwareStore } from './firmwareStore'

// Cap the retry queue so a persistently-offline tester can't grow localStorage
// without bound. Oldest is dropped when exceeded (logged, not silent).
const MAX_QUEUE = 20

/**
 * Resolve the selected firmware's id + version from one place so currentVersion
 * and captureContext can't drift: release builds carry a 'v'-prefixed id with
 * the hash; PR/CI builds carry only prBuild.version.
 */
function parseFirmwareVersion(selected: FirmwareResource | undefined): { id: string, version: string } {
  const id = selected?.id
  return {
    id: id ?? '',
    version: id ? id.replace(/^v/, '') : (selected?.prBuild?.version ?? ''),
  }
}

export type SubmitOutcome
  = { status: 'sent', deduped?: boolean }
    | { status: 'queued', error?: string }
    | { status: 'rejected', error?: string }

/**
 * State + orchestration for the alphanaut feedback tool. Reads live
 * device/firmware/serial state; never writes to any core flasher store.
 */
export const useAlphanautStore = defineStore('alphanaut', {
  state: () => ({
    queue: useLocalStorage<QueuedSubmission[]>('alphanautQueue', []),
    flushing: false,
    endpoint: '',
    token: '',
    snapshot: { firmware: null, device: null } as AlphanautSnapshot,
  }),

  getters: {
    // Empty endpoint = feature dark (runtime kill switch).
    enabled: state => state.endpoint.length > 0,

    /** Selected firmware version (without leading 'v'), or '' if none. */
    currentVersion(): string {
      return parseFirmwareVersion(useFirmwareStore().selectedFirmware).version
    },

    isTargetVersion(): boolean {
      return isAlphanautVersion(this.currentVersion)
    },

    /** The badge shows whenever the tool is enabled and a 2.8 build is selected. */
    isVisible(): boolean {
      return this.enabled && this.isTargetVersion
    },

    /**
     * Hardware the tester can pick from to correct the auto-detected target
     * (deduped by platformioTarget). The auto-detected device is guaranteed to be
     * in the list even if the device catalogue filtered it out.
     */
    hardwareOptions(): AlphanautDeviceContext[] {
      const seen = new Set<string>()
      const opts: AlphanautDeviceContext[] = []
      for (const t of useDeviceStore().sortedDevices ?? []) {
        if (t.platformioTarget && !seen.has(t.platformioTarget)) {
          seen.add(t.platformioTarget)
          opts.push({ platformioTarget: t.platformioTarget, displayName: t.displayName ?? '' })
        }
      }
      const current = this.snapshot.device
      if (current?.platformioTarget && !seen.has(current.platformioTarget)) {
        opts.unshift(current)
      }
      return opts
    },

    pendingCount: state => state.queue.length,
  },

  actions: {
    /** Called once by the component with runtime config. */
    configure(url: string | undefined, token: string | undefined) {
      this.endpoint = url ?? ''
      this.token = token ?? ''
    },

    /** Snapshot the live firmware + hardware context when the panel opens. */
    captureContext(): AlphanautSnapshot {
      const fw = useFirmwareStore()
      const dev = useDeviceStore()

      const selected = fw.selectedFirmware
      const { id, version } = parseFirmwareVersion(selected)
      const firmware = (selected?.id || selected?.prBuild)
        ? {
            id,
            version,
            isPrBuild: !!selected?.prBuild,
            prNumber: selected?.prBuild?.prNumber ?? null,
          }
        : null

      const target = dev.selectedTarget
      const device = target?.platformioTarget
        ? { platformioTarget: target.platformioTarget, displayName: target.displayName ?? '' }
        : null

      this.snapshot = { firmware, device }
      return this.snapshot
    },

    /**
     * Let the tester correct the hardware before submitting (the auto-detected
     * target can be wrong or absent). The submitted payload reads snapshot.device,
     * so overriding it here is all that's needed. null = "not specified".
     */
    setDevice(device: AlphanautDeviceContext | null) {
      this.snapshot = { ...this.snapshot, device }
    },

    /** Build + POST a report; queue it on transient failure. */
    async submit(form: AlphanautReportForm, serialLog: string): Promise<SubmitOutcome> {
      const payload = buildPayload({
        snapshot: this.snapshot,
        form,
        serialLog,
        submissionId: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        token: this.token || undefined,
      })

      const res = await postReport(this.endpoint, payload)
      if (res.ok) {
        // A successful send means we're online — opportunistically drain the queue.
        void this.flushQueue()
        return { status: 'sent', deduped: res.deduped }
      }
      if (res.transient) {
        this.enqueue(payload, res.error)
        return { status: 'queued', error: res.error }
      }
      return { status: 'rejected', error: res.error }
    },

    enqueue(payload: QueuedSubmission['payload'], error?: string) {
      if (this.queue.length >= MAX_QUEUE) {
        const dropped = this.queue.shift()
        console.warn('[alphanaut] queue full, dropped oldest report', dropped?.id)
      }
      this.queue.push({
        id: payload.submissionId,
        payload,
        createdAt: new Date().toISOString(),
        attempts: 1,
        lastError: error,
      })
    },

    /**
     * Re-send queued reports sequentially. Stops on the first transient failure
     * (network still down) to avoid hammering; drops permanently-rejected items.
     */
    async flushQueue(): Promise<{ sent: number, failed: number }> {
      if (this.flushing || !this.endpoint || this.queue.length === 0) {
        return { sent: 0, failed: 0 }
      }
      this.flushing = true
      let sent = 0
      let failed = 0
      try {
        for (const item of [...this.queue]) {
          const res = await postReport(this.endpoint, item.payload)
          if (res.ok) {
            this.queue = this.queue.filter(q => q.id !== item.id)
            sent++
            continue
          }
          const queued = this.queue.find(q => q.id === item.id)
          if (queued) {
            queued.attempts++
            queued.lastError = res.error
          }
          if (!res.transient) {
            // Server rejected it (malformed/schema) — retrying can never help.
            this.queue = this.queue.filter(q => q.id !== item.id)
            console.warn('[alphanaut] dropped permanently-rejected report', item.id, res.error)
            continue
          }
          failed++
          break
        }
      }
      finally {
        this.flushing = false
      }
      return { sent, failed }
    },
  },
})
