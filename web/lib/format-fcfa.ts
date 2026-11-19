const fcfaFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function formatFcfa(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError("FCFA amount must be a non-negative safe integer.");
  }

  return `${fcfaFormatter.format(amount)}\u202fFCFA`;
}
