# Android公開一次資料メモ

Google Play Consoleの公式ヘルプでは、アプリ作成時にデフォルト言語、アプリ名、アプリ/ゲーム区分、無料/有料、ユーザー向け連絡先メール、ポリシーおよび米国輸出法の宣言、Play App Signing規約への同意が必要とされている。Google PlayはApp Bundleを使って端末構成ごとに最適化されたAPKを生成・配信し、パッケージ名は一意かつ永続で削除や再利用ができないと明記されている。

ストア掲載では、アプリ名は30文字、短い説明は80文字、完全な説明は4000文字の制限がある。連絡先メールは必須で、サポートサイトURLの追加が推奨されている。

プレビューアセットでは、Google Playストア掲載用アイコンは32-bit PNG、512px×512px、最大1024KBが必須である。フィーチャーグラフィックはJPEGまたは24-bit PNG、1024px×500pxが必須である。スクリーンショットは対応デバイスごとに最大8枚で、スマートフォン向けはアプリ体験と機能を伝える素材として使う。

Expo公式ドキュメントでは、EAS BuildのAndroid既定成果物はGoogle Play Store配布に最適化されたAndroid App Bundle、つまりAABである。端末へ直接インストールする場合はAPKプロファイルを使う。Google Play提出では、Google Play Developerアカウント、Play Consoleでのアプリ作成、Google Service Account、Expoアカウント認証、app.json/app.config.tsのandroid.package、production build、初回手動アップロードが前提となる。EAS Submitによる自動提出は、Google Play APIの制約により少なくとも初回手動アップロード後に使うのが基本である。

参照URL:

[1]: https://support.google.com/googleplay/android-developer/answer/9859152 "Create and set up your app - Play Console Help"
[2]: https://support.google.com/googleplay/android-developer/answer/1078870 "Add preview assets to showcase your app - Play Console Help"
[3]: https://docs.expo.dev/build-reference/apk/ "Build APKs for Android Emulators and devices - Expo Docs"
[4]: https://docs.expo.dev/submit/android/ "Submit to the Google Play Store - Expo Docs"
