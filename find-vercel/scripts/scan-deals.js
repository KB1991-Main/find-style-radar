// Scheduled catalogue snapshot. Runs in GitHub Actions (Node 20+).
const fs=require('node:fs'),path=require('node:path');
const key=process.env.SERPAPI_KEY;
if(!key){console.error('Missing SERPAPI_KEY GitHub Actions secret');process.exit(1)}
const root=path.resolve(__dirname,'..'),dataPath=path.join(root,'data','deals.json');
const brands=['Acne Studios','J.Lindeberg','Samsøe Samsøe'];
const brandsConfig=path.join(root,'data','brands.json');
const configured=fs.existsSync(brandsConfig)?JSON.parse(fs.readFileSync(brandsConfig,'utf8')):brands;
const watchBrands=[...new Set(configured.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,12);
const previous=fs.existsSync(dataPath)?JSON.parse(fs.readFileSync(dataPath,'utf8')):{items:[],history:{}};
const history=previous.history&&typeof previous.history==='object'?previous.history:{};
const retailer=s=>/zalando/i.test(s)?'Zalando':/boozt/i.test(s)?'Boozt':null;
const women=/\b(women'?s?|ladies|female|damen|flickor|girls|kvinna|kvinnor)\b/i;
const validUrl=u=>/^https:\/\//.test(u);
function convert(p,brand){const shop=retailer([p.source,p.seller,p.merchant,p.product_link,p.link].join(' ')),price=Number(p.extracted_price),old=Number(p.extracted_old_price);const name=String(p.title||'');let url=String(p.product_link||p.link||'');if(!shop||!validUrl(url)||women.test(name)||!(old>price&&price>0))return null;const disc=Math.round(100*(1-price/old));if(disc<20)return null;const pic=String(p.thumbnail||'');return {id:url,brand,retailer:shop,name:name.slice(0,180),price,original:old,discount:disc,url,image:validUrl(pic)?pic:'',checkedAt:new Date().toISOString()}}
async function scan(brand,shop){const q=brand+' herr rea '+shop;const u=new URL('https://serpapi.com/search.json');for(const [k,v] of Object.entries({engine:'google_shopping',q,gl:'se',hl:'sv',api_key:key}))u.searchParams.set(k,v);const r=await fetch(u,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(shop+' '+brand+' HTTP '+r.status);const j=await r.json();if(j.error)throw Error(j.error);return (j.shopping_results||[]).map(p=>convert(p,brand)).filter(Boolean)}
(async()=>{const results=[],errors=[];for(const brand of watchBrands){for(const shop of ['Zalando','Boozt']){try{results.push(...await scan(brand,shop))}catch(e){errors.push(brand+' / '+shop+': '+e.message)} }}
if(results.length===0&&errors.length){console.error('All or most sources failed:',errors.join('; '));process.exit(1)}
const seen=new Set(),now=new Date().toISOString();
const items=results.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true}).sort((a,b)=>b.discount-a.discount);
for(const p of items){const prior=Array.isArray(history[p.id])?history[p.id]:[];if(!prior.length||prior.at(-1).price!==p.price)prior.push({price:p.price,at:now});history[p.id]=prior.slice(-40);p.lowestObserved=Math.min(...history[p.id].map(x=>x.price));p.firstObserved=history[p.id][0].at;}
const keep=new Set(items.map(x=>x.id));for(const k of Object.keys(history))if(!keep.has(k))delete history[k];
const snapshot={updatedAt:now,brands:watchBrands,items,history,searchesAttempted:watchBrands.length*2,searchesFailed:errors.length,errors:errors.slice(0,8),limitations:'Indexed third-party offers, not verified retailer stock. Reference prices are retailer/Google Shopping claims. Lowest observed is only since FIND began tracking.'};
fs.mkdirSync(path.dirname(dataPath),{recursive:true});fs.writeFileSync(dataPath,JSON.stringify(snapshot,null,2)+'\n');console.log('Saved '+items.length+' qualifying discounted listings. Errors: '+errors.length);
})().catch(e=>{console.error(e);process.exit(1)});
