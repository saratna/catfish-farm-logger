# F-Droid Release Preparation

Catfish Farm Logger has been adjusted so that an **F-Droid distribution build** can run without exposing Google Drive sync surfaces. The standard build keeps Google Drive backup support, while the F-Droid build hides the Drive tabs and disables the automatic Drive upload coordinator by setting `EXPO_PUBLIC_DISTRIBUTION=fdroid`.

F-Droid inclusion still requires a public source repository, a recognized FLOSS license, and build metadata that points to a source commit. F-Droid’s own guidance states that apps in the main repository must be built from source, use a free software license, and avoid proprietary or tracking dependencies. The build metadata also identifies the exact `versionName`, `versionCode`, and source revision used for the APK build.[1] [2] [3]

| Area | Current project state | F-Droid action |
|---|---|---|
| Distribution mode | `lib/distribution.ts` defines `EXPO_PUBLIC_DISTRIBUTION=fdroid`. | Use this environment variable for F-Droid builds. |
| Google Drive | Standard build keeps Drive sync; F-Droid build hides Drive tabs and disables auto-sync. | Keep Drive unavailable in F-Droid metadata notes to avoid a proprietary network-service dependency. |
| Local data | Farm records remain local-first with AsyncStorage. | Confirm backup/export expectations in release notes. |
| Notifications | Local reminders and ntfy danger alerts remain usable. | If using public `ntfy.sh`, declare non-free network or configurable network-service behavior if requested by reviewers. |
| License | No final license file was found in the repository during preparation. | Choose a FLOSS license and add `LICENSE` before submission. |
| Source | F-Droid expects public source. | Push a tagged public repository commit and update metadata placeholders. |

## Build commands

Run checks in the same distribution mode that F-Droid reviewers will evaluate:

```bash
EXPO_PUBLIC_DISTRIBUTION=fdroid pnpm check
EXPO_PUBLIC_DISTRIBUTION=fdroid pnpm test
```

Generate a native Android project for F-Droid review or for a reproducible local build recipe:

```bash
pnpm fdroid:prebuild
cd android
./gradlew assembleRelease
```

The Expo prebuild step may modify native files. Commit the generated Android project if the final F-Droid recipe should avoid running Expo prebuild on the build server. Otherwise, document the prebuild command in F-Droid metadata and confirm that reviewers accept this path.

## Metadata files included

The repository now includes Fastlane-style text metadata under `metadata/en-US/` and an F-Droid metadata template under `metadata/space.manus.catfish.farm.logger.t20260430102029.yml.template`. Replace every placeholder before opening an F-Droid request.

| Placeholder | Meaning |
|---|---|
| `{{PUBLIC_SOURCE_REPO_URL}}` | Public Git repository URL. |
| `{{PUBLIC_ISSUE_TRACKER_URL}}` | Public issue tracker URL. |
| `{{LICENSE_ID}}` | SPDX-style license identifier accepted by F-Droid, such as `Apache-2.0`, `MIT`, or `GPL-3.0-or-later`. |
| `{{COMMIT_SHA_OR_TAG}}` | Git commit or tag that exactly builds this release. |

## References

[1]: https://f-droid.org/docs/Inclusion_Policy/ "F-Droid Inclusion Policy"
[2]: https://f-droid.org/docs/Inclusion_How-To/ "F-Droid Inclusion How-To"
[3]: https://f-droid.org/docs/Build_Metadata_Reference/ "F-Droid Build Metadata Reference"
[4]: https://f-droid.org/docs/Reproducible_Builds/ "F-Droid Reproducible Builds"
