// Money is added up in whole sen, so totals come out exact. In plain JavaScript,
// 5 + 29.01 + 15.99 is 50.00000000000001: a RM 50 budget would count as over, and a
// balance of RM 50 in and RM 50 out would show as "-RM 0.00".

export const toSen = (rm: number) => Math.round(rm * 100)

// addRM(29.01, 15.99) -> 45
export const addRM = (a: number, b: number) => (toSen(a) + toSen(b)) / 100

// sumRM([5, 29.01, 15.99]) -> 50
export function sumRM(amounts: Iterable<number>) {
  let sen = 0
  for (const amount of amounts) sen += toSen(amount)
  return sen / 100
}
