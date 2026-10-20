const rm = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' })

// formatRM(1234.5) -> "RM 1,234.50"
export const formatRM = (amount: number) => rm.format(amount)
