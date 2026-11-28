// Where a transaction came from, in words
export function sourceText(source: string): string {
  switch (source) {
    case 'manual':
      return 'Added by you'
    case 'recurring':
      return 'Added automatically from Recurring'
    case 'pending':
      return 'Saved on this device, waiting to sync'
    case 'maybank':
      return 'Imported from a Maybank statement'
    case 'cimb':
      return 'Imported from a CIMB statement'
    case 'tng':
      return 'Imported from a Touch ’n Go eWallet statement'
    case 'generic':
      return 'Imported from a bank statement'
    default:
      return `Imported (${source})`
  }
}
