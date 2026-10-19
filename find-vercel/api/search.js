const cache = new Map();
function retailerFor(source){const s=String(source||'').toLowerCase();return s.includes('zalando')?'zalando':s.includes('boozt')?'boozt':null;}
function classify(title){const s=title.toLowerCase();if(/overshirt|over shirt/.test(s))return 'overshirt';if(/jacket|coat|bomber|parka|jacka|kappa|rock/.test(s))return 'jacket';return 'other';}
function toProduct(p,i){const price=Number(p.extracted_price),old=Number(p.extracted_old_price);const retailer=retailerFor(p.source);if(!retailer||!Number.isFinite(price)||price<=0)return null;
 const url=String(p.product_link||'');if(!/^https:\/\//.test(url))return null;
 const title=String(p.title||'').slice(0,180),image=String(p.thumbnail||'');return {id:'live-'+(p.product_id||i),retailer,brand:'',name:title,price,original:Number.isFinite(old)&&old>price?old:price,sizes:[],type:classify(title),terms:String(p.snippet||'').slice(0,200),url,image:/^https:\/\//.test(image)?image:'',live:true,source:p.source,hasReference:Number.isFinite(old)&&old>price};}
module.exports=async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(!process.env.SERPAPI_KEY)return res.status(503).json({error:'Live discovery is not connected. Configure SERPAPI_KEY in Vercel project settings.'});
 const q=String(req.query.q||'').trim().slice(0,120);if(q.length<3)return res.status(400).json({error:'Enter a search of at least three characters.'});
 const key=q.toLowerCase();if(cache.has(key)&&Date.now()-cache.get(key).at<15*60*1000)return res.status(200).json(cache.get(key).data);
 try{const api=new URL('https://serpapi.com/search.json');Object.entries({engine:'google_shopping',q:q+' (Zalando OR Boozt)',gl:'se',hl:'sv',api_key:process.env.SERPAPI_KEY}).forEach(([k,v])=>api.searchParams.set(k,v));
 const upstream=await fetch(api,{signal:AbortSignal.timeout(18000)});if(!upstream.ok)throw Error('Provider HTTP '+upstream.status);const body=await upstream.json();if(body.error)throw Error(String(body.error).slice(0,250));
 const products=(body.shopping_results||[]).map(toProduct).filter(Boolean);
 const data={products,checkedAt:new Date().toISOString(),query:q,warning:'Google Shopping results are indexed third-party offers, not retailer inventory. Size, price and availability must be verified on the product page.'};cache.set(key,{at:Date.now(),data});return res.status(200).json(data);
 }catch(e){return res.status(502).json({error:'Live search failed: '+e.message});}
};
