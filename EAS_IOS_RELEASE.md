# iOS公開用EAS設定メモ

今回のエラーは、EAS設定ファイルがないことと、Expo側のEASプロジェクトがまだリンクされていないことが主因です。リポジトリ側には `eas.json` を追加し、`cli.appVersionSource` と `EAS_BUILD_NO_EXPO_GO_WARNING` を設定しました。

## こちらで修正済みの内容

| 対象 | 対応内容 |
|---|---|
| `eas.json` | `cli.appVersionSource` を `local` に設定しました。 |
| `eas.json` | `development`、`preview`、`production` の各ビルドプロファイルを追加しました。 |
| `eas.json` | Expo Go警告を抑制する `EAS_BUILD_NO_EXPO_GO_WARNING=true` を各プロファイルへ追加しました。 |

## ユーザー環境で一度だけ必要な操作

EASのプロジェクトIDはExpoアカウント上に作成されるため、Expoにログインした環境で一度だけ以下を実行してください。

```bash
cd catfish_farm_logger
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` が完了すると、`app.config.ts` へ `extra.eas.projectId` が追加またはリンクされます。その後、iOSの本番ビルドは以下で実行できます。

```bash
npx eas-cli@latest build --platform ios --profile production
```

既にExpo DashboardでEASプロジェクトを作成済みの場合は、`npx eas-cli@latest init --id <PROJECT_ID>` で既存プロジェクトへリンクできます。
