'use client'
import { useState, useEffect, useCallback } from 'react'

const TAGS = [
  'PMERJ','PCERJ','PRF','Polícia Federal',
  'PMMG','PCMG','PMSP','PCSP',
  'Agente','Investigador','Inspetor','Escrivão','Bombeiro','Guarda Municipal',
]

const MATS_DESTAQUE = [
  'Direito Constitucional','Direito Penal','Direito Administrativo',
  'Raciocínio Lógico','Língua Portuguesa','Legislação Penal',
]

function fmt(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Home() {
  const [q, setQ]           = useState('')
  const [estado, setEstado] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [nivel,  setNivel]  = useState('Todos')
  const [page,   setPage]   = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoad]  = useState(false)
  const [tagAtiva, setTag]  = useState('')

  const buscar = useCallback(async (overrides = {}) => {
    setLoad(true)
    const params = new URLSearchParams()
    const qv = overrides.q      ?? q
    const ev = overrides.estado ?? estado
    const sv = overrides.status ?? status
    const nv = overrides.nivel  ?? nivel
    const pv = overrides.page   ?? page

    if (qv)              params.set('q', qv)
    if (ev !== 'Todos')  params.set('estado', ev)
    if (sv !== 'Todos')  params.set('status', sv)
    if (nv !== 'Todos')  params.set('nivel', nv)
    params.set('page', pv)

    try {
      const res  = await fetch(`/api/concursos?${params}`)
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ concursos: [], total: 0 })
    } finally {
      setLoad(false)
    }
  }, [q, estado, status, nivel, page])

  useEffect(() => { buscar() }, []) // carga inicial

  function onTag(t) {
    const novo = tagAtiva === t ? '' : t
    setTag(novo); setQ(novo); setPage(1)
    buscar({ q: novo, page: 1 })
  }

  function onFiltro(campo, val) {
    const map = { estado: setEstado, status: setStatus, nivel: setNivel }
    map[campo](val); setPage(1)
    buscar({ [campo]: val, page: 1 })
  }

  function onPage(p) {
    setPage(p); buscar({ page: p })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const concursos  = result?.concursos  || []
  const total      = result?.total      || 0
  const totalPages = result?.totalPages || 1
  const upd        = fmt(result?.lastUpdated)

  return (
    <>
      {/* HEADER */}
      <header className="hd">
        <span style={{fontSize:'1.2rem'}}>🛡️</span>
        <span className="hd-logo">Concursos Policiais BR</span>
        <span className="hd-pipe">|</span>
        <span className="hd-sub">Nível Médio · RJ · MG · SP · Nacional</span>
        <span className="hd-live"><span className="dot"/>LIVE</span>
      </header>

      {/* SEARCH */}
      <div className="sb">
        <div className="si-wrap">
          <span className="si-ico">🔍</span>
          <input
            className="si"
            placeholder="Buscar órgão ou cargo… ex: PMERJ, Investigador, PRF"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); buscar({ page: 1 }) } }}
          />
        </div>

        <select className="sel" value={estado} onChange={e => onFiltro('estado', e.target.value)}>
          <option>Todos</option>
          <option value="RJ">Rio de Janeiro</option>
          <option value="MG">Minas Gerais</option>
          <option value="SP">São Paulo</option>
          <option value="Nacional">Nacional / Federal</option>
        </select>

        <select className="sel" value={status} onChange={e => onFiltro('status', e.target.value)}>
          <option>Todos</option>
          <option value="Aberto">Aberto</option>
          <option value="Previsto">Previsto</option>
          <option value="Encerrado">Encerrado</option>
        </select>

        <select className="sel" value={nivel} onChange={e => onFiltro('nivel', e.target.value)}>
          <option>Todos</option>
          <option value="Médio">Nível Médio</option>
          <option value="Superior">Nível Superior</option>
        </select>

        <button className="btn-b" onClick={() => { setPage(1); buscar({ page: 1 }) }} disabled={loading}>
          {loading ? 'Buscando…' : 'BUSCAR'}
        </button>
      </div>

      {/* QUICK TAGS */}
      <div className="qt">
        <span className="qt-lbl">Rápido:</span>
        {TAGS.map(t => (
          <button key={t} className={`tag ${tagAtiva === t ? 'on' : ''}`} onClick={() => onTag(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* MAIN */}
      <main className="main">
        {loading ? (
          <div className="ld">
            <div className="spin"/>
            Carregando concursos…
          </div>
        ) : (
          <>
            <div className="srow">
              <span className="srow-count">
                <strong>{total}</strong> concurso{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              </span>
              {upd && <span className="srow-upd">Atualizado: {upd}</span>}
              <button className="btn-atualizar" onClick={() => buscar()}>↻ Atualizar</button>
            </div>

            {concursos.length > 0 ? (
              <>
                <div className="grid">
                  {concursos.map((c, i) => <Card key={c.id || i} c={c} />)}
                </div>

                {totalPages > 1 && (
                  <div className="pag">
                    <button className="pbtn" onClick={() => onPage(page - 1)} disabled={page <= 1}>← Anterior</button>
                    <span className="pinfo">Página {page} de {totalPages}</span>
                    <button className="pbtn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Próxima →</button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">
                <div style={{fontSize:'2rem',marginBottom:'.75rem'}}>📋</div>
                <h3>Nenhum concurso encontrado</h3>
                <p>
                  Tente outro filtro ou clique em "Atualizar".<br/>
                  O banco é reabastecido automaticamente a cada 6 horas pelo Vercel Cron.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

function Card({ c }) {
  const status  = c.status || 'Previsto'
  const materias = Array.isArray(c.materias) ? c.materias : []

  return (
    <div className="card">
      <div className="c-top">
        <span className="c-orgao">{c.orgao}</span>
        <span className={`badge b-${status}`}>{status}</span>
      </div>

      <div className="c-cargo">{c.cargo}</div>

      <div className="c-stats">
        <div className="stat">
          <span className="sl">Salário</span>
          <span className="sv g">{c.salario || '—'}</span>
        </div>
        <div className="stat">
          <span className="sl">Vagas</span>
          <span className="sv b">{c.vagas || '—'}</span>
        </div>
        <div className="stat">
          <span className="sl">Estado</span>
          <span className="sv w">{c.estado || '—'}</span>
        </div>
      </div>

      {materias.length > 0 && (
        <div className="mats">
          {materias.map(m => (
            <span key={m} className={`mat ${MATS_DESTAQUE.includes(m) ? 'hl' : ''}`}>{m}</span>
          ))}
        </div>
      )}

      <div className="c-ft">
        {c.banca      && <div className="cf-r"><span className="cf-l">Banca</span><span className="cf-v">{c.banca}</span></div>}
        {c.inscricoes && <div className="cf-r"><span className="cf-l">Inscrições</span><span className="cf-v">{c.inscricoes}</span></div>}
        {c.prova      && <div className="cf-r"><span className="cf-l">Prova</span><span className="cf-v">{c.prova}</span></div>}
        <div className="cf-r" style={{marginTop:'.15rem'}}>
          <span className="cf-src">📡 {c.fonte || c.site || '—'}</span>
          {c.edital && (
            <a href={c.edital} target="_blank" rel="noopener noreferrer" className="edital-a">
              ↗ Ver Edital
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
