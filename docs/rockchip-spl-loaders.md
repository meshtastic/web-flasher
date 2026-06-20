# Building the RK3506 / RK3506B maskrom SPL USB loader

This documents how the `rk3506_spl_loader.bin` files bundled in this web‑flasher
(`public/rockchip/`) are produced, and — more usefully for anyone else — how to
build a Rockchip RK3506/RK3506B maskrom USB loader from scratch with the official
tooling. Written up for the Armbian folks who asked.

Every filename, version, INI line, and binary offset below was verified against
`rockchip-linux/rkbin` at `master` and against the bytes of the loaders we ship
(a byte‑exact round‑trip; see [Verifying](#verifying-a-loader)).

---

## TL;DR

```sh
git clone https://github.com/rockchip-linux/rkbin
cd rkbin
./tools/boot_merger RKBOOT/RK3506MINIALL.ini     # RK3506  (e.g. Luckfox Lyra)
./tools/boot_merger RKBOOT/RK3506BMINIALL.ini    # RK3506B (e.g. Luckfox Lyra Zero W)
# => rk3506_spl_loader_v1.06.112.bin
```

`rkbin` ships only the *unmerged* component blobs — there is **no** prebuilt
`rk3506_spl_loader_*.bin` to download anywhere, so you must run `boot_merger`
yourself. RK3506 and RK3506B share everything **except the DDR init blob**.

---

## Background: what the loader is and why it exists

A Rockchip SoC held in **maskrom** mode runs only its on‑chip BootROM, which
brings up a USB device (Rockchip VID `0x2207`) but has **no DRAM initialised**.
You cannot read/erase/write flash yet. The maskrom **download‑boot ("db")**
sequence fixes that by pushing a small two‑stage loader over USB:

1. **code 471 — DDR init** (`*_ddr_*.bin`): runs in SRAM, brings up the DRAM
   controller. **This is the SoC‑specific part.**
2. **code 472 — usbplug** (`rk3506_usbplug_*.bin`): a minimal RockUSB stub that,
   once RAM is up, re‑enumerates the device as a working **RockUSB loader**
   exposing read / erase / write‑LBA / flash‑info commands.

The "SPL loader" (a.k.a. `*_spl_loader_*.bin`) is just those two stages wrapped
in a single **RKBOOT** container so a host tool (`rkdeveloptool db`, RKDevTool,
or this web‑flasher over WebUSB) can stream them in one shot.

### RK3506 vs RK3506B

They are close enough to share almost all tooling, but **the DDR init blob
differs** — Luckfox notes the two have "significant differences in the initial
DDR mode." A loader built with the wrong DDR stage will typically fail to bring
up RAM on the other variant (observed first‑hand: a G2/RK3506 loader does not
work on a Zero W/RK3506B). The `usbplug` and SPL stages are identical between
them.

| Board (examples)                         | SoC      | Use this INI            |
|------------------------------------------|----------|-------------------------|
| Luckfox Lyra, Lyra Plus/Ultra (non‑W)    | RK3506   | `RK3506MINIALL.ini`     |
| Luckfox Lyra Zero W, Lyra Ultra W        | RK3506B  | `RK3506BMINIALL.ini`    |

> **Identity caveat.** In maskrom the device enumerates as Rockchip VID
> `0x2207`. Rockchip tools report the *Support Type* as **`RK350F`** for this
> family (and the rkbin INI's `[CHIP_NAME] NAME=RK350F` is literally that, not
> "RK3506"). On the boards we tested the maskrom product id was `0x350f`, but
> `0x350f` is the *support type*, not a primary‑source‑confirmed `idProduct` —
> don't rely on the PID to tell G2 from B (you can't; both report `RK350F`) or
> even to tell maskrom from loader. The reliable maskrom‑vs‑loader discriminator
> is the **low bit of `bcdUSB`** (`0` = maskrom, `1` = loader).

### Mainline status (why blobs at all)

RK3506 is not a mature mainline platform yet, so DDR init and the usbplug stub
are only available as Rockchip‑provided binaries in `rkbin`. The DDR blob in
particular is closed; there is no open replacement, which is why maskrom flashing
depends on these prebuilt components.

---

## Option A — canonical build with `rkbin` + `boot_merger` (recommended)

This is the path Rockchip and U‑Boot use, and what we recommend for Armbian.

### 1. Get a `boot_merger`

`boot_merger` exists in three interchangeable forms (same RKBOOT format):

- **Prebuilt in rkbin:** `rkbin/tools/boot_merger` (x86‑64 Linux ELF).
- **Source in U‑Boot:** `tools/rockchip/boot_merger.c` — the readable
  implementation, built by U‑Boot's `make.sh`. Use this on non‑x86 hosts.
- **`rkdeveloptool pack`:** runs the identical merge logic.

### 2. Run it against the INI

```sh
git clone https://github.com/rockchip-linux/rkbin
cd rkbin
./tools/boot_merger RKBOOT/RK3506MINIALL.ini     # or RK3506BMINIALL.ini
```

The single argument is the INI describing the chip, the component paths, and the
output name. The result is `rk3506_spl_loader_v1.06.112.bin` (the version suffix
encodes **DDR v1.06 + SPL v1.12**). U‑Boot's `make.sh` then just
`mv ${RKBIN}/*_loader_*.bin ./`.

### 3. The four RK3506 INIs

All four live in `rkbin/RKBOOT/` and produce the same output name; they differ
**only** in which DDR blob they select:

| INI                        | DDR (code 471 / FlashData) blob                    |
|----------------------------|----------------------------------------------------|
| `RK3506MINIALL.ini`        | `bin/rk35/rk3506_ddr_750MHz_v1.06.bin`             |
| `RK3506BMINIALL.ini`       | `bin/rk35/rk3506b_ddr_750MHz_v1.06.bin`            |
| `RK3506MINIALL_RT.ini`     | `bin/rk35/rk3506_ddr_750MHz_rt_v1.06.bin`          |
| `RK3506BMINIALL_RT.ini`    | `bin/rk35/rk3506b_ddr_750MHz_rt_v1.06.bin`         |

(`_RT` = real‑time DDR tuning; use the non‑RT files unless you specifically need
the RT DDR profile.)

### 4. `RK3506MINIALL.ini` verbatim

```ini
[CHIP_NAME]
NAME=RK350F
[VERSION]
MAJOR=1
MINOR=1
[CODE471_OPTION]
NUM=1
Path1=bin/rk35/rk3506_ddr_750MHz_v1.06.bin
[CODE472_OPTION]
NUM=1
Path1=bin/rk35/rk3506_usbplug_v1.03.bin
[LOADER_OPTION]
NUM=2
LOADER1=FlashData
LOADER2=FlashBoot
FlashData=bin/rk35/rk3506_ddr_750MHz_v1.06.bin
FlashBoot=bin/rk35/rk3506_spl_v1.12.bin
[LOADER2_PARAM]
LOAD_ADDR=0x3f00000
FLAG=0x0
[OUTPUT]
PATH=rk3506_spl_loader_v1.06.112.bin
IDB_PATH=rk3506_idblock_v1.06.112.img
[SYSTEM]
NEWIDB=true
[FLAG]
471_RC4_OFF=true
RC4_OFF=true
CREATE_IDB=true
```

`RK3506BMINIALL.ini` is identical except the two DDR lines point at
`rk3506b_ddr_750MHz_v1.06.bin`.

### 5. Component blobs (in `rkbin/bin/rk35/`)

| Role                    | File                                | Notes                          |
|-------------------------|-------------------------------------|--------------------------------|
| DDR init — RK3506       | `rk3506_ddr_750MHz_v1.06.bin`       | code 471                        |
| DDR init — RK3506B      | `rk3506b_ddr_750MHz_v1.06.bin`      | code 471                        |
| DDR init — RT variants  | `rk3506{,b}_ddr_750MHz_rt_v1.06.bin`| code 471                        |
| usbplug (shared)        | `rk3506_usbplug_v1.03.bin`          | code 472 — same for G2 and B    |
| SPL (FlashBoot)         | `rk3506_spl_v1.12.bin`              | LOADER stage / IDB (not in db)  |

`471_RC4_OFF=true` / `RC4_OFF=true` mean the merger does **not** RC4‑encrypt the
471/472 payloads — the blobs ship already in the form the BootROM expects, and
the download path sends them **raw**.

### What the output actually contains

The full `rk3506_spl_loader_v1.06.112.bin` carries the **471 (ddr)** and
**472 (usbplug)** entries that the USB **db** sequence uses, *plus* a `LOADER`
section (`FlashData` + `FlashBoot`) and an IDB used when writing the bootloader
to flash. **Only the 471/472 entries are used for maskrom USB bring‑up.**

---

## Option B — minimal db‑only merge (what this web‑flasher bundles)

The maskrom **db** path reads only the **471** and **472** entries; it ignores
`chipType`, the `LOADER` section, the IDB, and the file‑level CRC32. So the two
loaders we ship in [`public/rockchip/`](../public/rockchip/) are a *stripped*
RKBOOT image — just the two entries the BootROM needs:

| File (our name)            | Built from            | 471 (ddr)      | 472 (usbplug)   |
|----------------------------|-----------------------|----------------|-----------------|
| `rk3506_spl_loader.bin`    | RK3506 components      | rk3506 ddr     | shared usbplug  |
| `rk3506b_spl_loader.bin`   | RK3506B components     | rk3506b ddr    | shared usbplug  |

Both are 67,852 bytes; the only difference between them is the 471/ddr payload.
Parsed header/entries (identical except the ddr bytes):

```
tag "BOOT"  headerSize 102  chipType 0  signFlag 0  rc4Flag 1  loaderNum 0
  471: type 1  name "ddr"      size 18952 B  delay 100 ms   @offset 216
  472: type 2  name "usbplug"  size 48680 B  delay  20 ms   @offset 19168
  + 4 trailing bytes (file CRC32 field, left 0 — unused by db)
```

`chipType=0`, no build timestamp, and a zero CRC32 trailer are the tells that
these were produced by a tiny custom merger rather than `boot_merger`. They work:
the RK3506B loader brought up the Zero W's onboard SPI‑NAND (255.5 MB) over
WebUSB. **For anything beyond db (e.g. writing the loader to flash) build the
full loader with Option A.**

### Reproducible minimal merge

This Python rebuilds our exact bundled files from the two rkbin component blobs
(round‑trips byte‑for‑byte against what we ship):

```python
import struct

def rkboot_entry(etype, name, data_off, data_size, delay_ms):
    e = bytearray(57)                       # BOOT_RESERVED_SIZE
    e[0] = 57                               # entry record size
    struct.pack_into('<I', e, 1, etype)     # 1 = code471, 2 = code472
    nm = name.encode('utf-16-le')           # name[20] uint16, NUL-padded
    e[5:5+len(nm)] = nm
    struct.pack_into('<I', e, 45, data_off)
    struct.pack_into('<I', e, 49, data_size)
    struct.pack_into('<I', e, 53, delay_ms)
    return bytes(e)

def merge(ddr_bin, usbplug_bin, out):
    ddr = open(ddr_bin, 'rb').read()
    usb = open(usbplug_bin, 'rb').read()
    hdr = bytearray(102)                     # rk_boot_header (pack(1))
    struct.pack_into('<I', hdr, 0, 0x544F4F42)   # tag "BOOT"
    struct.pack_into('<H', hdr, 4, 102)          # header size
    struct.pack_into('<I', hdr, 6, 0x00010600)   # version
    # releaseTime + chipType left 0
    hdr[25] = 1; struct.pack_into('<I', hdr, 26, 102); hdr[30] = 57   # code471 entry
    hdr[31] = 1; struct.pack_into('<I', hdr, 32, 159); hdr[36] = 57   # code472 entry
    hdr[44] = 1                                   # rc4Flag
    off_ddr = 216                                 # 102 + 57 + 57
    off_usb = off_ddr + len(ddr)
    img = (bytes(hdr)
           + rkboot_entry(1, 'ddr',     off_ddr, len(ddr), 100)
           + rkboot_entry(2, 'usbplug', off_usb, len(usb), 20)
           + ddr + usb
           + b'\x00\x00\x00\x00')               # file CRC32 field (unused by db)
    open(out, 'wb').write(img)

# merge('rk3506b_ddr_750MHz_v1.06.bin', 'rk3506_usbplug_v1.03.bin',
#       'rk3506b_spl_loader.bin')
```

> A *proper* `boot_merger` output ends with a real Rockchip CRC32
> (table factor `0x04C10DB7`, MSB‑first, init 0, stored little‑endian over all
> preceding bytes). The db path doesn't check it, so we leave it zero; populate
> it if you want a fully conformant image.

---

## The RKBOOT container format (reference)

From `boot_merger.h` (`#pragma pack(1)`). All multi‑byte fields little‑endian.

**`rk_boot_header` — 102 bytes**

| Off | Size | Field            | Notes                                        |
|----:|-----:|------------------|----------------------------------------------|
| 0   | 4    | `tag`            | `0x544F4F42` = "BOOT"                         |
| 4   | 2    | `size`           | header size (102)                            |
| 6   | 4    | `version`        |                                              |
| 10  | 4    | `mergerVersion`  |                                              |
| 14  | 7    | `releaseTime`    | year(2) month day hour min sec               |
| 21  | 4    | `chipType`       |                                              |
| 25  | 1    | `code471Num`     | number of 471 entries                        |
| 26  | 4    | `code471Offset`  | file offset of first 471 entry               |
| 30  | 1    | `code471Size`    | size of **each** 471 entry record (57)       |
| 31  | 1    | `code472Num`     |                                              |
| 32  | 4    | `code472Offset`  |                                              |
| 36  | 1    | `code472Size`    | (57)                                         |
| 37  | 1    | `loaderNum`      |                                              |
| 38  | 4    | `loaderOffset`   |                                              |
| 42  | 1    | `loaderSize`     |                                              |
| 43  | 1    | `signFlag`       |                                              |
| 44  | 1    | `rc4Flag`        |                                              |
| 45  | 57   | `reserved`       |                                              |

**`rk_boot_entry` — 57 bytes** (one per 471 / 472 / loader item)

| Off | Size | Field        | Notes                                   |
|----:|-----:|--------------|-----------------------------------------|
| 0   | 1    | `size`       | 57                                      |
| 1   | 4    | `type`       | 1=471, 2=472, 4=loader                  |
| 5   | 40   | `name`       | `uint16[20]` UTF‑16LE, NUL‑terminated   |
| 45  | 4    | `dataOffset` | file offset of the payload              |
| 49  | 4    | `dataSize`   | payload length                          |
| 53  | 4    | `dataDelay`  | post‑download settle delay, ms          |

Layout: header → 471 entry record(s) → 472 entry record(s) → [loader records] →
payloads → 4‑byte file CRC32.

---

## How the loader is consumed: maskrom "download boot" (db) over USB

For anyone re‑implementing the download (e.g. over WebUSB — see this repo's
[`utils/rockchip/rkusb.ts`](../utils/rockchip/rkusb.ts), and `RKComm.cpp` /
`RKBoot.cpp` in `rockchip-linux/rkdeveloptool`):

1. Parse the RKBOOT image; for **code 471 first, then code 472**, take each
   entry's payload (`dataOffset` / `dataSize`).
2. Stream the payload to the device with a **vendor control transfer**:
   - `bmRequestType` = vendor | device | host‑to‑device (`0x40`)
   - `bRequest` = `0x0C`
   - `wValue` = `0`
   - `wIndex` = `0x471` for code 471, `0x472` for code 472
3. Send in chunks of **≤ 4096 bytes**. After each chunk append a **CRC‑16/
   CCITT‑FALSE** (poly `0x1021`, init `0xFFFF`, no reflection, no final XOR;
   check value `0x29B1` over `"123456789"`), **big‑endian**, as the last 2 bytes.
   Mind the 4096‑boundary padding edge cases (a chunk landing one byte short of a
   4096 multiple gets a pad byte folded into the CRC; see the source for exact
   handling).
4. Honor each entry's `dataDelay` after sending it (471 = 100 ms, 472 = 20 ms in
   the RK3506 loaders).
5. **No RC4 in the host path** — with `RC4_OFF`, the 471/472 payloads are already
   in the form the BootROM expects and are sent raw; the maskrom side handles any
   decryption.

After 472 runs, the device resets and re‑enumerates as a RockUSB **loader**
(`bcdUSB` low bit = 1), now answering flash‑info / read / erase / write‑LBA.

---

## Verifying a loader

Inspect any RKBOOT image with:

```python
import struct
d = open('rk3506b_spl_loader.bin', 'rb').read()
assert d[:4] == b'BOOT'
def entry(o):
    name = bytes(d[o+5:o+45]).decode('utf-16-le').split('\x00')[0]
    return name, struct.unpack_from('<I', d, o+49)[0], struct.unpack_from('<I', d, o+53)[0]
print('471', entry(struct.unpack_from('<I', d, 26)[0]))   # ('ddr', 18952, 100)
print('472', entry(struct.unpack_from('<I', d, 32)[0]))   # ('usbplug', 48680, 20)
```

The bundled files' SHA‑256:

```
rk3506_spl_loader.bin   a632c51b6ef038dc3eb51b2749011af5ad997c7f5fc4196f589b374b0f1ec001
rk3506b_spl_loader.bin  e59ec91c612ab8b822d4b94ac8621ffdb8a3acb3fc1f5cce32ea0e66e70187df
```

---

## License / redistribution

The component blobs come from `rockchip-linux/rkbin` under Rockchip's
proprietary license (© Rockchip Electronics, 2017‑2023). It **permits** using,
copying, and distributing the software and redistributing modifications, **but**
forbids reverse‑engineering the blobs and requires keeping Rockchip's copyright /
trademark notices intact. It is not an OSI/open‑source license. Redistributing a
loader merged from these components (as this project does) is allowed under those
terms.

---

## References

- rkbin RK3506 INIs: `RKBOOT/RK3506MINIALL.ini`, `RK3506BMINIALL.ini`
  (`_RT` siblings) — <https://github.com/rockchip-linux/rkbin/tree/master/RKBOOT>
- rkbin components: <https://github.com/rockchip-linux/rkbin/tree/master/bin/rk35>
- rkbin license: <https://github.com/rockchip-linux/rkbin/blob/master/LICENSE>
- `boot_merger.h` / merge logic + db protocol:
  <https://github.com/rockchip-linux/rkdeveloptool> (`boot_merger.h`,
  `RKBoot.cpp`, `RKComm.cpp`, `crc.cpp`, `main.cpp`)
- U‑Boot `boot_merger.c`: `tools/rockchip/boot_merger.c`
- This repo's WebUSB implementation:
  [`utils/rockchip/rkusb.ts`](../utils/rockchip/rkusb.ts)
- Luckfox Lyra / Lyra Zero W: <https://wiki.luckfox.com/Luckfox-Lyra/>
