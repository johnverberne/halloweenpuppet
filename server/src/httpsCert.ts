import selfsigned from 'selfsigned';

export function createDevCertificates(lanIps: string[]): { key: string; cert: string } {
  const altNames: Array<{ type: number; value?: string; ip?: string }> = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
  ];
  for (const ip of lanIps) {
    altNames.push({ type: 7, ip });
  }

  const pems = selfsigned.generate([{ name: 'commonName', value: 'halloweenpuppet' }], {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames }],
  });

  return { key: pems.private, cert: pems.cert };
}
