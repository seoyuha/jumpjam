import asyncio, sys, os
from playwright.async_api import async_playwright
URL = 'http://localhost:3998'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

GALLERY = """
async () => {
  await document.fonts.ready;
  JC.ANIMALS.forEach(a=>JR.animalCard(a.id,8)); await new Promise(r=>setTimeout(r,1500));
  const out = [];
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 704; const c = cv.getContext('2d');
  const sets = {
    roof: [['saw',12,13],['spring',8,13],['ball',23,7],['bow',30,9,2],['fan',16,14,3]],
    cloud: [['hole',17,9],['move',9,12],['fire',26,9,3],['spike',22,10]],
    toy: [['ice',12,14],['honey',22,14],['saw',18,8]],
    jungle: [['cloud',18,13],['bow',26,10,0],['ball',13,6]],
    snow: [['spike',18,12],['move',22,8,1],['fan',10,14,0]],
    moon: [['spring',14,16],['saw',24,8],['hole',29,12]],
    volcano: [['plat',15,10],['fire',21,9,0]], candy: [['saw',16,10],['spring',24,17]], sea: [['ball',21,5],['spike',28,12]],
    ghost: [['bow',20,10,0],['cloud',26,9]], desert: [['honey',10,11],['saw',24,9]], space: [['hole',18,9],['move',28,7]],
  };
  for (const m of JC.MAPS) {
    const pcs = (sets[m.id]||[]).map((a,i)=>({id:'g'+i, type:a[0], gx:a[1], gy:a[2], rot:a[3]||0}));
    const W = JC.buildWorld(m, pcs);
    c.drawImage(JR.background(m),0,0); JR.terrain(c,m,1.2);
    pcs.forEach(p=>JR.piece(c,p,0.7,W,0.7));
    const info = JC.mapInfo(m);
    JC.ANIMALS.slice(0,5).forEach((a,i)=>{ const idx=(JC.MAPS.indexOf(m)*5+i)%JC.ANIMALS.length; const sp=info.spawns[i]; JR.animal(c,JC.ANIMALS[idx].id,sp.x+11,sp.y+26,1,1,i,i==1?'run':'idle'); JR.tag(c,sp.x+11,sp.y-6,JC.ANIMALS[idx].ko,null,i==0); });
    out.push(cv.toDataURL('image/jpeg', 0.85));
  }
  // 동물 모음
  const a = document.createElement('canvas'); a.width = 1200; a.height = 430; const ac = a.getContext('2d'); ac.fillStyle='#dfefff'; ac.fillRect(0,0,1200,430);
  JC.ANIMALS.forEach((an,i)=>{ const x = 60 + (i%9)*125, y = 110 + Math.floor(i/9)*140; JR.animal(ac, an.id, x, y, 2.6, 1, 0.3, i%4==1?'run':i%4==2?'air':i%4==3?'win':'idle'); ac.fillStyle='#15233f'; ac.font='700 16px "Noto Sans CJK KR"'; ac.fillText(an.ko, x-20, y+24); });
  out.push(a.toDataURL('image/png'));
  return out;
}
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        g = await b.new_page(viewport={'width':1280,'height':800})
        await g.goto(URL + '/'); await g.wait_for_timeout(500)
        imgs = await g.evaluate(GALLERY)
        import base64
        for i, d in enumerate(imgs):
            ext = 'jpg' if d.startswith('data:image/jpeg') else 'png'
            open(f'{OUT}/g{i:02d}.{ext}','wb').write(base64.b64decode(d.split(',')[1]))
        errs = []
        tctx = await b.new_context(viewport={'width':1366,'height':768})
        t = await tctx.new_page(); t.on('pageerror', lambda e: errs.append('T:'+str(e)))
        await t.goto(URL + '/teacher'); await t.fill('#pw', 'finel9932!'); await t.click('#loginBtn'); await t.wait_for_timeout(400)
        await t.click('#sCls button:nth-child(2)'); await t.wait_for_timeout(300); await t.screenshot(path=f'{OUT}/t0_setup.png'); CODE = await t.input_value('#sCode'); await t.evaluate("document.getElementById('openBtn').click()"); await t.wait_for_timeout(400)
        studs = []
        animals = ['chick','koala','alpaca','meerkat','capybara','badger','tapir','fennec','gazelle','panda']
        n = int(os.environ.get('NS','6'))
        for i in range(n):
            ctx = await b.new_context(viewport={'width':1180,'height':820}, has_touch=True, is_mobile=False)
            s = await ctx.new_page(); s.on('pageerror', lambda e, i=i: errs.append(f'S{i}:'+str(e)))
            await s.goto(URL + '/'); await s.wait_for_timeout(300)
            if i == 0: await s.wait_for_timeout(900); await s.screenshot(path=f'{OUT}/s00_title.png')
            await s.goto(URL + '/#join'); await s.wait_for_timeout(200)
            if i == 3: await s.fill('#code', CODE); await s.wait_for_timeout(700); await s.screenshot(path=f'{OUT}/s0_join.png')
            await s.fill('#code', CODE)
            await s.fill('#num', str(i+1)); await s.fill('#name', ['김보리','이단추','박몽이','최구름','정별이','한하늘','윤바다','오솔','남산','강이'][i]);
            if i % 2 == 0: await s.fill('#nick', ['보리','단추','몽이','구름','별이','하늘','바다','솔','산','이'][i])
            await s.click(f'#animals button:nth-child({JC_IDX[animals[i]]})')
            await s.wait_for_timeout(350); await s.evaluate("document.getElementById('go').click()"); studs.append(s)
        await t.wait_for_timeout(600)
        await studs[0].screenshot(path=f'{OUT}/s1_lobby.png'); await t.screenshot(path=f'{OUT}/t1_lobby.png')
        await t.click('#startBtn'); await t.wait_for_timeout(1500)
        await studs[0].screenshot(path=f'{OUT}/s2_preview.png'); await t.screenshot(path=f'{OUT}/t2_preview.png')
        await t.click('#skipBtn'); await t.wait_for_timeout(800)
        await studs[0].screenshot(path=f'{OUT}/s3_quiz.png')
        await studs[0].click('.quiz .opts button:nth-child(2)'); await studs[0].wait_for_timeout(500)
        await studs[0].screenshot(path=f'{OUT}/s3b_quiz_answer.png')
        await t.screenshot(path=f'{OUT}/t3_quiz.png')
        await t.click('#skipBtn'); await t.wait_for_timeout(900)
        await studs[0].screenshot(path=f'{OUT}/s4_place.png')
        # 학생 0: 첫 후보 고르고 캔버스 가운데쯤 터치
        for k, s in enumerate(studs):
            if await s.locator('#offer button').count() == 0: continue
            await s.locator('#offer button').first.click(); await s.wait_for_timeout(100)
            box = await (await s.query_selector('#game')).bounding_box()
            await s.mouse.click(box['x'] + box['width']*(0.3+0.08*k), box['y'] + box['height']*0.35)
            await s.wait_for_timeout(100)
            if k == 0: await s.screenshot(path=f'{OUT}/s4b_place_ghost.png')
            await s.click('#okBtn'); await s.wait_for_timeout(250)
            if k == 0: await s.screenshot(path=f'{OUT}/s4d_second.png')
        await studs[0].wait_for_timeout(300); await studs[0].screenshot(path=f'{OUT}/s4c_placed.png')
        await t.screenshot(path=f'{OUT}/t4_place.png')
        await t.click('#skipBtn'); await t.wait_for_timeout(1200)
        await studs[0].screenshot(path=f'{OUT}/s5_countdown.png')
        await t.wait_for_timeout(2300)
        for s in studs: await s.keyboard.down('ArrowRight')
        await t.wait_for_timeout(500)
        for s in studs: await s.keyboard.press(' ')
        await t.wait_for_timeout(700)
        await studs[0].screenshot(path=f'{OUT}/s5_race.png'); await t.screenshot(path=f'{OUT}/t5_race.png')
        for s in studs: await s.keyboard.up('ArrowRight')
        await t.click('#skipBtn'); await t.wait_for_timeout(800)
        await studs[0].screenshot(path=f'{OUT}/s6_result.png'); await t.screenshot(path=f'{OUT}/t6_result.png')
        for _ in range(10):
            await t.click('#endBtn') if False else None
        t.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await t.click('#endBtn'); await t.wait_for_timeout(900)
        await studs[0].screenshot(path=f'{OUT}/s7_final.png'); await t.screenshot(path=f'{OUT}/t7_final.png')
        await t.click('.sideTabs button[data-t=set]'); await t.wait_for_timeout(200); await t.screenshot(path=f'{OUT}/t8_settings.png')
        print('ERRORS:', errs)
        await b.close()

JC_IDX = {a:i+1 for i,a in enumerate(['chick', 'sheep', 'raccoon', 'elephant', 'rabbit', 'penguin', 'cat', 'dog', 'bear', 'fox', 'frog', 'panda', 'pig', 'duck', 'squirrel', 'hedgehog', 'turtle', 'otter', 'crocodile', 'hamster', 'lion', 'giraffe', 'zebra', 'rhino', 'camel', 'kangaroo', 'koala', 'alpaca', 'meerkat', 'capybara', 'badger', 'tapir', 'fennec', 'gazelle'])}
asyncio.run(main())
