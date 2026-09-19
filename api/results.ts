import * as cheerio from 'cheerio'

type Request = { method?:string }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }

export default async function handler(req:Request,res:Response) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'})
  try {
    const upstream = await fetch('https://www.cs2observer.com/results',{signal:AbortSignal.timeout(10000)})
    if (!upstream.ok) throw Error('Source unavailable')
    const $ = cheerio.load(await upstream.text())
    const matches = $('a.mrow').toArray().slice(0,20).map(row=>{
      const element=$(row)
      const names=element.find('.tnm').toArray().map(x=>$(x).find('.nm').text().trim())
      const scores=element.find('.sc').text().trim().match(/(\d+)\s*:\s*(\d+)/)
      const id=Number(element.attr('href')?.match(/\d+/)?.[0]||0)
      const team1={id:1,name:names[0]||'',score:Number(scores?.[1]||0),rank:0}
      const team2={id:2,name:names[1]||'',score:Number(scores?.[2]||0),rank:0}
      return {id,team1,team2,maps:[],best_of:Number(element.find('.fmt').text().replace(/\D/g,''))||0,date:element.find('.when').text().trim(),event:element.find('.evc').text().trim(),winner:team1.score>team2.score?team1:team2,url:`https://www.cs2observer.com${element.attr('href')||'/results'}`}
    }).filter(match=>match.id&&match.date&&match.team1.name&&match.team2.name)
    const latest = matches[0]?.date ? Date.now()-new Date(`${matches[0].date}T00:00:00Z`).getTime() : Infinity
    if (matches.length<5 || latest>2*86400000) throw Error('Results page is stale or changed')
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=300')
    return res.status(200).json(matches)
  } catch {
    return res.status(502).json({error:'Current results unavailable'})
  }
}
