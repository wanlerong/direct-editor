import {handleTab} from "./keydownHandler";
import {setRangeForTest} from "../range";

test('handleTab', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111</li><li>222</li><li>333</li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  setRangeForTest(div.firstChild.firstChild.childNodes[1].firstChild, 1, div.firstChild.firstChild.childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe("<div><ul>" +
    "<li>111<ul><li>222</li></ul></li><li>333</li>" +
    "</ul></div>");
});

test('handleTab_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111</li><li>222</li><li>333</li><li>444</li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  setRangeForTest(div.firstChild.firstChild.childNodes[1].firstChild, 1, div.firstChild.firstChild.childNodes[2].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe("<div><ul>" +
    "<li>111<ul><li>222</li><li>333</li></ul></li><li>444</li>" +
    "</ul></div>");
});

test('handleTab_03', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul><li>111' +
    '<ul><li>222' +
    '<ul><li>333</li><li>444</li></ul>' +
    '</li><li>555</li></ul>' +
    '</li><li>666</li>' +
    '</ul>' +
    '</div>';

  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  let ul = div.firstChild.firstChild
  setRangeForTest(ul.firstChild.childNodes[1].firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe('<div>' +
    '<ul><li>111' +
    '<ul><li>222' +
    '<ul><li>333<ul><li>444</li></ul></li><li>555</li></ul>' +
    '</li></ul>' +
    '</li><li>666</li>' +
    '</ul></div>'
  );
});

test('handleTab_shift', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111<ul><li>222</li><li>333</li><li>444</li></ul></li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
  });

  let ul = div.firstChild.firstChild
  setRangeForTest(ul.firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe('<div><ul>' +
    '<li>111<ul><li>222</li></ul></li>' +
    '<li>333<ul><li>444</li></ul></li>' +
    '</ul></div>'
  );
});

test('handleTab_shift_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111<ul><li>222</li><li>333</li><li>444</li></ul></li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
  });

  let ul = div.firstChild.firstChild
  setRangeForTest(ul.firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[2].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe('<div><ul>' +
    '<li>111<ul><li>222</li></ul></li>' +
    '<li>333</li><li>444</li>' +
    '</ul></div>'
  );
});
