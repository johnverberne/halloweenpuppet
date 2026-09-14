import QRCode from 'qrcode';

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#100d12',
      light: '#f4eef8',
    },
  });
}
