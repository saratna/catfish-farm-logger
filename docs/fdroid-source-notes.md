# F-Droid official source notes

Sources reviewed on 2026-05-11:

1. https://f-droid.org/docs/Inclusion_Policy/
2. https://f-droid.org/docs/Inclusion_How-To/

Key findings for Catfish Farm Logger:

| Area | Requirement or risk | Source basis |
|---|---|---|
| License and source | App needs a public source repository and a recognized FLOSS license file before inclusion. | Inclusion How-To prepare checklist |
| Dependencies | App should only have FOSS dependencies. Firebase, Google Mobile Services, Crashlytics, advertising, tracking SDKs, and proprietary analytics are not accepted in the main repository. | Inclusion Policy and Inclusion How-To |
| Build process | F-Droid builds from publicly accessible source using command-line tools in an isolated environment. Build instructions and metadata reduce reviewer burden. | Inclusion Policy and Inclusion How-To |
| Binary dependencies | Binary dependencies must be built from source or obtained from trusted sources such as Maven Central / Google Maven when FLOSS licensed. | Inclusion Policy |
| API keys | F-Droid does not sign up for API keys; provided keys are included in source and binary releases. | Inclusion Policy |
| Metadata | Fastlane/Triple-T style metadata text files and screenshots should be in the source repository before inclusion. | Inclusion How-To |
| Anti-features | Non-free network services, tracking, proprietary dependencies, or dependence on non-changeable services may be rejected or marked as Anti-Features. | Inclusion Policy and Inclusion How-To |

Immediate project implications:

The app currently includes Google OAuth / Google Drive sync features. These can be problematic for the main F-Droid repository because they require Google cloud services and OAuth configuration. The app can still be prepared for F-Droid review by documenting this clearly, keeping the app functional offline without Google, and considering a future `fdroid` build flavor that disables Google-specific sync if reviewers require it.

Additional official sources reviewed:

3. https://f-droid.org/docs/Reproducible_Builds/
4. https://f-droid.org/docs/Build_Metadata_Reference/

| Area | Requirement or risk | Source basis |
|---|---|---|
| Reproducible builds | F-Droid aims to let anyone repeatedly rebuild the same APK from source; APK byte-for-byte differences before signing can prevent verification. | Reproducible Builds |
| Upstream-signed APKs | F-Droid can publish upstream developer-signed APKs only when metadata includes binary/signing-key information and the APK matches the source build. | Reproducible Builds |
| Version fields | Build metadata uses `versionName`, `versionCode`, and `commit` to identify a source revision that produces an APK. | Build Metadata Reference |
| Build command | The `Builds.build` field contains shell commands to build during the F-Droid build phase, for example a Gradle assemble command. | Build Metadata Reference |
| Source metadata | Metadata should include human-friendly source URLs and repository information. | Build Metadata Reference |

Current implication:

An Expo managed app can be prepared for review, but the final F-Droid submission should provide either a generated native Android project in the public source tree or a documented F-Droid recipe that runs the non-interactive Expo prebuild step and then builds with Gradle. Because building Android APKs inside this sandbox can be resource-intensive, the project should document the expected commands and let F-Droid infrastructure or the UI Publish/EAS path perform real builds.
