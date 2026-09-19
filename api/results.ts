import * as cheerio from 'cheerio'

type Request = { method?:string }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }
type Team = { id:number; name:string; score:number; rank:number }
type Match = { id:number;team1:Team;team2:Team;maps:never[];best_of:number;date:string;event:string;winner:Team;url:string;source:'PandaScore'|'CS2Observer' }
type PandaMatch = { id:number;end_at:string|null;number_of_games:number;opponents:{opponent:{id:number;name:string};type:string}[];results:{team_id:number;score:number}[];winner_id:number|null;league?:{name:string}|null;serie?:{full_name?:string;name:string}|null;tournament?:{name:string}|null }

const normalize = (value:string) => value.toLowerCase().replace(/[^a-z0-9]/g,'')
const matchKey = (match:Match) => `${match.date}|${[normalize(match.team1.name),normalize(match.team2.name)].sort().join('|')}`

function parsePandaMatch(match:PandaMatch):Match|null {
  const opponents = match.opponents?.filter(item=>item.type==='Team'&&item.opponent?.name) || []
  if(opponents.length!==2 || !match.end_at) return null
  const scores = new Map((match.results||[]).map(item=>[item.team_id,item.score]))
  const first=opponents[0].opponent, second=opponents[1].opponent
  if(!scores.has(first.id)||!scores.has(second.id)) return null
  const team1:Team={id:first.id,name:first.name,score:scores.get(first.id)!,rank:0}
  const team2:Team={id:second.id,name:second.name,score:scores.get(second.id)!,rank:0}
  return {id:match.id,team1,team2,maps:[],best_of:match.number_of_games,date:match.end_at.slice(0,10),event:match.serie?.full_name||match.serie?.name||match.league?.name||match.tournament?.name||'Counter-Strike',winner:match.winner_id===first.id?team1:match.winner_id===second.id?team2:team1.score>team2.score?team1:team2,url:'https://www.cs2observer.com/results',source:'PandaScore'}
}

async function pandaResults():Promise<Match[]> {
  const token=process.env.PANDASCORE_API_KEY
  if(!token) return []
  const url='https://api.pandascore.co/csgo/matches/past?sort=-end_at&per_page=50'
  const upstream=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(10000)})
  if(!upstream.ok) throw Error(`PandaScore returned ${upstream.status}`)
  const payload=await upstream.json()
  if(!Array.isArray(payload)) throw Error('Unexpected PandaScore response')
  return (payload as PandaMatch[]).map(parsePandaMatch).filter((match):match is Match=>Boolean(match))
}

async function observerResults():Promise<Match[]> {
  const upstream = await fetch('https://www.cs2observer.com/results',{signal:AbortSignal.timeout(10000)})
  if (!upstream.ok) throw Error('CS2Observer unavailable')
  const $ = cheerio.load(await upstream.text())
  const matches = $('a.mrow').toArray().slice(0,35).map(row=>{
    const element=$(row)
    const names=element.find('.tnm').toArray().map(x=>$(x).find('.nm').text().trim())
    const scores=element.find('.sc').text().trim().match(/(\d+)\s*:\s*(\d+)/)
    const id=Number(element.attr('href')?.match(/\d+/)?.[0]||0)
    const team1:Team={id:1,name:names[0]||'',score:Number(scores?.[1]||0),rank:0}
    const team2:Team={id:2,name:names[1]||'',score:Number(scores?.[2]||0),rank:0}
    return {id,team1,team2,maps:[] as never[],best_of:Number(element.find('.fmt').text().replace(/\D/g,''))||0,date:element.find('.when').text().trim(),event:element.find('.evc').text().trim(),winner:team1.score>team2.score?team1:team2,url:`https://www.cs2observer.com${element.attr('href')||'/results'}`,source:'CS2Observer' as const}
  }).filter(match=>match.id&&match.date&&match.team1.name&&match.team2.name)
  if(matches.length<5) throw Error('CS2Observer page changed')
  return matches
}

export default async function handler(req:Request,res:Response) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'})
  const [panda,observer]=await Promise.allSettled([pandaResults(),observerResults()])
  const pandaMatches=panda.status==='fulfilled'?panda.value:[]
  const observerMatches=observer.status==='fulfilled'?observer.value:[]
  const combined=new Map<string,Match>()
  for(const match of observerMatches) combined.set(matchKey(match),match)
  for(const match of pandaMatches){
    const key=matchKey(match)
    const prior=combined.get(key)
    combined.set(key,{...match,url:prior?.url||match.url})
  }
  const matches=[...combined.values()].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.source==='PandaScore')-Number(a.source==='PandaScore')||b.id-a.id).slice(0,20)
  const latest = matches[0]?.date ? Date.now()-new Date(`${matches[0].date}T00:00:00Z`).getTime() : Infinity
  if(matches.length<5||latest>2*86400000)return res.status(502).json({error:'Current results unavailable'})
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=300')
  res.setHeader('X-Counterline-Sources',pandaMatches.length?'PandaScore, CS2Observer':'CS2Observer')
  return res.status(200).json(matches)
}
