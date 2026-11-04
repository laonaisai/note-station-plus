import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SynoNote, SyncTargetResult } from '@/types/synology';
import { useSessionStore } from './sessionStore';

export const useSyncStore = defineStore('sync', () => {
  const sessionStore = useSessionStore();
  const isSyncing = ref<boolean>(false);
  const syncLogs = ref<Array<{ time: number; message: string; type: 'info' | 'success' | 'error' }>>([]);

  function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    syncLogs.value.unshift({ time: Date.now(), message, type });
  }

  /**
   * Sync a specific note from current active server to targetServerId
   */
  async function syncNoteToTarget(
    sourceNote: SynoNote,
    targetServerId: string,
    targetNotebookId?: string
  ): Promise<SyncTargetResult> {
    const targetProfile = sessionStore.profiles.find(p => p.id === targetServerId);
    if (!targetProfile) {
      return {
        targetServerId,
        targetNotebookId: '',
        action: 'failed',
        error: '未找到指定目标服务器配置'
      };
    }

    const client = sessionStore.getClient(targetServerId);
    if (!client) {
      return {
        targetServerId,
        targetNotebookId: '',
        action: 'failed',
        error: '目标服务器客户端初始化失败'
      };
    }

    // Ensure target server is logged in
    let targetSession = sessionStore.sessionStates[targetServerId];
    if (!targetSession?.isLoggedIn) {
      addLog(`正在连接目标服务 ${targetProfile.alias}...`, 'info');
      const ok = await sessionStore.loginServer(targetServerId);
      if (!ok) {
        addLog(`目标服务 ${targetProfile.alias} 登录失败`, 'error');
        return {
          targetServerId,
          targetNotebookId: '',
          action: 'failed',
          error: '目标服务登录失败，请检查账号密码'
        };
      }
    }

    try {
      // 1. Get target notebooks
      let notebooks = await client.listNotebooks();
      if (notebooks.length === 0) {
        const defaultNb = await client.createNotebook('我的笔记本');
        notebooks = [defaultNb];
      }

      // Choose target notebook: specified or first available
      const notebook = targetNotebookId
        ? notebooks.find(nb => nb.object_id === targetNotebookId) || notebooks[0]
        : notebooks[0];

      addLog(`检索目标服务【${targetProfile.alias}】中的便签列表...`, 'info');

      // 2. Query notes in target notebook to match by title
      const { notes } = await client.listNotes(notebook.object_id);
      const matchedNote = notes.find(n => n.title.trim() === sourceNote.title.trim());

      const contentToSync = sourceNote.markdownContent || '';

      if (matchedNote) {
        // Match found -> Update existing note
        addLog(`匹配到同名便签【${sourceNote.title}】，执行覆盖更新...`, 'info');
        await client.updateNote(matchedNote.object_id, sourceNote.title, contentToSync);
        addLog(`便签【${sourceNote.title}】成功更新至【${targetProfile.alias}】`, 'success');

        return {
          targetServerId,
          targetNotebookId: notebook.object_id,
          targetNoteId: matchedNote.object_id,
          action: 'updated'
        };
      } else {
        // No match -> Create new note in target notebook
        addLog(`目标服务未发现同名便签，正在创建新便签【${sourceNote.title}】...`, 'info');
        const created = await client.createNote(notebook.object_id, sourceNote.title, contentToSync);
        addLog(`便签【${sourceNote.title}】成功新建至【${targetProfile.alias}】`, 'success');

        return {
          targetServerId,
          targetNotebookId: notebook.object_id,
          targetNoteId: created.object_id,
          action: 'created'
        };
      }
    } catch (err: any) {
      const errMsg = err?.message || '同步操作发生未知错误';
      addLog(`同步失败: ${errMsg}`, 'error');
      return {
        targetServerId,
        targetNotebookId: '',
        action: 'failed',
        error: errMsg
      };
    }
  }

  return {
    isSyncing,
    syncLogs,
    syncNoteToTarget,
    addLog
  };
});

