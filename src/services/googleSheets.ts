import { Task, SyncResult, TaskStatus } from '../types';
import { normalizeDateKey } from '../utils/dateUtils';
import { attachRecurrenceToNotes, extractRecurrenceFromNotes } from '../utils/recurrenceUtils';
import { loadDeletedTaskIds, saveDeletedTaskIds } from './storage';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Вставьте этот код в Расширения -> Apps Script вашей Google Таблицы
// После этого нажмите "Развернуть" -> "Новое развертывание" -> тип "Веб-приложение"
// Доступ: "Все" (Anyone), и скопируйте полученный URL.

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Всегда используем первый лист книги (индекс 0)
    var sheet = ss.getSheets()[0];
    var rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', tasks: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var tasks = [];
    // Первая строка - заголовки: ID, Дата, Задача, Статус, Заметки, Создано, Обновлено, Повторение
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var title = String(r[2] || '').trim();
      if (!r[0] && !title) continue;
      
      // Если пользователь вручную вписал задачу в таблицу без ID, генерируем ID
      var taskId = r[0] ? String(r[0]) : ('sheet-' + new Date().getTime() + '-' + i);
      
      // Форматируем дату в YYYY-MM-DD
      var dateVal = r[1];
      var dateStr = '';
      if (dateVal instanceof Date) {
        var y = dateVal.getFullYear();
        var m = String(dateVal.getMonth() + 1);
        if (m.length < 2) m = '0' + m;
        var d = String(dateVal.getDate());
        if (d.length < 2) d = '0' + d;
        dateStr = y + '-' + m + '-' + d;
      } else {
        dateStr = String(dateVal || '').trim();
        if (/^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$/.test(dateStr)) {
          var parts = dateStr.split('.');
          var pDay = parts[0].length < 2 ? ('0' + parts[0]) : parts[0];
          var pMonth = parts[1].length < 2 ? ('0' + parts[1]) : parts[1];
          dateStr = parts[2] + '-' + pMonth + '-' + pDay;
        }
      }

      var recurrenceObj = undefined;
      var recurrenceParentId = undefined;
      if (r[7]) {
        var rawRec = String(r[7]).trim();
        if (rawRec.charAt(0) === '{') {
          try {
            recurrenceObj = JSON.parse(rawRec);
          } catch(err) {}
        } else if (rawRec) {
          recurrenceParentId = rawRec;
        }
      }

      var nowIso = new Date().toISOString();
      tasks.push({
        id: taskId,
        date: dateStr,
        title: title,
        status: String(r[3] || 'pending'),
        notes: String(r[4] || ''),
        createdAt: String(r[5] || nowIso),
        updatedAt: String(r[6] || nowIso),
        recurrence: recurrenceObj,
        recurrenceParentId: recurrenceParentId
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', tasks: tasks }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString(), tasks: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tasks = data.tasks || [];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Всегда используем первый лист книги (индекс 0)
    var sheet = ss.getSheets()[0];
    
    // Очищаем и записываем заново с заголовками
    sheet.clearContents();
    sheet.appendRow(['ID', 'Дата', 'Задача', 'Статус', 'Заметки', 'Создано', 'Обновлено', 'Повторение']);
    
    // Красиво стилизуем заголовки
    var headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');
    
    var rowsToAdd = [];
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var recVal = t.recurrence ? JSON.stringify(t.recurrence) : (t.recurrenceParentId || '');
      rowsToAdd.push([
        t.id,
        t.date,
        t.title,
        t.status,
        t.notes || '',
        t.createdAt || '',
        t.updatedAt || '',
        recVal
      ]);
    }
    
    if (rowsToAdd.length > 0) {
      sheet.getRange(2, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
    }
    
    sheet.autoResizeColumns(1, 8);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'Успешно сохранено', 
      count: tasks.length 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export async function syncWithGoogleSheets(
  url: string,
  localTasks: Task[],
  deletedMap: Record<string, string> = {},
  lastSyncedAt: string | null = null
): Promise<{ result: SyncResult; mergedTasks: Task[]; updatedDeletedMap: Record<string, string> }> {
  if (!url || !url.trim().startsWith('http')) {
    return {
      result: { success: false, message: 'Укажите корректный URL веб-приложения Google' },
      mergedTasks: localTasks,
      updatedDeletedMap: deletedMap
    };
  }

  const cleanUrl = url.trim();

  try {
    // 1. Читаем существующие задачи из Google Sheets
    const getResponse = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!getResponse.ok) {
      throw new Error(`Ошибка подключения: HTTP ${getResponse.status}`);
    }

    const getData = await getResponse.json();
    const rawRemoteTasks: Task[] = Array.isArray(getData.tasks) ? getData.tasks : [];

    // Нормализуем даты, строковые поля и восстанавливаем параметры цикла (даже если колонка 8 отсутствовала)
    const remoteTasks: Task[] = rawRemoteTasks.map(rt => {
      const { cleanNotes, rule: notesRule } = extractRecurrenceFromNotes(rt.notes);
      let recurrence = rt.recurrence || notesRule;
      let recurrenceParentId = rt.recurrenceParentId;

      const idStr = String(rt.id);
      if (!recurrenceParentId && idStr.startsWith('rec-')) {
        const match = idStr.match(/^rec-(.+)-\d{4}-\d{2}-\d{2}$/);
        if (match) {
          recurrenceParentId = match[1];
        }
      }

      return {
        ...rt,
        id: idStr,
        date: normalizeDateKey(rt.date),
        title: String(rt.title || ''),
        status: (rt.status as TaskStatus) || 'pending',
        notes: cleanNotes,
        createdAt: rt.createdAt || new Date().toISOString(),
        updatedAt: rt.updatedAt || new Date().toISOString(),
        recurrence,
        recurrenceParentId
      };
    });

    // Объединяем удаленные ID из хранилища и переданной карты
    const diskDeleted = loadDeletedTaskIds();
    const updatedDeletedMap: Record<string, string> = { ...diskDeleted, ...deletedMap };
    const nowIso = new Date().toISOString();

    const localMap = new Map<string, Task>();
    for (const lt of localTasks) {
      localMap.set(lt.id, {
        ...lt,
        date: normalizeDateKey(lt.date)
      });
    }

    // Собираем актуальные параметры циклов (endDate, удаление цикла)
    interface SeriesState {
      endDate?: string;
      isDeleted: boolean;
      updatedAt: string;
    }
    const seriesMap = new Map<string, SeriesState>();

    for (const rt of remoteTasks) {
      if (rt.recurrence && rt.recurrence.type !== 'none') {
        seriesMap.set(rt.id, {
          endDate: rt.recurrence.endDate,
          isDeleted: Boolean(updatedDeletedMap[rt.id]),
          updatedAt: rt.updatedAt || ''
        });
      }
    }

    for (const lt of localTasks) {
      if (lt.recurrence && lt.recurrence.type !== 'none') {
        const existing = seriesMap.get(lt.id);
        if (!existing || (lt.updatedAt || '') >= existing.updatedAt) {
          seriesMap.set(lt.id, {
            endDate: lt.recurrence.endDate,
            isDeleted: Boolean(updatedDeletedMap[lt.id]),
            updatedAt: lt.updatedAt || ''
          });
        }
      }
    }

    // Помечаем удаленные серии
    for (const id of Object.keys(updatedDeletedMap)) {
      const series = seriesMap.get(id);
      if (series) {
        series.isDeleted = true;
      }
    }

    const mergedMap = new Map<string, Task>();

    // Если локальный список пуст (например, при сбое или первом входе на новом устройстве),
    // фильтруем только по удаленным задачам и восстанавливаем
    if (localTasks.length === 0) {
      for (const rt of remoteTasks) {
        if (updatedDeletedMap[rt.id]) continue;
        if (rt.recurrenceParentId && updatedDeletedMap[rt.recurrenceParentId]) continue;
        if (rt.id.startsWith('rec-')) {
          const match = rt.id.match(/^rec-(.+)-\d{4}-\d{2}-\d{2}$/);
          if (match && updatedDeletedMap[match[1]]) continue;
        }
        mergedMap.set(rt.id, rt);
      }
    } else {
      // 2. Обрабатываем задачи из Google Sheets
      for (const rt of remoteTasks) {
        // А) Проверяем: удалена ли эта задача
        if (updatedDeletedMap[rt.id]) {
          continue;
        }

        // Б) Дочерняя задача: проверяем, удален ли цикл
        if (rt.recurrenceParentId) {
          if (updatedDeletedMap[rt.recurrenceParentId]) {
            continue;
          }
          const parentSeries = seriesMap.get(rt.recurrenceParentId);
          if (parentSeries?.isDeleted) {
            continue;
          }
          if (parentSeries?.endDate && rt.date > parentSeries.endDate) {
            continue;
          }
        }

        // В) Если ID начинается с rec-: извлекаем parentId и проверяем
        if (rt.id.startsWith('rec-')) {
          const match = rt.id.match(/^rec-(.+)-\d{4}-\d{2}-\d{2}$/);
          if (match) {
            const parentId = match[1];
            if (updatedDeletedMap[parentId]) {
              continue;
            }
            const parentSeries = seriesMap.get(parentId);
            if (parentSeries?.isDeleted) {
              continue;
            }
            if (parentSeries?.endDate && rt.date > parentSeries.endDate) {
              continue;
            }
          }
        }

        // Г) Корневая задача с истекшим сроком endDate
        if (rt.recurrence?.endDate && rt.date > rt.recurrence.endDate && rt.status === 'pending') {
          continue;
        }

        // Д) Сравнение с локальной версией
        const lt = localMap.get(rt.id);
        if (!lt) {
          // Задачи НЕТ локально!
          // Если синхронизация уже проходила ранее:
          if (lastSyncedAt && remoteTasks.length > 0) {
            const createdBeforeSync = (rt.createdAt || '') <= lastSyncedAt;
            const notModifiedRemotely = (rt.updatedAt || '') <= lastSyncedAt;

            if (createdBeforeSync && notModifiedRemotely) {
              // Задача существовала до прошлой синхронизации, но пользователь удалил её локально!
              // Ни в коем случае НЕ восстанавливаем её!
              updatedDeletedMap[rt.id] = nowIso;
              continue;
            }
          }

          // Новая задача, созданная в таблице или на другом устройстве
          mergedMap.set(rt.id, rt);
        } else {
          const localTime = new Date(lt.updatedAt || 0).getTime();
          const remoteTime = new Date(rt.updatedAt || 0).getTime();

          // Гарантируем сохранение настроек повторения, если они есть локально
          const effectiveRecurrence = lt.recurrence || rt.recurrence;
          const effectiveParentId = lt.recurrenceParentId || rt.recurrenceParentId;

          if (localTime > remoteTime) {
            mergedMap.set(lt.id, {
              ...lt,
              recurrence: effectiveRecurrence,
              recurrenceParentId: effectiveParentId
            });
          } else if (remoteTime > localTime) {
            mergedMap.set(rt.id, {
              ...rt,
              recurrence: effectiveRecurrence,
              recurrenceParentId: effectiveParentId
            });
          } else {
            const contentDiffers =
              rt.title !== lt.title ||
              rt.status !== lt.status ||
              (rt.notes || '') !== (lt.notes || '') ||
              rt.date !== lt.date;

            if (contentDiffers) {
              mergedMap.set(rt.id, {
                ...rt,
                updatedAt: nowIso,
                recurrence: effectiveRecurrence,
                recurrenceParentId: effectiveParentId
              });
            } else {
              mergedMap.set(lt.id, {
                ...lt,
                recurrence: effectiveRecurrence,
                recurrenceParentId: effectiveParentId
              });
            }
          }
        }
      }

      // 3. Обрабатываем локальные задачи, которых нет в Google Sheets
      for (const lt of localTasks) {
        if (mergedMap.has(lt.id)) continue;
        if (updatedDeletedMap[lt.id]) continue;
        if (lt.recurrenceParentId && updatedDeletedMap[lt.recurrenceParentId]) continue;

        if (lastSyncedAt && remoteTasks.length > 0) {
          const createdBeforeSync = (lt.createdAt || '') <= lastSyncedAt;
          const notModifiedSinceSync = (lt.updatedAt || '') <= lastSyncedAt;

          if (createdBeforeSync && notModifiedSinceSync) {
            // Задача была в таблице, но удалена в ней пользователем!
            updatedDeletedMap[lt.id] = nowIso;
            continue;
          }
        }

        mergedMap.set(lt.id, lt);
      }
    }

    // Защита от случайной очистки таблицы
    if (mergedMap.size === 0 && remoteTasks.length > 0) {
      for (const rt of remoteTasks) {
        if (!updatedDeletedMap[rt.id]) {
          mergedMap.set(rt.id, rt);
        }
      }
    }

    const finalList = Array.from(mergedMap.values());

    // Для отправки в таблицу добавляем резервный маркер повторения в заметки
    // Это гарантирует работу повторений даже если таблица настроена с 7 колонками!
    const tasksToSend = finalList.map(t => {
      if (t.recurrence && t.recurrence.type !== 'none') {
        return {
          ...t,
          notes: attachRecurrenceToNotes(t.notes, t.recurrence)
        };
      }
      return t;
    });

    // 4. Отправляем актуальный список обратно в Google Таблицу
    const postResponse = await fetch(cleanUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'sync',
        tasks: tasksToSend
      })
    });

    if (!postResponse.ok) {
      throw new Error(`Ошибка записи в таблицу: HTTP ${postResponse.status}`);
    }

    saveDeletedTaskIds(updatedDeletedMap);

    return {
      result: {
        success: true,
        message: `Синхронизировано ${finalList.length} задач`,
        count: finalList.length
      },
      mergedTasks: finalList,
      // ВАЖНО: сохраняем tombstones (реестр удаленных задач), чтобы они никогда не воскресали!
      updatedDeletedMap
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка сети';
    return {
      result: { success: false, message },
      mergedTasks: localTasks,
      updatedDeletedMap: deletedMap
    };
  }
}
