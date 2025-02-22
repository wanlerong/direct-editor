import {Delta} from "./delta";

test('adjust path', () => {
  let delta = new Delta([{
    p: [4,2,1],
    si: "1",
  }])

  delta = delta.adjustPath([
    new Delta([
        {p:[2],li:["DIV",{"data-btype":"basic","id":"OOTYyG7ziJ"},["BR",{"id":"gfxZZ0z8Ko"}]]}
    ])
  ])
  expect(delta.ops[0].p).toStrictEqual([5,2,1]);
});

test('adjust path 2', () => {
  let delta = new Delta([{
    p: [4,2,1],
    si: "1",
  }])

  delta = delta.adjustPath([
    new Delta([
      {p:[3],ld:["DIV",{"data-btype":"basic","id":"OOTYyG7ziJ"},["BR",{"id":"gfxZZ0z8Ko"}]]}
    ])
  ])
  expect(delta.ops[0].p).toStrictEqual([3,2,1]);
});

test('adjust path 3', () => {
  let delta = new Delta([{
    p: [4,2,1],
    si: "1",
  }])

  delta = delta.adjustPath([
    new Delta([
      {p:[4,2,0],sd:"a"}
    ])
  ])
  expect(delta.ops[0].p).toStrictEqual([4,2,0]);
});

test('adjust path 4', () => {
  let delta = new Delta([{
    p: [4,2,1],
    si: "1",
  }])

  delta = delta.adjustPath([
    new Delta([
      {p:[4,2,1],si:"a"}
    ])
  ])
  expect(delta.ops[0].p).toStrictEqual([4,2,2]);
});

test('adjust path 5', () => {
  let delta1 = new Delta([{
    p: [4,2,1],
    si: "d",
  }])
  let delta2 = new Delta([{
    p: [4,2,2],
    si: "'d",
  }])
  let delta3 = new Delta([{
    p: [4,2,1],
    sd: "d'd",
  }, {
    p: [4,2,1],
    si: "得到"
  }])
  
  let delta4 = delta3.inverse([])
  delta3.nextReserve = delta4
  
  let delta5 = delta2.inverse([delta3, delta4])
  
  expect(delta5.ops[0].p).toStrictEqual([4,2,2])
  expect(delta5.ops[0].sd).toStrictEqual("'d")
  expect(delta5.ops[0].si).toStrictEqual(undefined)
});

test('adjust path 6', () => {
  let delta1 = new Delta([{
    p: [4,2,1],
    si: "a",
  }])
  let delta2 = new Delta([{
    p: [4,2,2],
    si: "a",
  }])

  // undo
  let delta3 = delta2.inverse([])
  delta2.nextReserve = delta3
  expect(delta3.ops[0].p).toStrictEqual([4,2,2])
  expect(delta3.ops[0].sd).toStrictEqual("a")

  // undo
  let delta4 = delta1.inverse([delta2, delta3])
  delta1.nextReserve = delta4
  expect(delta4.ops[0].p).toStrictEqual([4,2,1])
  expect(delta4.ops[0].sd).toStrictEqual("a")

  // redo
  let delta5 = delta4.inverse([])
  delta4.nextReserve = delta5
  expect(delta5.ops[0].p).toStrictEqual([4,2,1])
  expect(delta5.ops[0].si).toStrictEqual("a")

  // redo
  let delta6 = delta3.inverse([delta4, delta5])
  delta3.nextReserve = delta6
  expect(delta6.ops[0].p).toStrictEqual([4,2,2])
  expect(delta6.ops[0].si).toStrictEqual("a")
})

test('adjust path 7', () => {
  let delta1 = new Delta([{
    p: [4,2,1],
    si: "1",
  }])
  
  let delta2 = new Delta([{
    p: [4,2,1],
    sd: "1",
  }])
  
  let delta3 = delta1.inverse([delta2])
  expect(delta3).toStrictEqual(null)
})

test('adjust path 8', () => {
  let delta1 = new Delta([{
    p: [4,2,1],
    si: "23",
  }])
  let delta2 = new Delta([{
    p: [4,2,2],
    si: "1",
  }])
  let delta3 = delta1.inverse([delta2])
  expect(delta3).toStrictEqual(null)


  delta1 = new Delta([{
    p: [4,2,1],
    si: "23",
  }])
  delta2 = new Delta([{
    p: [4,2,1],
    si: "1",
  }])
  delta3 = delta1.inverse([delta2])
  expect(delta3.ops[0].p).toStrictEqual([4,2,2])
  expect(delta3.ops[0].sd).toStrictEqual("23")
})
