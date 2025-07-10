# Node.js を用いて構築した API サーバーで、React 製のショップ管理システムをバックエンドからサポートしています、基本的な CRUD 機能（商品、ユーザー情報の追加・編集・削除・取得など）を提供しています。

## 🛠️ スタック紹介

  <ul>
    <li>バックエンドフレームワーク：Express</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;高速で柔軟性の高い Node.js 向け Web アプリケーションフレームワークです。</p>
    <li>データベース：MySQL</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;データ管理のために使用。</p>
    <li>認証トークン管理：JWT（jsonwebtoken）</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ログイン認証のためのトークン管理に使用。ユーザーの認証状態を安全に保持するために</p>
    <li>2段階認証（2FA）：speakeasy ＋ qrcode</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TOTPベースの2段階認証コード生成とQRコードの表示に使用。</p>
    <li>パスワードを安全に扱う：Bcrypt</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;パスワードのセキュリティを向上させるための強力なツール</p>
    <li>ファイルアップロード：multer</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;マルチパートフォームデータ（例：画像アップロードなど）を処理。</p>
    <li>ファイルシステム操作：fs、path</li>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ファイルの保存・読み込み・削除、パス操作などを行うために使用。</p>
  </ul>

<img width="100%" src="https://github.com/user-attachments/assets/1bf79ee6-3b2b-422c-a3c6-a98b75c7f57c" />
