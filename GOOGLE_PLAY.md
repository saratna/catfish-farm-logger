# Catfish Farm Logger Google Play公開手順書

**作成者:** Manus AI  
**対象アプリ:** Catfish Farm Logger  
**Androidパッケージ名:** `space.manus.catfish.farm.logger.t20260430102029`  
**現在の公開方針:** Android / Google Playを先行し、iOS TestFlightおよびApp Store公開は後続対応とする。

## 1. 現在の整備状況

Catfish Farm Loggerは、Expo SDK 54、React Native、TypeScript、NativeWindで構築したオフライン優先のナマズ養殖記録アプリである。今回のAndroid優先公開対応では、Google Playに提出しやすいようにAndroid用EASビルドスクリプト、Androidの`versionCode`、Google Drive同期で使用するAndroid OAuthクライアントIDの環境変数分岐、Google Play掲載用スクリーンショットを追加した。

| 項目 | 現在値または状態 | 備考 |
|---|---:|---|
| Androidパッケージ名 | `space.manus.catfish.farm.logger.t20260430102029` | Google Cloud ConsoleのAndroid OAuthクライアント作成時にも使用する。 |
| アプリ表示名 | `Catfish Farm Logger` | `app.config.ts`に設定済み。 |
| バージョン | `1.0.0` | Google Play上のユーザー向けバージョン名。 |
| Android versionCode | `1` | Google Playへ同じ値を再提出できないため、次回以降は増加させる。 |
| 本番ビルドコマンド | `pnpm build:android` | 内部的には`eas build --platform android --profile production`を実行する。 |
| プレビューAndroidビルド | `pnpm build:android:preview` | Play提出前の検証用。 |
| Play提出コマンド | `pnpm submit:android` | 初回はGoogle Play Consoleへの手動アップロードが必要である。 |
| Google Drive同期 | 実装済み | Android本番配布ではAndroid OAuthクライアントIDの追加が推奨される。 |
| Play用スクリーンショット | 4枚生成済み | `assets/screenshots/google_play/`に1080×1920 PNGを配置済み。 |

Expo公式ドキュメントでは、Google Play提出にはGoogle Play Developerアカウント、Play Consoleでのアプリ作成、Androidパッケージ名、productionビルド、初回手動アップロードなどが前提として示されている。[1] また、ExpoのAndroid production build資料では、Google Play配布向けの本番Androidビルド形式は`.aab`であり、`.apk`とは異なりGoogle Play経由で配布される形式だと説明されている。[2]

> Expo公式資料は、Google Play Storeへ提出する前提として「Build a production app」と「Upload your app manually at least once」を挙げている。[1]

## 2. Google Play公開までの推奨順序

Google Play公開は、いきなり本番公開ではなく、**内部テストトラック**での検証を経由する順序が安全である。Google Play Console上で初回アプリを作成し、EAS Buildで作成した`.aab`を最初に手動アップロードする。その後、Google Drive同期をAndroid実機で確認し、Play Consoleのアプリコンテンツ、データセーフティ、対象年齢、プライバシーポリシーなどを埋めてから審査へ進める。

| 順番 | 作業 | 実施者 | 成果物 |
|---:|---|---|---|
| 1 | Google Play Developerアカウントの登録 | 快斗さん | Play Consoleへアプリを作成できる状態。 |
| 2 | Play Consoleで新規アプリを作成 | 快斗さん | パッケージ名とストア掲載情報の受け皿。 |
| 3 | ExpoアカウントでEASプロジェクトをリンク | 快斗さん、またはログイン済み環境 | EAS Buildがプロジェクトに紐づく。 |
| 4 | `pnpm build:android`でAAB本番ビルド | Manus環境またはExpo/EAS環境 | Google Playへアップロードする`.aab`。 |
| 5 | 初回AABをPlay Consoleへ手動アップロード | 快斗さん | 内部テストリリース。 |
| 6 | EAS/Play Consoleの署名証明書SHA-1を確認 | 快斗さん | Android OAuthクライアント作成に必要なSHA-1。 |
| 7 | Google Cloud ConsoleでAndroid OAuthクライアント作成 | 快斗さん | `VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID`。 |
| 8 | Android OAuthクライアントIDを環境変数へ設定 | Manus環境 | Drive同期のAndroid本番設定。 |
| 9 | 内部テストでDrive同期・記録・写真導線を確認 | 快斗さん | 審査前の実機検証結果。 |
| 10 | Google Play本番審査へ送信 | 快斗さん | Google Play公開申請。 |

Expo公式の提出資料では、Google Play APIの制約により**最初のアップロードは手動で行う必要がある**とされている。[1] したがって、`pnpm submit:android`は初回アップロード後、またはサービスアカウント設定後の自動提出に使う位置づけである。

## 3. EAS BuildでAndroid AABを作成する

このプロジェクトでは`package.json`へAndroid向けスクリプトを追加しているため、通常は次のコマンドを使う。

```bash
cd /home/ubuntu/catfish_farm_logger
pnpm build:android
```

このコマンドは`eas build --platform android --profile production`を実行する。Expo公式資料でも、Google Play提出用のproductionビルド作成コマンドとして`eas build --platform android --profile production`が示されている。[1] 生成される本番AndroidビルドはGoogle Play配布向けの`.aab`形式である。[2]

| 用途 | コマンド | 補足 |
|---|---|---|
| Android本番AAB作成 | `pnpm build:android` | Google Play Consoleへアップロードする候補。 |
| Androidプレビュー作成 | `pnpm build:android:preview` | 内部確認用。配布経路はEASの設定に依存する。 |
| Android提出 | `pnpm submit:android` | 初回手動アップロード後、サービスアカウント設定済みの場合に使う。 |

EAS Buildを実行するにはExpoアカウントでのログインと、プロジェクトのEASリンクが必要である。未リンクの場合は、最初に`pnpm eas:init`または`eas init`を実行して、Expoアカウント側のプロジェクトと紐づける。

## 4. Android OAuthクライアントIDの取得手順

Google Drive同期はOAuth 2.0とPKCEで実装されている。Google公式資料では、インストール型アプリがGoogle APIへアクセスするためにはOAuth 2.0認可情報を作成し、アプリがリクエストするスコープに対してユーザーの同意を取得する流れが説明されている。[3] また、PKCEについては、認可リクエストごとにcode verifierとcode challengeを生成し、S256方式を推奨する旨が記載されている。[3]

本プロジェクトではiOS用OAuthクライアントIDは設定済みだが、Google PlayでAndroid実機配布する場合、Android用OAuthクライアントを別途作成するのが望ましい。Android OAuthクライアント作成には、パッケージ名と署名証明書のSHA-1フィンガープリントが必要になる。SHA-1はEAS BuildまたはGoogle Play App Signingの署名証明書が確定してから確認する。

| Google Cloud Console入力項目 | 入力値 |
|---|---|
| アプリケーションの種類 | Android |
| パッケージ名 | `space.manus.catfish.farm.logger.t20260430102029` |
| SHA-1証明書フィンガープリント | EAS/Google Play App Signingで確定した値 |
| 作成後に得る値 | Android OAuthクライアントID（`*.apps.googleusercontent.com`） |
| Manus側の環境変数名 | `VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID` |

作成後に得たAndroid OAuthクライアントIDは、Manus環境のシークレットとして`VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID`へ設定する。本実装では、Android環境ではこの値を優先し、未設定の場合は既存のiOSクライアントIDへフォールバックする。ただし、本番配布ではAndroid専用クライアントIDを設定した状態で再ビルドすることを推奨する。

## 5. Google Play掲載素材

Google Play Consoleのプレビューアセット資料では、スクリーンショットはアプリの機能、見た目、体験を伝えるために使うものと説明され、対応デバイス種別ごとに最大8枚まで追加できる。[4] また、アプリアイコンは512×512px、フィーチャーグラフィックは1024×500pxの要件が示されている。[4]

今回、Google Playのスマートフォン掲載向けに1080×1920pxのPNGを4枚生成した。これは縦向き9:16の一般的なPlay掲載サイズで、Google Play資料が求める大画面向け9:16の考え方とも整合する。[4]

| ファイル | サイズ | 内容 |
|---|---:|---|
| `assets/screenshots/google_play/01_tank_overview_google_play.png` | 1080×1920 | 水槽の状態サマリー。 |
| `assets/screenshots/google_play/02_daily_entry_google_play.png` | 1080×1920 | 日次検査値・給餌量の入力。 |
| `assets/screenshots/google_play/03_photo_log_google_play.png` | 1080×1920 | 魚の写真記録。 |
| `assets/screenshots/google_play/04_drive_sync_google_play.png` | 1080×1920 | Google Drive同期。 |

ストア掲載文言案は次の通りである。

| 項目 | 文言案 |
|---|---|
| アプリ名 | Catfish Farm Logger |
| 短い説明 | ナマズ養殖の水槽検査、給餌、写真、Drive同期を記録 |
| 詳細説明 | Catfish Farm Loggerは、ナマズ養殖現場の水槽管理を日々記録するためのオフライン優先アプリです。水温、pH、溶存酸素、アンモニア、亜硝酸、給餌量、平均体重、写真メモを水槽ごとに保存し、必要に応じてGoogle Driveへバックアップできます。通信が不安定な現場でも端末内に記録を保持し、後から同期できるため、日々の観察、異常の早期発見、出荷前管理の履歴整理に役立ちます。 |
| キーワード方針 | ナマズ養殖、水槽管理、給餌記録、水質記録、Google Driveバックアップ。 |
| 広告の有無 | 広告なしとして申告予定。 |
| ログイン要否 | アプリ自体の独自ログインはなし。Google Drive同期時のみGoogle OAuth同意が必要。 |
| 対象年齢 | 事業者・養殖担当者向け。Play Consoleの質問票で実態に合わせて回答する。 |

Google Playのアプリコンテンツページでは、プライバシーポリシー、広告有無、アプリへのアクセス方法、対象年齢、データセーフティなどの申告が必要になる。[5] Catfish Farm LoggerはGoogle Drive連携を行うため、どのデータを端末内とGoogle Driveに保存するかをプライバシーポリシーで明示する必要がある。

## 6. Google Play Consoleで埋めるべき主な項目

Google Play審査へ進む前に、Play Consoleの「アプリコンテンツ」と「ストア掲載情報」を整える必要がある。公式ヘルプでは、App contentページでプライバシーポリシー、広告有無、アプリへのアクセス、対象年齢、権限申告、コンテンツレーティング、プライバシーとセキュリティ実践などを管理すると説明されている。[5]

| 区分 | 設定項目 | Catfish Farm Loggerでの方針案 |
|---|---|---|
| ストア掲載 | アプリ名、短い説明、詳細説明 | 上記文言案をベースに登録する。 |
| グラフィック | アイコン、スクリーンショット、フィーチャーグラフィック | アイコンは既存アプリアイコンを使用し、スクリーンショットは生成済み4枚を使用する。必要に応じて1024×500のフィーチャーグラフィックを追加作成する。 |
| プライバシーポリシー | 公開URL | Google Drive同期と端末内保存の説明を含むURLを用意する。 |
| データセーフティ | 収集・共有・暗号化・削除 | 端末内保存、Google Driveアップロード、写真データの扱いを実態に合わせて申告する。 |
| アプリ権限 | 写真・通知など | 実際に使用する権限だけを説明する。 |
| 対象年齢 | Target audience | 養殖業務用途として回答する。 |
| 広告 | Ads declaration | 広告SDKを入れていないため「広告なし」方針。 |
| アプリアクセス | ログイン情報 | 独自ログインはないが、Google Drive同期は任意のGoogle OAuth操作である旨を説明する。 |

## 7. 現時点の未完了事項

Android公開に向けたアプリ側の設定は概ね整備済みだが、公開手続きとしては外部アカウント側の作業が残っている。特に、Android OAuthクライアントIDはEAS/Playの署名証明書SHA-1が確定してから作成するため、AABビルド後に対応する。

| 未完了事項 | 理由 | 次の処理 |
|---|---|---|
| Google Play Developerアカウント登録 | Play Console提出に必須 | 快斗さんのGoogleアカウントで登録する。 |
| Play Consoleでアプリ作成 | AABアップロード先が必要 | パッケージ名を確認して作成する。 |
| 初回AAB手動アップロード | Google Play APIの制約で初回は手動が必要 | EAS Build後に`.aab`をアップロードする。 |
| Android OAuthクライアントID設定 | SHA-1未確定 | EAS/Play署名SHA-1取得後にGoogle Cloud Consoleで作成する。 |
| プライバシーポリシーURL | Play Console申告に必要 | 既存サイト配下などに公開ページを用意する。 |
| 実機確認 | OAuthとDrive同期は実機での検証が重要 | 内部テストトラックで確認する。 |

## References

[1]: https://docs.expo.dev/submit/android/ "Expo Docs - Submit to the Google Play Store"  
[2]: https://docs.expo.dev/tutorial/eas/android-production-build/ "Expo Docs - Create a production build for Android"  
[3]: https://developers.google.com/identity/protocols/oauth2/native-app "Google Identity - OAuth 2.0 for Mobile & Desktop Apps"  
[4]: https://support.google.com/googleplay/android-developer/answer/9866151?hl=en "Google Play Console Help - Add preview assets to showcase your app"  
[5]: https://support.google.com/googleplay/android-developer/answer/9859455?hl=en "Google Play Console Help - Prepare your app for review"
