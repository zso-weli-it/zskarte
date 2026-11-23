import BlockEmbed from 'quill/blots/embed';

const createSpan = (className: string, text = '') => {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
};

export class AddressTokenBlot extends BlockEmbed {
  static override blotName = 'addressToken';
  static override tagName = 'span';
  static override className = 'addr-geo';

  static override create(value: { address: string; option?: string }) {
    const node = super.create() as HTMLElement;
    //the address comes from user input: textContent keeps it as text, innerHTML would run markup in it
    if (value.option) {
      node.setAttribute('data-geo', value.option);
      node.replaceChildren(
        createSpan('addr-show'),
        createSpan('text addr-search', value.address),
        createSpan('addr-edit'),
      );
    } else {
      node.replaceChildren(
        createSpan('addr-show addr-unknown'),
        createSpan('text', value.address),
        createSpan('addr-edit'),
      );
    }
    return node;
  }

  static override value(node: HTMLElement) {
    return {
      address: node.querySelector('.text')?.textContent || '',
      option: node.getAttribute('data-geo') || undefined,
    };
  }
}
