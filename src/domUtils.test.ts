import {getLastTextNode} from "./domUtils";

test('getLastTextNode', () => {
  let div = document.createElement("div")
  let txt1 = document.createTextNode("111")
  div.appendChild(txt1)
  let txt2 = document.createTextNode("222")
  let span = document.createElement("span")
  span.appendChild(txt2)
  div.appendChild(span)
  
  let got = getLastTextNode(div)
  expect(got).toBe(txt2);
});
