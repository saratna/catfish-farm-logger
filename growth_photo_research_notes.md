# Growth and Photo Diagnosis Research Notes

## Expo SDK 54 implementation notes

Expo Camera uses `CameraView` for an active camera preview and `takePictureAsync()` to capture photos into the app cache. The local Expo SDK 54 documentation emphasizes that only one camera preview should be active at a time, permission must be handled before rendering the preview, and preview should be paused or unmounted when not visible to reduce CPU and battery use.

Expo ImagePicker provides `launchImageLibraryAsync()` for gallery selection and `launchCameraAsync()` for direct camera capture. The local Expo SDK 54 documentation notes that camera permission should be requested before `launchCameraAsync()`, and results must always be checked for `canceled` before reading `assets[0]`. For the first implementation, ImagePicker is simpler and safer than embedding a custom `CameraView`, because it avoids keeping an active preview in a tab screen.

## Disease and health signs for AI-assisted photo review

Mississippi State University Extension explains that infectious diseases became a primary limiting factor in catfish production as stocking and feeding rates increased, and reports that overall disease losses in catfish are dominated by bacterial, parasitic, and fungal causes. The app should therefore treat photo review as a screening aid, not as a veterinary diagnosis.

UF/IFAS Extension recommends daily observation of fish appearance, behavior, and feeding activity for early detection. It lists behavior concerns such as stopping feeding, lethargy, hanging listlessly in shallow water, gasping at the surface, or rubbing against objects. It also lists physical signs such as ulcers or hemorrhages, ragged fins, abnormal conformation, distended abdomen, and popeye.

SRAC Publication No. 477 on Enteric Septicemia of Catfish describes ESC behavior signs including tight circles, spiraling, spinning, tail chasing, lethargy, slow swimming near pond edge, head-up/tail-down posture, and stopping eating. It describes visible external signs including swollen abdomen, popeye, small red and white skin ulcers, petechial hemorrhage under the jaw or belly, and cranial ulceration.

## Feeding and growth context

Mississippi State University Extension states that catfish feeding and growth depend on water quality, fish size, cropping system, inventory estimation, and producer practice. It notes that diets that are too low in energy can slow growth and that feeding may need to be restricted when water quality or fish health is poor. Growth assessment in the app should therefore be framed as a trend indicator based on local records rather than a definitive biological diagnosis.

## Implementation implications

The new feature should store manual length and weight records with optional photo URI, notes, AI-derived estimated length and weight, visible sign flags, confidence, and safety disclaimer. Growth status should use recent measurements to calculate approximate specific growth rate and trend direction. The UI should clearly say that AI photo review is an advisory screening result and users should confirm with water-quality checks and aquaculture/veterinary specialists when severe signs appear.

## References

[1]: https://extension.msstate.edu/agriculture/catfish/diseases-catfish "Mississippi State University Extension — Diseases of Catfish"
[2]: https://extension.msstate.edu/agriculture/catfish/catfish-feeds-and-feeding "Mississippi State University Extension — Catfish Feeds and Feeding"
[3]: https://ask.ifas.ufl.edu/publication/FA004 "UF/IFAS Extension — Introduction to Fish Health Management"
[4]: https://srac.msstate.edu/pdfs/Fact%20Sheets/477%20Enteric%20Septicemia%20of%20Catfish.pdf "SRAC Publication No. 477 — Enteric Septicemia of Catfish"
