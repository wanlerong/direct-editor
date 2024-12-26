import {Delta} from "./delta";

test('adjust path', () => {
  let delta = new Delta([{
    p: [4,2,1],
    si: "1",
  }])

  delta = delta.adjustPath([
    new Delta([
        {p:[2],li:["DIV",{"class":"row","id":"OOTYyG7ziJ"},["BR",{"id":"gfxZZ0z8Ko"}]]}
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
      {p:[3],ld:["DIV",{"class":"row","id":"OOTYyG7ziJ"},["BR",{"id":"gfxZZ0z8Ko"}]]}
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