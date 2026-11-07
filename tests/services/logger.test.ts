import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '@/services/logger';

describe('LoggerService 本地日志记录与导出测试', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('能成功记录 info, warn, error 级别的日志', () => {
    logger.info('note', 'create', '便签创建成功', { noteId: '1001', title: '测试便签' });
    logger.warn('notebook', 'delete', '删除笔记本', { notebookId: 'nb_01' });
    logger.error('note', 'update', '保存便签失败', new Error('版本冲突'), { noteId: '1001' });

    const logs = logger.getLogs();
    expect(logs.length).toBe(3);

    expect(logs[0].level).toBe('info');
    expect(logs[0].category).toBe('note');
    expect(logs[0].action).toBe('create');
    expect(logs[0].message).toBe('便签创建成功');
    expect(logs[0].details).toEqual({ noteId: '1001', title: '测试便签' });

    expect(logs[1].level).toBe('warn');
    expect(logs[1].category).toBe('notebook');
    expect(logs[1].action).toBe('delete');

    expect(logs[2].level).toBe('error');
    expect(logs[2].category).toBe('note');
    expect(logs[2].action).toBe('update');
    expect(logs[2].error).toContain('版本冲突');
  });

  it('能自动过滤与脱敏敏感信息 (password, sid, otp_code)', () => {
    logger.info('auth', 'login', '用户尝试登录', {
      account: 'admin',
      password: 'superSecretPassword123',
      sid: 'secret_sid_token_456',
      otp_code: '123456',
      nested: {
        token: 'nested_token_789',
        normalField: 'ok'
      }
    });

    const logs = logger.getLogs();
    expect(logs.length).toBe(1);
    const details = logs[0].details;

    expect(details.account).toBe('admin');
    expect(details.password).toBe('******');
    expect(details.sid).toBe('******');
    expect(details.otp_code).toBe('******');
    expect(details.nested.token).toBe('******');
    expect(details.nested.normalField).toBe('ok');
  });

  it('能正常导出为文本格式，包含规范的 Header 和格式化内容', () => {
    logger.info('note', 'save', '便签保存成功', { noteId: '123' });
    logger.error('sync', 'current_nas', '同步失败', new Error('网络断开'));

    const text = logger.exportLogsAsText();
    expect(text).toContain('Note Station Plus 运行日志导出');
    expect(text).toContain('[INFO] [note:save] 便签保存成功');
    expect(text).toContain('[ERROR] [sync:current_nas] 同步失败');
    expect(text).toContain('网络断开');
  });

  it('清空日志功能正常', () => {
    logger.info('system', 'start', '应用启动');
    expect(logger.getLogs().length).toBe(1);

    logger.clearLogs();
    expect(logger.getLogs().length).toBe(0);
  });

  it('支持事件订阅监听', () => {
    let triggered = 0;
    const unsubscribe = logger.subscribe(() => {
      triggered++;
    });

    logger.info('note', 'create', '新建1');
    logger.info('note', 'create', '新建2');
    expect(triggered).toBe(2);

    unsubscribe();
    logger.info('note', 'create', '新建3');
    expect(triggered).toBe(2);
  });
});
