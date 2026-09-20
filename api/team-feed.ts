import * as cheerio from 'cheerio'

type Request = { method?:string; query:Record<string,string|string[]|undefined> }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }
const safeImage=(url:string|undefined)=>url?.startsWith('https://api.cs2observer.com/api/img?')?url:''

export default async function handler(req:Request,res:Response) {
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
  const name=typeof req.query.name==='string'?req.query.name.trim():''
  if(name && (name.length>80 || !/^[\p{L}\p{N} ._+&'-]+$/u.test(name)))return res.status(400).json({error:'Invalid team'})
  try {
    const url=name?`https://www.cs2observer.com/team/${encodeURIComponent(name)}`:'https://www.cs2observer.com/teams'
    const upstream=await fetch(url,{signal:AbortSignal.timeout(10000)})
    if(!upstream.ok)throw Error('Team source unavailable')
    const $=cheerio.load(await upstream.text())
    res.setHeader('Cache-Control',name?'s-maxage=300, stale-while-revalidate=600':'s-maxage=21600, stale-while-revalidate=21600')
    if(!name){
      const logos:Record<string,string>={}
      $('a[href^="/team/"]').each((_,row)=>{
        const item=$(row),team=item.find('.rkb-nm').first().text().trim(),logo=safeImage(item.find('img.tlogo').first().attr('src'))
        if(team&&logo)logos[team.toLowerCase()]=logo
      })
      if(Object.keys(logos).length<20)throw Error('Logo directory changed')
      return res.status(200).json({logos,source:'CS2Observer'})
    }
    const logo=safeImage($('.tb-hero img.tlogo').first().attr('src'))
    const maps=$('details.mp-row').toArray().map(row=>{
      const item=$(row),map=item.find('.mp-nm-t').first().text().trim()
      const number=(selector:string)=>Number(item.find(selector).first().text().replace(/[^\d.]/g,''))
      return {name:map,ctRoundWinPct:number('.mp-ct'),tRoundWinPct:number('.mp-tt'),pistolWinPct:number('.mp-pist'),allTimeWinPct:number('.mp-win'),allTimeRecord:item.find('.mp-wl').first().text().trim()}
    }).filter(item=>item.name)
    const matches=$('.mlist a.mrow').toArray().slice(0,8).map(row=>{
      const item=$(row),names=item.find('.tnm .nm').toArray().map(node=>$(node).text().trim()),scores=item.find('.sc span').toArray().map(node=>Number($(node).text().trim())).filter(Number.isFinite)
      return {date:item.find('.when').text().trim(),team1:names[0],team2:names[1],score1:scores[0],score2:scores.at(-1),event:item.find('.up-wm').text().trim()||item.attr('title')||'',url:`https://www.cs2observer.com${item.attr('href')||''}`}
    }).filter(item=>item.date&&item.team1&&item.team2&&Number.isFinite(item.score1)&&Number.isFinite(item.score2))
    return res.status(200).json({logo,maps,matches,source:'CS2Observer',scope:'all-time for side and pistol rates'})
  }catch{return res.status(502).json({error:'Team feed unavailable'})}
}
