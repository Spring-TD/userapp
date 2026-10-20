import type { UserProductApplication } from '../types/userProductApplication';

export async function enrichApplicationWithOfferLetter(
  application: UserProductApplication
): Promise<
  UserProductApplication & {
    offerLetter?: {
      html: string;
      text: string;
      reference: string;
      offerValidUntil: string;
      pdfUrl?: string;
      pdfFileName?: string;
      signedPdfUrl?: string;
      signedPdfFileName?: string;
    };
  }
> {
  return application;
}
