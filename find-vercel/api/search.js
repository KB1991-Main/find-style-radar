const cache=new Map();
function merchant(s){const t=String(s||'').toLowerCase();return t.includes('zalando')?'Zalando':t.includes('boozt')?'Boozt':null}
function normalize(p){const seller=merchant([p.source,p.seller,p.merchant,p.link,p.product_link].join(' '));const price=Number(p.extracted_price),old=Number(p.extracted_old_price);if(!seller||!Number.isFinite(price)||!Number.isFinite(old)||old<=price||price<=0)return null;
const title=String(p.title||'').slice(0,200);if(/\b(women'?s?|ladies|female|damen|flickor|girls|kvinna|kvinnor)\b/i.test(title))return null;
const link=String(p.product_link||p.link||'');if(!/^https:\/\//.test(link))return null;
const image=String(p.thumbnail||'');return {id:String(p.product_id||link),retailer:seller,name:title,price,original:old,image:/^https:\/\//.test(image)?image:'',url:link,source:String(p.source||''),discount:Math.round(100*(1-price/old)),genderVerified:false};}
async function page(q,start){const u=new URL('https://serpapi.com/search.json');for(const [k,v] of Object.entries({engine:'google_shopping',q,gl:'se',hl:'sv',api_key:process.env.SERPAPI_KEY,start:String(start)}))u.searchParams.set(k,v);
const response=await fetch(u,{signal:AbortSignal.timeout(16000)});if(!response.ok)throw Error('Search provider HTTP '+response.status);const data=await response.json();if(data.error)throw Error(String(data.error).slice(0,180));return data.shopping_results||[];}
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});if(!process.env.SERPAPI_KEY)return res.status(503).json({error:'SERPAPI_KEY not configured'});
const q=String(req.query.q||'').trim().slice(0,110);if(q.length<3)return res.status(400).json({error:'Enter a brand or product description.'});
const threshold=Math.min(80,Math.max(1,Number(req.query.minDiscount)||30));const cacheKey=q.toLowerCase()+'|'+threshold;const prior=cache.get(cacheKey);if(prior&&Date.now()-prior.at<10*60*1000)return res.status(200).json(prior.data);
try{const searches=[q+' herr rea zalando',q+' herr rea boozt',q+' men sale'];const results=await Promise.allSettled(searches.map(s=>page(s,0)));const collected=[];let checked=0;const failures=[];
for(const r of results){if(r.status==='fulfilled'){checked++;collected.push(...r.value)}else failures.push(String(r.reason?.message||r.reason));}
if(!checked)throw Error(failures[0]||'Provider unavailable');
const seen=new Set();const products=collected.map(normalize).filter(p=>{if(!p||p.discount<threshold||seen.has(p.url))return false;seen.add(p.url);return true}).sort((a,b)=>b.discount-a.discount);
const data={query:q,products,checkedAt:new Date().toISOString(),minimumDiscount:threshold,searchesCompleted:checked,searchesAttempted:searches.length,offersExamined:collected.length,partial:failures.length>0,notice:'Only products with an indexed original price higher than the current price are shown. Retailer prices, sizes, and discounts must be verified before purchase.'};cache.set(cacheKey,{at:Date.now(),data});return res.status(200).json(data);
}catch(e){return res.status(502).json({error:'Deal search failed: '+e.message})}};