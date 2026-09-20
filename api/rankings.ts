type Request = { method?:string }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }

const normalize = (name:string) => name.toLowerCase().replace(/[^a-z0-9]/g,'')
const directory = 'https://api.github.com/repos/ValveSoftware/counter-strike_regional_standings/contents/live'
const rawBase = 'https://raw.githubusercontent.com/ValveSoftware/counter-strike_regional_standings/main/live'

export default async function handler(req:Request,res:Response) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'})
  try {
    const year = new Date().getUTCFullYear()
    const filesResponse = await fetch(`${directory}/${year}`,{headers:{accept:'application/vnd.github+json','user-agent':'Counterline-CS2'},signal:AbortSignal.timeout(10000)})
    if (!filesResponse.ok) throw Error('Valve directory unavailable')
    const files = await filesResponse.json() as {name:string}[]
    const file = files.map(item=>item.name).filter(name=>/^standings_global_\d{4}_\d{2}_\d{2}\.md$/.test(name)).sort().at(-1)
    if (!file) throw Error('No global standings')
    const date = file.match(/(\d{4})_(\d{2})_(\d{2})/)!.slice(1).join('-')
    if (date>new Date().toISOString().slice(0,10)) throw Error('Future standings')
    const [rankingResponse,teamResponse] = await Promise.all([
      fetch(`${rawBase}/${year}/${file}`,{signal:AbortSignal.timeout(10000)}),
      fetch('https://api.csapi.de/teams/?limit=100',{signal:AbortSignal.timeout(10000)})
    ])
    if (!rankingResponse.ok) throw Error('Valve standings unavailable')
    const markdown = await rankingResponse.text()
    const teams = teamResponse.ok ? await teamResponse.json() as {id:number;name:string}[] : []
    const ids = new Map(teams.map(team=>[normalize(team.name),team.id]))
    const rankings = markdown.split('\n').map(line=>{
      const cells = line.split('|').map(cell=>cell.trim())
      if (cells.length<5 || !/^\d+$/.test(cells[1]) || !/^\d+$/.test(cells[2])) return null
      const rank=Number(cells[1]),points=Number(cells[2]),name=cells[3]
      return {id:ids.get(normalize(name))||0,name,rank,points}
    }).filter((team):team is {id:number;name:string;rank:number;points:number}=>Boolean(team))
    if (rankings.length<20 || rankings[0].rank!==1) throw Error('Valve format changed')
    res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({date,rankings,source:'Valve Regional Standings',sourceUrl:`https://github.com/ValveSoftware/counter-strike_regional_standings/blob/main/live/${year}/${file}`})
  } catch {
    return res.status(502).json({error:'Valve standings unavailable'})
  }
}
