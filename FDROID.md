# F-Droid 公開ガイド

Catfish Farm Logger は **F-Droid 配布ビルド** に対応しています。`EXPO_PUBLIC_DISTRIBUTION=fdroid` を設定することで Google Drive 同期画面を非表示にし、ローカル記録・検査リマインダー・ntfy 危険アラートはそのまま利用できます。

---

## 現在の公開状態

| 項目 | 内容 |
|------|------|
| GitHubリポジトリ | https://github.com/saratna/catfish-farm-logger |
| ライセンス | MIT |
| 対象コミット | `f18a24c9692efa789671fae285dc1fc78dac56df` |
| バージョン | 1.0.0 (versionCode: 1) |
| F-Droid配布フラグ | `EXPO_PUBLIC_DISTRIBUTION=fdroid` |

---

## F-Droid 要件チェックリスト

| 要件 | 状態 |
|------|------|
| ソースコードの公開 (OSS) | ✅ GitHub 公開済み |
| FLOSS ライセンス (MIT) | ✅ LICENSE ファイル追加済み |
| Google Play 非依存 | ✅ F-Droid ビルドで無効化済み |
| 非フリーな依存なし (F-Droid ビルド) | ✅ Google Drive 同期を無効化 |
| ビルドレシピ (YML) | ✅ `metadata/` に作成済み |
| 英語ストア説明文 | ✅ `metadata/en-US/` |
| 日本語ストア説明文 | ✅ `metadata/ja-JP/` |
| ntfy 通知 (自己ホスト可) | ✅ 対応済み |

---

## F-Droid への提出手順

### ステップ 1: fdroiddata リポジトリをフォーク

1. https://gitlab.com/fdroid/fdroiddata にアクセス
2. 右上の「Fork」をクリックして自分の GitLab アカウントにフォーク

### ステップ 2: メタデータファイルをコピー

フォークしたリポジトリの `metadata/` ディレクトリに以下のファイルを追加します。

```
metadata/space.manus.catfish.farm.logger.t20260430102029.yml
```

このファイルの内容は本リポジトリの同名ファイルをそのまま使用してください（プレースホルダーはすべて確定済みです）。

### ステップ 3: プルリクエストを作成

フォークから fdroiddata の `master` ブランチへプルリクエストを送ります。

**タイトル例:**
```
New app: Catfish Farm Logger (space.manus.catfish.farm.logger.t20260430102029)
```

**本文例:**
```
This is a local-first catfish farm daily log app for Android.

- License: MIT
- Source: https://github.com/saratna/catfish-farm-logger
- No proprietary dependencies in F-Droid build (Google Drive sync disabled via EXPO_PUBLIC_DISTRIBUTION=fdroid)
- ntfy notifications use self-hosted or public ntfy server (user-configurable)
- Tested build commit: f18a24c9692efa789671fae285dc1fc78dac56df
```

### ステップ 4: 審査対応

F-Droid チームがビルドを試みます。問題があればプルリクエストのコメントで指摘されます。
通常、審査には数週間〜数ヶ月かかります。

---

## ローカルビルド手順 (F-Droid 版 APK)

```bash
# F-Droid 配布モードで依存関係インストール
EXPO_PUBLIC_DISTRIBUTION=fdroid pnpm install --frozen-lockfile

# Android ネイティブプロジェクト生成
EXPO_PUBLIC_DISTRIBUTION=fdroid pnpm exec expo prebuild --platform android --clean

# APK ビルド
cd android && ./gradlew assembleRelease

# 出力先
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

または `pnpm fdroid:build` スクリプトを使用してください。

---

## バージョンアップ時の手順

1. `app.config.ts` の `versionCode` を +1 する
2. コードをコミットして GitHub へ push
3. `git tag v1.x.x` でタグを打つ
4. F-Droid メタデータ YML の `Builds:` セクションに新バージョンを追記
5. fdroiddata へ再度プルリクエストを送る

---

## 参考リンク

[1]: https://f-droid.org/docs/Inclusion_Policy/ "F-Droid Inclusion Policy"
[2]: https://f-droid.org/docs/Inclusion_How-To/ "F-Droid Inclusion How-To"
[3]: https://f-droid.org/docs/Build_Metadata_Reference/ "F-Droid Build Metadata Reference"
[4]: https://f-droid.org/docs/Reproducible_Builds/ "F-Droid Reproducible Builds"
