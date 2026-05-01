# Google Drive実同期設定メモ

この文書は、**Catfish Farm Logger** のGoogle Drive実同期機能について、アプリ内で実装済みの内容、Google Cloud Consoleで必要な設定、Manus管理環境と快斗さん側アカウント操作の切り分けをまとめたものです。

## 実装済みの内容

アプリには、Google OAuth 2.0のPKCE認証、SecureStoreによるトークン保存、Google Drive APIへのフォルダ作成とファイルアップロード処理を追加しています。Googleのインストール済みアプリ向けOAuth 2.0資料では、モバイルアプリがGoogle APIへアクセスする際にOAuth 2.0でユーザー同意を得る流れとPKCEの利用が説明されています。[1] 同期画面では、Google Drive接続、切断、ローカルJSONエクスポート、Driveアップロードを実行できます。

| 項目 | 実装内容 |
|---|---|
| 認証方式 | OAuth 2.0 Authorization Code Flow with PKCE |
| OAuthクライアント | iOS用OAuthクライアントIDを `VITE_GOOGLE_OAUTH_CLIENT_ID` として利用 |
| リダイレクトURI | `com.googleusercontent.apps.642943194749-jaf9ipi3lmad28i3buhnmp7u8jkjp9o0:/oauth2redirect/google` |
| 保存先 | `expo-secure-store` にアクセストークン、必要に応じてリフレッシュトークンを保存 |
| Drive権限 | `https://www.googleapis.com/auth/drive.file` |
| Drive構造 | ルートフォルダ配下に水槽別フォルダを作成し、JSONと写真をアップロード |

> `drive.file` スコープは、Google Drive API公式資料で非機密スコープとして示されており、アプリが作成した新規Driveファイル、またはユーザーがアプリで開いた・共有した既存ファイルを作成・変更する用途として説明されています。[2] ユーザーのGoogle Drive全体を無制限に読む目的ではありません。

## Google Cloud Console側で必要な設定

Google Cloud Consoleでは、Google Drive APIを有効化し、OAuth同意画面を設定したうえで、iOS用OAuthクライアントを作成します。Google公式資料では、Google APIを呼び出すアプリは対象APIを有効化し、OAuth 2.0クライアント認証情報を作成する必要があると説明されています。[1] 今回使用するiOS Bundle IDは次の値です。

```text
space.manus.catfish.farm.logger.t20260430102029
```

| Google Cloud Consoleの項目 | 入力・設定内容 |
|---|---|
| 有効化するAPI | Google Drive API |
| OAuth同意画面 | アプリ名、サポートメール、デベロッパー連絡先、テストユーザーを設定 |
| OAuthクライアント種別 | iOS |
| 名前 | `Catfish Farm Logger iOS` |
| バンドルID | `space.manus.catfish.farm.logger.t20260430102029` |
| App Store ID | App Store Connectでアプリ作成済みならApple ID、任意欄なら未入力可 |
| チームID | Apple DeveloperのMembership detailsに表示されるTeam ID |

## Manus環境と快斗さん側操作の切り分け

このアプリのソースコードとビルド前設定はManus管理環境にあります。そのため、`/home/ubuntu/catfish_farm_logger` へ移動するコマンドは快斗さんの手元PCでは実行できません。Manus環境内の実装、テスト、チェックポイント保存はこちらで行います。

| 作業 | 実行場所 | 担当 |
|---|---|---|
| アプリコード編集 | Manus管理環境 | Manus |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` の安全な登録 | Manusの設定カード | 快斗さんが入力、Manusが利用 |
| Google Cloud ConsoleでOAuthクライアント作成 | 快斗さんのGoogleアカウント | 快斗さん |
| Apple Developer Team ID確認 | 快斗さんのApple Developerアカウント | 快斗さん |
| TestFlight公開操作 | App Store Connect / Publish後の配布操作 | 快斗さん |

## 実同期時のアップロード構造

同期時には、アプリ内のローカル記録からDrive用のエクスポートパッケージを作成し、Google Drive内に以下のような構造で保存します。

```text
Catfish Farm Logger/
  catfish-farm-export.json
  Tank A/
    tank.json
    inspections.json
    feedings.json
    photos.json
    sync-log.json
    photos/
      001_<photo-id>.jpg
```

水槽が複数ある場合は、水槽ごとに同様のフォルダが作成されます。写真の拡張子は元URIから `jpg`、`png`、`heic` を推定します。

## 注意点

Google OAuthクライアントIDを変更した場合は、`VITE_GOOGLE_OAUTH_CLIENT_ID` と `app.config.ts` のGoogleリバースクライアントIDを一致させる必要があります。今回のplistから取得したリバースクライアントIDは次の値です。

```text
com.googleusercontent.apps.642943194749-jaf9ipi3lmad28i3buhnmp7u8jkjp9o0
```

また、OAuth認証やDrive APIアップロードは実機ビルド上で検証する必要があります。Expo WebBrowserの公式資料では、認証用途では `openAuthSessionAsync` を使い、iOSではアプリ設定のschemeでモバイルアプリへ戻る必要があると説明されています。[3] SecureStoreについても、AndroidとiOSで保存方式やアンインストール時の永続性が異なるため、最終確認はTestFlight、またはiOS実機のExpo開発ビルドで行ってください。[4]

## References

[1]: https://developers.google.com/identity/protocols/oauth2/native-app "OAuth 2.0 for iOS & Desktop Apps - Google Identity"
[2]: https://developers.google.com/drive/api/guides/api-specific-auth "Choose Google Drive API scopes - Google Drive API"
[3]: https://docs.expo.dev/versions/latest/sdk/webbrowser/ "Expo WebBrowser"
[4]: https://docs.expo.dev/versions/latest/sdk/securestore/ "Expo SecureStore"
