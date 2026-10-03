import { nextTabIndex } from '../lib/tabs';

export function mount(root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (tabs.length === 0 || tabs.length !== panels.length) return;

  const select = (index: number, moveFocus: boolean) => {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      const next = nextTabIndex(event.key, index, tabs.length);
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0, false);
  root.dataset.enhanced = 'true';
}
