export default function AuthLayout({ children }) {
  return (
    <>
      <link rel="preload" as="image" href="/fondo.jpg" fetchPriority="high" />
      {children}
    </>
  );
}
