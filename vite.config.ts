import { defineConfig } from 'vite'
export default defineConfig({
  plugins:[{name:'local-fresh-feeds',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      const route=req.url?.split('?')[0]
      if(route!=='/api/rankings'&&route!=='/api/results')return next()
      try{
        const {default:handler}=await server.ssrLoadModule(`${route}.ts`)
        const response={status(code:number){res.statusCode=code;return response},json(data:unknown){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))},setHeader(name:string,value:string){res.setHeader(name,value)}}
        await handler({method:req.method},response)
      }catch{res.statusCode=500;res.end(JSON.stringify({error:'Local feed unavailable'}))}
    })
  }}],
  server:{proxy:{'/api':{target:'https://api.csapi.de',changeOrigin:true,rewrite:path=>path.replace(/^\/api/,'')}}}
})
