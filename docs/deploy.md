# デプロイガイド

このプロジェクトのデプロイは **GitHub Actions**（バックエンド）と **Amplify Hosting**（フロントエンド）に役割を分けています。

## デプロイの仕組み

```
git push origin main
  │
  ├─ GitHub Actions (deploy.yml)
  │    ├─ ampx pipeline-deploy  →  Cognito + AgentCore Runtime をデプロイ
  │    └─ Webhook curl          →  Amplify Hosting のフロントビルドを起動
  │
  └─ Amplify Hosting (amplify.yml)
       ├─ ampx generate outputs  →  amplify_outputs.json を取得
       └─ vite build             →  React SPA をビルドしてホスティング
```

Amplify Hosting のビルド（`amplify.yml`）は GitHub Actions の Webhook で起動されます。**Amplify コンソール上の「自動デプロイ」は必ずオフにしてください**。有効のままだと git push のたびに二重デプロイが走ります。

---

## 環境変数・シークレット一覧

### GitHub Secrets（必須）

| シークレット名 | 説明 |
|---|---|
| `AWS_ROLE_ARN` | GitHub Actions が AssumeRole する IAM ロールの ARN |
| `AMPLIFY_APP_ID` | Amplify Hosting のアプリ ID（`d1xxxxxxxxx` 形式） |
| `AMPLIFY_WEBHOOK_URL` | Amplify Hosting の Incoming Webhook URL |
| `ALLOWED_EMAIL_DOMAIN` | Cognito サインアップを許可するメールドメイン（例: `example.com`） |

**Settings → Secrets and variables → Actions** から登録します。

### GitHub Actions が CDK に渡す環境変数

`deploy.yml` の `Deploy Amplify backend` ステップで設定される環境変数です。`ampx pipeline-deploy` の CDK 実行プロセスが `process.env.*` で参照します。

| 環境変数名 | 設定値 | 参照先 |
|---|---|---|
| `ALLOWED_EMAIL_DOMAIN` | `${{ secrets.ALLOWED_EMAIL_DOMAIN }}` | `amplify/auth/pre-signup/resource.ts` の Lambda 環境変数 |
| `AUTH_REDIRECT_URLS` | `https://main.{AMPLIFY_APP_ID}.amplifyapp.com/` | `amplify/auth/resource.ts` の Cognito コールバック URL |
| `CORS_ORIGIN` | `https://main.{AMPLIFY_APP_ID}.amplifyapp.com` | `amplify/backend.ts` 経由で AgentCore Runtime コンテナに注入 |

これらは `deploy.yml` に記載済みで、GitHub Secrets から自動的に組み立てられます。手動追加は不要です。

### AgentCore Runtime コンテナ環境変数

`amplify/backend.ts` の `environmentVariables` でコンテナに渡される値です。

| 環境変数名 | 値 | 説明 |
|---|---|---|
| `PORT` | `8000` | AgentCore Runtime MCP 契約（固定値・変更不可） |
| `AWS_REGION` | `ap-northeast-1` | Bedrock Converse を呼ぶリージョン |
| `CORS_ORIGIN` | デプロイ時に `CORS_ORIGIN` 環境変数から注入 | 許可するブラウザオリジン（後述） |

### ローカル開発用 `.env`（リポジトリルート）

| 環境変数名 | 例 | 説明 |
|---|---|---|
| `ALLOWED_EMAIL_DOMAIN` | `example.com` | sandbox 環境の Cognito に適用されるドメイン制限 |
| `AUTH_REDIRECT_URLS` | `http://localhost:5173/` | sandbox の Cognito コールバック URL |
| `CORS_ORIGIN` | 省略可 | 省略時は `http://localhost:5173` がデフォルト |

---

## CORS の設定について

### なぜ CORS 設定が必要か

本番環境では、ブラウザ（`https://main.{AMPLIFY_APP_ID}.amplifyapp.com`）が直接 AgentCore Runtime のエンドポイント（`https://bedrock-agentcore.ap-northeast-1.amazonaws.com/...`）を呼びます。異なるオリジン間の通信になるため、MCP サーバー（`server/src/server.ts`）が適切な `Access-Control-Allow-Origin` ヘッダーを返す必要があります。

### 本番での設定フロー

```
deploy.yml
  └─ env: CORS_ORIGIN=https://main.{APP_ID}.amplifyapp.com
       └─ ampx pipeline-deploy (CDK 実行)
            └─ amplify/backend.ts の environmentVariables に注入
                 └─ AgentCore コンテナ起動時の環境変数として設定
                      └─ server.ts: cors({ origin: process.env.CORS_ORIGIN })
```

`CORS_ORIGIN` は `deploy.yml` で `AMPLIFY_APP_ID` シークレットから自動的に組み立てられるため、**追加の設定作業は不要**です。

### ローカル開発での CORS

`.env` に `CORS_ORIGIN` を設定しなければ、`http://localhost:5173` がデフォルトになります（`pnpm dev:host` のデフォルトポートと一致）。別のポートを使う場合は `.env` に `CORS_ORIGIN=http://localhost:<PORT>` を追加してください。

### カスタムドメインを使う場合

Amplify Hosting にカスタムドメインを設定している場合は、`CORS_ORIGIN` に対応する環境変数をどこかで上書きする必要があります。`deploy.yml` の `CORS_ORIGIN` 行を以下のように変更してください。

```yaml
# deploy.yml
CORS_ORIGIN: https://your-custom-domain.example.com
```

または GitHub Secrets に `FRONTEND_URL` を追加して参照する方法も取れます。

```yaml
CORS_ORIGIN: ${{ secrets.FRONTEND_URL }}
```

---

## Amplify Hosting の環境変数設定

Amplify Hosting のビルド（`amplify.yml`）は `ampx generate outputs` を実行するだけなので、Amplify Console 上での追加の環境変数設定は**不要**です。

ただし、Amplify ビルド環境に渡したい `VITE_*` 変数（フロントエンドのビルド時定数）がある場合は、Amplify Console → **アプリ設定 → 環境変数** から設定します。

現時点でこのプロジェクトが使用する `VITE_*` 変数:

| 変数名 | 用途 |
|---|---|
| `VITE_MCP_ENDPOINT` | AgentCore の代わりにローカルの MCP サーバーへ接続（開発専用）。本番ビルドでは設定しない |

---

## デプロイ手順（初回）

1. **IAM ロールの作成** — GitHub OIDC プロバイダーを信頼する AssumeRole ポリシーを持つロールを作成（README「AWS 側の準備」参照）
2. **Amplify Hosting アプリの作成** — コンソールでアプリを作成し、自動デプロイをオフにする（README「Amplify Hosting アプリの作成」参照）
3. **Incoming Webhook の作成** — Amplify コンソール → アプリ設定 → Webhook
4. **GitHub Secrets を登録** — 上表の4つのシークレットを設定
5. **main ブランチに push** — GitHub Actions が自動起動し、バックエンド→フロントエンドの順にデプロイされる

初回デプロイは AgentCore コンテナのビルドと ECR push が含まれるため、10〜20 分程度かかります。

## デプロイ手順（2回目以降）

`main` ブランチへの push で自動実行されます。`deploy.yml` の `paths` に変更がないファイルは GitHub Actions をスキップします。手動実行は **Actions → Deploy → Run workflow** から行えます。

---

## トラブルシューティング

### `CustomFunctionProviderDockerError`

Amplify のビルド環境で Docker が使えないというエラー。このプロジェクトでは `ampx pipeline-deploy` を Amplify CI/CD ではなく GitHub Actions から実行することで回避しています。Amplify Console から直接 backend を deploy しようとした場合に発生します。

### `exec format error`（ARM64 クロスビルド）

GitHub Actions の `ubuntu-latest` は AMD64 です。`docker/setup-qemu-action` と `docker/setup-buildx-action` の**両方**が必要です。どちらか一方だけでは動きません。

### `exit code 255`（alpine + QEMU）

`node:22-alpine`（musl libc）を QEMU の ARM64 エミュレーション上で実行するとクラッシュします。このプロジェクトでは `node:22-slim`（glibc）を使用しています。ローカルの Apple Silicon では再現せず、CI 上だけで失敗するため気づきにくい問題です。

### フロントエンドが古い状態でデプロイされる

GitHub Actions の Webhook トリガーは `ampx pipeline-deploy` の完了後に実行されます。Amplify Hosting のビルドログで `ampx generate outputs` が正しく `amplify_outputs.json` を取得できているか確認してください。
