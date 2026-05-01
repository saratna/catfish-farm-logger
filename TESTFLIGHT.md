# TestFlight Distribution Guide

This project includes a dedicated **TestFlight** profile in `eas.json` and matching package scripts for building and submitting an iOS binary. Expo states that EAS Build can produce ready-to-submit binaries for Apple App Store distribution, and that Apple Developer Program membership is required for App Store release builds.[^1] Expo also documents that iOS submissions through EAS Submit are uploaded to App Store Connect and then appear in TestFlight after Apple processing.[^2]

| Area | Project Setting | Purpose |
|---|---|---|
| Build profile | `eas build --platform ios --profile testflight` | Creates a store-distribution iOS build suitable for App Store Connect/TestFlight. |
| Submit profile | `eas submit --platform ios --profile testflight` | Uploads the finished `.ipa` to App Store Connect for TestFlight processing. |
| Version source | `cli.appVersionSource = "remote"` | Lets EAS manage version/build number source of truth remotely after project linking. |
| Auto-increment | `autoIncrement = true` | Increments build numbers for repeated TestFlight uploads. |

## Current Configuration

The `testflight` profile is intentionally separate from `production`. This keeps beta delivery commands explicit and avoids confusing TestFlight upload with public App Store release.

```json
{
  "build": {
    "testflight": {
      "distribution": "store",
      "autoIncrement": true,
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "testflight": {
      "ios": {}
    }
  }
}
```

## Required One-Time Account Setup

Before running the TestFlight workflow, the app must be linked to an Expo/EAS project. Expo’s EAS Build setup guide instructs developers to install EAS CLI, log in with `eas login`, and configure a project for EAS Build.[^1] In this repository, the script is already available:

```sh
pnpm eas:init
```

You also need an Apple Developer Program account with App Store Connect access. Expo’s build setup guide states that Apple Developer Program membership is required to build for the Apple App Store.[^1] EAS Submit may prompt for Apple credentials or App Store Connect API-key configuration, and Expo states that iOS submit requires the App Store Connect app ID (`ascAppId`) and Apple authentication unless an API key is configured.[^2]

## Build and Submit Workflow

Run the following commands from the project root after `eas init` has linked the project.

| Step | Command | Expected Result |
|---:|---|---|
| 1 | `pnpm build:testflight` | EAS creates an iOS store-distribution `.ipa`. |
| 2 | `pnpm submit:testflight` | EAS uploads the selected/latest iOS build to App Store Connect. |
| 3 | App Store Connect | Apple processes the build; Expo notes that TestFlight processing commonly takes about 10–15 minutes but can vary.[^2] |
| 4 | TestFlight tab | Add internal testers immediately, or add external testers after Apple’s Beta App Review. |

Expo’s EAS Submit documentation clarifies that uploading to TestFlight is not the same as releasing publicly: a TestFlight build is not automatically released to the App Store, and production release still requires metadata, screenshots, questionnaires, build selection, and App Review submission in App Store Connect.[^2]

## Recommended App Store Connect Checklist

| Checklist Item | Status in Repository | Action Still Required in App Store Connect |
|---|---|---|
| Bundle identifier | Configured in `app.config.ts` | Confirm the generated bundle identifier maps to the App Store Connect app record. |
| App screenshots | Created in `assets/screenshots/` | Upload screenshots manually to the app listing. |
| Metadata draft | Created in `SCREENSHOTS.md` | Review and paste/edit metadata in App Store Connect. |
| Privacy details | Not stored in repository | Complete App Privacy questions based on actual data collection and Google Drive sync behavior. |
| Export compliance | `ITSAppUsesNonExemptEncryption: false` currently configured | Confirm this remains accurate before submission. |
| Beta testing notes | Not stored in repository | Add concise tester instructions describing local records and Google Drive sync. |

## Notes for 快斗さん

The current setup prepares the repository for TestFlight, but the upload itself must be run by an authenticated Expo/Apple account holder. If App Store Connect has not yet created the app record, create it first and use the same bundle identifier shown by `app.config.ts`. If the first submission prompts for `ascAppId`, use the App Store Connect app’s Apple ID from the App Information page.

## References

[^1]: Expo Docs, “Create your first build,” https://docs.expo.dev/build/setup/
[^2]: Expo Docs, “EAS Submit,” https://docs.expo.dev/submit/introduction/
