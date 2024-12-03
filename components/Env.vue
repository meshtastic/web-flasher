<template>
    <div>
        <button id="dropdownDeviceButton" data-dropdown-toggle="dropdownEnv" class="display-inline content-center text-black bg-meshtastic hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center" type="button">
            {{ selectedTarget.replace('_', '-') }}
            <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
        </button>
        <div id="dropdownEnv" class="z-10 hidden bg-gray-200 divide-y divide-gray-500 rounded-lg shadow w-52">
            <ul class="py-2 text-sm text-gray-800" aria-labelledby="dropdownEnv">
                <li v-for="env in store.$state.envs">
                    <a class="block px-4 py-1 hover:bg-gray-400 cursor-pointer" @click="setEnv(env)">
                        {{ env }}
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useBuilderStore } from '../stores/builderStore';

const store = useBuilderStore();
store.fetchList();

const selectedTarget = computed(() => store.$state.selectedEnv ? store.$state.selectedEnv : "Select Target Environment");

const setEnv = (env: string) => {
    store.setSelectedEnv(env);
    document.getElementById('dropdownEnv')?.classList.toggle('hidden');
}

</script>