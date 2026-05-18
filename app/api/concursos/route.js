import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Só o Vercel pode chamar esta rota
function autorizado(request) {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

const BUSCAS = [
  'concurso PMERJ 2025 2026 inscrições abertas vagas salário edital',
  'concurso PCERJ Polícia Civil RJ 2025 2026 inscrições edital',
  'concurso PRF Polícia Rodoviária Federal 2025 2026 inscrições',
  'concurso Polícia Federal PF 2025 2026 inscrições edital',
  'concurso PMMG Polícia Militar Minas Gerais 2025 2026',
  'concurso PCMG Polícia Civil MG 2025 2026 inscrições edital',
  'concurso PMSP Polícia Militar São Paulo 2025 2026',
  'concurso PCSP Polícia Civil SP 2025 2026 inscrições edital',
  'concurso agente penitenciário RJ MG SP 2025 2026 nível médio',
  'concurso guarda municipal Rio de Janeiro São Paulo 2025 2026 nível médio',
  'concurso segurança pública nível médio RJ MG SP 2025 2026 previstos',
  'concurso Bombeiros CBM RJ MG SP 2025 2026',
]

async function buscarComClaude(query) {
  const prompt = `Pesquise na web e retorne dados REAIS e ATUALIZADOS sobre: "${query}"

Retorne SOMENTE JSON válido, sem markdown, sem explicações:
{
  "concursos": [
    {
      "orgao": "nome exato do órgão",
      "cargo": "nome do cargo",
      "vagas": número inteiro ou "CR",
      "salario": "R$ X.XXX,XX",
      "nivel": "Médio",
      "status": "Aberto" ou "Previsto" ou "Encerrado",
      "banca": "nome da banca ou null",
      "estado": "RJ" ou "MG" ou "SP" ou "Nacional",
      "inscricoes": "período de inscrições ou null",
      "prova": "data da prova ou null",
      "edital": "URL do edital oficial ou null",
      "site": "site oficial",
      "materias": ["Direito Constitucional", "Direito Penal", "Direito Administrativo", "Raciocínio Lógico", "Língua Portuguesa"]
    }
  ]
}

Regras:
- Inclua APENAS concursos com inscrições abertas ou previstos para 2025/2026
- Foco em nível médio e carreira policial
- Se não encontrar dados reais, retorne {"concursos": []}
- Nunca invente dados — só inclua o que a busca confirmar`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json()
  const textBlock = data.content?.find(b => b.type === 'text')
  const raw = textBlock?.text || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean).concursos || []
  } catch {
    return []
  }
}

async function salvar(concursos) {
  if (!concursos.length) return 0

  const rows = concursos.map(c => ({
    orgao:      c.orgao?.substring(0, 150) || 'Desconhecido',
    cargo:      c.cargo?.substring(0, 200) || 'Desconhecido',
    vagas:      c.vagas ? String(c.vagas) : null,
    salario:    c.salario?.substring(0, 50) || null,
    nivel:      c.nivel || 'Médio',
    status:     c.status || 'Previsto',
    banca:      c.banca?.substring(0, 80) || null,
    estado:     c.estado?.substring(0, 20) || null,
    inscricoes: c.inscricoes?.substring(0, 100) || null,
    prova:      c.prova?.substring(0, 60) || null,
    edital:     c.edital?.substring(0, 500) || null,
    site:       c.site?.substring(0, 200) || null,
    materias:   Array.isArray(c.materias) ? c.materias : [],
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('concursos')
    .upsert(rows, { onConflict: 'orgao,cargo', ignoreDuplicates: false })

  if (error) console.error('[DB]', error.message)
  return rows.length
}

export async function GET(request) {
  if (!autorizado(request)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  console.log('[CRON] Iniciando coleta —', new Date().toISOString())
  let total = 0

  for (const query of BUSCAS) {
    try {
      console.log('[CRON] Buscando:', query.substring(0, 50))
      const concursos = await buscarComClaude(query)
      const salvos = await salvar(concursos)
      total += salvos
      console.log(`[CRON] +${salvos} concursos`)
      // Pausa entre chamadas para evitar rate limit
      await new Promise(r => setTimeout(r, 1500))
    } catch (e) {
      console.error('[CRON] Erro:', e.message)
    }
  }

  console.log(`[CRON] Concluído. Total salvo: ${total}`)
  return Response.json({ ok: true, total, timestamp: new Date().toISOString() })
}
