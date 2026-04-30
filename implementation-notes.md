# 実装メモ

## 採用するExpo機能

本アプリでは、ローカル保存、写真追加、通知、通信状態判定を端末側で完結させる。ローカルデータはまずAsyncStorageに保持し、写真や同期用エクスポートファイルの扱いにはExpo FileSystemを利用する方針とする。写真の追加にはExpo ImagePickerを使い、カメラ起動前には権限確認を行う。日次検査の促進にはExpo Notificationsのローカル通知を使い、Androidでは通知チャンネルの作成と権限確認を行う。通信状態はExpo Networkの`isInternetReachable`を重視し、単なる接続状態ではなく実際のインターネット到達可能性を同期判断に用いる。

| 領域 | 採用モジュール | 実装上の注意 |
|---|---|---|
| ローカルファイル | `expo-file-system` | ユーザー生成データは`documentDirectory`相当の領域を使う。同期用JSONは水槽単位で生成する。 |
| 写真 | `expo-image-picker` | カメラ利用時は権限を確認し、キャンセル時に例外扱いしない。Androidの復帰時処理は将来拡張の対象とする。 |
| 日次リマインダー | `expo-notifications` | Androidでは通知チャンネルを作り、権限が許可されている場合だけ日次通知を設定する。 |
| 通信判定 | `expo-network` | `isInternetReachable`を用い、通信不安定時は同期を保留してローカル保存を続ける。 |

## Google Drive同期の扱い

Google Driveへの完全自動アップロードにはGoogle認証とDrive APIのOAuth設定が必要になる。初期実装では、アプリ内の同期画面でインターネット到達性、同期待ち件数、Drive向けの水槽別フォルダ構造プレビューを表示し、同期対象JSONを生成できる構造にする。OAuthクライアント設定が利用可能になった段階で、同じデータ生成層からDrive APIへ接続できるよう、同期ロジックは画面表示から分離する。

## 参照資料

[1]: https://docs.expo.dev/versions/latest/sdk/filesystem/ "Expo FileSystem"
[2]: https://docs.expo.dev/versions/latest/sdk/imagepicker/ "Expo ImagePicker"
[3]: https://docs.expo.dev/versions/latest/sdk/notifications/ "Expo Notifications"
[4]: https://docs.expo.dev/versions/latest/sdk/network/ "Expo Network"
