function icon(shapes) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${shapes}</svg>`;
}

export const ICONS = {
  home: icon('<path d="M3.25 10.75 12 3.5l8.75 7.25"/><path d="M5.75 8.75V19a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5V8.75"/><path d="M10 20.5v-4.75a2 2 0 0 1 4 0v4.75"/>'),
  training: icon('<rect x="5" y="5.5" width="3.5" height="13" rx="1.75"/><rect x="15.5" y="5.5" width="3.5" height="13" rx="1.75"/><path d="M2.75 9v6M21.25 9v6M8.5 12h7"/>'),
  nutrition: icon('<path d="M6.75 3.5v5a2.75 2.75 0 0 0 5.5 0v-5M9.5 3.5v17"/><path d="M17.25 20.5v-17c-2 .9-3.25 3.4-3.25 7v3.75h3.25"/>'),
  stats: icon('<rect x="3.5" y="12.5" width="4.25" height="8" rx="1.25"/><rect x="9.875" y="7.75" width="4.25" height="12.75" rx="1.25"/><rect x="16.25" y="3.5" width="4.25" height="17" rx="1.25"/>'),
  person: icon('<circle cx="12" cy="7.5" r="4"/><path d="M4.25 20.5c.75-4.1 3.9-6.75 7.75-6.75s7 2.65 7.75 6.75"/>'),
  search: icon('<circle cx="10.75" cy="10.75" r="6.25"/><path d="m15.25 15.25 4.75 4.75"/>'),
  info: icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.25M12 7.75v.01"/>'),
  check: icon('<path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/>'),
  close: icon('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  chevron: icon('<path d="M9 4.5l7.5 7.5L9 19.5"/>'),
  chevronLeft: icon('<path d="M15 4.5 7.5 12l7.5 7.5"/>'),
  plus: icon('<path d="M12 4.5v15M4.5 12h15"/>'),
  minus: icon('<path d="M4.5 12h15"/>'),
  updown: icon('<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4"/>'),
  sunrise: icon('<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 4v6M9 7l3-3 3 3M4.5 14.5l1.5 1M19.5 14.5l-1.5 1"/>'),
  sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  sunset: icon('<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 4v6M9 7l3 3 3-3M4.5 14.5l1.5 1M19.5 14.5l-1.5 1"/>'),
  moon: icon('<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>'),
  camera: icon('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.4"/>'),
  calendar: icon('<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  repeat: icon('<path d="M4.5 11a7.5 7.5 0 0 1 13-5l2 2M19.5 3.5V8H15M19.5 13a7.5 7.5 0 0 1-13 5l-2-2M4.5 20.5V16H9"/>'),
  chart: icon('<path d="M4 19.5h16M5.5 15l4.5-4.5 3.5 3.5 6-7"/>'),
  document: icon('<path d="M7 3.5h6.5l4.5 4.5v12.5H7zM13.5 3.5V8H18"/>'),
  restore: icon('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 15.5v2A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-2"/>'),
  trash: icon('<path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 13h9l1-13M10.5 10.5v6M13.5 10.5v6"/>'),
  table: icon('<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 10h16M4 14.5h16M10 5v14"/>'),
};
