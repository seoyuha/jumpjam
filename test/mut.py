import asyncio, time
from playwright.async_api import async_playwright
URL='http://localhost:3998'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        t = await b.new_page(); await t.goto(URL+'/teacher'); await t.fill('#pw','finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(300)
        await t.click('#sCls button:nth-child(1)'); await t.wait_for_timeout(300); CODE = await t.input_value('#sCode'); await t.evaluate("document.getElementById('openBtn').click()")
        s = await b.new_page(viewport={'width':1180,'height':820}); await s.goto(URL+'/#join'); await s.fill('#code', CODE); await s.fill('#num','3'); await s.fill('#name','테스트'); await s.wait_for_timeout(350); await s.evaluate("document.getElementById('go').click()")
        await t.wait_for_timeout(300); await t.click('#startBtn'); await t.wait_for_timeout(300); await t.click('#skipBtn'); await s.wait_for_timeout(300)
        await s.evaluate("window.__m=0; new MutationObserver(l=>window.__m+=l.length).observe(document.getElementById('ov'),{childList:true})")
        await s.wait_for_timeout(1500); print('mutations in 1.5s:', await s.evaluate('window.__m'))
        t0=time.time(); await s.click('.quiz .opts button:nth-child(1)'); print('click took', round(time.time()-t0,2)); await s.wait_for_timeout(300)
        print('qt:', await s.inner_text('#qt'), '| fb:', await s.inner_text('.quiz .fb'))
        # 시간 초과 흐름: 2번 문제는 안 누르고 기다리기
        await s.wait_for_timeout(13500); print('slot text:', await s.inner_text('.quiz .qn'), '| fb:', await s.inner_text('.quiz .fb'))
        await s.wait_for_timeout(2500); print('slot text:', await s.inner_text('.quiz .qn'))
        await b.close()
asyncio.run(main())
