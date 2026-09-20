type Request = { method?:string; query:Record<string,string|string[]|undefined> }
type Response = { status:(code:number)=>Response; json:(data:unknown)=>void; setHeader:(name:string,value:string)=>void }
type RosterPlayer={id:number;name:string}
type Stat={id:number;name:string;k:number;d:number;swing:number;adr:number;kast:number;rating:number;N:number}
const fetchJson=async<T,>(url:string):Promise<T>=>{const result=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!result.ok)throw Error('Stats unavailable');return result.json() as Promise<T>}
const average=(values:number[])=>values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*100)/100:null

export default async function handler(req:Request,res:Response) {
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
  const teamId=Number(req.query.teamId),mapId=Number(req.query.mapId)
  if(!Number.isInteger(teamId)||teamId<1||!Number.isInteger(mapId)||mapId<1||mapId>20)return res.status(400).json({error:'Invalid team or map'})
  try {
    const team=await fetchJson<{roster?:RosterPlayer[]}>(`https://api.csapi.de/teams/${teamId}`)
    const roster=(team.roster||[]).slice(0,7)
    const data=await Promise.all(roster.map(async player=>{
      const [maps,sides]=await Promise.allSettled([
        fetchJson<Stat[]>(`https://api.csapi.de/players/${player.id}/stats/maps`),
        fetchJson<Stat[]>(`https://api.csapi.de/players/${player.id}/stats/sides?mapid=${mapId}`)
      ])
      const map=maps.status==='fulfilled'?maps.value.find(row=>row.id===mapId):undefined
      const sideRows=sides.status==='fulfilled'?sides.value:[]
      return map?.N?{...map,id:player.id,name:player.name,ct:sideRows.find(row=>row.name==='ct')||null,t:sideRows.find(row=>row.name==='t')||null}:null
    }))
    const players=data.filter((player):player is NonNullable<typeof player>=>player!==null)
    const side=(key:'ct'|'t')=>({rating:average(players.map(player=>player[key]?.rating).filter((value):value is number=>typeof value==='number')),adr:average(players.map(player=>player[key]?.adr).filter((value):value is number=>typeof value==='number'))})
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({players,average:{rating:average(players.map(player=>player.rating)),adr:average(players.map(player=>player.adr)),kast:average(players.map(player=>player.kast)),ct:side('ct'),t:side('t')},source:'CSAPI',scope:'rolling three months; current roster'})
  }catch{return res.status(502).json({error:'Map stats unavailable'})}
}
