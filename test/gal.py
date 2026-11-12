import asyncio, sys, base64
from playwright.async_api import async_playwright
OUT=sys.argv[1]; IDS=sys.argv[2].split(',')
JS="""async (ids) => { await document.fonts.ready; const out=[]; const cv=document.createElement('canvas'); cv.width=1280; cv.height=704; const c=cv.getContext('2d');
 JC.ANIMALS.forEach(a=>JR.animalCard(a.id,8)); for(const id of ids){ JR.terrain(c, JC.mapById(id), 0);} await new Promise(r=>setTimeout(r,1500));
 for (const id of ids){ const m=JC.mapById(id), info=JC.mapInfo(m); c.drawImage(JR.background(m),0,0); JR.terrain(c,m,1.3);
  JC.ANIMALS.slice(0,5).forEach((a,i)=>{ const sp=info.spawns[i]; JR.animal(c,JC.ANIMALS[(i*5+id.length)%26].id,sp.x+11,sp.y+26,1,1,i,i==1?'run':'idle'); JR.tag(c,sp.x+11,sp.y-6,JC.ANIMALS[(i*5+id.length)%26].ko,null,i==0); });
  out.push(cv.toDataURL('image/jpeg',0.88)); } return out; }"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); g=await b.new_page(); errs=[]; g.on('pageerror', lambda e: errs.append(str(e)))
        await g.goto('http://localhost:3998/'); await g.wait_for_timeout(500)
        for i,d in enumerate(await g.evaluate(JS, IDS)): open(f'{OUT}/m_{IDS[i]}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print('ERR',errs); await b.close()
asyncio.run(main())
