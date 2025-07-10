# Description

<!-- Please provide a brief description of the changes in this PR -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature
- [ ] Documentation update
- [ ] Other (please describe):

## Testing

- [ ] I have tested these changes locally
- [ ] I have added/updated tests as appropriate
- [ ] All existing tests pass

---

## Hardware Model Acceptance Policy

### New Hardware Model Acceptance Policy

Due to limited availability and ongoing support, new Hardware Models will only be accepted from [Meshtastic Backers and Partners](https://meshtastic.com/). The Meshtastic team reserves the right to make exceptions to this policy.

#### Alternative for Community Contributors

You are welcome to use one of the existing DIY hardware models in your PlatformIO environment and create a pull request in the firmware project. Please note the following conditions:

- The device will **not** be officially supported by the core Meshtastic team.
- The device will **not** appear in the [Web Flasher](https://flasher.meshtastic.org/) or Github release assets.
- You will be responsible for ongoing maintenance and support.
- Community-contributed / DIY hardware models are considered experimental and will likely have limited or no testing.

#### Getting Official Support

To have your hardware model officially supported and included in the Meshtastic ecosystem, consider becoming a Meshtastic Backer or Partner. Visit [meshtastic.com](https://meshtastic.com/) for more information about partnership opportunities.

---

## Protected Files Notice

**The following files are protected and changes to them will be automatically rejected:**

- `public/data/hardware-list.json` - Auto-generated Hardware definitions (additionally see policy above)
- `types/resources.ts` - Auto-generated resource definitions
- `i18n/locales/**` - Translation files (managed via [Crowdin](https://meshtastic.crowdin.com/web-flasher))
