import * as cheerio from 'cheerio'

type Request = { method?:string }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }

const normalize = (name:string) => name.toLowerCase().replace(/[^a-z0-9]/g,'')

export default async function handler(req:Request,res:Response) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'})
  try {
    const [rankResponse,teamResponse] = await Promise.all([
      fetch('https://pley.gg/cs2/world-rankings-cs2-2/',{signal:AbortSignal.timeout(10000)}),
      fetch('https://api.csapi.de/teams/?limit=100',{signal:AbortSignal.timeout(10000)})
    ])
    if (!rankResponse.ok || !teamResponse.ok) throw Error('Source unavailable')
    const $ = cheerio.load(await rankResponse.text())
    const heading = $('.cs2-world-ranking').first().text().match(/Updated\s+[^,]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/)?.[0]
    const date = heading ? new Date(heading.replace(/^Updated\s+/,'')).toISOString().slice(0,10) : ''
    const teams = await teamResponse.json() as {id:number;name:string}[]
    const ids = new Map(teams.map(team=>[normalize(team.name),team.id]))
    const rankings = $('.cs2-world-ranking').first().find('tbody tr').toArray().map(row=>{
      const cells = $(row).find('td')
      const rank = Number($(cells[0]).text().replace(/\D/g,''))
      const name = $(cells[1]).find('span').first().text().trim() || $(cells[1]).text().trim()
      const points = Number($(cells[2]).text().replace(/[^\d]/g,''))
      return {id:ids.get(normalize(name))||0,name,rank,points}
    }).filter(team=>team.rank>0&&team.name&&team.points>0)
    const age = date ? Date.now()-new Date(`${date}T00:00:00Z`).getTime() : Infinity
    if (!date || rankings.length<10 || age>15*86400000) throw Error('Ranking page is stale or changed')
    res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({date,rankings,source:'HLTV ranking via Pley.gg'})
  } catch {
    return res.status(502).json({error:'Current rankings unavailable'})
  }
}
