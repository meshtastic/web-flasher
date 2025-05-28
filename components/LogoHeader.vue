<template>
    <div class="mx-auto font-museo">
        <h1 v-if="vendorCobrandingTag === 'RAK'" class="text-white text-6xl inline-block ml-4 align-top tracking-wide">
            <img src="@/assets/img/logo.svg" class="h-32 w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
            x
            <img src="@/public/img/icon_rak-cropped.svg" class="h-64 w-64 inline-block pt-0 mt-0" alt="RAK Logo" />
            {{ $t('header_title') }}
        </h1>
        <h1 v-else class="text-white text-7xl inline-block ml-4 justify-center text-center text-meshtastic tracking-wide">
            <img src="@/assets/img/logo.svg" class="h-32 w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
            {{ $t('header_title') }}
            <img src="/img/dc33-final-fullcolor.svg" class="h-28 w-28 inline-block pt-0 mt-0 ml-4 opacity-80" alt="DEFCON 33 Logo" />
        </h1>
    </div>
</template>

<script lang="ts" setup>
import { vendorCobrandingTag } from '~/types/resources';
</script>