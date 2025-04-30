import {Editor,Const,ActiveStatusConst,BlockConst} from "direct-editor"

let btn1 = document.getElementById("btn1")
let btn2 = document.getElementById("btn2")
let btn3 = document.getElementById("btn3")
let btn4 = document.getElementById("btn4")
let btn5 = document.getElementById("btn5")
let btn6 = document.getElementById("btn6")
let btn7 = document.getElementById("btn7")
let btn71 = document.getElementById("btn71")
let btn8 = document.getElementById("btn8")
let btn9 = document.getElementById("btn9")
let btn10 = document.getElementById("btn10")

let btnLink = document.getElementById("btnLink")
let linkUrlInput = document.getElementById('linkUrlInput');
let linkTextInput = document.getElementById('linkTextInput');
let confirmLink = document.getElementById("confirmLink");
let canInsert,canEdit

let btnImg = document.getElementById("btnImg")
let imgInput = document.getElementById('imgInput');
let confirmImg = document.getElementById("confirmImg");

let e = new Editor(document.getElementById("container"), (ops) => {
}, (as)=>{
  btn1.className = as.bold ? 'active' : ''
  btn2.className = as.italic ? 'active' : ''
  btn3.className = as.underline ? 'active' : ''
  btn4.className = as.strikethrough ? 'active' : ''
  
  btn5.className = as.blockInfo.blockType === BlockConst.BlockType.Line && as.blockInfo.subType === "h1" ? 'active' : ''
  btn6.className = as.blockInfo.blockType === BlockConst.BlockType.Line && as.blockInfo.subType === "h2" ? 'active' : ''
  btn7.className = as.blockInfo.blockType === BlockConst.BlockType.Line && as.blockInfo.subType === "h3" ? 'active' : ''
  btn71.className = as.blockInfo.blockType === BlockConst.BlockType.Line && as.blockInfo.subType === "blockquote" ? 'active' : ''
  if (as.disableActions.includes(ActiveStatusConst.Action.Line)) {
    btn5.className = 'disable'
    btn6.className = 'disable'
    btn7.className = 'disable'
    btn71.className = 'disable'
  }
  
  btn8.className = as.blockInfo.blockType === BlockConst.BlockType.List && as.blockInfo.subType === "ul" ? 'active' : ''
  if (as.disableActions.includes(ActiveStatusConst.Action.UN_ORDERED_LIST)) {
    btn8.className = 'disable'
  }
  
  btn9.className = as.blockInfo.blockType === BlockConst.BlockType.List && as.blockInfo.subType === "ol" ? 'active' : ''
  if (as.disableActions.includes(ActiveStatusConst.Action.ORDERED_LIST)) {
    btn9.className = 'disable'
  }
  
  if (!as.link.canInsert && !as.link.canEdit) {
    btnLink.className = 'disable'
  } else {
    btnLink.className = ''
  }
  
  linkUrlInput.value=as.link.suggestedUrl
  linkTextInput.value=as.link.suggestedText

  canInsert = as.link.canInsert
  canEdit = as.link.canEdit
})

btn1.addEventListener('click', (event) => {
  e.toolbar.bold(!btn1.classList.contains("active"))
})
btn2.addEventListener('click', (event) => {
  e.toolbar.italic(!btn2.classList.contains("active"))
})

btn3.addEventListener('click', (event) => {
  e.toolbar.underline(!btn3.classList.contains("active"))
})

btn4.addEventListener('click', (event) => {
  e.toolbar.strikethrough(!btn4.classList.contains("active"))
})

btn5.addEventListener('click', (event) => {
  e.toolbar.line(btn5.classList.contains("active") ? Const.LineLevel.LEVEL_NONE : Const.LineLevel.H1)
})

btn6.addEventListener('click', (event) => {
  e.toolbar.line(btn6.classList.contains("active") ? Const.LineLevel.LEVEL_NONE : Const.LineLevel.H2)
})

btn7.addEventListener('click', (event) => {
  e.toolbar.line(btn7.classList.contains("active") ? Const.LineLevel.LEVEL_NONE : Const.LineLevel.H3)
});

btn71.addEventListener('click', (event) => {
  e.toolbar.line(btn71.classList.contains("active") ? Const.LineLevel.LEVEL_NONE : Const.LineLevel.BLOCKQUOTE)
});


// Preventing buttons from getting focus
[btn5,btn6,btn7,btn71].forEach(btn => {
  btn.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })
})

btn8.addEventListener('click', (event) => {
  if(btn8.classList.contains("active")){
    e.toolbar.unToggleList("ul")
  } else {
    e.toolbar.toggleList("ul")
  }
});

btn9.addEventListener('click', (event) => {
  if(btn9.classList.contains("active")){
    e.toolbar.unToggleList("ol")
  } else {
    e.toolbar.toggleList("ol")
  }
});

btn10.addEventListener('click', (event) => {
  e.toolbar.toggleTodoList()
});

btnLink.addEventListener('click', () => {
  console.log("aaa")
  linkUrlInput.style.display = "block"
  linkTextInput.style.display = "block"
  confirmLink.style.display = "block"
  e.cacheSelection()
});

confirmLink.addEventListener('click', () => {
  if (canEdit) {
    e.toolbar.editLink(linkUrlInput.value, linkTextInput.value);
  } else if (canInsert) {
    e.toolbar.insertLink(linkUrlInput.value, linkTextInput.value);
  }
  linkUrlInput.style.display = "none"
  linkTextInput.style.display = "none"
  confirmLink.style.display = "none"
});

btnImg.addEventListener('click', () => {
  imgInput.style.display = "block"
  confirmImg.style.display = "block"
  e.cacheSelection()
});

confirmImg.addEventListener('click', () => {
  e.toolbar.insertImg(imgInput.value);
  imgInput.style.display = "none"
  confirmImg.style.display = "none"
});