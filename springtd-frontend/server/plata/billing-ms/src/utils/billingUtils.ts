export class BillingUtils {
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }

  static calculateInvoiceTotal(items: { quantity: number; unitPrice: number }[]): number {
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  }

  static isOverdue(dueDate: Date): boolean {
    return dueDate < new Date() && dueDate.getDate() !== new Date().getDate();
  }

  static getNextBillingDate(interval: 'day' | 'week' | 'month' | 'year', intervalCount: number, startDate?: Date): Date {
    const date = startDate ? new Date(startDate) : new Date();
    
    switch (interval) {
      case 'day':
        date.setDate(date.getDate() + intervalCount);
        break;
      case 'week':
        date.setDate(date.getDate() + (intervalCount * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() + intervalCount);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + intervalCount);
        break;
    }
    
    return date;
  }

  static generateInvoiceNumber(prefix: string = 'INV'): string {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${year}${month}${day}-${random}`;
  }
}