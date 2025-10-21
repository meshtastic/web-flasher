<template>
    <div class="mx-auto">
        <h1 v-if="vendorCobrandingTag === 'RAK'" class="text-white text-3xl sm:text-5xl md:text-6xl inline-block ml-2 sm:ml-4 align-top tracking-wide">
            <img src="@/assets/img/logo.svg" class="h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
            x
            <img src="@/public/img/icon_rak-cropped.svg" class="h-32 w-32 sm:h-48 sm:w-48 md:h-64 md:w-64 inline-block pt-0 mt-0" alt="RAK Logo" />
            {{ $t('header_title') }}
        </h1>
        <h1 v-else class="text-white text-4xl sm:text-6xl md:text-7xl inline-block ml-2 sm:ml-4 justify-center text-center text-meshtastic tracking-wide">
            <img src="@/assets/img/logo.svg" class="h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 inline-block pt-0 mt-0" alt="Meshtastic Logo" />
            {{ $t('header_title') }}
        </h1>
    </div>
</template>

<script lang="ts" setup>
import { vendorCobrandingTag } from '~/types/resources';
</script>