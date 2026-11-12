// 점프 대소동! 기본 문제 은행 — 6학년 영어 10·11·12단원 주요 낱말·표현
// 1번(6초) 낱말 보고 그림 고르기 · 2번(7초) 짧은 문장 뜻 고르기 · 3번(9초) 대화의 알맞은 응답 고르기
// 2·3번은 [문제, 정답, 오답, 오답] 순서로 적어요(보여 줄 때 섞어요).

const UNITS = {
  10: {
    title: "10단원 I'd Like to Have the Fruit Salad",
    words: [
      ['fruit salad', '🥗', '과일 샐러드'], ['pizza', '🍕', '피자'], ['spaghetti', '🍝', '스파게티'], ['hamburger', '🍔', '햄버거'],
      ['sandwich', '🥪', '샌드위치'], ['curry', '🍛', '카레'], ['steak', '🥩', '스테이크'], ['noodles', '🍜', '국수'],
      ['soup', '🍲', '수프'], ['ice cream', '🍨', '아이스크림'], ['cake', '🍰', '케이크'], ['juice', '🧃', '주스'],
      ['milk', '🥛', '우유'], ['chicken', '🍗', '치킨'], ['bread', '🍞', '빵'], ['hot dog', '🌭', '핫도그'],
      ['sweet', '🍬', '달콤한'], ['salty', '🧂', '짠'], ['sour', '🍋', '신'], ['spicy', '🌶️', '매운'],
    ],
    sent: [
      ["I'd like to have the fruit salad.", '저는 과일 샐러드를 먹고 싶어요.', '저는 과일 샐러드를 만들고 싶어요.', '저는 채소 샐러드를 먹고 싶어요.'],
      ['What would you like to have?', '무엇을 먹고 싶나요?', '무엇을 만들고 싶나요?', '언제 먹고 싶나요?'],
      ["How's the food?", '음식 맛이 어때요?', '음식이 어디 있어요?', '음식이 얼마예요?'],
      ["It's sweet.", '달콤해요.', '짜요.', '셔요.'],
      ["It's too salty.", '너무 짜요.', '너무 달아요.', '조금 짜요.'],
      ['The curry is spicy.', '카레가 매워요.', '카레가 달아요.', '스테이크가 매워요.'],
      ['The lemon is sour.', '레몬이 셔요.', '레몬이 달아요.', '사과가 셔요.'],
      ["I'd like to have some juice.", '주스를 좀 마시고 싶어요.', '우유를 좀 마시고 싶어요.', '주스를 좀 사고 싶어요.'],
      ['Would you like some water?', '물 좀 드릴까요?', '물이 어디 있나요?', '물을 사고 싶나요?'],
      ['Yes, please.', '네, 주세요.', '아니요, 괜찮아요.', '네, 맞아요.'],
      ['No, thanks.', '아니요, 괜찮아요.', '네, 주세요.', '아니요, 몰라요.'],
      ["It's delicious.", '맛있어요.', '맛없어요.', '배고파요.'],
      ["I'm hungry.", '배고파요.', '배불러요.', '목말라요.'],
      ["I'm full.", '배불러요.', '배고파요.', '피곤해요.'],
      ['May I take your order?', '주문하시겠어요?', '계산하시겠어요?', '앉으시겠어요?'],
      ["I'll have the steak.", '저는 스테이크로 할게요.', '저는 스테이크를 좋아해요.', '저는 스테이크를 요리할게요.'],
    ],
    talk: [
      ['What would you like to have?', "I'd like to have the spaghetti.", "It's salty.", 'Yes, I do.'],
      ["How's the pizza?", "It's delicious.", "I'd like to have pizza.", 'No, thanks.'],
      ['Would you like some ice cream?', 'Yes, please.', "It's sour.", "It's on the table."],
      ['Is the soup salty?', "Yes, it's too salty.", "I'd like to have the soup.", "No, I don't."],
      ["How's the lemon juice?", "It's sour.", 'Yes, please.', "I'm full."],
      ['May I take your order?', "I'd like to have the curry.", "It's sweet.", "No, I'm not."],
      ['Are you hungry?', 'Yes, I am.', 'Yes, I do.', "It's delicious."],
      ['Do you want some more?', "No, thanks. I'm full.", "It's spicy food.", 'Yes, I am.'],
      ["How's the curry?", "It's spicy but good.", "I'd like curry.", 'Yes, please.'],
      ['What would you like to drink?', "I'd like to have orange juice.", "It's too sweet.", "I'm full."],
      ["Let's have lunch.", 'Sounds good!', "It's salty.", "No, it isn't."],
      ["How's the cake?", "It's very sweet.", "I'd like to have cake.", "No, I'm not."],
    ],
  },
  11: {
    title: '11단원 Do You Know About Songpyeon?',
    words: [
      ['songpyeon', '🍡', '송편'], ['hanbok', '👗', '한복'], ['gat', '🎩', '갓'], ['Hanji', '📜', '한지'],
      ['Tuho', '🏺', '투호'], ['hanok', '🏠', '한옥'], ['tteokguk', '🍲', '떡국'], ['yunnori', '🎲', '윷놀이'],
      ['gonggi', '🪨', '공기놀이'], ['kite', '🪁', '연'], ['Taekwondo', '🥋', '태권도'], ['Chuseok', '🌕', '추석'],
      ['Seollal', '🧧', '설날'], ['kimchi', '🥬', '김치'], ['fan', '🪭', '부채'], ['mask', '🎭', '탈'],
      ['drum', '🥁', '북'], ['culture', '🏛️', '문화'], ['traditional', '🏯', '전통적인'], ['rice cake', '🍘', '떡'],
    ],
    sent: [
      ['Do you know about songpyeon?', '너는 송편에 대해 알고 있니?', '너는 송편을 좋아하니?', '너는 송편을 만들 수 있니?'],
      ['Yes, I do.', '응, 알아.', '아니, 몰라.', '응, 좋아해.'],
      ["No, I don't.", '아니, 몰라.', '응, 알아.', '아니, 안 갈래.'],
      ["It's a traditional Korean food.", '그것은 한국의 전통 음식이야.', '그것은 한국의 전통 옷이야.', '그것은 일본의 전통 음식이야.'],
      ['How about playing yunnori?', '윷놀이 하는 게 어때?', '윷놀이는 언제 해?', '윷놀이를 좋아해?'],
      ['How about making songpyeon?', '송편을 만드는 게 어때?', '송편을 먹는 게 어때?', '송편을 사는 게 어때?'],
      ['That sounds great.', '그거 좋겠다.', '그거 슬프다.', '그거 시끄럽다.'],
      ['We eat tteokguk on Seollal.', '우리는 설날에 떡국을 먹어.', '우리는 추석에 떡국을 먹어.', '우리는 설날에 송편을 먹어.'],
      ['People wore gat in the past.', '옛날에 사람들은 갓을 썼어.', '요즘 사람들은 갓을 써.', '옛날에 사람들은 한복을 입었어.'],
      ['Hanji is Korean paper.', '한지는 한국의 종이야.', '한지는 한국의 옷이야.', '한지는 중국의 종이야.'],
      ["Let's play Tuho together.", '함께 투호를 하자.', '함께 윷놀이를 하자.', '혼자 투호를 하자.'],
      ['I want to wear hanbok.', '나는 한복을 입고 싶어.', '나는 한복을 사고 싶어.', '나는 갓을 쓰고 싶어.'],
      ['Hanok is a traditional Korean house.', '한옥은 한국의 전통 집이야.', '한옥은 한국의 전통 놀이야.', '한옥은 새로 지은 집이야.'],
      ['Do you know how to play gonggi?', '공기놀이 하는 방법을 아니?', '공기놀이를 좋아하니?', '공기놀이를 어디서 하니?'],
      ["It's fun.", '재미있어.', '지루해.', '어려워.'],
      ['We fly kites in winter.', '우리는 겨울에 연을 날려.', '우리는 여름에 연을 날려.', '우리는 겨울에 연을 만들어.'],
    ],
    talk: [
      ['Do you know about hanbok?', "Yes, I do. It's traditional Korean clothing.", 'How about playing Tuho?', "It's sweet."],
      ['How about playing yunnori?', 'That sounds fun!', 'Yes, I do.', "It's a Korean house."],
      ['What is songpyeon?', "It's a rice cake for Chuseok.", "It's a traditional house.", "No, I don't."],
      ['Do you know about Tuho?', "No, I don't. What is it?", 'That sounds great.', "It's delicious food."],
      ['How about making Hanji crafts?', 'Good idea!', 'Yes, I do.', "No, I'm full."],
      ['What do you eat on Seollal?', 'We eat tteokguk.', 'We wear hanbok.', 'We play Tuho.'],
      ['Do you know about gat?', "Yes. It's a traditional Korean hat.", "It's a fun game.", 'How about eating it?'],
      ["Let's play gonggi.", "Okay. Let's play!", "It's a Korean hat.", 'Yes, I do.'],
      ['What is hanok?', "It's a traditional Korean house.", "It's a traditional game.", 'That sounds good.'],
      ['How about wearing hanbok on Chuseok?', "That's a great idea.", "It's Korean paper.", "No, I don't."],
      ['Can you play Tuho?', "Yes, I can. It's easy.", 'Yes, I do.', "It's spicy."],
      ['Do you know about yunnori?', "Yes. It's a game with four sticks.", "It's a Korean rice cake.", 'How about it?'],
    ],
  },
  12: {
    title: '12단원 We Should Save the World',
    words: [
      ['recycle', '♻️', '재활용하다'], ['reuse paper', '📄', '종이를 다시 쓰다'], ['use the stairs', '🪜', '계단을 이용하다'], ['turn off the lights', '💡', '불을 끄다'],
      ['save water', '🚰', '물을 아끼다'], ['plant trees', '🌳', '나무를 심다'], ['ride a bike', '🚲', '자전거를 타다'], ['pick up trash', '🗑️', '쓰레기를 줍다'],
      ['take the bus', '🚌', '버스를 타다'], ['use a tumbler', '🥤', '텀블러를 쓰다'], ['walk to school', '🚶', '걸어서 학교에 가다'], ['Earth', '🌍', '지구'],
      ['energy', '⚡', '에너지'], ['plastic bag', '🛍️', '비닐봉지'], ['air', '🌬️', '공기'], ['pollution', '🏭', '오염'],
      ['save', '🛟', '구하다, 아끼다'], ['clean', '🧽', '깨끗한'], ['eco bag', '👜', '장바구니'], ['take a short shower', '🚿', '샤워를 짧게 하다'],
    ],
    sent: [
      ['We should save the world.', '우리는 세상을 구해야 해.', '우리는 세상을 여행해야 해.', '우리는 세상을 그려야 해.'],
      ['We should recycle cans.', '우리는 캔을 재활용해야 해.', '우리는 캔을 버려야 해.', '우리는 병을 재활용해야 해.'],
      ["Don't forget to turn off the lights.", '불 끄는 것을 잊지 마.', '불 켜는 것을 잊지 마.', '문 닫는 것을 잊지 마.'],
      ['We should use the stairs.', '우리는 계단을 이용해야 해.', '우리는 엘리베이터를 이용해야 해.', '우리는 계단을 청소해야 해.'],
      ['We should save water.', '우리는 물을 아껴야 해.', '우리는 물을 많이 써야 해.', '우리는 물을 사야 해.'],
      ["Don't forget to reuse paper.", '종이를 다시 쓰는 것을 잊지 마.', '종이를 버리는 것을 잊지 마.', '종이를 사는 것을 잊지 마.'],
      ['We should plant trees.', '우리는 나무를 심어야 해.', '우리는 나무를 베어야 해.', '우리는 꽃을 심어야 해.'],
      ["Let's pick up trash.", '쓰레기를 줍자.', '쓰레기를 버리자.', '장난감을 줍자.'],
      ["We shouldn't use plastic bags.", '우리는 비닐봉지를 쓰면 안 돼.', '우리는 비닐봉지를 써야 해.', '우리는 종이봉투를 쓰면 안 돼.'],
      ['What should we do for the Earth?', '지구를 위해 무엇을 해야 할까?', '지구는 어디에 있을까?', '지구에서 무엇을 먹을까?'],
      ["Don't forget to bring your tumbler.", '텀블러 가져오는 것을 잊지 마.', '텀블러 사는 것을 잊지 마.', '컵 씻는 것을 잊지 마.'],
      ['We should take short showers.', '우리는 샤워를 짧게 해야 해.', '우리는 샤워를 길게 해야 해.', '우리는 목욕을 자주 해야 해.'],
      ['The air is dirty.', '공기가 더러워.', '공기가 깨끗해.', '물이 더러워.'],
      ["Let's walk to school.", '걸어서 학교에 가자.', '버스 타고 학교에 가자.', '걸어서 집에 가자.'],
      ["I'll ride my bike.", '나는 자전거를 탈 거야.', '나는 자전거를 살 거야.', '나는 버스를 탈 거야.'],
      ['Good idea!', '좋은 생각이야!', '나쁜 생각이야!', '잘 모르겠어!'],
    ],
    talk: [
      ['What should we do to save energy?', 'We should turn off the lights.', "It's sour.", 'Yes, I do.'],
      ["Don't forget to recycle.", "Okay, I won't.", 'Yes, I do.', "It's a traditional food."],
      ['How can we save water?', 'We should take short showers.', 'We should take the bus.', "That's spicy."],
      ['We should use the stairs.', "That's a good idea.", 'No, thanks.', "I'd like to have it."],
      ['What should we do for the trees?', 'We should reuse paper.', 'We should use more paper.', 'Yes, I do.'],
      ["Look! There's trash on the ground.", "Let's pick it up.", "Let's throw more trash.", "It's delicious."],
      ['How do you go to school?', 'I walk to school.', 'I turn off the lights.', 'I recycle bottles.'],
      ["Don't forget to bring your tumbler.", 'Thanks for telling me.', "No, I don't.", "It's too salty."],
      ['Why should we plant trees?', 'Trees make the air clean.', 'Trees are spicy.', 'We should cut them.'],
      ['Should we use plastic bags?', 'No, we should use eco bags.', 'Yes, we should use more.', "It's a hanbok."],
      ['What can you do for the Earth?', 'I can ride a bike.', 'I can eat a lot.', 'I can turn on the TV.'],
      ['The Earth is sick.', 'We should save the Earth.', "Let's play yunnori.", "I'm full."],
    ],
  },
};

const UNIT_LIST = [
  { id: '10', ko: '10단원 · 음식 주문하기' },
  { id: '11', ko: '11단원 · 전통문화' },
  { id: '12', ko: '12단원 · 환경 지키기' },
  { id: 'all', ko: '10~12단원 섞기' },
  { id: 'custom', ko: '직접 올린 문제' },
];

function shuffle(a, rnd = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 하나의 문제 은행 {1:[...],2:[...],3:[...]} 만들기. 각 문제: {t, q, a, o:[오답,오답], icon?, unit}
function bankOf(unitId, custom) {
  const ids = unitId === 'all' ? ['10', '11', '12'] : [unitId];
  const b = { 1: [], 2: [], 3: [] };
  if (unitId === 'custom') return custom || b;
  ids.forEach(u => {
    const U = UNITS[u]; if (!U) return;
    U.words.forEach((w, i) => b[1].push({ t: 1, unit: u, q: w[0], a: w[1] + ' ' + w[2], icon: true, pool: U.words.map(x => x[1] + ' ' + x[2]) }));
    U.sent.forEach(s => b[2].push({ t: 2, unit: u, q: s[0], a: s[1], o: [s[2], s[3]] }));
    U.talk.forEach(s => b[3].push({ t: 3, unit: u, q: s[0], a: s[1], o: [s[2], s[3]] }));
  });
  return b;
}
// 한 학생의 한 라운드 문제 3개(이미 푼 문제는 피해요)
function pickQuiz(bank, seen, rnd = Math.random) {
  const out = [];
  [1, 2, 3].forEach(t => {
    let pool = bank[t] && bank[t].length ? bank[t] : [].concat(bank[1] || [], bank[2] || [], bank[3] || []);
    if (!pool.length) return;
    let fresh = pool.filter(q => !seen.has(q.q));
    if (!fresh.length) fresh = pool;
    const q = fresh[Math.floor(rnd() * fresh.length)]; seen.add(q.q);
    let wrong = q.o && q.o.length >= 2 ? q.o.slice(0, 2) : shuffle((q.pool || pool.map(x => x.a)).filter(x => x !== q.a), rnd).slice(0, 2);
    const choices = shuffle([q.a, ...wrong], rnd);
    out.push({ t: q.t || t, unit: q.unit, q: q.q, choices, answer: choices.indexOf(q.a), aText: q.a, slot: t });
  });
  return out;
}

module.exports = { UNITS, UNIT_LIST, bankOf, pickQuiz, shuffle };
