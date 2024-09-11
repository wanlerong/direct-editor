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
  let ul = prevLi.querySelector('ul');
  if (!ul) {
    ul = document.createElement('ul');
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
      const newUl = document.createElement('ul');
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
    if (currentElement.tagName === 'UL') {
      ulCount++;
    }
    if (ulCount > 1) {
      return true;
    }
    currentElement = currentElement.parentElement;
  }
  
  return false;
}
