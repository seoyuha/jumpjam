import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:3998'; OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        t=await b.new_page(viewport={'width':1366,'height':768}); await t.goto(URL+'/teacher'); await t.fill('#pw','finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(300)
        await t.click('#sCls button:nth-child(1)'); await t.wait_for_timeout(300); CODE=await t.input_value('#sCode'); await t.evaluate("document.getElementById('openBtn').click()")
        s=await b.new_page(viewport={'width':1180,'height':820}); s.on('pageerror', lambda e: errs.append(str(e)))
        await s.goto(URL+'/?code='+CODE); await s.fill('#num','1'); await s.fill('#name','보리'); await s.wait_for_timeout(400); await s.evaluate("document.getElementById('go').click()")
        await t.wait_for_timeout(300); await t.click('#startBtn'); await t.wait_for_timeout(300)
        for _ in range(3): await t.click('#skipBtn'); await t.wait_for_timeout(400)
        await t.wait_for_timeout(3400); await s.bring_to_front()
        await s.keyboard.down('ArrowRight'); await s.wait_for_timeout(500); await s.keyboard.up('ArrowRight'); await s.wait_for_timeout(200)
        x0=await s.evaluate("__jc().race.p.x"); await s.evaluate("__jc().race.p.y = 3000"); await s.wait_for_timeout(500)
        await s.screenshot(path=OUT+'/r_revive.png'); print('overlay:', await s.locator('#revive').count(), 'x before', round(x0))
        # 정답을 서버에서 알아내 누르기 대신: 보기 3개를 차례로 시도할 수 없으니 첫 보기를 누름
        await s.click('#revive .rv-opts button:nth-child(1)'); await s.wait_for_timeout(900)
        print('after: overlay', await s.locator('#revive').count(), 'x', round(await s.evaluate("__jc().race.p.x")), 'toast:', (await s.inner_text('.toast')))
        await s.evaluate("__jc().race.p.y = 3000"); await s.wait_for_timeout(1200); print('second fall overlay:', await s.locator('#revive').count(), 'x', round(await s.evaluate("__jc().race.p.x")))
        print('ERR', errs); await b.close()
asyncio.run(main())
