/**
 * 精算計算ロジック
 * 誰が誰にいくら払えばよいかを計算し、最小送金回数で最適化する
 */

interface ExpenseData {
    amount: number;
    paid_by: string;
    splits: string[]; // 対象者のuser_id配列
}

interface MemberBalance {
    userId: string;
    displayName: string;
    balance: number; // プラス=受け取るべき、マイナス=払うべき
}

interface Settlement {
    from: { userId: string; displayName: string };
    to: { userId: string; displayName: string };
    amount: number;
}

/**
 * 各メンバーの収支バランスを計算
 */
export function calculateBalances(
    expenses: ExpenseData[],
    members: { userId: string; displayName: string }[]
): MemberBalance[] {
    const balanceMap = new Map<string, number>();

    // 初期化
    members.forEach(m => balanceMap.set(m.userId, 0));

    // 各支払いについて計算
    expenses.forEach(expense => {
        const splitCount = expense.splits.length;
        if (splitCount === 0) return;

        const perPerson = Math.floor(expense.amount / splitCount);
        const remainder = expense.amount - (perPerson * splitCount);

        // 払った人はプラス（受け取るべき）
        const payerBalance = balanceMap.get(expense.paid_by) ?? 0;
        balanceMap.set(expense.paid_by, payerBalance + expense.amount);

        // 対象者はマイナス（払うべき）
        expense.splits.forEach((userId, index) => {
            const balance = balanceMap.get(userId) ?? 0;
            // 最後の1人に端数を寄せる
            const amountToSubtract = index === splitCount - 1 ? perPerson + remainder : perPerson;
            balanceMap.set(userId, balance - amountToSubtract);
        });
    });

    return members.map(m => ({
        userId: m.userId,
        displayName: m.displayName,
        balance: balanceMap.get(m.userId) ?? 0,
    }));
}

/**
 * 最小送金回数で精算を計算
 */
export function calculateSettlements(
    balances: MemberBalance[]
): Settlement[] {
    // プラスの人（受け取る人）とマイナスの人（払う人）に分ける
    const creditors = balances
        .filter(b => b.balance > 0)
        .map(b => ({ ...b }))
        .sort((a, b) => b.balance - a.balance);

    const debtors = balances
        .filter(b => b.balance < 0)
        .map(b => ({ ...b, balance: -b.balance })) // 正の数に変換
        .sort((a, b) => b.balance - a.balance);

    const settlements: Settlement[] = [];

    // 貪欲法で精算を計算
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.balance, debtor.balance);

        if (amount > 0) {
            settlements.push({
                from: { userId: debtor.userId, displayName: debtor.displayName },
                to: { userId: creditor.userId, displayName: creditor.displayName },
                amount: Math.round(amount),
            });
        }

        creditor.balance -= amount;
        debtor.balance -= amount;

        if (creditor.balance === 0) i++;
        if (debtor.balance === 0) j++;
    }

    return settlements;
}

/**
 * 精算結果をLINE共有用テキストに変換
 */
export function generateSettlementText(
    tripName: string,
    settlements: Settlement[],
    totalAmount: number
): string {
    if (settlements.length === 0) {
        return `【${tripName}】精算完了\n\n精算の必要はありません！🎉`;
    }

    let text = `【${tripName}】精算のお願い\n\n`;
    text += `💰 合計: ¥${totalAmount.toLocaleString()}\n\n`;
    text += `📝 精算内容:\n`;

    settlements.forEach((s, index) => {
        text += `${index + 1}. ${s.from.displayName} → ${s.to.displayName}: ¥${s.amount.toLocaleString()}\n`;
    });

    text += `\nTripMateで管理中 ✈️`;

    return text;
}
