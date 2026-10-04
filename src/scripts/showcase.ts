import { nextTabIndex } from '../lib/tabs';

export function mount(root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (tabs.length === 0 || tabs.length !== panels.length) {
    throw new Error(`Showcase needs one tabpanel for every tab, but found ${tabs.length} tabs and ${panels.length} panels`);
  }

  const select = (index: number, moveFocus: boolean) => {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
  };

  // A hidden panel's lazy cover only starts loading once the panel is shown, leaving an empty frame
  // for a moment. Pointing at a tab starts the download early. (Keyboard and touch users select a tab
  // in the same action that reaches it, so there is nothing earlier to hook for them.)
  const warm = (index: number) => panels[index].querySelector('img')?.setAttribute('loading', 'eager');

  tabs.forEach((tab, index) => {
    tab.addEventListener('pointerenter', () => warm(index));
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      // Leave browser and system shortcuts (such as Alt+Left for back) alone.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next = nextTabIndex(event.key, index, tabs.length);
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0, false);
  root.dataset.enhanced = 'true';
}
