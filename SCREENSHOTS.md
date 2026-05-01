# App Store Screenshot Package

This package contains **App Store screenshot source assets** for Catfish Farm Logger. Apple App Store Connect accepts one to ten screenshots in `.jpeg`, `.jpg`, or `.png` format, and Apple’s current iPhone screenshot specification lists 6.9-inch portrait sizes including **1320 × 2868 px** and 6.5-inch portrait size **1284 × 2778 px**.[^1] Apple also states that, when the interface is the same across device sizes and localizations, the highest-resolution screenshots can be supplied and scaled down automatically.[^2]

| Screenshot Set | Pixel Size | Files | Intended Use |
|---|---:|---:|---|
| `iphone_69` | 1320 × 2868 | 5 PNG files | Primary iPhone App Store screenshots for 6.9-inch display wells. |
| `iphone_65` | 1284 × 2778 | 5 PNG files | Optional 6.5-inch display well when a separate legacy set is preferred. |

## Included Screenshots

| Order | File Prefix | Screen Theme | App Store Message |
|---:|---|---|---|
| 1 | `01_home_tank_overview` | Home / tank overview | Multiple tanks, daily inspection state, and pending sync count are visible quickly. |
| 2 | `02_daily_inspection_form` | Daily inspection | Water temperature, pH, dissolved oxygen, ammonia, nitrite, and notes are recorded together. |
| 3 | `03_feeding_weight_log` | Feeding and weight log | Feed type, feed amount, average fish weight, and feeding behavior are saved in one workflow. |
| 4 | `04_google_drive_sync` | Google Drive sync | Local-first records can be backed up into Drive folders by tank and month. |
| 5 | `05_settings_reminders` | Settings and reminders | Daily inspection reminder time, feed presets, and Drive root folder can be adjusted. |

## Suggested App Store Metadata Draft

**App Name:** Catfish Farm Logger

**Subtitle:** Offline pond records for catfish farms

**Promotional Text:** Record tank checks, feeding, weight, and photos even when farm internet is unstable. Sync structured folders to Google Drive when connectivity returns.

**Description:** Catfish Farm Logger is an offline-first farm record app designed for catfish pond and tank management. It helps farm staff record daily water checks, feeding logs, fish weight notes, and catfish photos from a mobile phone in portrait orientation. The app keeps data locally on the device first, so routine work can continue in field conditions where mobile internet is unreliable. When internet access is available, records can be organized for Google Drive backup by farm folder, tank, and month.

The app is intended for practical aquaculture routines: confirming that each tank has been inspected today, logging water temperature, pH, dissolved oxygen, ammonia and nitrite, tracking feed quantity and feed type, and keeping visual evidence of fish condition over time. It does not replace professional veterinary, laboratory, or water-quality advice; it provides a structured record-keeping workflow for farm operations.

**Keywords Draft:** catfish, aquaculture, fish farm, pond, tank, feeding, water quality, pH, dissolved oxygen, farm log, Google Drive

**Support URL Draft:** https://saratna.com

**Marketing URL Draft:** https://saratna.com

## Upload Notes

The PNG files are under `assets/screenshots/`. Each file is below Apple’s 10 MB per-image practical upload limit mentioned in App Store Connect guidance for screenshot uploads.[^2] Upload the 6.9-inch set first. If App Store Connect asks for 6.5-inch screenshots separately, upload the matching `iphone_65` files.

## References

[^1]: Apple Developer, “Screenshot specifications,” App Store Connect Help, https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
[^2]: Apple Developer, “Upload app previews and screenshots,” App Store Connect Help, https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
