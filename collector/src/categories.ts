// Maps a foreground process / window to a coarse app category. Only the category leaves the machine — never titles.
export type AppCategory = 'CRM' | 'Spreadsheet' | 'Email' | 'Messenger' | 'ERP' | 'Docs' | 'Browser' | 'Meeting' | 'Other';

const PROCESS_RULES: [RegExp, AppCategory][] = [
  [/excel|libreoffice.*calc|numbers/i, 'Spreadsheet'],
  [/outlook|thunderbird|mail/i, 'Email'],
  [/telegram|whatsapp|slack|discord|viber|signal/i, 'Messenger'],
  [/zoom|teams|webex|skype/i, 'Meeting'],
  [/winword|word|notepad|onenote|obsidian|acrobat|foxit/i, 'Docs'],
  [/1cv8|1c|sap|odoo|axapta|dynamics/i, 'ERP'],
  [/bitrix|amocrm|hubspot|salesforce|zoho/i, 'CRM'],
  [/chrome|msedge|firefox|opera|brave|yandex|safari/i, 'Browser'],
];

// For browsers we look at the window title only locally, to tell web CRMs / sheets / meetings apart. The title is discarded.
const TITLE_RULES: [RegExp, AppCategory][] = [
  [/bitrix24|amocrm|hubspot|salesforce|zoho|crm/i, 'CRM'],
  [/google sheets|таблиц|sheet|excel/i, 'Spreadsheet'],
  [/gmail|outlook|почта|mail/i, 'Email'],
  [/google meet|zoom|teams|webex/i, 'Meeting'],
  [/whatsapp|telegram|slack|discord/i, 'Messenger'],
  [/google docs|документ|notion|confluence|docs/i, 'Docs'],
  [/1c|sap|odoo|erp/i, 'ERP'],
];

export function categorize(processName: string, title: string): AppCategory {
  const proc = PROCESS_RULES.find(([re]) => re.test(processName))?.[1] ?? 'Other';
  if (proc === 'Browser') return TITLE_RULES.find(([re]) => re.test(title))?.[1] ?? 'Browser';
  return proc;
}
