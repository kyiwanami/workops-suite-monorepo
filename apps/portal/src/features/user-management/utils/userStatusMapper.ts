/**
 * Cognitoユーザーステータスを日本語に変換するマッパー
 */
export const userStatusToJapanese = (
  status: string | null | undefined
): string => {
  if (!status) return "不明";

  switch (status) {
    case "UNCONFIRMED":
      return "未確認";
    case "CONFIRMED":
      return "確認済み";
    case "ARCHIVED":
      return "アーカイブ済み";
    case "COMPROMISED":
      return "侵害された";
    case "UNKNOWN":
      return "不明";
    case "RESET_REQUIRED":
      return "パスワードリセット必須";
    case "FORCE_CHANGE_PASSWORD":
      return "パスワード変更必須";
    case "EXTERNAL_PROVIDER":
      return "外部プロバイダー";
    default:
      return status;
  }
};

/**
 * ユーザーの有効/無効状態を日本語に変換
 */
export const userEnabledStatusToJapanese = (
  enabled: boolean | null | undefined
): string => {
  if (enabled === undefined || enabled === null) return "不明";
  return enabled ? "有効" : "無効";
};

/**
 * ユーザー属性を日本語に変換するマッパー
 */
export const userAttributeToJapanese = (key: string): string => {
  const attributeMap: Record<string, string> = {
    email: "メールアドレス",
    email_verified: "メール検証済み",
    sub: "サブジェクトID",
    name: "名前",
    family_name: "姓",
    given_name: "名",
    middle_name: "ミドルネーム",
    nickname: "ニックネーム",
    preferred_username: "希望ユーザー名",
    profile: "プロフィール",
    picture: "プロフィール画像",
    website: "ウェブサイト",
    gender: "性別",
    birthdate: "生年月日",
    zoneinfo: "タイムゾーン",
    locale: "言語設定",
    phone_number: "電話番号",
    phone_number_verified: "電話番号検証済み",
    address: "住所",
    updated_at: "更新日時",
  };

  return attributeMap[key] || key;
};

/**
 * 属性値を適切な形式に変換する
 */
export const formatAttributeValue = (key: string, value: string): string => {
  if (key === "email_verified" || key === "phone_number_verified") {
    return value === "true" ? "済" : "未";
  }
  return value;
};
