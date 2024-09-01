import {splitTextNode} from "./range";

test('splitTextNode', () => {
  let div = document.createElement("div")
  div.innerHTML = '123456'
  let range = new Range()
  range.setStart(div.firstChild, 1)
  range.setEnd(div.firstChild, 3)
  
  let data = splitTextNode((div.firstChild) as Text, range.startOffset, range.endOffset)  
  
  expect(data.before).toBe("1");
  expect(data.mid).toBe("23");
  expect(data.after).toBe("456");
});


test('splitTextNode-02', () => {
  let div = document.createElement("div")
  div.innerHTML = '123456'
  let data = splitTextNode((div.firstChild) as Text, 4)
  expect(data.before).toBe("1234");
  expect(data.mid).toBe("56");
  expect(data.after).toBe("");
});