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
    const sh = body.sheet ? ss.getSheetByName(body.sheet) : ss.getSheets()[0];
    if (!sh) return ok({ error: 'sheet not found: ' + body.sheet });
    sh.getRange(body.range).setValues(body.values);
    return ok({ updated: true, sheet: sh.getName(), range: body.range });
  } catch (err) {
    return ok({ error: String(err) });
  }
}
