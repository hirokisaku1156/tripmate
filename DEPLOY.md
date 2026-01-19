# TripMate デプロイガイド

## 前提条件

- Node.js 18以上
- Supabaseプロジェクト（作成済み）
- Vercelアカウント（推奨）またはその他のホスティング

---

## 1. Supabase セットアップ

### 1.1 データベーススキーマの適用

Supabase SQL Editorで以下のファイルを**順番に**実行：

```
1. supabase/schema.sql              # 基本テーブル
2. supabase/profile_trigger.sql     # プロフィール自動作成トリガー
3. supabase/fix_rls.sql             # RLSポリシー
4. supabase/add_manual_members.sql  # 手動メンバー機能
5. supabase/add_is_settled_to_expenses.sql  # 精算済みフラグ
6. supabase/add_timezone_columns.sql  # タイムゾーン対応
7. supabase/add_ai_generated_column.sql  # AI生成フラグ
8. supabase/create_todos_memos.sql  # Todo & メモ機能
```

### 1.2 認証設定

Supabase Dashboard > Authentication > Providers:
- **Email** を有効化
- Confirm email を無効化（身内用途なので）

### 1.3 環境変数の取得

Supabase Dashboard > Settings > API から以下を取得：
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集

# 開発サーバー起動
npm run dev
```

### .env.local の内容

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AIスクショ解析機能を使う場合（任意）
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

---

## 3. Vercel デプロイ

### 3.1 リポジトリ連携

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com) にログイン
3. "New Project" → GitHubリポジトリを選択
4. Framework Preset: `Next.js` を選択

### 3.2 環境変数設定

Vercel Dashboard > Project > Settings > Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API Key（任意） |

### 3.3 デプロイ

"Deploy" ボタンをクリック。自動的にビルド・デプロイされます。

---

## 4. PWA インストール

### iPhone/iPad

1. Safari でサイトを開く
2. 共有ボタン → "ホーム画面に追加"
3. "追加" をタップ

### Android

1. Chrome でサイトを開く
2. メニュー → "アプリをインストール" または "ホーム画面に追加"

---

## 5. トラブルシューティング

### 認証エラー

- Supabase の Site URL が正しいか確認
- Redirect URLs に本番URLを追加

### RLSエラー

- SQLファイルが全て実行されているか確認
- `trip_members` テーブルにユーザーが登録されているか確認

### PWAがインストールできない

- HTTPSでアクセスしているか確認
- manifest.json が正しく配信されているか確認（DevTools > Application）

---

## 6. 本番運用チェックリスト

- [ ] Supabase SQLスキーマ適用完了
- [ ] 環境変数設定完了
- [ ] テストユーザーで動作確認
- [ ] PWAインストール確認
- [ ] 海外からのアクセス確認（可能であれば）

---

## 海外利用について

TripMateは海外でも問題なく使用できます：

- **データ通信**: Supabaseは世界中からアクセス可能
- **タイムゾーン**: 旅程ごとに出発/到着TZを個別設定可能
- **オフライン**: 現時点ではオフライン対応なし（データ通信が必要）

### 推奨事項

- 海外SIMまたはWi-Fiを確保
- 重要な情報（予約番号等）はスクリーンショットも保存
