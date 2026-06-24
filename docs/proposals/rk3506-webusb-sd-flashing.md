# Proposal: browser / WebUSB microSD flashing for RK3506 via rockusb-on-MMC

**Status:** draft for discussion (Armbian / Kwiboo U-Boot / Meshtastic)
**Author context:** Meshtastic web-flasher (flash.meshtastic.org fork) maintainers
**Audience:** RK3506 board + U-Boot maintainers (notably the Luckfox Lyra family)

## Summary

There is currently no way to write a Luckfox Lyra (RK3506 / RK3506B) microSD
**over USB** — a host card reader is required. The pieces to fix this already
exist in the mainline-track U-Boot Armbian pins: the `rockusb` USB gadget (vendor
class `0xFF/0x06/0x05`) plus the DesignWare MMC driver. If U-Boot can be made to
enter `rockusb 0 mmc <sd>` without a serial console, a **browser WebUSB tool**
(the Meshtastic web-flasher, asadmemon.com/rkdeveloptool, a future Armbian Imager
web flow) can write the SD directly: no card reader, no native tools.

This asks for the small U-Boot-side entry mechanism, and offers the browser side
(already implemented).

## Why it matters

- Removes the card-reader requirement for first-flash / re-flash of RK3506 boards.
- Enables a pure-web flashing UX (one click in a browser).
- Reuses the existing, vendor-blessed **rockusb** protocol. No new protocol, and
  no fastboot (which RK3506 deliberately leaves off).

## Current state

| Path | Reaches SD over USB? | Notes |
|------|----------------------|-------|
| Card reader / Armbian Imager / `dd` | n/a (not USB-to-SoC) | Default. Needs a reader + native app. |
| Maskrom `db` -> rkbin **usbplug** -> `wl` (`rkdevflash`, rkdeveloptool, our WebUSB port) | No | usbplug (code 472) exposes only onboard **SPI NAND**; `cs 2` -> "SD card is not available". |
| U-Boot `ums 0 mmc` | No (for browsers) | Exposes SD as USB **Mass Storage** (class `0x08`), which WebUSB cannot claim. |
| **U-Boot `rockusb 0 mmc` (proposed)** | **Yes** | Vendor class `0xFF/0x06/0x05`, WebUSB-claimable; same protocol rkdeveloptool already speaks. |

## Why it is feasible now

The Kwiboo rk3506 U-Boot that Armbian pins already enables the needed pieces. In
`luckfox-lyra-zero-w-rk3506b_defconfig`:

```
CONFIG_USB_FUNCTION_ROCKUSB=y
CONFIG_CMD_ROCKUSB=y
CONFIG_MMC_DW=y
CONFIG_MMC_DW_ROCKCHIP=y
CONFIG_USB_GADGET_DWC2_OTG=y
# CONFIG_USB_FUNCTION_FASTBOOT is not set
```

- `cmd/rockusb.c` usage: `rockusb <ctrl> <devtype> <dev[:part]>` (e.g. `rockusb 0 mmc 0`),
  so `rockusb 0 mmc 1` points the gadget at the microSD.
- `f_rockusb.h`: the gadget is `ROCKUSB_INTERFACE_CLASS 0xff`, `SUB_CLASS 0x06`,
  `PROTOCOL 0x05` — exactly the interface WebUSB may claim, and the same RockUSB
  Bulk-Only protocol (READ_FLASH_INFO / READ_LBA / WRITE_LBA) that rkdeveloptool
  and our WebUSB port already implement.
- RK3506 SPL/BootROM already treat SD as a first-class boot device
  (`mach-rockchip/rk3506/rk3506.c` `boot_devices[BROM_BOOTSOURCE_SD]`;
  `rk3506-u-boot.dtsi` SPL boot order includes `&sdmmc`).

So the SD is reachable over USB via rockusb. The single missing piece is a
**console-free way to enter `rockusb 0 mmc`**.

## The gap

`rockusb 0 mmc 1` is a U-Boot console command. There is no sanctioned way to
enter it without a serial console, and the maskrom `db` path loads the NAND-only
usbplug, not a rockusb-on-mmc stage. That is why even Armbian falls back to a card
reader for the SD.

## Proposed mechanisms

### Option A — a console-free entry trigger in Armbian's RK3506 U-Boot

For a board that already boots (re-flash case), add a sanctioned trigger so U-Boot
enters `rockusb 0 mmc ${mmc_dev}` instead of booting Linux. Candidates:

- a held **recovery key / GPIO** sampled at boot, or
- a **boot-env flag** (`setenv rockusb_recovery 1; saveenv`, then reboot), or
- a **bootcmd fallback** (no valid kernel found -> drop to `rockusb 0 mmc`).

Smallest change; lives in the boot script / defconfig already maintained for these
boards. Lets a browser tool re-flash the running board's SD.

### Option B — a maskrom-loadable rockusb-on-MMC image (the prize)

Provide a maskrom-`db`-loadable image (a usbplug replacement, or a thin U-Boot)
that, after DDR init, **auto-enters `rockusb 0 mmc`** and exposes the microSD.
Flow for a **blank** board:

```
hold BOOT -> maskrom -> db(rockusb-mmc image) -> device re-enumerates as
rockusb-on-mmc -> browser writes the SD image via WRITE_LBA -> reset
```

This is the goal UX: flash a fresh microSD with **no card reader and no
pre-existing bootable card**. It needs an artifact built and hosted — a natural
fit alongside the existing `armbian/rkbin` `rk35/*_spl_loader_*.bin`, or as a
build output in the spirit of the (closed) idbloader-capture PR below.

**Recommendation:** Option A as a quick interim (re-flash); Option B as the goal
(blank-board, pure USB).

## Browser side (already implemented, offered)

The Meshtastic web-flasher already ships a WebUSB RockUSB stack: a port of
rkdeveloptool covering `db` (maskrom loader download), READ_FLASH_INFO /
READ_STORAGE, ERASE, chunked WRITE_LBA, and raw / gzip / xz image streaming. Once
the device is in rockusb-on-mmc it can:

1. claim the `0xFF/0x06/0x05` interface,
2. confirm the exposed device is the SD (capacity / READ_FLASH_INFO),
3. stream the image via WRITE_LBA,
4. reset.

That is minimal additional code on our side. We are happy to wire it to whichever
entry mechanism lands and to contribute it upstream — it is the same lineage as
the asadmemon.com/rkdeveloptool tooling referenced in the closed PR below.

## Validation plan

1. Build/boot a Kwiboo RK3506B U-Boot; `rockusb 0 mmc 1` over serial; confirm host
   `rkdeveloptool` and our WebUSB tool both see the SD and read/write LBAs; write a
   small image and boot it.
2. Implement Option A trigger; repeat without serial.
3. Option B: build the maskrom rockusb-mmc image; exercise the full blank-SD flow
   over USB end to end.

## Open questions

- Reliability of `rockusb` writes against `mmc` in the current WIP tree (large
  images, whole-disk vs partition).
- Best entry trigger (key/GPIO vs env vs fallback), and which `mmc` index is the
  SD per board (Lyra Zero W vs Plus vs Ultra).
- Option B: who builds/hosts the rockusb-mmc image, and its relation to the
  `idbloader.img` capture proposed in build#10008.
- Safety of re-flashing the running boot device in Option A (raw LBA should be safe
  with the rootfs unmounted; worth confirming).

## References

- Armbian RK3506 family config (U-Boot pin, `ROCKUSB_BLOB`, `write_uboot_platform`):
  https://github.com/armbian/build/blob/main/config/sources/families/rockchip.conf
- Armbian maskrom flash extension (`db`/`wl`/`rd`):
  https://github.com/armbian/build/blob/main/extensions/rkdevflash.sh
- Kwiboo U-Boot RK3506B defconfig (rockusb + MMC on, fastboot off):
  https://github.com/Kwiboo/u-boot-rockchip/blob/0b8e25bd9e16e8043b600e8f49b926b95572dc47/configs/luckfox-lyra-zero-w-rk3506b_defconfig
- `cmd/rockusb.c` (usage: `rockusb 0 mmc 0`):
  https://github.com/Kwiboo/u-boot-rockchip/blob/0b8e25bd9e16e8043b600e8f49b926b95572dc47/cmd/rockusb.c
- rockusb gadget class `0xFF/0x06/0x05`:
  https://github.com/Kwiboo/u-boot-rockchip/blob/0b8e25bd9e16e8043b600e8f49b926b95572dc47/arch/arm/include/asm/arch-rockchip/f_rockusb.h
- RK3506 boot devices incl. SD:
  https://github.com/Kwiboo/u-boot-rockchip/blob/0b8e25bd9e16e8043b600e8f49b926b95572dc47/arch/arm/mach-rockchip/rk3506/rk3506.c
- Merged SPL loaders (armbian/rkbin PR #46):
  https://github.com/armbian/rkbin/pull/46
- Closed PR: capture `idbloader.img` for web rkdeveloptool / Armbian Imager:
  https://github.com/armbian/build/pull/10008
- Loader format / db protocol writeup (this repo): `docs/rockchip-spl-loaders.md`
