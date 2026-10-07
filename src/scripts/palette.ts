import { filterCommands, type Command } from '../lib/palette';

// The ⌘K palette. CommandPalette.astro renders the empty dialog and the command data; main.ts imports this on the
// first ⌘K / Ctrl+K and calls toggle(). The list is the ARIA combobox pattern: focus stays in the input and the
// highlighted option is announced through aria-activedescendant.

const dialog = document.querySelector<HTMLDialogElement>('#palette');
const input = dialog?.querySelector<HTMLInputElement>('input');
const list = dialog?.querySelector<HTMLUListElement>('ul');
const foot = dialog?.querySelector<HTMLElement>('[data-default]');
const data = document.querySelector('#palette-data')?.textContent;
if (!dialog || !input || !list || !foot || !data) throw new Error('The command palette markup is missing from this page');

const commands: Command[] = JSON.parse(data);
const defaultFoot = foot.dataset.default ?? '';

let shown = commands;
let active = 0;
let closeTimer = 0;

function render() {
  list!.replaceChildren();
  let group = '';
  shown.forEach((command, index) => {
    if (command.group !== group) {
      group = command.group;
      const heading = document.createElement('li');
      heading.className = 'palette__group label';
      heading.setAttribute('role', 'presentation');
      heading.textContent = group;
      list!.append(heading);
    }
    const option = document.createElement('li');
    option.className = 'palette__option';
    option.id = `palette-option-${index}`;
    option.setAttribute('role', 'option');
    option.dataset.index = String(index);
    const label = document.createElement('span');
    label.textContent = command.label;
    const hint = document.createElement('span');
    hint.className = 'palette__hint';
    hint.textContent = command.hint;
    option.append(label, hint);
    list!.append(option);
  });
  if (shown.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'palette__empty';
    empty.setAttribute('role', 'presentation');
    empty.textContent = 'No matches';
    list!.append(empty);
  }
  setActive(0);
}

function setActive(index: number) {
  active = index;
  list!.querySelectorAll('[role="option"]').forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
  const current = list!.querySelector(`#palette-option-${index}`);
  if (current) {
    input!.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  } else {
    input!.removeAttribute('aria-activedescendant');
  }
}

function run(command: Command | undefined) {
  if (!command) return;
  const { type, value } = command.action;
  if (type === 'copy') {
    // Stays open for a moment so the confirmation is seen. A blocked clipboard falls back to the mail client.
    navigator.clipboard.writeText(value).then(
      () => {
        foot!.textContent = 'Email copied';
        closeTimer = window.setTimeout(() => dialog!.close(), 700);
      },
      () => {
        location.href = `mailto:${value}`;
      },
    );
    return;
  }
  dialog!.close();
  if (type === 'external') window.open(value, '_blank', 'noopener');
  else if (value.startsWith('#')) location.hash = value;
  else location.assign(value);
}

input.addEventListener('input', () => {
  shown = filterCommands(commands, input.value);
  render();
});

input.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (shown.length === 0) return;
    const step = event.key === 'ArrowDown' ? 1 : -1;
    setActive((active + step + shown.length) % shown.length);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    run(shown[active]);
  }
});

list.addEventListener('mousemove', (event) => {
  const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
  if (option && Number(option.dataset.index) !== active) setActive(Number(option.dataset.index));
});

list.addEventListener('click', (event) => {
  const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
  if (option) run(shown[Number(option.dataset.index)]);
});

// A click on the backdrop lands on the dialog itself, outside its box.
dialog.addEventListener('click', (event) => {
  const box = dialog.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (outside) dialog.close();
});

dialog.addEventListener('close', () => {
  clearTimeout(closeTimer);
  foot.textContent = defaultFoot;
});

export function toggle() {
  if (dialog!.open) {
    dialog!.close();
    return;
  }
  input!.value = '';
  shown = commands;
  render();
  dialog!.showModal();
  input!.focus();
}
