import config from '../config/index.js';

/**
 * メール送信サービス
 * 本番環境ではSMTPサーバーやクラウドメールサービスを使用
 * 開発環境ではコンソール出力でモック
 */
export class EmailService {
  constructor(emailConfig = {}) {
    this.config = {
      host: emailConfig.host || config.email?.host || 'localhost',
      port: emailConfig.port || config.email?.port || 587,
      secure: emailConfig.secure || config.email?.secure || false,
      user: emailConfig.user || config.email?.user || '',
      pass: emailConfig.pass || config.email?.pass || '',
      fromEmail: emailConfig.fromEmail || config.email?.fromEmail || 'noreply@example.com'
    };
    
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * パスワードリセットメールを送信
   * @param {string} email - 送信先メールアドレス
   * @param {string} resetToken - リセットトークン
   * @param {string} userName - ユーザー名
   * @returns {Promise<boolean>} 送信成功かどうか
   */
  async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${config.app?.frontendUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const subject = 'パスワードリセットのご案内';
    const html = this._generatePasswordResetHTML(userName, resetUrl, resetToken);
    const text = this._generatePasswordResetText(userName, resetUrl, resetToken);

    return await this._sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  /**
   * パスワード変更完了通知メールを送信
   * @param {string} email - 送信先メールアドレス
   * @param {string} userName - ユーザー名
   * @returns {Promise<boolean>} 送信成功かどうか
   */
  async sendPasswordChangeConfirmationEmail(email, userName = '') {
    const subject = 'パスワード変更完了のお知らせ';
    const html = this._generatePasswordChangeHTML(userName);
    const text = this._generatePasswordChangeText(userName);

    return await this._sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  /**
   * アカウント登録完了メールを送信
   * @param {string} email - 送信先メールアドレス
   * @param {string} userName - ユーザー名
   * @returns {Promise<boolean>} 送信成功かどうか
   */
  async sendWelcomeEmail(email, userName = '') {
    const subject = 'アカウント登録完了のお知らせ';
    const html = this._generateWelcomeHTML(userName);
    const text = this._generateWelcomeText(userName);

    return await this._sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  /**
   * メール送信の実装
   * 開発環境ではコンソール出力、本番環境では実際の送信
   * @private
   */
  async _sendEmail({ to, subject, html, text }) {
    try {
      if (this.isDevelopment) {
        // 開発環境: コンソールに出力
        console.log('\n=== EMAIL MOCK ===');
        console.log(`To: ${to}`);
        console.log(`From: ${this.config.fromEmail}`);
        console.log(`Subject: ${subject}`);
        console.log('Text Content:');
        console.log(text);
        console.log('\nHTML Content:');
        console.log(html);
        console.log('=================\n');
        
        return true;
      } else {
        // 本番環境: 実際のメール送信
        // TODO: nodemailer や SendGrid, AWS SES などの実装
        console.warn('Production email sending not implemented yet');
        return false;
      }
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  /**
   * パスワードリセットメールのHTMLテンプレート
   * @private
   */
  _generatePasswordResetHTML(userName, resetUrl, resetToken) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>パスワードリセット</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; padding: 20px; text-align: center; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>パスワードリセット</h1>
        </div>
        <div class="content">
            <h2>こんにちは${userName ? ` ${userName}さん` : ''}</h2>
            <p>パスワードのリセットが要求されました。</p>
            <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
            
            <a href="${resetUrl}" class="button">パスワードをリセット</a>
            
            <div class="warning">
                <strong>⚠️ 重要な注意事項</strong>
                <ul>
                    <li>このリンクは1時間後に無効になります</li>
                    <li>リンクは1回のみ使用できます</li>
                    <li>心当たりがない場合は、このメールを無視してください</li>
                </ul>
            </div>
            
            <p>ボタンがクリックできない場合は、以下のURLを直接ブラウザにコピーしてください：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">
                ${resetUrl}
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。返信しないでください。</p>
            <p>Token: ${resetToken.substring(0, 8)}...</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * パスワードリセットメールのテキストテンプレート
   * @private
   */
  _generatePasswordResetText(userName, resetUrl, resetToken) {
    return `
パスワードリセットのご案内

こんにちは${userName ? ` ${userName}さん` : ''}

パスワードのリセットが要求されました。
以下のURLにアクセスして、新しいパスワードを設定してください：

${resetUrl}

重要な注意事項：
- このリンクは1時間後に無効になります
- リンクは1回のみ使用できます
- 心当たりがない場合は、このメールを無視してください

このメールは自動送信されています。返信しないでください。
Token: ${resetToken.substring(0, 8)}...
`;
  }

  /**
   * パスワード変更完了メールのHTMLテンプレート
   * @private
   */
  _generatePasswordChangeHTML(userName) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>パスワード変更完了</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { font-size: 12px; color: #666; padding: 20px; text-align: center; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ パスワード変更完了</h1>
        </div>
        <div class="content">
            <h2>こんにちは${userName ? ` ${userName}さん` : ''}</h2>
            <div class="success">
                <strong>パスワードの変更が正常に完了しました。</strong>
            </div>
            <p>変更日時: ${new Date().toLocaleString('ja-JP')}</p>
            <p>心当たりがない場合は、すぐにサポートまでご連絡ください。</p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。返信しないでください。</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * パスワード変更完了メールのテキストテンプレート
   * @private
   */
  _generatePasswordChangeText(userName) {
    return `
パスワード変更完了のお知らせ

こんにちは${userName ? ` ${userName}さん` : ''}

パスワードの変更が正常に完了しました。

変更日時: ${new Date().toLocaleString('ja-JP')}

心当たりがない場合は、すぐにサポートまでご連絡ください。

このメールは自動送信されています。返信しないでください。
`;
  }

  /**
   * ウェルカムメールのHTMLテンプレート
   * @private
   */
  _generateWelcomeHTML(userName) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>アカウント登録完了</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { font-size: 12px; color: #666; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 ようこそ！</h1>
        </div>
        <div class="content">
            <h2>こんにちは${userName ? ` ${userName}さん` : ''}</h2>
            <p>アカウントの登録が完了しました。</p>
            <p>今すぐサービスをお楽しみいただけます。</p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。返信しないでください。</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * ウェルカムメールのテキストテンプレート
   * @private
   */
  _generateWelcomeText(userName) {
    return `
アカウント登録完了のお知らせ

こんにちは${userName ? ` ${userName}さん` : ''}

アカウントの登録が完了しました。
今すぐサービスをお楽しみいただけます。

このメールは自動送信されています。返信しないでください。
`;
  }
}

// デフォルトエクスポート
const emailService = new EmailService();
export default emailService;