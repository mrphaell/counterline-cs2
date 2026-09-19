type VercelRequest = { method?:string; query:Record<string,string|string[]|undefined> }
type VercelResponse = { status:(code:number)=>VercelResponse; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }

const allowed = /^\/(rankings\/|teams\/\?limit=\d+|teams\/\d+|teams\/\d+\/stats|players\/stats\?mapid=\d+&min_played=\d+&limit=\d+|players\/\d+\/stats\/maps|matches\/latest\?limit=\d+|maps\/)$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = typeof req.query.path === 'string' ? req.query.path : ''
  if (req.method !== 'GET' || !allowed.test(path)) return res.status(400).json({error:'Unsupported request'})
  try {
    const upstream = await fetch(`https://api.csapi.de${path}`, {headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)})
    if (!upstream.ok) return res.status(502).json({error:'Stats service unavailable'})
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(await upstream.json())
  } catch {
    return res.status(502).json({error:'Stats service unavailable'})
  }
}
