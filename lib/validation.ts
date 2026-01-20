/**
 * Input validation helpers
 */

// 最大文字数の定義
export const MAX_LENGTHS = {
    TRIP_NAME: 100,
    TRIP_DESCRIPTION: 500,
    MEMBER_NAME: 50,
    DESTINATION: 100,
    EXPENSE_TITLE: 100,
    EXPENSE_DESCRIPTION: 500,
    EXPENSE_AMOUNT: 100000000, // 1億円
    ITINERARY_TITLE: 200,
    ITINERARY_NOTE: 2000,
    MEMO_TITLE: 100,
    MEMO_CONTENT: 5000,
    TODO_TITLE: 200,
} as const;

/**
 * 文字列の長さをバリデーション
 */
export function validateLength(
    value: string,
    maxLength: number,
    fieldName: string
): { valid: boolean; error?: string } {
    if (value.length > maxLength) {
        return {
            valid: false,
            error: `${fieldName}は${maxLength}文字以内で入力してください`,
        };
    }
    return { valid: true };
}

/**
 * 金額のバリデーション
 */
export function validateAmount(
    value: number,
    fieldName: string = "金額"
): { valid: boolean; error?: string } {
    if (isNaN(value) || value < 0) {
        return {
            valid: false,
            error: `${fieldName}は0以上の数値で入力してください`,
        };
    }
    if (value > MAX_LENGTHS.EXPENSE_AMOUNT) {
        return {
            valid: false,
            error: `${fieldName}は${MAX_LENGTHS.EXPENSE_AMOUNT.toLocaleString()}円以内で入力してください`,
        };
    }
    // 整数に丸める（円単位）
    if (!Number.isInteger(value)) {
        return {
            valid: false,
            error: `${fieldName}は整数で入力してください`,
        };
    }
    return { valid: true };
}

/**
 * 複数のバリデーション結果を結合
 */
export function combineValidations(
    ...validations: { valid: boolean; error?: string }[]
): { valid: boolean; errors: string[] } {
    const errors = validations
        .filter(v => !v.valid && v.error)
        .map(v => v.error!);
    return {
        valid: errors.length === 0,
        errors,
    };
}
