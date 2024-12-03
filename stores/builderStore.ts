import { mande } from 'mande';
import { defineStore } from 'pinia';

import { createUrl } from './store';
import { openTerminal } from '../utils/terminal';

const envApi = mande(createUrl("api/env"));
const prefsApi = mande(createUrl("api/userprefs"));
const portsApi = mande(createUrl("api/ports"));
const versionApi = mande(createUrl("api/version"));
const manifestApi = mande(createUrl("api/manifest"));

interface FirmwareVersion {
  branch: string;
  branches: string[];
  tags: string[];
}

export const useBuilderStore = defineStore("builder", {
  state: () => {
    return {
      envs: new Array<string>(),
      selectedEnv: undefined as string | undefined,
      userPrefs: "",
      branch: undefined as string | undefined,
      branches: new Array<string>(),
      tags: new Array<string>(),
      ports: new Array<string>(),
      selectedPort: undefined as string | undefined,
      isUpload: false,
      isBuilding: false,
      manifest: new Array<string>(),
    };
  },
  getters: {
   
  },
  actions: {
    async fetchList() {
      try {
        const envs = await envApi.get<string[]>();
        this.envs = envs.sort();
      } catch (ex) {
        console.error(ex);
      }
    },
    async fetchPrefs() {
      try {
        const prefs = await prefsApi.get<string>();
        this.userPrefs = JSON.parse(prefs)
      } catch (ex) {
        console.error(ex);
      }
    },
    async fetchPorts() {
      try {
        const ports = await portsApi.get<string[]>();
        this.ports = ports.sort();
      } catch (ex) {
        console.error(ex);
      }
    },
    async build() {
      this.manifest = [];
      let params = "";
      if (this.selectedPort) {
        params = `&port=${this.selectedPort}`;
      }
      else if (this.isUpload) {
        params = `&upload=${this.isUpload}`;
      }
      this.isBuilding = true;
      const terminal = await openTerminal();
      try {
        const response = await fetch(`/api/build?env=${this.selectedEnv}${params}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/event-stream'
          },
          body: JSON.stringify({
            userPrefs: this.userPrefs
          })
        })
        if (!response.body) {
          throw new Error('Response body is null');
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          const {value, done} = await reader.read();
          if (value) {
            terminal.writeln(value);
            console.log(value);
          }
          if (done) break;
        }
        manifestApi.get<string[]>(`?env=${this.selectedEnv}`).then((manifest) => {
          console.log(manifest);
          this.manifest = manifest;
        });
      } catch (ex) {
        console.error(ex);
      }
      this.isBuilding = false;
    },
    async fetchVersion() {
      try {
        const version = await versionApi.get<FirmwareVersion>();
        this.branch = version.branch;
        this.tags = version.tags;
        this.branches = version.branches;
      } catch (ex) {
        console.error(ex);
      }
    },
    async download(filename: string) {
      try {
        const response = await fetch(`/api/download?env=${this.selectedEnv}&file=${filename}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (ex) {
        console.error(ex);
      }
    },
    setSelectedEnv(env: string) {
      this.selectedEnv = env;
    },
  },
});
