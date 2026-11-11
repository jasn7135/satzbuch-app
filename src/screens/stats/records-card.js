import { personalRecords } from "../../model/strength.js";
import { renderCardMessage } from "../../ui/components.js";
import { parseIsoDate } from "../../utils/dates.js";
import { chartDateFormat, countLabel, formatKilograms, formatNumber } from "../../utils/format.js";
import { escapeHtml } from "../../utils/text.js";

const RECORD_LIST_LIMIT = 8;

export function describeRecordSet(record) {
  return record.kg > 0 ? `${formatNumber(record.kg)} kg × ${record.reps}` : `${countLabel(record.reps, "Wiederholung", "Wiederholungen")}`;
}

function describeRecordDetail(record) {
  const set = record.kg > 0 ? `${formatNumber(record.kg)} kg × ${record.reps}` : "Körpergewicht";
  return `${set} · ${chartDateFormat.format(parseIsoDate(record.date))}`;
}

function describeRecordValue(record) {
  return record.oneRepMax === null ? `${record.reps} Wdh.` : `≈ ${formatKilograms(record.oneRepMax)}`;
}

function renderRecordRow(record) {
  return `
    <div class="entry-row">
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(record.name)}</span>
        <span class="entry-sub">${escapeHtml(describeRecordDetail(record))}</span>
      </span>
      <span class="entry-value">${escapeHtml(describeRecordValue(record))}</span>
    </div>`;
}

export function renderRecordsCard() {
  const records = personalRecords().slice(0, RECORD_LIST_LIMIT);
  if (records.length === 0) return renderCardMessage("Deine besten Sätze pro Übung erscheinen hier, sobald du trainierst.");
  return records.map(renderRecordRow).join("");
}
