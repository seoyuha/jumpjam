import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:3998'; OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        t=await b.new_page(viewport={'width':1366,'height':768}); t.on('pageerror', lambda e: errs.append(str(e)))
        await t.goto(URL+'/teacher'); await t.fill('#pw','finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(400)
        await t.click('#sCls button:nth-child(2)'); await t.wait_for_timeout(600); await t.screenshot(path=OUT+'/x_setup.png'); CODE=await t.input_value('#sCode')
        await t.evaluate("document.getElementById('openBtn').click()"); await t.wait_for_timeout(400)
        for i,(a,nm) in enumerate([('koala','코알'),('fennec','여우'),('alpaca','파카')]):
            c=await b.new_context(viewport={'width':1180,'height':820}); s=await c.new_page(); s.on('pageerror', lambda e: errs.append(str(e)))
            await s.goto(URL+'/?code='+CODE); await s.wait_for_timeout(500)
            await s.fill('#num',str(i+1)); await s.fill('#name',nm); await s.click(f'#animals button[data-animal={a}]'); await s.wait_for_timeout(200)
            if i==2: await s.screenshot(path=OUT+'/x_join.png')
            await s.evaluate("document.getElementById('go').click()"); await s.wait_for_timeout(300)
        # 같은 동물 고르기 시도
        c=await b.new_context(viewport={'width':1180,'height':820}); s=await c.new_page(); await s.goto(URL+'/?code='+CODE); await s.wait_for_timeout(600)
        print('taken tiles:', await s.locator('#animals button.taken').count(), '| code ok:', await s.evaluate("document.getElementById('code').classList.contains('ok')"))
        await s.click('#animals button[data-animal=koala]', force=True); print('msg:', await s.inner_text('#err'))
        await t.wait_for_timeout(300); await t.screenshot(path=OUT+'/x_lobby.png'); print('ERR', errs); await b.close()
asyncio.run(main())
