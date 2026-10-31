/**
 * Kimi Sheets Bridge — бесплатный HTTPS-мост к Google Sheets аккаунта владельца.
 * Apps Script Web App: Execute as = Me, Who has access = Anyone (доступ закрыт токеном).
 *
 * GET  ?token=...&id=<spreadsheetId>&action=list
 * GET  ?token=...&id=<spreadsheetId>[&sheet=<name>][&range=A1:Z100]
 * POST {token, id, action:"createSheet", name}
 * POST {token, id, sheet, range, values:[[...]]}
 * POST {token, action:"createSpreadsheet", title}
 * POST {token, id, action:"append", sheet, values:[[...]]}
 * POST {token, id, action:"format", sheet, formats, widths, frozenRows, frozenColumns}
 * POST {token, id, action:"chart", sheet, charts}
 * POST {token, id, action:"clearCharts", sheet}
 */
const TOKEN = 'REPLACE_WITH_YOUR_OWN_RANDOM_TOKEN';

function ok(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.token !== TOKEN) return ok({ error: 'unauthorized' });
    if (!p.id) return ok({ error: 'id required' });
    const ss = SpreadsheetApp.openById(p.id);
    if (p.action === 'list') {
      return ok({ sheets: ss.getSheets().map(s => ({ name: s.getName(), id: s.getSheetId() })) });
    }
    const sh = p.sheet ? ss.getSheetByName(p.sheet) : ss.getSheets()[0];
    if (!sh) return ok({ error: 'sheet not found: ' + p.sheet });
    const range = p.range || 'A1:Z100';
    return ok({ sheet: sh.getName(), range: range, values: sh.getRange(range).getValues() });
  } catch (err) {
    return ok({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.token !== TOKEN) return ok({ error: 'unauthorized' });
    if (body.action === 'createSpreadsheet') {
      const created = SpreadsheetApp.create(body.title || 'Новая таблица');
      return ok({ id: created.getId(), url: created.getUrl() });
    }
    if (!body.id) return ok({ error: 'id required' });
    const ss = SpreadsheetApp.openById(body.id);
    if (body.action === 'createSheet') {
      const sh = ss.insertSheet(body.name || 'Новый лист');
      return ok({ sheet: sh.getName(), sheetId: sh.getSheetId() });
    }
    if (body.action === 'append') {
      const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
      if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
      (body.values || []).forEach(row => sh.appendRow(row));
      return ok({ appended: (body.values || []).length });
    }
    if (body.action === 'format') {
      const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
      if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
      (body.formats || []).forEach(f => {
        const r = sh.getRange(f.range);
        if (f.bold !== undefined) r.setFontWeight(f.bold ? 'bold' : 'normal');
        if (f.background) r.setBackground(f.background);
        if (f.color) r.setFontColor(f.color);
        if (f.numberFormat) r.setNumberFormat(f.numberFormat);
        if (f.fontSize) r.setFontSize(f.fontSize);
        if (f.horizontalAlignment) r.setHorizontalAlignment(f.horizontalAlignment);
        if (f.wrap !== undefined) r.setWrap(f.wrap);
        if (f.border) r.setBorder(true, true, true, true, true, true);
      });
      (body.widths || []).forEach(w => sh.setColumnWidth(w.column, w.width));
      if (body.frozenRows !== undefined) sh.setFrozenRows(body.frozenRows);
      if (body.frozenColumns !== undefined) sh.setFrozenColumns(body.frozenColumns);
      return ok({ formatted: true, sheet: sh.getName() });
    }
    if (body.action === 'clearCharts') {
      const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
      if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
      sh.getCharts().forEach(ch => sh.removeChart(ch));
      return ok({ cleared: true, sheet: sh.getName() });
    }
    if (body.action === 'chart') {
      const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
      if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
      const types = { LINE: Charts.ChartType.LINE, COLUMN: Charts.ChartType.COLUMN,
                      AREA: Charts.ChartType.AREA, BAR: Charts.ChartType.BAR };
      (body.charts || []).forEach(c => {
        const b = sh.newChart()
          .setChartType(types[c.type] || Charts.ChartType.LINE)
          .setPosition(c.row || 1, c.col || 1, 0, 0)
          .setOption('title', c.title || '')
          .setOption('width', c.width || 760)
          .setOption('height', c.height || 380)
          .setOption('legend', { position: 'bottom' });
        (c.ranges || []).forEach(rg => b.addRange(sh.getRange(rg)));
        if (c.transpose) b.setTransposeRowsAndColumns(true);
        if (c.headers) b.setNumHeaders(c.headers);
        sh.insertChart(b.build());
      });
      return ok({ charted: true, sheet: sh.getName() });
    }
    const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
    if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
    sh.getRange(body.range).setValues(body.values);
    return ok({ updated: true, sheet: sh.getName(), range: body.range });
  } catch (err) {
    return ok({ error: String(err) });
  }
}
