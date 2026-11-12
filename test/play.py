import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:3998'; OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        t = await b.new_page(viewport={'width':1366,'height':768}); t.on('pageerror', lambda e: errs.append(str(e)))
        await t.goto(URL+'/teacher'); await t.fill('#pw','finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(300)
        await t.click('#sCls button:nth-child(1)'); await t.wait_for_timeout(300); CODE = await t.input_value('#sCode'); await t.evaluate("document.getElementById('openBtn').click()")
        ps=[]
        for i in range(7):
            s = await b.new_page(viewport={'width':1180,'height':820}); s.on('pageerror', lambda e: errs.append(str(e)))
            await s.goto(URL+'/#join'); await s.fill('#code', CODE); await s.fill('#num',str(i+1)); await s.fill('#name',['보리','단추','몽이','구름','별이','하늘','초록'][i]); await s.wait_for_timeout(350); await s.evaluate("document.getElementById('go').click()"); ps.append(s)
        await t.wait_for_timeout(300); await t.click('#startBtn'); await t.wait_for_timeout(300)
        for _ in range(3): await t.click('#skipBtn'); await t.wait_for_timeout(400)
        await t.wait_for_timeout(3300)
        s = ps[0]; await s.bring_to_front()
        await s.evaluate("""() => { const key=(t,k)=>dispatchEvent(new KeyboardEvent(t,{key:k})); key('keydown','ArrowRight'); let held=false;
          window.__bot=setInterval(()=>{ const {race,st}=__jc(); if(!race||race.fin) return; const p=race.p, t=(Date.now()-st.raceStart)/1000; const S=JC.solidsAt(race.W,t,t);
            const hit=(x,y)=>S.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);
            const gap=!hit(p.x+22+8,p.y+26+6)&&!hit(p.x+22+8,p.y+26+40), wall=hit(p.x+22+10,p.y+13);
            if(p.on&&(gap||wall)&&!held){ key('keydown',' '); held=true; setTimeout(()=>{key('keyup',' ');held=false;},380);} },16); }""")
        for k in range(60):
            await s.wait_for_timeout(250)
            if k == 6: await s.screenshot(path=OUT+'/p_race.png'); await t.screenshot(path=OUT+'/p_tv.png')
            if await s.evaluate("__jc().race && __jc().race.fin"): print('finished after', k*0.25, 's'); break
        await s.wait_for_timeout(600)
        print('toast:', (await s.inner_text('#wrap')).strip()[:60], '| score', await s.inner_text('#hScore'))
        await s.screenshot(path=OUT+'/p_fin.png'); await t.wait_for_timeout(300); await t.screenshot(path=OUT+'/p_tv2.png')
        await t.click('#skipBtn'); await t.wait_for_timeout(500); await s.screenshot(path=OUT+'/p_result.png')
        await t.click('.sideTabs button[data-t=rank]'); await t.wait_for_timeout(400); await t.screenshot(path=OUT+'/p_table.png')
        t.on('dialog', lambda d: asyncio.ensure_future(d.accept())); await t.click('#endBtn'); await t.wait_for_timeout(1200); await t.screenshot(path=OUT+'/p_final.png')
        print('ERRORS', errs); await b.close()
asyncio.run(main())
