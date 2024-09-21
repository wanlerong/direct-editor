export function indentLi(li: HTMLElement, bool: boolean) {
  if (bool) {
    indent(li)
  } else {
    unindent(li)
  }
}

function indent(li: HTMLElement) {
  const prevLi = li.previousElementSibling as HTMLElement;
  if (!prevLi) {
    return;
  }
  let ul = prevLi.querySelector(li.parentElement.tagName);
  if (!ul) {
    ul = document.createElement(li.parentElement.tagName);
    prevLi.appendChild(ul);
  }
  ul.appendChild(li);
}

function unindent(li: HTMLElement) {
  const parentUl = li.parentElement as HTMLElement;
  const parentLi = parentUl.parentElement as HTMLElement;
  if (parentLi.nodeName === 'LI') {
    let nextSibling = li.nextElementSibling;
    if (nextSibling) {
      const newUl = document.createElement(parentUl.tagName);
      li.appendChild(newUl);

      while (nextSibling) {
        const next = nextSibling.nextElementSibling;
        newUl.appendChild(nextSibling);
        nextSibling = next;
      }
    }
    parentLi.insertAdjacentElement('afterend', li);
    if (parentUl.children.length === 0) {
      parentUl.remove();
    }
  }
}

export function isNestedLi(element: HTMLElement): boolean {
  let currentElement: HTMLElement | null = element;
  let ulCount = 0;

  while (currentElement) {
    if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
      ulCount++;
    }
    if (ulCount > 1) {
      return true;
    }
    currentElement = currentElement.parentElement;
  }

  return false;
}

export function replaceListType(node: HTMLElement, listType: 'ul' | 'ol') {
  let newList = document.createElement(listType);
  newList.replaceChildren(...node.childNodes)
  node.replaceWith(newList);
  
  Array.from(newList.childNodes).forEach((child) => {
    Array.from(child.childNodes).forEach((childNode) => {
      if (childNode.nodeType === Node.ELEMENT_NODE &&
        (childNode.nodeName.toLowerCase() === 'ul' || childNode.nodeName.toLowerCase() === 'ol')) {
        replaceListType(childNode as HTMLElement, listType);
      }
    });
  })
}
