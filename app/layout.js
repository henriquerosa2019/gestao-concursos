import './globals.css'

export const metadata = {
  title: 'Concursos Policiais BR — RJ · MG · SP',
  description: 'Monitoramento de concursos de carreira policial nível médio. Direito Constitucional, Penal, Administrativo, RLM, Português.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
