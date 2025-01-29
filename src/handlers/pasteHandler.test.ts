import {setRange} from "../range";
import {handlePaste} from "./pasteHandler";

class ClipboardEventMock extends Event {
  clipboardData: DataTransfer;

  constructor(type: string, options: ClipboardEventInit) {
    super(type, options);
    this.clipboardData = options.clipboardData || {} as DataTransfer;
  }
}

global.ClipboardEvent = ClipboardEventMock as any;

test('handlePaste', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div class="row">1</div>'
  document.body.appendChild(div);

  // Create clipboard data mock
  let clipboardData: DataTransfer = {
    getData:  jest.fn().mockImplementation((type: string) => {
      if (type === 'text/html') {
        return '<div>111<div>222<div>333</div></div></div>';
      }
      return '';
    })
  } as unknown as DataTransfer;
  
  let event: ClipboardEvent = new ClipboardEvent('paste', { clipboardData });

  setRange(div.firstChild.firstChild, 1, div.firstChild.firstChild, 1)
  handlePaste(event);

  expect(div.innerHTML).toBe('<div class="row">1</div>' +
    '<div class="row">111</div>' +
    '<div class="row">222</div>' +
    '<div class="row">333</div>' 
    );
});
