import { SynoNote } from '@/types/synology';

/**
 * 判断便签是否处于已共享状态
 * 满足以下任一条件即视为已共享：
 * 1. 开启了公开外链访问 (acl.public.perm 为 'ro' 或 'rw')
 * 2. 授权给了 DSM 系统用户 (acl.dsm_user 不为空)
 * 3. 授权给了 DSM 系统群组 (acl.dsm_group 不为空)
 */
export function isNoteShared(note?: SynoNote | null): boolean {
  if (!note || !note.acl) return false;
  const acl = note.acl;

  // 显式禁用分享权限
  if (acl.enabled === false) return false;

  // 1. 公开外链访问
  if (acl.public && (acl.public.perm === 'ro' || acl.public.perm === 'rw')) {
    return true;
  }

  // 2. DSM 用户授权
  if (acl.dsm_user && typeof acl.dsm_user === 'object') {
    const userKeys = Object.keys(acl.dsm_user);
    if (userKeys.length > 0) {
      return true;
    }
  }

  // 3. DSM 群组授权
  if (acl.dsm_group && typeof acl.dsm_group === 'object') {
    const groupKeys = Object.keys(acl.dsm_group);
    if (groupKeys.length > 0) {
      return true;
    }
  }

  return false;
}
