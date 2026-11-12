import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:3998'; OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        t=await b.new_page(viewport={'width':1366,'height':768}); t.on('pageerror', lambda e: errs.append('T'+str(e)))
        await t.goto(URL+'/teacher'); await t.fill('#pw','finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(300)
        await t.click('#sCls button:nth-child(1)'); await t.wait_for_timeout(300); CODE=await t.input_value('#sCode'); await t.evaluate("document.getElementById('openBtn').click()")
        ps=[]
        for i in range(2):
            c=await b.new_context(viewport={'width':1180,'height':820}); s=await c.new_page(); s.on('pageerror', lambda e: errs.append('S'+str(e)))
            await s.goto(URL+'/?code='+CODE); await s.fill('#num',str(i+1)); await s.fill('#name',['보리','단추'][i]); await s.wait_for_timeout(400); await s.evaluate("document.getElementById('go').click()"); ps.append(s)
        await t.wait_for_timeout(300); await t.click('#startBtn'); await t.wait_for_timeout(300)
        for rnd in range(1,4):
            if rnd==3: await ps[0].wait_for_timeout(300); await ps[0].screenshot(path=OUT+'/e_preview3.png'); await ps[1].screenshot(path=OUT+'/e_preview3b.png')
            for _ in range(3): await t.click('#skipBtn'); await t.wait_for_timeout(400)
            await t.wait_for_timeout(3600)
            s=ps[0]; info=await s.evaluate("({coins:__jc().race.coins.length, shield:__jc().race.shield, ev:__jc().st.event, grav:__jc().race.W.info.grav})"); info2=await ps[1].evaluate("({shield:__jc().race.shield})")
            # 동전 줍기: 첫 동전 자리로 옮겨 보기
            await s.evaluate("(()=>{const r=__jc().race,k=r.coins[0]; r.p.x=k.x-11; r.p.y=k.y-13; r.p.vy=0;})()"); await s.wait_for_timeout(300)
            got=await s.evaluate("__jc().race.got.size"); print('round',rnd,info,info2,'got',got,'score',await s.inner_text('#hScore'))
            # 방패 시험: 방패 가진 학생을 함정 조각 위로
            for q in ps:
                if await q.evaluate("__jc().race.shield"):
                    r=await q.evaluate("(()=>{const r=__jc().race, hz=JC.hazardsAt(r.W, (Date.now()-__jc().st.raceStart)/1000).find(h=>h.c); if(!hz) return 'no hazard'; r.p.x=hz.c[0]-11; r.p.y=hz.c[1]-13; return 'moved';})()"); await q.wait_for_timeout(250)
                    print('  shield test:', r, '→ shield', await q.evaluate("__jc().race.shield"), 'dead', await q.evaluate("__jc().race.p.dead>0"), 'revive', await q.locator('#revive').count())
            if rnd==3: await s.screenshot(path=OUT+'/e_race3.png'); await t.screenshot(path=OUT+'/e_tv3.png')
            await t.click('#skipBtn'); await t.wait_for_timeout(400); await t.click('#skipBtn'); await t.wait_for_timeout(500)
        print('ERR', errs); await b.close()
asyncio.run(main())
