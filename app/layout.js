import './globals.css';

export const metadata = {
  title: 'ProHealth Programs | HCL Healthcare',
  description:
    'Premium, on-demand health programs from HCL Healthcare. Register your interest in ProHealth Plus, Diet or Lab and get the program flyer.',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6A2C91',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Playfair+Display:wght@700;800;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
